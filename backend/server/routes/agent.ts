/**
 * AI Agent Routes — runtime-selectable agent backends.
 * POST /v1/agent/run         — Prompt Library Agent run
 * POST /v1/agent/orchestrate — Tum proje: Orchestrator / project assistant
 * GET  /v1/agent/status      — Agent durumu ve bilgisi
 */

import { Router, Request, Response } from 'express';
import { optionalAnyAuth } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { optionalApiKey } from '../middleware/auth';
import { runPromptAgent, getAgentStatus, type AgentRunContext } from '@/services/agentService';
import { runOrchestrator } from '@/services/multiAgentOrchestrator';
// Qwen agent integration removed

const router = Router();
const withKey = [optionalApiKey];
type AgentRuntime = 'openai';
function resolveRuntime(_value: unknown): AgentRuntime {
  return 'openai';
}

function getSafeContext(context: unknown): AgentRunContext | undefined {
  if (!context || typeof context !== 'object') return undefined;
  const value = context as Record<string, unknown>;

  return {
    currentPrompt: typeof value.currentPrompt === 'string' ? value.currentPrompt : undefined,
    domainId: typeof value.domainId === 'string' ? value.domainId : undefined,
    framework: typeof value.framework === 'string' ? value.framework : undefined,
    analyticsSnapshot: value.analyticsSnapshot && typeof value.analyticsSnapshot === 'object'
      ? value.analyticsSnapshot as AgentRunContext['analyticsSnapshot']
      : undefined,
  };
}

function handleAgentError(res: Response, runtime: AgentRuntime, error: unknown, fallbackMessage: string) {
  const message = error instanceof Error ? error.message : String(error ?? fallbackMessage);

  if (runtime === 'openai' && message.includes('OPENAI_API_KEY')) {
    return res.status(503).json({
      error: 'OpenAI API key not configured',
      code: 'OPENAI_KEY_MISSING',
      hint: 'Set OPENAI_API_KEY in .env',
    });
  }

  // Qwen error handling removed

  return res.status(500).json({ error: message || fallbackMessage });
}

/** POST /v1/agent/run — Agent run (auth opsiyonel; input yapmadan da kullanilabilir) */
router.post('/agent/run', ...withKey, apiRateLimiter, optionalAnyAuth, async (req: Request, res: Response) => {
  try {
    const { query, context, runtime } = req.body ?? {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) required' });
    }

    const agentRuntime = resolveRuntime(runtime);
    const lang = 'en';
    const safeContext = getSafeContext(context);
    const result = await runPromptAgent(query, safeContext);

    res.json({
      query,
      answer: result.answer,
      model: result.model,
      ...('toolCalls' in result ? { toolCalls: result.toolCalls } : {}),
      sdk: '@openai/agents',
      runtime: agentRuntime,
      enrichedPrompt: result.enrichedPrompt,
    });
  } catch (error: unknown) {
    return handleAgentError(res, resolveRuntime(req.body?.runtime), error, 'Agent run failed');
  }
});

/** POST /v1/agent/orchestrate — Tum projeyi agent'lara baglayan input noktasi (routing + prompt agent) */
router.post('/agent/orchestrate', ...withKey, apiRateLimiter, optionalAnyAuth, async (req: Request, res: Response) => {
  try {
    const { query, userId, context, runtime } = req.body ?? {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) required' });
    }

    const agentRuntime = resolveRuntime(runtime);
    const uid = typeof userId === 'string' && userId.trim() ? userId.trim() : 'anonymous';
    const language: 'en' = 'en';
    const orchestratorContext = {
      language,
      ...(context && typeof context === 'object' ? context : {}),
    };
    const result = await runOrchestrator(query, uid, orchestratorContext);
    res.json({
      query: result.decision.query,
      answer: result.answer,
      decision: result.decision,
      memory: result.memory,
      sdk: '@openai/agents',
      runtime: agentRuntime,
    });
  } catch (error: unknown) {
    return handleAgentError(res, resolveRuntime(req.body?.runtime), error, 'Orchestrator failed');
  }
});

/** GET /v1/agent/status — Agent durumu (public, sadece metadata) */
router.get('/agent/status', async (req: Request, res: Response) => {
  try {
    const runtime = resolveRuntime(req.query.runtime);
    const status = await getAgentStatus();
    res.json(status);
  } catch (error: unknown) {
    return handleAgentError(res, resolveRuntime(req.query.runtime), error, 'Status failed');
  }
});

export default router;
