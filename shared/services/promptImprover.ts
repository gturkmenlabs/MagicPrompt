/**
 * Prompt Improver — Closed-loop iterative prompt refinement.
 *
 * Pipeline:
 *   champion ← input
 *   loop N:
 *     weakness ← identify lowest-scoring criterion (+ lint + budget violations)
 *     candidate ← await mutate(champion, weakness)    // caller supplies LLM
 *     verdict   ← judgePairwise(candidate, champion)  // heuristic, deterministic
 *     if candidate wins: champion ← candidate, reset plateau counter
 *     else: plateau++; stop if plateau >= tolerance
 *   return { finalPrompt, trace[] }
 *
 * The `MutateFn` is injected so tests can use a fake and production code can
 * wire an LLM call (e.g. getMutationPrompt() + generateMasterPromptUnified()).
 *
 * @see docs/PROMPT_LEADERSHIP_ROADMAP.md §closed-loop-improvement
 */

import {
  judgePairwise,
  JUDGE_CRITERIA,
  _runScoring,
  _calcWeightedTotal,
  type JudgePromptOptions,
  type JudgeScore,
  type JudgePairwiseResult,
} from './judgeEnsemble';
import { lintPrompt, type LintIssue } from './promptLint';
import { estimateTokenCount } from './budgetOptimizer';

// ─── Types ──────────────────────────────────────────────────────────────────

export type Language = 'tr' | 'en';

export interface ImproveGoals {
  /** Ulasilinca erken dur. Agirlikli toplam 0-100. Default 80. */
  minScore?: number;
  /** Prompt metni icin token ust siniri. Asarsa iyilestirme "token-budget" ile durur. */
  maxTokens?: number;
  /** Zorunlu odaklanilacak kriterler (ornegin ['testability','security']). */
  focusCriteria?: string[];
  /** Calibration + skorlama secenekleri. */
  domainId?: string;
  framework?: string;
  reasoning?: string;
}

export interface ImproveOptions {
  /** Max iterasyon sayisi. Default 5. */
  maxIterations?: number;
  /** Ust uste kaybeden mutasyon esigi (bundan sonra dur). Default 2. */
  plateauTolerance?: number;
  /** Mutator'a verilecek dil. Default 'tr'. */
  language?: Language;
}

export interface WeaknessReport {
  criterionId: string;
  label: string;
  labelTr: string;
  score: number;
  /** Promptta tespit edilen lint hatalari (sadece error/warning). */
  lintIssues: Array<{ ruleId: string; message: string; messageTr: string }>;
  /** Token butcesini asiyor mu? */
  overLength: boolean;
  tokenCount: number;
  maxTokens: number | null;
  /** Mutator icin insan-okunur ozet — bu stringi mutator prompt'una gecir. */
  summary: string;
  summaryTr: string;
}

export interface ImproveStep {
  iteration: number;
  /** Iterasyon baslangicindaki sampiyonun agirlikli skoru ve token sayisi. */
  before: { score: number; tokens: number };
  /** Iterasyon sonundaki sampiyonun (aday kazandiysa aday, yoksa eski) skoru. */
  after: { score: number; tokens: number };
  weakness: WeaknessReport;
  /** Mutator'un dondurdugu aday prompt. */
  mutatedPrompt: string;
  /** Pairwise sonucu. */
  verdict: JudgePairwiseResult;
  /** Aday sampiyon yapildi mi? */
  kept: boolean;
  reason: string;
  reasonTr: string;
  /** Kriter bazinda delta (candidate - champion). UI diff panelinde kullanilir. */
  perCriterionDelta: Record<string, number>;
}

export type StopReason =
  | 'goal-reached'
  | 'plateau'
  | 'max-iterations'
  | 'token-budget'
  | 'mutator-error';

export interface ImproveResult {
  initialPrompt: string;
  finalPrompt: string;
  initialScore: number;
  finalScore: number;
  initialTokens: number;
  finalTokens: number;
  iterations: ImproveStep[];
  stopReason: StopReason;
  stopReasonTr: string;
  /** Hem improvement hem regression olup olmadigini ozetler. */
  netGain: number;
}

/**
 * Caller-supplied mutator. Gercek ortamda LLM'e getMutationPrompt() ile cagri atar.
 * Test ortaminda sabit/statik bir donusum dondurebilir.
 */
export type MutateFn = (
  prompt: string,
  weakness: WeaknessReport,
  language: Language,
) => Promise<string>;

// ─── Weakness Identification ────────────────────────────────────────────────

function findWeakness(
  prompt: string,
  scores: JudgeScore[],
  goals: ImproveGoals,
): WeaknessReport {
  const maxTokens = goals.maxTokens ?? null;
  const tokenCount = estimateTokenCount(prompt);
  const overLength = maxTokens !== null && tokenCount > maxTokens;

  // Odak listesi varsa o kriterler icinde en dusuk olani se; yoksa genel en dusuk.
  const candidates = goals.focusCriteria && goals.focusCriteria.length > 0
    ? scores.filter(s => goals.focusCriteria!.includes(s.criterionId))
    : scores;

  const lowest = candidates.reduce<JudgeScore>((min, s) => (s.score < min.score ? s : min), candidates[0]!);
  const criterion = JUDGE_CRITERIA.find(c => c.id === lowest.criterionId)!;

  // Lint — sadece error/warning (info gurultusunu mutator'a tasima).
  const lint = lintPrompt(prompt);
  const lintIssues: WeaknessReport['lintIssues'] = lint.issues
    .filter((i: LintIssue) => i.severity !== 'info')
    .map(i => ({ ruleId: i.ruleId, message: i.message, messageTr: i.messageTr }));

  const parts: string[] = [];
  const partsTr: string[] = [];
  parts.push(`Weakest criterion: ${criterion.label} (${lowest.score}/100). ${lowest.reasoning}`);
  partsTr.push(`En zayif kriter: ${criterion.labelTr} (${lowest.score}/100). ${lowest.reasoningTr}`);
  if (lintIssues.length > 0) {
    parts.push(`Lint findings: ${lintIssues.map(i => `[${i.ruleId}] ${i.message}`).join(' | ')}`);
    partsTr.push(`Lint bulgulari: ${lintIssues.map(i => `[${i.ruleId}] ${i.messageTr}`).join(' | ')}`);
  }
  if (overLength) {
    parts.push(`Token budget exceeded: ${tokenCount} > ${maxTokens}. Tighten phrasing without losing constraints.`);
    partsTr.push(`Token butcesi asildi: ${tokenCount} > ${maxTokens}. Kisitlari kaybetmeden kisalt.`);
  }

  return {
    criterionId: lowest.criterionId,
    label: criterion.label,
    labelTr: criterion.labelTr,
    score: lowest.score,
    lintIssues,
    overLength,
    tokenCount,
    maxTokens,
    summary: parts.join(' '),
    summaryTr: partsTr.join(' '),
  };
}

function buildJudgeOpts(goals: ImproveGoals): JudgePromptOptions {
  return {
    domainId: goals.domainId ?? 'auto',
    framework: goals.framework ?? 'AUTO',
    reasoning: goals.reasoning ?? '',
  };
}

function evalChampion(prompt: string, goals: ImproveGoals): { scores: JudgeScore[]; total: number; tokens: number } {
  const opts = {
    domainId: goals.domainId ?? 'auto',
    framework: goals.framework ?? 'AUTO',
    reasoning: goals.reasoning ?? '',
  };
  const scores = _runScoring(prompt, opts);
  const total = _calcWeightedTotal(scores);
  const tokens = estimateTokenCount(prompt);
  return { scores, total, tokens };
}

function perCriterionDelta(verdict: JudgePairwiseResult): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of verdict.perCriterion) out[p.criterionId] = p.delta;
  return out;
}

// ─── Main API ───────────────────────────────────────────────────────────────

/**
 * Prompt'u kapali dongude iyilestirir. Her iterasyonda:
 *   1) Sampiyonun zayif kriterini bul
 *   2) mutate() ile aday uret
 *   3) judgePairwise ile aday vs sampiyon karsilastir
 *   4) Aday kazandiysa sampiyonu guncelle; yoksa plateau say
 *
 * @param prompt  Baslangic prompt'u
 * @param goals   Hedef skor, token butcesi, odak kriterleri
 * @param mutate  Aday ureten fonksiyon (LLM veya fake)
 * @param options Iterasyon/plateau parametreleri
 */
export async function improvePrompt(
  prompt: string,
  goals: ImproveGoals,
  mutate: MutateFn,
  options: ImproveOptions = {},
): Promise<ImproveResult> {
  const maxIterations = options.maxIterations ?? 5;
  const plateauTolerance = options.plateauTolerance ?? 2;
  const language: Language = options.language ?? 'tr';
  const minScore = goals.minScore ?? 80;

  const judgeOpts = buildJudgeOpts(goals);
  const iterations: ImproveStep[] = [];

  let champion = prompt;
  let champEval = evalChampion(champion, goals);
  const initialScore = champEval.total;
  const initialTokens = champEval.tokens;

  let plateauCount = 0;
  let stopReason: StopReason = 'max-iterations';
  let stopReasonTr = 'Maksimum iterasyon sayisina ulasildi.';

  // Hedefi zaten asiyorsak hic iterasyon calistirma.
  if (champEval.total >= minScore && (goals.maxTokens === undefined || champEval.tokens <= goals.maxTokens)) {
    return {
      initialPrompt: prompt,
      finalPrompt: prompt,
      initialScore,
      finalScore: champEval.total,
      initialTokens,
      finalTokens: champEval.tokens,
      iterations: [],
      stopReason: 'goal-reached',
      stopReasonTr: 'Baslangicta hedef skor karsilaniyor.',
      netGain: 0,
    };
  }

  for (let i = 1; i <= maxIterations; i++) {
    const weakness = findWeakness(champion, champEval.scores, goals);
    const before = { score: champEval.total, tokens: champEval.tokens };

    let candidate: string;
    try {
      candidate = await mutate(champion, weakness, language);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      iterations.push({
        iteration: i,
        before,
        after: before,
        weakness,
        mutatedPrompt: '',
        verdict: emptyVerdict(champEval.total),
        kept: false,
        reason: `Mutator error: ${msg}`,
        reasonTr: `Mutator hatasi: ${msg}`,
        perCriterionDelta: {},
      });
      stopReason = 'mutator-error';
      stopReasonTr = `Mutator hatasi ile duruldu: ${msg}`;
      break;
    }

    // Guard: bos veya ayni prompt gelirse plateau say.
    const trimmedCandidate = (candidate ?? '').trim();
    if (!trimmedCandidate || trimmedCandidate === champion.trim()) {
      const verdict = judgePairwise(champion, champion, judgeOpts);
      iterations.push({
        iteration: i,
        before,
        after: before,
        weakness,
        mutatedPrompt: trimmedCandidate,
        verdict,
        kept: false,
        reason: 'Mutator returned empty or identical prompt — skipped.',
        reasonTr: 'Mutator bos veya ayni prompt dondurdu — atlandi.',
        perCriterionDelta: {},
      });
      plateauCount++;
      if (plateauCount >= plateauTolerance) {
        stopReason = 'plateau';
        stopReasonTr = `${plateauCount} ardisik kazanamayan mutasyon — plateau.`;
        break;
      }
      continue;
    }

    const verdict = judgePairwise(trimmedCandidate, champion, judgeOpts);
    const candidateTokens = estimateTokenCount(trimmedCandidate);
    const candidateWins = verdict.winner === 'a';
    const delta = perCriterionDelta(verdict);

    // Token butcesi kontrolu: aday kazandi ama butceyi asiyorsa reddet.
    const maxTokens = goals.maxTokens;
    if (candidateWins && maxTokens !== undefined && candidateTokens > maxTokens) {
      iterations.push({
        iteration: i,
        before,
        after: before,
        weakness,
        mutatedPrompt: trimmedCandidate,
        verdict,
        kept: false,
        reason: `Candidate won on quality but exceeds token budget (${candidateTokens}/${maxTokens}). Rejected.`,
        reasonTr: `Aday kalitede kazandi ama token butcesini asiyor (${candidateTokens}/${maxTokens}). Reddedildi.`,
        perCriterionDelta: delta,
      });
      stopReason = 'token-budget';
      stopReasonTr = 'Token butcesi nedeniyle iyilestirme durduruldu.';
      break;
    }

    if (candidateWins) {
      champion = trimmedCandidate;
      champEval = evalChampion(champion, goals);
      plateauCount = 0;
      iterations.push({
        iteration: i,
        before,
        after: { score: champEval.total, tokens: champEval.tokens },
        weakness,
        mutatedPrompt: trimmedCandidate,
        verdict,
        kept: true,
        reason: `Candidate wins pairwise (+${verdict.margin}). Promoted. A wins on: ${verdict.aWinsOn.join(', ') || '-'}.`,
        reasonTr: `Aday pairwise'da kazandi (+${verdict.margin}). Sampiyon yapildi. Kazanilan kriterler: ${verdict.aWinsOn.join(', ') || '-'}.`,
        perCriterionDelta: delta,
      });

      if (champEval.total >= minScore) {
        stopReason = 'goal-reached';
        stopReasonTr = `Hedef skor (${minScore}) karsilandi.`;
        break;
      }
    } else {
      plateauCount++;
      iterations.push({
        iteration: i,
        before,
        after: before,
        weakness,
        mutatedPrompt: trimmedCandidate,
        verdict,
        kept: false,
        reason: `Candidate did not beat champion (verdict=${verdict.winner}, margin=${verdict.margin}). B wins on: ${verdict.bWinsOn.join(', ') || '-'}.`,
        reasonTr: `Aday sampiyonu geremedi (sonuc=${verdict.winner}, fark=${verdict.margin}). Sampiyonun kazandigi: ${verdict.bWinsOn.join(', ') || '-'}.`,
        perCriterionDelta: delta,
      });
      if (plateauCount >= plateauTolerance) {
        stopReason = 'plateau';
        stopReasonTr = `${plateauCount} ardisik kazanamayan mutasyon — plateau.`;
        break;
      }
    }
  }

  return {
    initialPrompt: prompt,
    finalPrompt: champion,
    initialScore,
    finalScore: champEval.total,
    initialTokens,
    finalTokens: champEval.tokens,
    iterations,
    stopReason,
    stopReasonTr,
    netGain: champEval.total - initialScore,
  };
}

function emptyVerdict(total: number): JudgePairwiseResult {
  return {
    winner: 'tie',
    margin: 0,
    totalA: total,
    totalB: total,
    perCriterion: [],
    aWinsOn: [],
    bWinsOn: [],
    weakestCriterionForA: null,
    summary: 'no-op',
    summaryTr: 'no-op',
  };
}
