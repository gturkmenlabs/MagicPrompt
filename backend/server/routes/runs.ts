/**
 * Runs API — async/sync workflow calistirma, run history.
 * DB gerekli (getPool). SR_USE_DB_STORE=true ve DATABASE_URL olmali.
 */

import { Router } from 'express';
import { getPool } from '../db/client';
import { runWorkflow } from '@/services/orchestrator';
import { generateMasterPromptServer } from '../lib/generateAdapter';
import { recordRunUsage, getUsageForOrg } from '../lib/usage';
import { compressIntent } from '@/utils/compressIntent';
import { WORKFLOW_PRESETS } from '@/data/workflows';
import { Framework } from '@/types';
import { optionalApiKey } from '../middleware/auth';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { generateRateLimiter, apiRateLimiter } from '../middleware/rateLimit';

const router = Router();

const FRAMEWORKS = Object.values(Framework);
const PROVIDERS = ['groq', 'gemini', 'huggingface', 'claude', 'claude-opus', 'openrouter', 'mistral'];
const PRESET_IDS = WORKFLOW_PRESETS.map((p) => p.id);

function resolveOrgId(req: unknown): string | null {
  const r = req as any;
  return r?.tenantId ?? r?.authUser?.orgId ?? process.env.SR_DEFAULT_ORG_ID ?? null;
}

/** POST /v1/runs — Run start (senkron MVP; workflow hemen calisir) */
router.post(
  '/runs',
  optionalApiKey,
  generateRateLimiter,
  requireAnyAuth,
  async (req, res) => {
    const pool = getPool();
    if (!pool) {
      return res.status(503).json({ error: 'Database required. Set DATABASE_URL and SR_USE_DB_STORE=true.' });
    }

    const orgId = resolveOrgId(req);
    if (!orgId) {
      return res.status(400).json({
        error: 'Tenant context not found',
        code: 'ORG_REQUIRED',
      });
    }

    const {
      intent,
      framework,
      domainId,
      provider,
      projectId,
      workflowPreset,
      contextRules,
      openRouterModel,
    } = req.body ?? {};

    if (!intent || typeof intent !== 'string') {
      return res.status(400).json({ error: 'intent (string) required' });
    }

    const fw = FRAMEWORKS.includes(framework) ? framework : Framework.AUTO;
    const prov = PROVIDERS.includes(provider) ? provider : 'groq';
    const presetId = PRESET_IDS.includes(workflowPreset) ? workflowPreset : 'quick';
    const preset = WORKFLOW_PRESETS.find((p) => p.id === presetId) ?? WORKFLOW_PRESETS[0];
    if (!preset) {
      return res.status(500).json({ error: 'No workflow presets configured' });
    }
    const intentClean = String(intent).slice(0, 50000);
    const intentCompressed = compressIntent(intentClean);

    let runId: string;
    try {
      const insertResult = await pool.query(
        `INSERT INTO runs (org_id, project_id, intent, intent_raw, intent_compressed, framework, domain_id, provider, status)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7, $8, 'running')
         RETURNING id`,
        [
          orgId,
          projectId || null,
          intentClean,
          intentClean,
          intentCompressed,
          fw,
          domainId || 'auto',
          prov,
        ]
      );
      runId = insertResult.rows[0].id;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to create run';
      return res.status(500).json({ error: msg });
    }

    const provTyped = prov as 'groq' | 'gemini' | 'huggingface' | 'claude' | 'claude-opus' | 'openrouter' | 'mistral';
    const generateFn = async (
      intentArg: string,
      frameworkArg: Framework,
      domainIdArg: string,
      _useSearch: boolean,
      _thinkingMode: boolean,
      contextRulesArg: string
    ) => {
      return generateMasterPromptServer({
        intent: intentArg,
        framework: frameworkArg,
        domainId: domainIdArg,
        provider: provTyped,
        contextRules: contextRulesArg,
        openRouterModel: typeof openRouterModel === 'string' ? openRouterModel : undefined,
      });
    };

    try {
      const result = await runWorkflow({
        steps: preset.steps,
        initialIntent: intentClean,
        framework: fw,
        domainId: domainId || 'auto',
        provider: prov,
        contextRules: contextRules ?? 'General software development.',
        generateFn,
      });

      const stepOutputs = result.stepResults.map((s) => ({
        step: s.step,
        label: s.label,
        output: s.output,
        testPass: s.testPass,
      }));

      await pool.query(
        `UPDATE runs SET status = $1, step_outputs = $2, model = $3
         WHERE id = $4::uuid`,
        [result.error ? 'failed' : 'completed', JSON.stringify(stepOutputs), prov, runId]
      );

      await recordRunUsage(pool, orgId, 1, 0);

      return res.status(202).json({
        runId,
        status: result.error ? 'failed' : 'completed',
        stepResults: result.stepResults,
        finalPrompt: result.finalPrompt,
        error: result.error,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Workflow failed';
      await pool.query(`UPDATE runs SET status = 'failed' WHERE id = $1::uuid`, [runId]);
      return res.status(500).json({ error: msg });
    }
  }
);

/** GET /v1/runs/:id — Tek run detayi */
router.get('/runs/:id', optionalApiKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ error: 'Database required' });
  }

  const orgId = resolveOrgId(req);
  const runId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT id, org_id, project_id, intent, intent_compressed, framework, domain_id, provider, model, status, step_outputs, timings, cost_estimate, token_usage, request_usage, created_at
       FROM runs WHERE id = $1::uuid AND org_id = $2::uuid`,
      [runId, orgId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }

    const row = result.rows[0];
    res.json({
      runId: row.id,
      orgId: row.org_id,
      projectId: row.project_id,
      intent: row.intent,
      intentCompressed: row.intent_compressed,
      framework: row.framework,
      domainId: row.domain_id,
      provider: row.provider,
      model: row.model,
      status: row.status,
      stepOutputs: row.step_outputs,
      timings: row.timings,
      costEstimate: row.cost_estimate,
      tokenUsage: parseInt(String(row.token_usage), 10),
      requestUsage: parseInt(String(row.request_usage), 10),
      createdAt: row.created_at,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch run';
    res.status(500).json({ error: msg });
  }
});

/** GET /v1/runs — Run listesi (projectId filtresi) */
router.get('/runs', optionalApiKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ error: 'Database required' });
  }

  const orgId = resolveOrgId(req);
  const projectId = req.query.projectId as string | undefined;

  try {
    let query = `SELECT id, org_id, project_id, intent_compressed, framework, domain_id, provider, status, created_at
                 FROM runs WHERE org_id = $1::uuid`;
    const params: (string | null)[] = [orgId];

    if (projectId) {
      query += ` AND project_id = $2::uuid`;
      params.push(projectId);
    }

    query += ` ORDER BY created_at DESC LIMIT 100`;

    const result = await pool.query(query, params);

    res.json({
      runs: result.rows.map((r) => ({
        runId: r.id,
        projectId: r.project_id,
        intentCompressed: r.intent_compressed?.slice(0, 200),
        framework: r.framework,
        domainId: r.domain_id,
        provider: r.provider,
        status: r.status,
        createdAt: r.created_at,
      })),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to list runs';
    res.status(500).json({ error: msg });
  }
});

/** GET /v1/usage — Org kullanim ozeti */
router.get('/usage', optionalApiKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  const pool = getPool();
  if (!pool) {
    return res.status(503).json({ error: 'Database required' });
  }

  const orgId = resolveOrgId(req);
  if (!orgId) {
    return res.status(400).json({ error: 'Tenant context not found' });
  }

  try {
    const usage = await getUsageForOrg(pool, orgId);
    if (!usage) {
      return res.json({
        orgId,
        plan: 'free',
        periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
        periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10),
        requestCount: 0,
        tokenCount: 0,
      });
    }
    res.json(usage);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to fetch usage';
    res.status(500).json({ error: msg });
  }
});

export default router;
