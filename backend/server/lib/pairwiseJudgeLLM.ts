/**
 * LLM-as-judge pairwise comparator with position-swap debias.
 *
 * Heuristik judge'a ek olarak, iki prompt'u bir LLM'e karsilastirtir.
 * Pozisyon biasini sifirlamak icin (A, B) ve (B, A) olarak iki kez calistirir,
 * ikinci cevabin pozisyonunu tersler, kriter basina puanlari ortalar.
 *
 * API, heuristik `judgePairwise`'in JudgePairwiseResult tipiyle UYUMLUDUR —
 * boylece improver / orchestrator kodu iki judge arasinda secim yapabilir.
 *
 * @see services/judgeEnsemble.ts judgePairwise (heuristic)
 */

import { JUDGE_CRITERIA, type JudgePairwiseResult, type PairwiseCriterionResult } from '@/services/judgeEnsemble';

/** Prompt -> text chat callable. Injected so routes can supply any provider. */
export type LlmChatFn = (
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxTokens?: number },
) => Promise<string>;

export interface LlmPairwiseOptions {
  domainId?: string;
  framework?: string;
  reasoning?: string;
  /** (A,B) + (B,A) + ortalama. Default true. */
  positionSwap?: boolean;
  temperature?: number;
  /** Judge cevabi icin dil ipucu (fark etmez, dogruluk icin sabit). */
  language?: 'tr' | 'en';
  /** Kriter agirliklari (toplam ~1.0). Default: JUDGE_CRITERIA weights. */
  weights?: Record<string, number>;
}

/** Tek bir kriter icin LLM'in dondurdugu ham oy. */
interface LlmCriterionVote {
  id: string;
  scoreA: number;  // 0-100
  scoreB: number;  // 0-100
  winner: 'A' | 'B' | 'tie';
  reason?: string;
}

interface LlmJudgeRawResponse {
  criteria: LlmCriterionVote[];
}

const TIE_TOTAL = 1;
const TIE_CRITERION = 2;

// ─── Prompt builders ────────────────────────────────────────────────────────

function buildJudgeSystemPrompt(opts: LlmPairwiseOptions): string {
  const lang = opts.language ?? 'en';
  const criterionList = JUDGE_CRITERIA
    .map(c => `- ${c.id}: ${lang === 'tr' ? c.descriptionTr : c.description}`)
    .join('\n');

  return `You are an impartial prompt-engineering judge. Compare two master prompts (A and B) head-to-head across the following criteria:

${criterionList}

Scoring rules:
- Score each prompt on each criterion between 0 and 100.
- For each criterion, declare a winner: "A", "B", or "tie".
- Use "tie" only when scores are within 2 points.
- Be strict and numeric; do not hedge.
- Do NOT be influenced by order or length. Judge content quality.

Return STRICTLY a JSON object with this shape:
{
  "criteria": [
    { "id": "<criterion-id>", "scoreA": <0-100>, "scoreB": <0-100>, "winner": "A"|"B"|"tie", "reason": "<one short sentence>" }
  ]
}
Return exactly ${JUDGE_CRITERIA.length} entries, one per criterion id above. No extra keys. No markdown. No prose outside the JSON.`;
}

function buildJudgeUserPrompt(
  promptA: string,
  promptB: string,
  opts: LlmPairwiseOptions,
): string {
  const ctx: string[] = [];
  if (opts.domainId && opts.domainId !== 'auto') ctx.push(`Domain: ${opts.domainId}`);
  if (opts.framework && opts.framework !== 'AUTO') ctx.push(`Framework: ${opts.framework}`);
  if (opts.reasoning) ctx.push(`Reasoning hint: ${opts.reasoning}`);
  const context = ctx.length > 0 ? `\nContext:\n${ctx.join('\n')}\n` : '';
  return `${context}
=== PROMPT A ===
${promptA}
=== END A ===

=== PROMPT B ===
${promptB}
=== END B ===

Score both prompts per criterion. Respond with the JSON object only.`;
}

// ─── Response parsing ───────────────────────────────────────────────────────

function parseJudgeResponse(text: string): LlmJudgeRawResponse {
  // LLM'ler bazen ```json ... ``` sarmasi veya ek metin ekler — tolerans.
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1]!.trim() : trimmed;
  // JSON'un basini/sonunu yakala.
  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error(`Judge response not JSON: ${raw.slice(0, 200)}`);
  }
  const jsonStr = raw.slice(firstBrace, lastBrace + 1);
  const parsed = JSON.parse(jsonStr);
  if (!parsed || !Array.isArray(parsed.criteria)) {
    throw new Error('Judge response missing `criteria` array');
  }
  // Normalize.
  const criteria: LlmCriterionVote[] = parsed.criteria.map((c: any) => ({
    id: String(c.id),
    scoreA: clamp01_100(Number(c.scoreA)),
    scoreB: clamp01_100(Number(c.scoreB)),
    winner: normalizeWinner(c.winner),
    reason: typeof c.reason === 'string' ? c.reason : undefined,
  }));
  return { criteria };
}

function clamp01_100(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeWinner(w: unknown): 'A' | 'B' | 'tie' {
  const s = String(w ?? '').trim().toLowerCase();
  if (s === 'a') return 'A';
  if (s === 'b') return 'B';
  return 'tie';
}

/** LLM cevabini ters pozisyonla calismis gibi duzelt (A↔B). */
function unswapResponse(resp: LlmJudgeRawResponse): LlmJudgeRawResponse {
  return {
    criteria: resp.criteria.map(c => ({
      id: c.id,
      scoreA: c.scoreB,
      scoreB: c.scoreA,
      winner: c.winner === 'A' ? 'B' : c.winner === 'B' ? 'A' : 'tie',
      reason: c.reason,
    })),
  };
}

// ─── Aggregation ────────────────────────────────────────────────────────────

function defaultWeights(): Record<string, number> {
  const w: Record<string, number> = {};
  for (const c of JUDGE_CRITERIA) w[c.id] = c.weight;
  return w;
}

function mergeRuns(primary: LlmJudgeRawResponse, debiased: LlmJudgeRawResponse | null): LlmCriterionVote[] {
  // Map by id for stability.
  const byId: Record<string, LlmCriterionVote[]> = {};
  for (const c of primary.criteria) {
    if (!byId[c.id]) byId[c.id] = [];
    byId[c.id]!.push(c);
  }
  if (debiased) {
    for (const c of debiased.criteria) {
      if (!byId[c.id]) byId[c.id] = [];
      byId[c.id]!.push(c);
    }
  }
  const merged: LlmCriterionVote[] = [];
  for (const criterion of JUDGE_CRITERIA) {
    const votes = byId[criterion.id] ?? [];
    if (votes.length === 0) {
      // Judge kriteri atladi: esit-50 ver, tie.
      merged.push({ id: criterion.id, scoreA: 50, scoreB: 50, winner: 'tie' });
      continue;
    }
    const scoreA = Math.round(votes.reduce((s, v) => s + v.scoreA, 0) / votes.length);
    const scoreB = Math.round(votes.reduce((s, v) => s + v.scoreB, 0) / votes.length);
    // Iki run'in kazananlari ayni ise o kazanan; degilse tie (yuksek belirsizlik).
    const winners = new Set(votes.map(v => v.winner));
    const winner: 'A' | 'B' | 'tie' =
      winners.size === 1 ? votes[0]!.winner : 'tie';
    merged.push({ id: criterion.id, scoreA, scoreB, winner, reason: votes[0]?.reason });
  }
  return merged;
}

function aggregateToResult(
  votes: LlmCriterionVote[],
  weights: Record<string, number>,
): JudgePairwiseResult {
  let totalA = 0;
  let totalB = 0;
  for (const v of votes) {
    const w = weights[v.id] ?? 0.2;
    totalA += v.scoreA * w;
    totalB += v.scoreB * w;
  }
  totalA = Math.round(totalA);
  totalB = Math.round(totalB);
  const margin = totalA - totalB;

  const perCriterion: PairwiseCriterionResult[] = votes.map(v => {
    const delta = v.scoreA - v.scoreB;
    // LLM "winner" imzasini da dogrudan kullanabiliriz ama delta esikli karar
    // heuristik judge ile uyumluluk saglar.
    const winner: 'a' | 'b' | 'tie' =
      Math.abs(delta) <= TIE_CRITERION ? 'tie' : delta > 0 ? 'a' : 'b';
    return {
      criterionId: v.id,
      scoreA: v.scoreA,
      scoreB: v.scoreB,
      delta,
      winner,
    };
  });

  const winner: 'a' | 'b' | 'tie' =
    Math.abs(margin) <= TIE_TOTAL ? 'tie' : margin > 0 ? 'a' : 'b';

  const aWinsOn = perCriterion.filter(p => p.winner === 'a').map(p => p.criterionId);
  const bWinsOn = perCriterion.filter(p => p.winner === 'b').map(p => p.criterionId);

  let weakestCriterionForA: string | null = null;
  let worstDelta = -Infinity;
  for (const p of perCriterion) {
    if (p.winner === 'b' && -p.delta > worstDelta) {
      worstDelta = -p.delta;
      weakestCriterionForA = p.criterionId;
    }
  }
  if (weakestCriterionForA === null) {
    let lowest = Infinity;
    for (const p of perCriterion) {
      if (p.scoreA < lowest) { lowest = p.scoreA; weakestCriterionForA = p.criterionId; }
    }
  }

  const summary = `LLM-judge: A=${totalA}, B=${totalB} (margin ${margin >= 0 ? '+' : ''}${margin}). A wins: [${aWinsOn.join(', ') || '-'}]. B wins: [${bWinsOn.join(', ') || '-'}].`;
  const summaryTr = `LLM-hakem: A=${totalA}, B=${totalB} (fark ${margin >= 0 ? '+' : ''}${margin}). A kazandi: [${aWinsOn.join(', ') || '-'}]. B kazandi: [${bWinsOn.join(', ') || '-'}].`;

  return {
    winner,
    margin,
    totalA,
    totalB,
    perCriterion,
    aWinsOn,
    bWinsOn,
    weakestCriterionForA,
    summary,
    summaryTr,
  };
}

// ─── Main API ───────────────────────────────────────────────────────────────

/**
 * LLM'i iki prompt'u karsilastirmaya zorlar; pozisyon biasini elimine etmek
 * icin (A,B) ve (B,A) calistirir, un-swap sonrasi skorlari ortalar.
 */
export async function judgePairwiseLLM(
  promptA: string,
  promptB: string,
  chat: LlmChatFn,
  options: LlmPairwiseOptions = {},
): Promise<JudgePairwiseResult> {
  const positionSwap = options.positionSwap !== false;
  const temperature = options.temperature ?? 0;
  const system = buildJudgeSystemPrompt(options);
  const weights = options.weights ?? defaultWeights();

  // Run 1: (A, B)
  const run1Text = await chat(system, buildJudgeUserPrompt(promptA, promptB, options), { temperature });
  const run1 = parseJudgeResponse(run1Text);

  let merged: LlmCriterionVote[];
  if (positionSwap) {
    // Run 2: (B, A) — A/B swapped in the user prompt; we un-swap the reply.
    const run2Text = await chat(system, buildJudgeUserPrompt(promptB, promptA, options), { temperature });
    const run2 = parseJudgeResponse(run2Text);
    const run2Unswapped = unswapResponse(run2);
    merged = mergeRuns(run1, run2Unswapped);
  } else {
    merged = mergeRuns(run1, null);
  }

  return aggregateToResult(merged, weights);
}

// ─── Default OpenAI-compatible chat (used by the route) ────────────────────

interface EnvJudgeConfig {
  url: string;
  apiKey: string;
  model: string;
}

function resolveEnvJudgeConfig(): EnvJudgeConfig | null {
  const envUrl = process.env.SR_JUDGE_LLM_URL;
  const envKey = process.env.SR_JUDGE_LLM_KEY ?? process.env.OPENAI_API_KEY ?? process.env.GROQ_API_KEY;
  const envModel = process.env.SR_JUDGE_LLM_MODEL;

  if (!envKey) return null;

  // Akilli default: Groq varsa onu (ucuz + hizli), yoksa OpenAI.
  const url = envUrl
    ?? (process.env.GROQ_API_KEY ? 'https://api.groq.com/openai/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions');
  const model = envModel
    ?? (process.env.GROQ_API_KEY ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini');

  return { url, apiKey: envKey, model };
}

export interface ProgressiveJudgeOptions extends LlmPairwiseOptions {
  riskLevel?: 'low' | 'medium' | 'high';
  scoreThresholdLow?: number;
  scoreThresholdMedium?: number;
}

export async function progressiveJudgePairwiseLLM(
  promptA: string,
  promptB: string,
  chat: LlmChatFn,
  options: ProgressiveJudgeOptions = {},
): Promise<JudgePairwiseResult> {
  const riskLevel = options.riskLevel ?? 'low';
  const thresholdLow = options.scoreThresholdLow ?? 50;
  const thresholdMedium = options.scoreThresholdMedium ?? 65;

  if (riskLevel === 'high') {
    return judgePairwiseLLM(promptA, promptB, chat, { ...options, positionSwap: true });
  }

  const firstResult = await judgePairwiseLLM(promptA, promptB, chat, {
    ...options,
    positionSwap: false,
  });

  const threshold = riskLevel === 'medium' ? thresholdMedium : thresholdLow;
  const firstScore = Math.max(firstResult.totalA, firstResult.totalB);

  if (firstScore < threshold) {
    return judgePairwiseLLM(promptA, promptB, chat, { ...options, positionSwap: true });
  }

  return firstResult;
}

// ─── Default OpenAI-compatible chat (used by the route) ────────────────────

/**
 * Env'den cozumlenen varsayilan OpenAI-compatible chat helper.
 * Yoksa null dondurur — route bunu kontrol edip 501 donebilir.
 */
export function getDefaultJudgeChat(): LlmChatFn | null {
  const cfg = resolveEnvJudgeConfig();
  if (!cfg) return null;

  return async (system, user, opts) => {
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature: opts?.temperature ?? 0,
        max_tokens: opts?.maxTokens ?? 1024,
        response_format: { type: 'json_object' },
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Judge LLM ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data?.choices?.[0]?.message?.content ?? '';
    if (!content) throw new Error('Judge LLM empty response');
    return content;
  };
}
