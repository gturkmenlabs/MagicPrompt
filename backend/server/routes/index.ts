import { Router } from 'express';
import path from 'path';
import { generateMasterPromptServer } from '../lib/generateAdapter';
import { analyzeIntentServer } from '../lib/intentAnalyzer';
import { getPromptStore } from '../store/promptStore';
import { validateApiKey } from '../lib/keyManager';
import { Framework } from '@/types';
import { optionalApiKey, requireApiScope } from '../middleware/auth';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { generateRateLimiter, apiRateLimiter } from '../middleware/rateLimit';
import { validateBody, GenerateRequestSchema, EnrichRequestSchema, OptimizeRequestSchema } from '../middleware/validation';
import paymentRouter from './payment';
import iyzicoRouter from './iyzico';
import runsRouter from './runs';
import qualityRouter from './quality';
import authRouter from './auth';
import builderRouter from './builder';
import agentRouter from './agent';
import vectorSearchRouter from './vectorSearch';
import ragRouter from './rag';
import regressionRouter from './regression';
import teamRouter from './team';
import packsRouter from './packs';
import scimRouter from './scim';
import previewRouter from './preview';
import templatesRouter from './templates';
import docsRouter from './docs';
import finetuneRouter from './finetune';
import keysRouter from './keys';
import promptImproveRouter from './promptImprove';
import { getPool } from '../db/client';
import { writeAuditLog } from '../lib/auditLog';
import { enrichMasterPrompt } from '../lib/enrichment';
import { analyzeWithLangExtract } from '../lib/langextract/client';
import { requirePermission } from '../middleware/rbac';
import { analyzeRiskDiff } from '@/services/riskDiffAnalyzer';
import { signRelease, verifyRelease, getProvenanceChain } from '../lib/signedRelease';
import type { AuthUser } from '../middleware/supabaseAuth';
import { parsePromptDSLFromContent } from '../../../shared/dsl/parser';
import { compileAndSave } from '../../../shared/compilers/dslCompiler';
import { getOllamaModelCatalog, resolveOllamaModelSelection } from '../lib/ollamaCatalog';
import { getOpenRouterModelCatalog } from '../lib/openRouterCatalog';
import { OLLAMA_AUTO_BEST_CLOUD, OLLAMA_DEFAULT_LOCAL_MODEL } from '@/lib/ollamaModels';
import { getSelfLearningStats, recordSelfLearningEvent } from '../lib/selfLearning';
import { generateFalImageServer, generateFalSpeechServer, listFalModelsServer } from '../lib/falClient';

const router = Router();
router.use(authRouter);
router.use(paymentRouter);
router.use(iyzicoRouter);
router.use(runsRouter);
router.use(qualityRouter);
router.use(builderRouter);
router.use(agentRouter);
router.use(vectorSearchRouter);
router.use(ragRouter);
router.use(regressionRouter);
router.use(teamRouter);
router.use(packsRouter);
router.use(scimRouter);
router.use('/preview', previewRouter);
router.use('/templates', templatesRouter);
router.use('/docs', docsRouter);
router.use(finetuneRouter);
router.use(keysRouter);
router.use(promptImproveRouter);
const promptStore = getPromptStore();

function getValidKeys(): Set<string> {
  return new Set(
    (process.env.API_KEYS ?? '')
      .replace(/\r/g, '')
      .split(',')
      .map((k: string) => k.trim())
      .filter(Boolean)
  );
}

// Auth: JWT veya API key kabul eder. DISABLE_API_KEY_AUTH=true → bypass.
const withKey = [optionalApiKey]; // Rate limit key for (apiKey veya IP)

const FRAMEWORKS = Object.values(Framework);
const PROMPTS_DIR = path.resolve(process.cwd(), 'prompts');

function resolveCompileInputPath(filePath: string): string | null {
  const normalized = String(filePath).trim();
  if (!normalized) return null;

  const absolute = path.isAbsolute(normalized)
    ? path.resolve(normalized)
    : path.resolve(process.cwd(), normalized);

  const rel = path.relative(PROMPTS_DIR, absolute);
  const isUnderPrompts = rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
  if (!isUnderPrompts) return null;
  if (!absolute.toLowerCase().endsWith('.prompt')) return null;

  return absolute;
}

/** POST /v1/generate — Master prompt uretir (x-api-key + rate limit) */
router.post('/generate', ...withKey, generateRateLimiter, requireAnyAuth, requireApiScope('generate:write'), validateBody(GenerateRequestSchema), async (req, res) => {
  try {
    const { intent, framework, domainId, provider, language, outputFormat, useSearch, thinkingMode, systemPrompt, styleContext, attachments, contextRules, openRouterModel, ollamaMode, ollamaModel, enrichment } = req.body;
    const orgId = (req as any).tenantId ?? null;
    const result = await generateMasterPromptServer({
      intent,
      framework,
      domainId,
      orgId,
      provider,
      language,
      outputFormat,
      useSearch,
      thinkingMode,
      systemPrompt,
      styleContext,
      attachments,
      contextRules,
      openRouterModel,
      ollamaMode,
      ollamaModel,
    });

    // Optional post-generation enrichment
    const enrichMode = enrichment?.mode;
    if (enrichMode && enrichMode !== 'off' && result.masterPrompt) {
      try {
        const enrichResult = await enrichMasterPrompt(result.masterPrompt, {
          domainId: typeof domainId === 'string' ? domainId : undefined,
          framework,
          config: { mode: enrichMode === 'deep' ? 'deep' : 'fast' },
        });
        if (enrichment?.autoApply && enrichResult.integratedPrompts.length > 0) {
          result.masterPrompt = enrichResult.enrichedPrompt;
        }
        (result as any).enrichment = enrichResult;
      } catch (enrichErr: any) {
        console.warn(`[Generate] Enrichment step failed: ${enrichErr.message}`);
      }
    }

    // Audit log
    const pool = getPool();
    await writeAuditLog(pool, {
      action: 'generate',
      resourceType: 'prompt',
      metadata: {
        framework,
        domainId,
        requestedProvider: provider,
        resolvedProvider: result.resolvedProvider ?? provider,
        resolvedModel: result.resolvedModel ?? null,
        enrichMode: enrichMode ?? 'off',
      },
      ip: req.ip ?? undefined,
    });

    // Continuous self-learning loop: record every generation event.
    // This enables project-level adaptive memory that influences future outputs.
    try {
      recordSelfLearningEvent({
        intent,
        framework,
        domainId,
        provider: result.resolvedProvider ?? provider,
        language: (language === 'tr' ? 'tr' : 'en'),
        outputFormat: outputFormat ?? 'auto',
        useSearch: Boolean(useSearch),
        thinkingMode: Boolean(thinkingMode),
        agentBlueprintMode: /agent_blueprint_mode\s*=\s*on/i.test(String(contextRules ?? '')),
        result,
      });
    } catch {
      // Non-blocking learning write.
    }

    res.json(result);
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Generation failed';
    const missingKey =
      /no api key configured/i.test(msg) ||
      /all providers failed/i.test(msg);
    if (missingKey) {
      res.status(400).json({ error: msg, code: 'MISSING_PROVIDER_KEY' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

/** POST /v1/fal/image — fal.ai image generation proxy */
router.post('/fal/image', ...withKey, generateRateLimiter, requireAnyAuth, requireApiScope('generate:write'), async (req, res) => {
  try {
    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    const modelId = typeof req.body?.modelId === 'string' ? req.body.modelId.trim() : 'fal-ai/flux/schnell';
    const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
    if (!apiKey) return res.status(400).json({ error: 'apiKey is required' });
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const out = await generateFalImageServer({ apiKey, modelId, prompt });
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'fal.ai image generation failed' });
  }
});

/** GET /v1/fal/models — fal.ai model catalog proxy */
router.get('/fal/models', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const apiKey = typeof req.query?.apiKey === 'string' ? req.query.apiKey.trim() : '';
    const statusParam = typeof req.query?.status === 'string' ? req.query.status.trim().toLowerCase() : 'active';
    const status = statusParam === 'deprecated' || statusParam === 'all' ? statusParam : 'active';
    const q = typeof req.query?.q === 'string' ? req.query.q : '';
    const category = typeof req.query?.category === 'string' ? req.query.category : '';
    if (!apiKey) return res.status(400).json({ error: 'apiKey is required' });

    const out = await listFalModelsServer({
      apiKey,
      status: status as 'active' | 'deprecated' | 'all',
      q,
      category,
      limitPerPage: 100,
      maxPages: 20,
    });
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'fal.ai models fetch failed' });
  }
});

/** POST /v1/fal/speech — fal.ai speech generation proxy */
router.post('/fal/speech', ...withKey, generateRateLimiter, requireAnyAuth, requireApiScope('generate:write'), async (req, res) => {
  try {
    const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
    const modelId = typeof req.body?.modelId === 'string' ? req.body.modelId.trim() : 'fal-ai/playai/tts';
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    const voice = typeof req.body?.voice === 'string' ? req.body.voice.trim() : undefined;
    if (!apiKey) return res.status(400).json({ error: 'apiKey is required' });
    if (!text) return res.status(400).json({ error: 'text is required' });

    const out = await generateFalSpeechServer({ apiKey, modelId, text, voice });
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'fal.ai speech generation failed' });
  }
});

/** GET /v1/learning/stats — Continuous learning status */
router.get('/learning/stats', ...withKey, apiRateLimiter, requireAnyAuth, (_req, res) => {
  try {
    res.json({
      ok: true,
      ...getSelfLearningStats(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Learning stats failed' });
  }
});

/** POST /v1/brain/execute — Brain operation execution */
router.post('/brain/execute', ...withKey, apiRateLimiter, requireAnyAuth, requireApiScope('generate:write'), async (req, res) => {
  try {
    const { operation, payload } = req.body ?? {};
    if (operation === 'analyze_intent') {
      const body = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
      const prompt = typeof body.prompt === 'string' ? body.prompt : '';
      if (!prompt.trim()) {
        return res.status(400).json({ error: 'payload.prompt is required', code: 'INVALID_PAYLOAD' });
      }
      const result = await analyzeIntentServer(
        prompt,
        typeof body.domainId === 'string' ? body.domainId : undefined,
        typeof body.framework === 'string' ? body.framework : undefined,
      );
      return res.json({ operation, ok: true, result });
    }
    // Fallback/stub for other operations
    res.json({ operation, ok: true, result: {} });
  } catch (e: any) {
    const msg = typeof e?.message === 'string' ? e.message : 'Brain execute failed';
    const missingKey =
      /no api key configured/i.test(msg) ||
      /all providers failed/i.test(msg);
    if (missingKey) {
      res.status(400).json({ error: msg, code: 'MISSING_PROVIDER_KEY' });
      return;
    }
    res.status(500).json({ error: msg });
  }
});

/** GET /v1/ollama/models — Ollama local+cloud model katalogu */
router.get('/ollama/models', ...withKey, apiRateLimiter, requireAnyAuth, async (_req, res) => {
  try {
    const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    const catalog = await getOllamaModelCatalog(ollamaUrl);
    res.json(catalog);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Failed to load Ollama models' });
  }
});

/** GET /v1/openrouter/models — OpenRouter dinamik model katalogu (10dk cache). */
router.get('/openrouter/models', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const force = req.query.force === 'true' || req.query.force === '1';
    const catalog = await getOpenRouterModelCatalog({ force });
    res.json(catalog);
  } catch (e: any) {
    res.status(502).json({ error: e?.message ?? 'Failed to load OpenRouter models' });
  }
});

/** POST /v1/ollama/generate — Ollama local/cloud raw generation proxy */
router.post('/ollama/generate', ...withKey, generateRateLimiter, requireAnyAuth, requireApiScope('generate:write'), async (req, res) => {
  try {
    const systemPrompt = typeof req.body?.systemPrompt === 'string' ? req.body.systemPrompt : '';
    const userPrompt = typeof req.body?.userPrompt === 'string' ? req.body.userPrompt : '';
    const mode: 'local' | 'cloud' = req.body?.mode === 'local' ? 'local' : 'cloud';
    const requestedModel = typeof req.body?.model === 'string' ? req.body.model : undefined;
    const temperature = Number.isFinite(req.body?.options?.temperature)
      ? Number(req.body.options.temperature)
      : 0.2;
    const numPredict = Number.isFinite(req.body?.options?.num_predict)
      ? Math.max(256, Math.min(16384, Number(req.body.options.num_predict)))
      : 8192;

    if (!userPrompt.trim()) {
      return res.status(400).json({ error: 'userPrompt is required' });
    }

    const ollamaUrl = process.env.OLLAMA_URL ?? 'http://localhost:11434';
    const defaultLocalModel = process.env.OLLAMA_TEXT_MODEL ?? OLLAMA_DEFAULT_LOCAL_MODEL;
    const defaultCloudModel = process.env.OLLAMA_CLOUD_MODEL ?? OLLAMA_AUTO_BEST_CLOUD;
    const { model } = await resolveOllamaModelSelection({
      ollamaUrl,
      mode,
      requestedModel,
      defaultLocalModel,
      defaultCloudModel,
    });

    const ollamaRes = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        stream: false,
        options: {
          temperature,
          num_predict: numPredict,
        },
      }),
    });

    if (!ollamaRes.ok) {
      const err = await ollamaRes.text();
      throw new Error(`Ollama API ${ollamaRes.status}: ${err.slice(0, 300)}`);
    }

    const data = await ollamaRes.json().catch(() => ({}));
    const response = typeof data?.response === 'string'
      ? data.response
      : (typeof data?.message?.content === 'string' ? data.message.content : '');

    if (!response) {
      throw new Error('Empty Ollama response');
    }

    res.json({ response, model, mode });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Ollama proxy failed' });
  }
});

/** POST /v1/optimize — .prompt DSL icerigini parse edip generate pipeline ile optimize & judge */
router.post('/optimize', ...withKey, generateRateLimiter, requireAnyAuth, requireApiScope('generate:write'), validateBody(OptimizeRequestSchema), async (req, res) => {
  try {
    const { content, provider } = req.body;
    const dsl = parsePromptDSLFromContent(content);
    const fwStr = String(dsl.meta.framework).toUpperCase();
    const framework = FRAMEWORKS.includes(fwStr as Framework) ? (fwStr as Framework) : Framework.AUTO;
    const result = await generateMasterPromptServer({
      intent: dsl.intent,
      framework,
      domainId: dsl.meta.domain,
      orgId: (req as any).tenantId ?? null,
      provider: provider ?? 'auto',
      contextRules: dsl.style?.tone ? `Tone: ${dsl.style.tone}. ${dsl.style.length ? `Length: ${dsl.style.length}` : ''}` : undefined,
    });
    res.json(result);
  } catch (e: any) {
    res.status(400).json({ error: e?.message ?? 'Optimize failed' });
  }
});

/** POST /v1/compile-dsl — .prompt dosyasini derleyip prompts/compiled'a kaydeder */
router.post('/compile-dsl', ...withKey, generateRateLimiter, requireAnyAuth, requireApiScope('generate:write'), async (req, res) => {
  try {
    const { filePath } = req.body ?? {};
    if (!filePath || typeof filePath !== 'string') {
      return res.status(400).json({ error: 'filePath (string) required' });
    }
    const safeInputPath = resolveCompileInputPath(filePath);
    if (!safeInputPath) {
      return res.status(400).json({ error: 'filePath must be a .prompt file under /prompts' });
    }
    const result = await compileAndSave(safeInputPath);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Compile failed' });
  }
});

/** POST /v1/enrich — Master prompt zenginlestirme (kutuphaneden otomatik tamamlama) */
router.post('/enrich', ...withKey, generateRateLimiter, requireAnyAuth, requireApiScope('generate:write'), validateBody(EnrichRequestSchema), async (req, res) => {
  try {
    const { masterPrompt, domainId, framework, mode, config } = req.body;
    const result = await enrichMasterPrompt(masterPrompt, {
      domainId,
      framework,
      config: { mode, ...config },
    });

    const pool = getPool();
    await writeAuditLog(pool, {
      action: 'enrich',
      resourceType: 'prompt',
      metadata: { mode, domainId, gapsFound: result.metrics.gapsFound, promptsIntegrated: result.metrics.promptsIntegrated },
      ip: req.ip ?? undefined,
    });

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Enrichment failed' });
  }
});

/** POST /v1/langextract/analyze — langextract-main ile prompt analizi (opsiyonel) */
router.post('/langextract/analyze', ...withKey, apiRateLimiter, requireAnyAuth, requireApiScope('generate:write'), async (req, res) => {
  try {
    const { text } = req.body ?? {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'text (string) required' });
    }
    const result = await analyzeWithLangExtract(text.slice(0, 20000));
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'LangExtract analyze failed' });
  }
});

/** GET /v1/prompts — Tum promptlari listeler (auth + rate limit + pagination). Multi-tenant: orgId ileride req.tenantId ile gecer. */
router.get('/prompts', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const orgId = (req as any).tenantId ?? null;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 24;
    const search = req.query.search as string;
    const category = req.query.category as string;

    const listOptions = { orgId, page, limit, search, category };
    const [list, total] = await Promise.all([
      promptStore.list(listOptions),
      promptStore.count(listOptions)
    ]);

    res.json({ prompts: list, total, page, limit });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'List failed' });
  }
});

/** GET /v1/prompts/:id?version= — Tek prompt (opsiyonel version) */
router.get('/prompts/:id', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const version = req.query.version as string | undefined;
    const orgId = (req as any).tenantId ?? null;
    const prompt = await promptStore.get(req.params.id as string, version, orgId);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    res.json(prompt);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Get failed' });
  }
});

/** POST /v1/prompts — Prompt kaydeder (version ile) */
router.post('/prompts', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const { id, version, name, masterPrompt, reasoning, meta } = req.body ?? {};
    if (!id || !version || !masterPrompt) {
      return res.status(400).json({ error: 'id, version, masterPrompt required' });
    }
    const orgId = (req as any).tenantId ?? null;
    const source = (req.body?.source as string) || 'dashboard';
    const saved = await promptStore.save({
      id: String(id),
      version: String(version),
      name,
      masterPrompt: String(masterPrompt),
      reasoning,
      meta,
      source: source as 'dashboard' | 'imported' | 'api',
    }, orgId);
    res.status(201).json(saved);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Save failed' });
  }
});

/** GET /v1/prompts/:id/versions — Prompt'un tum versiyonlarini listeler */
router.get('/prompts/:id/versions', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const orgId = (req as any).tenantId ?? null;
    const versions = await promptStore.listVersions(req.params.id as string, orgId);
    if (versions.length === 0) return res.status(404).json({ error: 'Prompt not found' });
    res.json({ id: req.params.id, versions });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'ListVersions failed' });
  }
});

/** GET /v1/prompts/:id/diff?v1=x&v2=y — Iki versiyon arasinda diff */
router.get('/prompts/:id/diff', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const orgId = (req as any).tenantId ?? null;
    const v1 = req.query.v1 as string;
    const v2 = req.query.v2 as string;
    if (!v1 || !v2) return res.status(400).json({ error: 'v1 and v2 query params required' });

    const [prompt1, prompt2] = await Promise.all([
      promptStore.get(req.params.id as string, v1, orgId),
      promptStore.get(req.params.id as string, v2, orgId),
    ]);
    if (!prompt1 || !prompt2) return res.status(404).json({ error: 'One or both versions not found' });

    // Line-by-line diff
    const lines1 = prompt1.masterPrompt.split('\n');
    const lines2 = prompt2.masterPrompt.split('\n');
    const maxLen = Math.max(lines1.length, lines2.length);
    const changes: Array<{ line: number; type: 'added' | 'removed' | 'changed' | 'unchanged'; old?: string; new?: string; content?: string }> = [];

    for (let i = 0; i < maxLen; i++) {
      const l1 = lines1[i];
      const l2 = lines2[i];
      if (l1 === undefined) {
        changes.push({ line: i + 1, type: 'added', new: l2 });
      } else if (l2 === undefined) {
        changes.push({ line: i + 1, type: 'removed', old: l1 });
      } else if (l1 !== l2) {
        changes.push({ line: i + 1, type: 'changed', old: l1, new: l2 });
      } else {
        changes.push({ line: i + 1, type: 'unchanged', content: l1 });
      }
    }

    const stats = {
      added: changes.filter(c => c.type === 'added').length,
      removed: changes.filter(c => c.type === 'removed').length,
      changed: changes.filter(c => c.type === 'changed').length,
      unchanged: changes.filter(c => c.type === 'unchanged').length,
    };

    res.json({
      id: req.params.id,
      from: { version: v1, createdAt: prompt1.createdAt, meta: prompt1.meta },
      to: { version: v2, createdAt: prompt2.createdAt, meta: prompt2.meta },
      changes,
      stats,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Diff failed' });
  }
});

/** GET /v1/prompts/:id/diff/export?format=mermaid|html&v1=x&v2=y — Diff Mermaid veya HTML onizleme */
router.get('/prompts/:id/diff/export', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const orgId = (req as any).tenantId ?? null;
    const v1 = req.query.v1 as string;
    const v2 = req.query.v2 as string;
    const format = ((req.query.format as string) || 'mermaid').toLowerCase();
    if (!v1 || !v2) return res.status(400).json({ error: 'v1 and v2 query params required' });
    if (format !== 'mermaid' && format !== 'html') return res.status(400).json({ error: 'format must be mermaid or html' });

    const [prompt1, prompt2] = await Promise.all([
      promptStore.get(req.params.id as string, v1, orgId),
      promptStore.get(req.params.id as string, v2, orgId),
    ]);
    if (!prompt1 || !prompt2) return res.status(404).json({ error: 'One or both versions not found' });

    const lines1 = prompt1.masterPrompt.split('\n');
    const lines2 = prompt2.masterPrompt.split('\n');
    const maxLen = Math.max(lines1.length, lines2.length);
    const changes: Array<{ line: number; type: 'added' | 'removed' | 'changed' | 'unchanged'; old?: string; new?: string; content?: string }> = [];
    for (let i = 0; i < maxLen; i++) {
      const l1 = lines1[i];
      const l2 = lines2[i];
      if (l1 === undefined) changes.push({ line: i + 1, type: 'added', new: l2 });
      else if (l2 === undefined) changes.push({ line: i + 1, type: 'removed', old: l1 });
      else if (l1 !== l2) changes.push({ line: i + 1, type: 'changed', old: l1, new: l2 });
      else changes.push({ line: i + 1, type: 'unchanged', content: l1 });
    }

    const escape = (s: string) => s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

    if (format === 'mermaid') {
      const lines: string[] = ['graph LR', '  subgraph v' + v1, '    A[Version ' + v1 + ']', '  end', '  subgraph v' + v2, '    B[Version ' + v2 + ']', '  end', '  A -->|diff| B'];
      const added = changes.filter(c => c.type === 'added').length;
      const removed = changes.filter(c => c.type === 'removed').length;
      const changed = changes.filter(c => c.type === 'changed').length;
      lines.push('  subgraph Degisiklikler');
      lines.push('    C["+ ' + added + ' satir"]');
      lines.push('    D["- ' + removed + ' satir"]');
      lines.push('    E["~ ' + changed + ' satir"]');
      lines.push('  end');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(lines.join('\n'));
    }

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Diff v${v1} → v${v2}</title>
<style>body{font-family:monospace;background:#0a0a0f;color:#e2e8f0;padding:1rem;}.add{color:#22c55e;}.rem{color:#ef4444;}.chg{color:#eab308;}.unch{color:#64748b;}
pre{margin:0.25em 0;white-space:pre-wrap;word-break:break-all;}</style></head><body>
<h2>Diff: ${escape(req.params.id as string)} v${v1} → v${v2}</h2>
<div class="diff">${changes.map(c => {
      if (c.type === 'added') return `<pre class="add">+ ${escape(c.new ?? '')}</pre>`;
      if (c.type === 'removed') return `<pre class="rem">- ${escape(c.old ?? '')}</pre>`;
      if (c.type === 'changed') return `<pre class="chg">~ ${escape(c.old ?? '')}\n→ ${escape(c.new ?? '')}</pre>`;
      return `<pre class="unch">  ${escape(c.content ?? '')}</pre>`;
    }).join('')}</div></body></html>`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Export failed' });
  }
});

/** DELETE /v1/prompts/:id?version= — Prompt siler (admin+ only) */
router.delete('/prompts/:id', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('prompt:delete'), async (req, res) => {
  try {
    const version = req.query.version as string | undefined;
    const orgId = (req as any).tenantId ?? null;
    const ok = await promptStore.delete(req.params.id as string, version, orgId);
    if (!ok) return res.status(404).json({ error: 'Prompt not found' });
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Delete failed' });
  }
});

/** POST /v1/auth/validate — API key dogrula (BYOK/Managed); OpenAPI auth/validate */
router.post('/auth/validate', (req, res) => {
  const key = (req.header('x-api-key') ?? req.body?.['x-api-key']) ?? '';
  const result = validateApiKey(key, req, {
    byok: { validKeys: getValidKeys() },
  });
  if (!result.valid) {
    if (result.rateLimitExceeded) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        code: result.code,
        rateLimitExceeded: true,
      });
    }
    return res.status(401).json({
      error: result.code === 'MISSING_API_KEY' ? 'Missing x-api-key' : 'Invalid API key',
      code: result.code ?? 'INVALID_API_KEY',
    });
  }
  res.json({
    valid: true,
    mode: result.mode,
    orgId: result.orgId ?? undefined,
    plan: result.plan ?? 'free',
  });
});

/** GET /v1/orgs/:orgId/prompts — Tenant (org) promptlarini listele; tenant izolasyonu */
router.get('/orgs/:orgId/prompts', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const orgId = req.params.orgId as string;
    const tenantId = (req as any).tenantId as string | null | undefined;
    if (!tenantId || orgId !== tenantId) {
      return res.status(403).json({ error: 'Forbidden org access', code: 'FORBIDDEN_ORG' });
    }
    const list = await promptStore.list({ orgId });
    res.json({ prompts: list });
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'List failed' });
  }
});

/** POST /v1/prompts/:id/diff/risk — Risk diff analysis for two versions */
router.post('/prompts/:id/diff/risk', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const orgId = (req as any).tenantId ?? null;
    const { v1, v2 } = req.body ?? {};
    if (!v1 || !v2) return res.status(400).json({ error: 'v1 and v2 required in body' });

    const [prompt1, prompt2] = await Promise.all([
      promptStore.get(req.params.id as string, v1, orgId),
      promptStore.get(req.params.id as string, v2, orgId),
    ]);
    if (!prompt1 || !prompt2) return res.status(404).json({ error: 'One or both versions not found' });

    // Generate diff changes
    const lines1 = prompt1.masterPrompt.split('\n');
    const lines2 = prompt2.masterPrompt.split('\n');
    const maxLen = Math.max(lines1.length, lines2.length);
    const changes: Array<{ line: number; type: 'added' | 'removed' | 'changed' | 'unchanged'; old?: string; new?: string; content?: string }> = [];
    for (let i = 0; i < maxLen; i++) {
      const l1 = lines1[i];
      const l2 = lines2[i];
      if (l1 === undefined) changes.push({ line: i + 1, type: 'added', new: l2 });
      else if (l2 === undefined) changes.push({ line: i + 1, type: 'removed', old: l1 });
      else if (l1 !== l2) changes.push({ line: i + 1, type: 'changed', old: l1, new: l2 });
      else changes.push({ line: i + 1, type: 'unchanged', content: l1 });
    }

    const riskResult = analyzeRiskDiff(v1, v2, changes, prompt1.masterPrompt, prompt2.masterPrompt);
    res.json(riskResult);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Risk diff analysis failed' });
  }
});

/** POST /v1/prompts/:id/versions/:ver/sign — Sign a version for release */
router.post('/prompts/:id/versions/:ver/sign', ...withKey, apiRateLimiter, requireAnyAuth, requirePermission('version:promote'), async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  const user = (req as any).authUser as AuthUser | undefined;
  if (!user?.userId) return res.status(401).json({ error: 'Authentication required' });

  try {
    const orgId = (req as any).tenantId ?? null;
    const promptId = req.params.id as string;
    const version = req.params.ver as string;
    const prompt = await promptStore.get(promptId, version, orgId);
    if (!prompt) return res.status(404).json({ error: 'Prompt version not found' });

    const metadata = req.body?.metadata ?? {};
    const result = await signRelease(pool, promptId, version, prompt.masterPrompt, user.userId, user.email ?? undefined, metadata);

    if (!result.success) return res.status(500).json({ error: result.error });
    res.status(201).json(result.signature);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Signing failed' });
  }
});

/** GET /v1/prompts/:id/versions/:ver/verify — Verify release signature */
router.get('/prompts/:id/versions/:ver/verify', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  try {
    const orgId = (req as any).tenantId ?? null;
    const promptId = req.params.id as string;
    const version = req.params.ver as string;
    const prompt = await promptStore.get(promptId, version, orgId);
    if (!prompt) return res.status(404).json({ error: 'Prompt version not found' });

    const result = await verifyRelease(pool, promptId, version, prompt.masterPrompt);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Verification failed' });
  }
});

/** GET /v1/prompts/:id/provenance — Get provenance chain */
router.get('/prompts/:id/provenance', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  const pool = getPool();
  if (!pool) return res.status(503).json({ error: 'Database not available' });

  try {
    const promptId = req.params.id as string;
    const chain = await getProvenanceChain(pool, promptId);
    res.json(chain);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Provenance chain failed' });
  }
});

/** GET /v1/health */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'super-reasoning-api' });
});

export default router;
