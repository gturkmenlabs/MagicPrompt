/**
 * POST /v1/prompt/improve — Kapali dongu prompt iyilestirme.
 *
 * Istemci: masterPrompt + goals + options gonderir.
 * Sunucu: LLM tabanli bir mutator enjekte eder, services/promptImprover'i
 * calistirir, sonucu dondurur. LLM cagrilari SUNUCU TARAFINDAN yapilir
 * (anahtarlar env'de kalir).
 *
 * @see services/promptImprover.ts
 * @see server/lib/pairwiseJudgeLLM.ts (ayni auth ile LLM-judge aktive edilebilir)
 */

import { Router } from 'express';
import { improvePrompt, type MutateFn, type WeaknessReport } from '@/services/promptImprover';
import { JUDGE_CRITERIA, judgePairwise } from '@/services/judgeEnsemble';
import { judgePairwiseLLM, getDefaultJudgeChat, type LlmChatFn } from '../lib/pairwiseJudgeLLM';
import { optionalApiKey } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { getPool } from '../db/client';
import { writeAuditLog } from '../lib/auditLog';

const router = Router();

// ─── Mutator prompt builders ────────────────────────────────────────────────

function mutatorSystem(language: 'tr' | 'en'): string {
  if (language === 'tr') {
    return `Sen uzman bir prompt muhendisisin. Gorevin, verilen master prompt'u yalnizca belirtilen zayifligi giderecek sekilde iyilestirmektir.

Kurallar:
- SADECE iyilestirilmis master prompt metnini dondur.
- Aciklama, yorum, markdown sarmasi EKLEME.
- Orijinal amaci ve mevcut kisitlamalari KORU.
- Odak: belirtilen kriteri guclendir, diger kriterlere zarar verme.
- Mumkunse token sayisini artirmadan iyilestir.
- Iyilestirme OLCULEBILIR olmali (daha net hedef, daha spesifik kisit, daha iyi format, vb.).`;
  }
  return `You are an expert prompt engineer. Your job is to improve the given master prompt by addressing ONLY the specified weakness.

Rules:
- Return ONLY the improved master prompt text.
- NO explanations, comments, or markdown wrapping.
- PRESERVE the original intent and existing constraints.
- Focus: strengthen the specified criterion without harming others.
- Prefer improvements that do NOT increase token count.
- Improvements must be MEASURABLE (clearer goal, more specific constraint, better format, etc.).`;
}

function mutatorUser(prompt: string, weakness: WeaknessReport, language: 'tr' | 'en'): string {
  const criterionBlock = JUDGE_CRITERIA.map(c => `- ${c.id}: ${language === 'tr' ? c.descriptionTr : c.description}`).join('\n');
  const summary = language === 'tr' ? weakness.summaryTr : weakness.summary;

  if (language === 'tr') {
    return `Odak kriter: ${weakness.criterionId} (skor: ${weakness.score}/100)

Tespit edilen zayiflik:
${summary}

Kriter referansi:
${criterionBlock}

Iyilestirilecek prompt:
--- BASLANGIC ---
${prompt}
--- BITIS ---

Sadece iyilestirilmis prompt metnini dondur, baska hicbir sey yazma.`;
  }
  return `Focus criterion: ${weakness.criterionId} (score: ${weakness.score}/100)

Detected weakness:
${summary}

Criterion reference:
${criterionBlock}

Prompt to improve:
--- START ---
${prompt}
--- END ---

Return only the improved prompt text — nothing else.`;
}

function buildMutator(chat: LlmChatFn): MutateFn {
  return async (prompt, weakness, language) => {
    const system = mutatorSystem(language);
    const user = mutatorUser(prompt, weakness, language);
    const raw = await chat(system, user, { temperature: 0.3, maxTokens: 4096 });
    // Bazi saglayicilar kod bloguna sarabilir — temizle.
    const trimmed = raw.trim();
    const fenced = trimmed.match(/^```(?:\w+)?\s*([\s\S]*?)```$/);
    return fenced ? fenced[1]!.trim() : trimmed;
  };
}

// ─── Request validation ─────────────────────────────────────────────────────

interface ImproveBody {
  masterPrompt?: unknown;
  goals?: {
    minScore?: unknown;
    maxTokens?: unknown;
    focusCriteria?: unknown;
    domainId?: unknown;
    framework?: unknown;
    reasoning?: unknown;
  };
  options?: {
    maxIterations?: unknown;
    plateauTolerance?: unknown;
    language?: unknown;
  };
  /** LLM-as-judge'i aday-sampiyon pairwise'da kullan (default false, heuristik kullanilir). */
  useLlmJudge?: unknown;
}

function normalize(body: ImproveBody) {
  const prompt = typeof body.masterPrompt === 'string' ? body.masterPrompt : '';
  const g = body.goals ?? {};
  const o = body.options ?? {};
  const goals = {
    minScore: typeof g.minScore === 'number' ? g.minScore : undefined,
    maxTokens: typeof g.maxTokens === 'number' ? g.maxTokens : undefined,
    focusCriteria: Array.isArray(g.focusCriteria)
      ? g.focusCriteria.filter((x): x is string => typeof x === 'string')
      : undefined,
    domainId: typeof g.domainId === 'string' ? g.domainId : undefined,
    framework: typeof g.framework === 'string' ? g.framework : undefined,
    reasoning: typeof g.reasoning === 'string' ? g.reasoning : undefined,
  };
  const options = {
    maxIterations: typeof o.maxIterations === 'number' ? Math.min(10, Math.max(1, o.maxIterations)) : undefined,
    plateauTolerance: typeof o.plateauTolerance === 'number' ? Math.min(5, Math.max(1, o.plateauTolerance)) : undefined,
    language: o.language === 'en' ? 'en' as const : 'tr' as const,
  };
  const useLlmJudge = body.useLlmJudge === true;
  return { prompt, goals, options, useLlmJudge };
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/** POST /v1/prompt/improve */
router.post('/prompt/improve', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const { prompt, goals, options, useLlmJudge } = normalize(req.body ?? {});
    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({ error: 'masterPrompt (string, >=10 chars) required' });
    }

    const chat = getDefaultJudgeChat();
    if (!chat) {
      return res.status(400).json({
        error: 'No LLM API key configured for improve endpoint. Set OPENAI_API_KEY, GROQ_API_KEY, or SR_JUDGE_LLM_KEY.',
        code: 'MISSING_PROVIDER_KEY',
      });
    }

    const mutate = buildMutator(chat);

    // useLlmJudge=true ise improvePrompt icindeki pairwise kararini LLM-judge ile desteklemek
    // icin pre/post aday-sampiyon LLM karsilastirmasi yap ve sonuclari meta olarak dondur.
    // Not: Mevcut improvePrompt() heuristik pairwise kullanir (hizli + deterministik).
    // LLM-judge opsiyonel bir "second opinion" olarak calistirilir.
    const result = await improvePrompt(prompt, goals, mutate, options);

    let llmSecondOpinion: Awaited<ReturnType<typeof judgePairwiseLLM>> | null = null;
    if (useLlmJudge && result.finalPrompt !== result.initialPrompt) {
      try {
        llmSecondOpinion = await judgePairwiseLLM(result.finalPrompt, result.initialPrompt, chat, {
          domainId: goals.domainId,
          framework: goals.framework,
          reasoning: goals.reasoning,
          language: options.language,
        });
      } catch (err) {
        console.warn('[improve] LLM second-opinion failed:', err instanceof Error ? err.message : err);
      }
    }

    // Audit log (best-effort).
    const pool = getPool();
    await writeAuditLog(pool, {
      action: 'prompt_improve',
      resourceType: 'prompt',
      metadata: {
        iterations: result.iterations.length,
        stopReason: result.stopReason,
        initialScore: result.initialScore,
        finalScore: result.finalScore,
        netGain: result.netGain,
        usedLlmJudge: !!llmSecondOpinion,
      },
      ip: req.ip ?? undefined,
    });

    res.json({
      ...result,
      llmSecondOpinion,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Improve failed';
    res.status(500).json({ error: msg });
  }
});

/** POST /v1/prompt/pairwise — iki prompt'u heuristik + (opsiyonel) LLM judge ile karsilastir */
router.post('/prompt/pairwise', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const { promptA, promptB, useLlmJudge, domainId, framework, reasoning } = req.body ?? {};
    if (typeof promptA !== 'string' || typeof promptB !== 'string') {
      return res.status(400).json({ error: 'promptA and promptB (string) required' });
    }
    const opts = { domainId, framework, reasoning };
    const heuristic = judgePairwise(promptA, promptB, opts);

    let llm: Awaited<ReturnType<typeof judgePairwiseLLM>> | null = null;
    if (useLlmJudge === true) {
      const chat = getDefaultJudgeChat();
      if (!chat) {
        return res.status(400).json({
          error: 'useLlmJudge=true but no LLM API key configured',
          code: 'MISSING_PROVIDER_KEY',
        });
      }
      llm = await judgePairwiseLLM(promptA, promptB, chat, opts);
    }

    res.json({ heuristic, llm });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Pairwise failed';
    res.status(500).json({ error: msg });
  }
});

export default router;
