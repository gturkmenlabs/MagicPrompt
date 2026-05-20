/**
 * Regression & CI/CD API routes.
 * Contracts, Test Cases, Regression Runs, Version Lifecycle.
 * Auto-detects DB availability; falls back to file-based cicdStore.
 */

import { Router } from 'express';
import { getPool } from '../db/client';
import { optionalApiKey } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import type { AuthUser } from '../middleware/supabaseAuth';
import { requirePermission } from '../middleware/rbac';
import { writeAuditLog } from '../lib/auditLog';
import { validateContract } from '@/services/contractValidator';
import { executeRegressionRun } from '@/services/regressionRunner';
import { getVersionLifecycle, promoteVersion } from '@/services/promptLifecycle';
import { executeRegressionRunLocal } from '@/services/regressionRunnerLocal';
import { getVersionLifecycleLocal, promoteVersionLocal } from '@/services/promptLifecycleLocal';
import * as cicd from '../store/cicdStore';
import { getPromptStore } from '../store/promptStore';
import type { ContractRule, ApprovalStatus, ApprovalVote } from '@/types/regression';
import { DEFAULT_APPROVAL_CONFIG } from '@/types/regression';

const router = Router();
const mw = [optionalApiKey, apiRateLimiter, requireAnyAuth];


// ─── Helper: resolve internal prompt UUID from external_id ────────────────────
async function resolvePromptId(orgId: string | null, externalId: string): Promise<string | null> {
  const effectiveOrgId = orgId || process.env.SR_DEFAULT_ORG_ID || null;
  if (!effectiveOrgId) return null;
  const pool = getPool();
  if (!pool) return null;

  // Try DB lookup first
  const r = await pool.query(
    `SELECT id FROM prompts WHERE org_id = $1::uuid AND external_id = $2`,
    [effectiveOrgId, externalId]
  );
  if (r.rows.length > 0) return r.rows[0].id;

  // Auto-provision: if prompt exists in file store but not in DB, create DB entry
  const store = getPromptStore();
  const prompt = await store.get(externalId);
  if (prompt) {
    const ins = await pool.query(
      `INSERT INTO prompts (org_id, external_id, name, updated_at)
       VALUES ($1::uuid, $2, $3, now())
       ON CONFLICT (org_id, external_id) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, prompts.name), updated_at = now()
       RETURNING id`,
      [effectiveOrgId, externalId, prompt.name ?? null]
    );
    if (ins.rows.length > 0) {
      const internalId = ins.rows[0].id;
      // Sync ALL versions from file store into DB
      const allVersions = await store.listVersions(externalId);
      for (const ver of allVersions) {
        await pool.query(
          `INSERT INTO prompt_versions (prompt_id, version, master_prompt, reasoning, meta, created_at)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz)
           ON CONFLICT (prompt_id, version) DO NOTHING`,
          [internalId, ver.version, ver.masterPrompt, ver.reasoning ?? null,
           ver.meta ? JSON.stringify(ver.meta) : null, ver.createdAt]
        );
      }
      return internalId;
    }
  }

  return null;
}

function getOrgId(req: any): string | null {
  return req.tenantId ?? process.env.SR_DEFAULT_ORG_ID ?? req.authUser?.orgId ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /v1/prompts/:id/contracts — Create/update contract */
router.post('/prompts/:id/contracts', ...mw, async (req, res) => {
  try {
    const { name, description, rules } = req.body ?? {};
    if (!rules || typeof rules !== 'object') {
      return res.status(400).json({ error: 'rules (object) required' });
    }
    const contractName = name || 'default';
    const pool = getPool();
    const orgId = getOrgId(req);

    if (pool && orgId) {
      const promptId = await resolvePromptId(orgId, req.params.id as string);
      if (!promptId) return res.status(404).json({ error: 'Prompt not found' });

      const row = await pool.query(
        `INSERT INTO prompt_contracts (org_id, prompt_id, name, description, rules)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb)
         ON CONFLICT (prompt_id, name) DO UPDATE SET
           description = EXCLUDED.description,
           rules = EXCLUDED.rules,
           updated_at = now()
         RETURNING id, created_at, updated_at`,
        [orgId, promptId, contractName, description || null, JSON.stringify(rules)]
      );

      await writeAuditLog(pool, {
        action: 'contract_save', resourceType: 'contract', resourceId: row.rows[0].id,
        orgId: orgId ?? undefined, metadata: { promptId: req.params.id, name: contractName },
      });

      return res.status(201).json({
        id: row.rows[0].id, promptId: req.params.id, name: contractName,
        description, rules, createdAt: row.rows[0].created_at, updatedAt: row.rows[0].updated_at,
      });
    }

    // File-based fallback
    const contract = cicd.saveContract(req.params.id as string, orgId || 'default', contractName, description, rules as ContractRule);
    res.status(201).json({
      id: contract.id, promptId: req.params.id, name: contractName,
      description, rules, createdAt: contract.createdAt, updatedAt: contract.updatedAt,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Contract save failed' });
  }
});

/** GET /v1/prompts/:id/contracts — List active contracts */
router.get('/prompts/:id/contracts', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);

    if (pool && orgId) {
      const promptId = await resolvePromptId(orgId, req.params.id as string);
      if (!promptId) return res.status(404).json({ error: 'Prompt not found' });

      const result = await pool.query(
        `SELECT id, name, description, rules, is_active, created_at, updated_at
         FROM prompt_contracts
         WHERE prompt_id = $1::uuid AND org_id = $2::uuid
         ORDER BY created_at ASC`,
        [promptId, orgId]
      );

      return res.json({ contracts: result.rows.map(r => ({
        id: r.id, promptId: req.params.id, name: r.name, description: r.description,
        rules: r.rules, isActive: r.is_active, createdAt: r.created_at, updatedAt: r.updated_at,
      })) });
    }

    // File-based fallback
    const contracts = cicd.listContracts(req.params.id as string);
    res.json({ contracts: contracts.map(c => ({
      id: c.id, promptId: req.params.id, name: c.name, description: c.description,
      rules: c.rules, isActive: c.isActive, createdAt: c.createdAt, updatedAt: c.updatedAt,
    })) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'List contracts failed' });
  }
});

/** DELETE /v1/prompts/:id/contracts/:cid — Delete contract */
router.delete('/prompts/:id/contracts/:cid', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);

    if (pool && orgId) {
      const result = await pool.query(
        `DELETE FROM prompt_contracts WHERE id = $1::uuid AND org_id = $2::uuid`,
        [req.params.cid, orgId]
      );
      if ((result.rowCount ?? 0) === 0) return res.status(404).json({ error: 'Contract not found' });
      return res.status(204).send();
    }

    // File-based fallback
    const deleted = cicd.deleteContract(req.params.cid as string);
    if (!deleted) return res.status(404).json({ error: 'Contract not found' });
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Delete contract failed' });
  }
});

/** POST /v1/prompts/:id/contracts/validate — Stateless validation */
router.post('/prompts/:id/contracts/validate', ...mw, async (req, res) => {
  try {
    const { output, rules } = req.body ?? {};
    if (!output || typeof output !== 'string') return res.status(400).json({ error: 'output (string) required' });
    if (!rules || typeof rules !== 'object') return res.status(400).json({ error: 'rules (object) required' });

    const result = validateContract(output, rules as ContractRule);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Validation failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /v1/prompts/:id/test-cases — Create test case */
router.post('/prompts/:id/test-cases', ...mw, async (req, res) => {
  try {
    const { name, description, inputVars, expectedOutput, matchMode, tags, priority } = req.body ?? {};
    if (!name) return res.status(400).json({ error: 'name required' });

    const pool = getPool();
    const orgId = getOrgId(req);

    if (pool && orgId) {
      const promptId = await resolvePromptId(orgId, req.params.id as string);
      if (!promptId) return res.status(404).json({ error: 'Prompt not found' });

      const row = await pool.query(
        `INSERT INTO prompt_test_cases (org_id, prompt_id, name, description, input_vars, expected_output, match_mode, tags, priority)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5::jsonb, $6, $7, $8, $9)
         RETURNING id, created_at, updated_at`,
        [orgId, promptId, name, description || null, JSON.stringify(inputVars ?? {}), expectedOutput || null, matchMode || 'contains', tags || [], priority ?? 0]
      );

      await writeAuditLog(pool, { action: 'test_case_save', resourceType: 'test_case', resourceId: row.rows[0].id, orgId: orgId ?? undefined, metadata: { promptId: req.params.id, name } });
      return res.status(201).json({ id: row.rows[0].id, promptId: req.params.id, name, matchMode: matchMode || 'contains', createdAt: row.rows[0].created_at });
    }

    // File-based fallback
    const tc = cicd.saveTestCase(req.params.id as string, orgId || 'default', { name, description, inputVars, expectedOutput, matchMode, tags, priority });
    res.status(201).json({ id: tc.id, promptId: req.params.id, name, matchMode: tc.matchMode, createdAt: tc.createdAt });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Create test case failed' });
  }
});

/** GET /v1/prompts/:id/test-cases — List test cases */
router.get('/prompts/:id/test-cases', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);

    if (pool && orgId) {
      const promptId = await resolvePromptId(orgId, req.params.id as string);
      if (!promptId) return res.status(404).json({ error: 'Prompt not found' });

      const result = await pool.query(
        `SELECT id, name, description, input_vars, expected_output, match_mode, tags, is_active, priority, created_at, updated_at
         FROM prompt_test_cases WHERE prompt_id = $1::uuid AND org_id = $2::uuid ORDER BY priority DESC, created_at ASC`,
        [promptId, orgId]
      );
      return res.json({ testCases: result.rows.map(r => ({
        id: r.id, promptId: req.params.id, name: r.name, description: r.description,
        inputVars: r.input_vars, expectedOutput: r.expected_output, matchMode: r.match_mode,
        tags: r.tags, isActive: r.is_active, priority: r.priority, createdAt: r.created_at, updatedAt: r.updated_at,
      })) });
    }

    // File-based fallback
    const testCases = cicd.listTestCases(req.params.id as string);
    res.json({ testCases: testCases.map(tc => ({
      id: tc.id, promptId: req.params.id, name: tc.name, description: tc.description,
      inputVars: tc.inputVars, expectedOutput: tc.expectedOutput, matchMode: tc.matchMode,
      tags: tc.tags, isActive: tc.isActive, priority: tc.priority, createdAt: tc.createdAt, updatedAt: tc.updatedAt,
    })) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'List test cases failed' });
  }
});

/** PUT /v1/prompts/:id/test-cases/:tcId — Update test case */
router.put('/prompts/:id/test-cases/:tcId', ...mw, async (req, res) => {
  try {
    const { name, description, inputVars, expectedOutput, matchMode, tags, isActive, priority } = req.body ?? {};
    const pool = getPool();
    const orgId = getOrgId(req);

    if (pool && orgId) {
      const result = await pool.query(
        `UPDATE prompt_test_cases SET
           name = COALESCE($1, name), description = COALESCE($2, description),
           input_vars = COALESCE($3::jsonb, input_vars), expected_output = COALESCE($4, expected_output),
           match_mode = COALESCE($5, match_mode), tags = COALESCE($6, tags),
           is_active = COALESCE($7, is_active), priority = COALESCE($8, priority), updated_at = now()
         WHERE id = $9::uuid AND org_id = $10::uuid RETURNING id, name, updated_at`,
        [name || null, description, inputVars ? JSON.stringify(inputVars) : null, expectedOutput, matchMode || null, tags || null, isActive ?? null, priority ?? null, req.params.tcId, orgId]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Test case not found' });
      return res.json({ id: result.rows[0].id, name: result.rows[0].name, updatedAt: result.rows[0].updated_at });
    }

    // File-based fallback
    const updated = cicd.updateTestCase(req.params.tcId as string, { name, description, inputVars, expectedOutput, matchMode, tags, isActive, priority });
    if (!updated) return res.status(404).json({ error: 'Test case not found' });
    res.json({ id: updated.id, name: updated.name, updatedAt: updated.updatedAt });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Update test case failed' });
  }
});

/** DELETE /v1/prompts/:id/test-cases/:tcId — Delete test case */
router.delete('/prompts/:id/test-cases/:tcId', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);

    if (pool && orgId) {
      const result = await pool.query(
        `DELETE FROM prompt_test_cases WHERE id = $1::uuid AND org_id = $2::uuid`, [req.params.tcId, orgId]
      );
      if ((result.rowCount ?? 0) === 0) return res.status(404).json({ error: 'Test case not found' });
      return res.status(204).send();
    }

    // File-based fallback
    const deleted = cicd.deleteTestCase(req.params.tcId as string);
    if (!deleted) return res.status(404).json({ error: 'Test case not found' });
    res.status(204).send();
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Delete test case failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REGRESSION RUNS
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /v1/prompts/:id/versions/:ver/test — Run regression suite */
router.post('/prompts/:id/versions/:ver/test', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);
    const config = req.body?.config ?? {};
    const triggerType = req.body?.triggerType ?? 'manual';

    if (pool && orgId) {
      const promptId = await resolvePromptId(orgId, req.params.id as string);
      if (!promptId) return res.status(404).json({ error: 'Prompt not found' });

      const pvRow = await pool.query(
        `SELECT pv.master_prompt, pv.reasoning, pv.meta FROM prompt_versions pv
         WHERE pv.prompt_id = $1::uuid AND pv.version = $2`,
        [promptId, req.params.ver]
      );
      if (pvRow.rows.length === 0) return res.status(404).json({ error: 'Version not found' });

      const meta = pvRow.rows[0].meta ?? {};
      const { run, results } = await executeRegressionRun({
        pool, orgId, promptId,
        externalId: req.params.id as string, version: req.params.ver as string,
        masterPrompt: pvRow.rows[0].master_prompt, reasoning: pvRow.rows[0].reasoning ?? undefined,
        domainId: meta.domainId ?? config.domainId, config, triggerType,
      });

      await writeAuditLog(pool, {
        action: 'regression_run', resourceType: 'regression', resourceId: run.id, orgId,
        metadata: { promptId: req.params.id, version: req.params.ver, status: run.status },
      });
      return res.json({ run, results });
    }

    // File-based fallback
    const store = getPromptStore();
    const prompt = await store.get(req.params.id as string, req.params.ver as string);
    if (!prompt) return res.status(404).json({ error: 'Prompt/version not found' });

    const { run, results } = await executeRegressionRunLocal({
      orgId: orgId || 'default',
      promptId: req.params.id as string,
      externalId: req.params.id as string,
      version: req.params.ver as string,
      masterPrompt: prompt.masterPrompt,
      reasoning: prompt.reasoning,
      domainId: (prompt.meta as any)?.domainId ?? config.domainId,
      config, triggerType,
    });

    res.json({ run, results });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Regression run failed' });
  }
});

/** GET /v1/prompts/:id/versions/:ver/test-results — Last test results */
router.get('/prompts/:id/versions/:ver/test-results', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);

    if (pool && orgId) {
      const promptId = await resolvePromptId(orgId, req.params.id as string);
      if (!promptId) return res.status(404).json({ error: 'Prompt not found' });

      const runRow = await pool.query(
        `SELECT id, status, summary, config, started_at, completed_at, created_at
         FROM regression_runs WHERE prompt_id = $1::uuid AND version = $2 AND org_id = $3::uuid
         ORDER BY created_at DESC LIMIT 1`,
        [promptId, req.params.ver, orgId]
      );
      if (runRow.rows.length === 0) return res.status(404).json({ error: 'No test results found' });

      const run = runRow.rows[0];
      const resultsRow = await pool.query(
        `SELECT id, test_type, test_case_id, provider, model, status, input, actual_output, expected, score, details, duration_ms, created_at
         FROM regression_results WHERE run_id = $1::uuid ORDER BY created_at ASC`, [run.id]
      );
      return res.json({
        run: { id: run.id, status: run.status, summary: run.summary, config: run.config, startedAt: run.started_at, completedAt: run.completed_at },
        results: resultsRow.rows.map(r => ({
          id: r.id, testType: r.test_type, testCaseId: r.test_case_id,
          provider: r.provider, model: r.model, status: r.status,
          input: r.input, actualOutput: r.actual_output, expected: r.expected,
          score: r.score != null ? Number(r.score) : null,
          details: r.details, durationMs: r.duration_ms, createdAt: r.created_at,
        })),
      });
    }

    // File-based fallback
    const latestRun = cicd.getLatestRun(req.params.id as string, req.params.ver as string);
    if (!latestRun) return res.status(404).json({ error: 'No test results found' });
    const runResults = cicd.getRunResults(latestRun.id);
    res.json({
      run: { id: latestRun.id, status: latestRun.status, summary: latestRun.summary, config: latestRun.config, startedAt: latestRun.startedAt, completedAt: latestRun.completedAt },
      results: runResults.map(r => ({
        id: r.id, testType: r.testType, testCaseId: r.testCaseId,
        provider: r.provider, model: r.model, status: r.status,
        input: r.input, actualOutput: r.actualOutput, expected: r.expected,
        score: r.score ?? null, details: r.details, durationMs: r.durationMs, createdAt: r.createdAt,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Get test results failed' });
  }
});

/** GET /v1/regression-runs/:runId — Detailed run */
router.get('/regression-runs/:runId', ...mw, async (req, res) => {
  try {
    const pool = getPool();

    if (pool) {
      const runRow = await pool.query(
        `SELECT id, org_id, prompt_id, version, trigger_type, status, config, summary, started_at, completed_at, created_at
         FROM regression_runs WHERE id = $1::uuid`, [req.params.runId]
      );
      if (runRow.rows.length === 0) {
        // Try file-based fallback
        const fileRun = cicd.getRun(req.params.runId as string);
        if (!fileRun) return res.status(404).json({ error: 'Run not found' });
        const fileResults = cicd.getRunResults(fileRun.id);
        return res.json({
          run: { id: fileRun.id, promptId: fileRun.promptId, version: fileRun.version, triggerType: fileRun.triggerType, status: fileRun.status, config: fileRun.config, summary: fileRun.summary, startedAt: fileRun.startedAt, completedAt: fileRun.completedAt, createdAt: fileRun.createdAt },
          results: fileResults.map(r => ({ id: r.id, testType: r.testType, testCaseId: r.testCaseId, provider: r.provider, model: r.model, status: r.status, input: r.input, actualOutput: r.actualOutput, expected: r.expected, score: r.score ?? null, details: r.details, durationMs: r.durationMs, createdAt: r.createdAt })),
        });
      }

      const run = runRow.rows[0];
      const resultsRow = await pool.query(
        `SELECT id, test_type, test_case_id, provider, model, status, input, actual_output, expected, score, details, duration_ms, created_at
         FROM regression_results WHERE run_id = $1::uuid ORDER BY created_at ASC`, [run.id]
      );
      return res.json({
        run: { id: run.id, promptId: run.prompt_id, version: run.version, triggerType: run.trigger_type, status: run.status, config: run.config, summary: run.summary, startedAt: run.started_at, completedAt: run.completed_at, createdAt: run.created_at },
        results: resultsRow.rows.map(r => ({ id: r.id, testType: r.test_type, testCaseId: r.test_case_id, provider: r.provider, model: r.model, status: r.status, input: r.input, actualOutput: r.actual_output, expected: r.expected, score: r.score != null ? Number(r.score) : null, details: r.details, durationMs: r.duration_ms, createdAt: r.created_at })),
      });
    }

    // File-based fallback
    const fileRun = cicd.getRun(req.params.runId as string);
    if (!fileRun) return res.status(404).json({ error: 'Run not found' });
    const fileResults = cicd.getRunResults(fileRun.id);
    res.json({
      run: { id: fileRun.id, promptId: fileRun.promptId, version: fileRun.version, triggerType: fileRun.triggerType, status: fileRun.status, config: fileRun.config, summary: fileRun.summary, startedAt: fileRun.startedAt, completedAt: fileRun.completedAt, createdAt: fileRun.createdAt },
      results: fileResults.map(r => ({ id: r.id, testType: r.testType, testCaseId: r.testCaseId, provider: r.provider, model: r.model, status: r.status, input: r.input, actualOutput: r.actualOutput, expected: r.expected, score: r.score ?? null, details: r.details, durationMs: r.durationMs, createdAt: r.createdAt })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Get run failed' });
  }
});

/** GET /v1/prompts/:id/regression-history — Run history */
router.get('/prompts/:id/regression-history', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);

    if (pool && orgId) {
      const promptId = await resolvePromptId(orgId, req.params.id as string);
      if (!promptId) return res.status(404).json({ error: 'Prompt not found' });

      const result = await pool.query(
        `SELECT id, version, trigger_type, status, summary, started_at, completed_at, created_at
         FROM regression_runs WHERE prompt_id = $1::uuid AND org_id = $2::uuid ORDER BY created_at DESC LIMIT 50`,
        [promptId, orgId]
      );
      return res.json({ runs: result.rows.map(r => ({
        id: r.id, version: r.version, triggerType: r.trigger_type, status: r.status,
        summary: r.summary, startedAt: r.started_at, completedAt: r.completed_at, createdAt: r.created_at,
      })) });
    }

    // File-based fallback
    const runs = cicd.listRuns(req.params.id as string);
    res.json({ runs: runs.map(r => ({
      id: r.id, version: r.version, triggerType: r.triggerType, status: r.status,
      summary: r.summary, startedAt: r.startedAt, completedAt: r.completedAt, createdAt: r.createdAt,
    })) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'List runs failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /v1/prompts/:id/versions/:ver/status — Lifecycle status */
router.get('/prompts/:id/versions/:ver/status', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);

    if (pool && orgId) {
      const promptId = await resolvePromptId(orgId, req.params.id as string);
      if (!promptId) return res.status(404).json({ error: 'Prompt not found' });
      const info = await getVersionLifecycle(pool, orgId, promptId, req.params.ver as string);
      if (!info) return res.status(404).json({ error: 'Version not found' });
      return res.json(info);
    }

    // File-based fallback
    const info = await getVersionLifecycleLocal(req.params.id as string, req.params.ver as string);
    if (!info) return res.status(404).json({ error: 'Version not found' });
    res.json(info);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Get status failed' });
  }
});

/** POST /v1/prompts/:id/versions/:ver/promote — Promote version (with approval gate) */
router.post('/prompts/:id/versions/:ver/promote', ...mw, requirePermission('version:promote'), async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);

    const { targetStatus, forcePromote } = req.body ?? {};
    if (!targetStatus) return res.status(400).json({ error: 'targetStatus required' });

    const user = (req as any).authUser as AuthUser | undefined;
    const userId = user?.userId;

    // DB mode
    if (pool && orgId) {
      const promptId = await resolvePromptId(orgId, req.params.id as string);
      if (!promptId) return res.status(404).json({ error: 'Prompt not found' });

      const statusOrder = ['draft', 'testing', 'staging', 'production', 'archived'];
      const targetIdx = statusOrder.indexOf(targetStatus);
      const requireIdx = statusOrder.indexOf(DEFAULT_APPROVAL_CONFIG.requireApprovalFrom);
      const needsApproval = targetIdx >= requireIdx && !forcePromote;

      if (needsApproval) {
        const existingApproval = await pool.query(
          `SELECT id, status, approvals FROM version_approvals
           WHERE prompt_id = $1::uuid AND version = $2 AND to_status = $3 AND status = 'pending' LIMIT 1`,
          [promptId, req.params.ver, targetStatus]
        );

        if (existingApproval.rows.length > 0) {
          return res.json({ success: false, newStatus: targetStatus, message: 'Approval already pending for this promote',
            pendingApproval: { id: existingApproval.rows[0].id, status: existingApproval.rows[0].status } });
        }

        const lifecycle = await getVersionLifecycle(pool, orgId, promptId, req.params.ver as string);
        const fromStatus = lifecycle?.status ?? 'draft';

        const approvalRow = await pool.query(
          `INSERT INTO version_approvals (prompt_id, version, from_status, to_status, requested_by, required_approvers, gate_results)
           VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6, $7::jsonb) RETURNING id, created_at`,
          [promptId, req.params.ver, fromStatus, targetStatus, userId, DEFAULT_APPROVAL_CONFIG.requiredApprovers,
           lifecycle?.gates ? JSON.stringify(lifecycle.gates) : null]
        );

        await writeAuditLog(pool, { action: 'version_promote', resourceType: 'approval', resourceId: approvalRow.rows[0].id,
          orgId: orgId ?? undefined, userId, metadata: { promptId: req.params.id, version: req.params.ver, targetStatus, event: 'approval_requested' } });

        return res.json({
          success: false, newStatus: fromStatus,
          message: `Approval required for promote to '${targetStatus}'. Approval request created.`,
          pendingApproval: {
            id: approvalRow.rows[0].id, promptId, version: req.params.ver, fromStatus, toStatus: targetStatus,
            requestedBy: userId, requestedAt: approvalRow.rows[0].created_at,
            status: 'pending' as ApprovalStatus, requiredApprovers: DEFAULT_APPROVAL_CONFIG.requiredApprovers,
            approvals: [], gateResults: lifecycle?.gates,
          },
        });
      }

      // Direct promote (DB)
      const result = await promoteVersion(pool, orgId, promptId, req.params.ver as string, targetStatus, userId);
      if (result.success) {
        await writeAuditLog(pool, { action: 'version_promote', resourceType: 'prompt_version', orgId: orgId ?? undefined, userId,
          metadata: { promptId: req.params.id, version: req.params.ver, newStatus: result.newStatus, forced: !!forcePromote } });
      }
      return res.json(result);
    }

    // File-based fallback — direct promote (no approval workflow in file mode)
    const result = await promoteVersionLocal(req.params.id as string, req.params.ver as string, targetStatus, userId);
    res.json(result);
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Promote failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL WORKFLOW
// ═══════════════════════════════════════════════════════════════════════════════

/** GET /v1/approvals — List pending approvals for the org */
router.get('/approvals', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);
    const status = (req.query.status as string) || 'pending';

    if (pool && orgId) {
      const result = await pool.query(
        `SELECT va.id, va.prompt_id, va.version, va.from_status, va.to_status,
                va.requested_by, va.status, va.required_approvers, va.approvals,
                va.gate_results, va.created_at, va.resolved_at,
                p.external_id, p.name as prompt_name
         FROM version_approvals va JOIN prompts p ON p.id = va.prompt_id
         WHERE p.org_id = $1::uuid AND va.status = $2 ORDER BY va.created_at DESC LIMIT 50`,
        [orgId, status]
      );
      return res.json({ approvals: result.rows.map(r => ({
        id: r.id, promptId: r.prompt_id, promptExternalId: r.external_id, promptName: r.prompt_name,
        version: r.version, fromStatus: r.from_status, toStatus: r.to_status, requestedBy: r.requested_by,
        status: r.status, requiredApprovers: r.required_approvers, approvals: r.approvals ?? [],
        gateResults: r.gate_results, createdAt: r.created_at, resolvedAt: r.resolved_at,
      })) });
    }

    // File-based fallback
    const approvals = cicd.listApprovals(status);
    res.json({ approvals: approvals.map(a => ({
      id: a.id, promptId: a.promptId, version: a.version,
      fromStatus: a.fromStatus, toStatus: a.toStatus, requestedBy: a.requestedBy,
      status: a.status, requiredApprovers: a.requiredApprovers, approvals: a.approvals,
      gateResults: a.gateResults, createdAt: a.requestedAt, resolvedAt: a.resolvedAt,
    })) });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'List approvals failed' });
  }
});

/** POST /v1/approvals/:id/vote — Approve or reject */
router.post('/approvals/:id/vote', ...mw, requirePermission('version:promote'), async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);
    const user = (req as any).authUser as AuthUser | undefined;
    const { decision, comment } = req.body ?? {};

    if (!decision || !['approve', 'reject'].includes(decision)) {
      return res.status(400).json({ error: "decision must be 'approve' or 'reject'" });
    }
    const approvalId = req.params.id as string;

    if (pool && orgId) {
      const approvalRow = await pool.query(
        `SELECT va.*, p.org_id FROM version_approvals va JOIN prompts p ON p.id = va.prompt_id
         WHERE va.id = $1::uuid AND p.org_id = $2::uuid AND va.status = 'pending'`, [approvalId, orgId]
      );
      if (approvalRow.rows.length === 0) return res.status(404).json({ error: 'Pending approval not found' });

      const approval = approvalRow.rows[0];
      if (approval.requested_by === user?.userId) return res.status(400).json({ error: 'Cannot vote on your own approval request', code: 'SELF_APPROVE' });

      const vote: ApprovalVote = { userId: user?.userId ?? 'unknown', email: user?.email, decision, comment: comment ?? undefined, votedAt: new Date().toISOString() };
      const existingVotes: ApprovalVote[] = approval.approvals ?? [];
      if (existingVotes.some(v => v.userId === user?.userId)) return res.status(409).json({ error: 'Already voted on this approval' });

      const updatedVotes = [...existingVotes, vote];
      let newStatus: ApprovalStatus = 'pending';
      if (decision === 'reject') { newStatus = 'rejected'; }
      else { const approveCount = updatedVotes.filter(v => v.decision === 'approve').length; if (approveCount >= approval.required_approvers) newStatus = 'approved'; }

      await pool.query(
        `UPDATE version_approvals SET approvals = $1::jsonb, status = $2,
         resolved_at = CASE WHEN $2 != 'pending' THEN now() ELSE resolved_at END WHERE id = $3::uuid`,
        [JSON.stringify(updatedVotes), newStatus, approvalId]
      );

      if (newStatus === 'approved') {
        const promoteResult = await promoteVersion(pool, orgId, approval.prompt_id, approval.version, approval.to_status, approval.requested_by);
        await writeAuditLog(pool, { action: 'version_promote', resourceType: 'prompt_version', orgId, userId: user?.userId,
          metadata: { promptId: approval.prompt_id, version: approval.version, newStatus: approval.to_status, event: 'approval_completed', approvalId } });
        return res.json({ approval: { id: approvalId, status: newStatus, votes: updatedVotes }, promote: promoteResult });
      }
      if (newStatus === 'rejected') {
        await writeAuditLog(pool, { action: 'version_promote', resourceType: 'approval', resourceId: approvalId, orgId, userId: user?.userId, metadata: { event: 'approval_rejected', comment } });
      }
      return res.json({ approval: { id: approvalId, status: newStatus, votes: updatedVotes } });
    }

    // File-based fallback
    const approval = cicd.getApproval(approvalId);
    if (!approval || approval.status !== 'pending') return res.status(404).json({ error: 'Pending approval not found' });

    const vote = { userId: user?.userId ?? 'unknown', email: user?.email, decision, comment: comment ?? undefined, votedAt: new Date().toISOString() };
    const updatedVotes = [...approval.approvals, vote];
    let newStatus: 'pending' | 'approved' | 'rejected' = 'pending';
    if (decision === 'reject') newStatus = 'rejected';
    else if (updatedVotes.filter(v => v.decision === 'approve').length >= approval.requiredApprovers) newStatus = 'approved';

    cicd.updateApproval(approvalId, { approvals: updatedVotes, status: newStatus, resolvedAt: newStatus !== 'pending' ? new Date().toISOString() : undefined });

    if (newStatus === 'approved') {
      const promoteResult = await promoteVersionLocal(approval.promptId, approval.version, approval.toStatus, approval.requestedBy);
      return res.json({ approval: { id: approvalId, status: newStatus, votes: updatedVotes }, promote: promoteResult });
    }

    res.json({ approval: { id: approvalId, status: newStatus, votes: updatedVotes } });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Vote failed' });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// A/B TESTING
// ═══════════════════════════════════════════════════════════════════════════════

/** POST /v1/prompts/:id/ab-tests — Create and run an A/B test */
router.post('/prompts/:id/ab-tests', ...mw, requirePermission('regression:run'), async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);
    if (!pool || !orgId) return res.status(400).json({ error: 'Organization context required' });

    const body = req.body ?? {};
    const { name, description, variantA, variantB, metrics, sampleSize } = body;

    if (!name || !variantA?.version || !variantB?.version) {
      return res.status(400).json({ error: 'name, variantA.version, variantB.version required' });
    }

    const defaultMetrics = ['judgeScore', 'latencyMs', 'tokenCount', 'costUsd'];
    const testMetrics = Array.isArray(metrics) ? metrics : defaultMetrics;
    const testSampleSize = Math.min(Math.max(1, sampleSize ?? 10), 50);

    // Create AB test record
    const insertResult = await pool.query(
      `INSERT INTO ab_tests (org_id, prompt_id, name, description, variant_a, variant_b, metrics, sample_size, created_by)
       VALUES ($1::uuid, $2, $3, $4, $5::jsonb, $6::jsonb, $7::text[], $8, $9::uuid)
       RETURNING id, created_at`,
      [
        orgId, req.params.id, name.slice(0, 200), (description ?? '').slice(0, 1000),
        JSON.stringify(variantA), JSON.stringify(variantB),
        testMetrics, testSampleSize,
        ((req as any).authUser as AuthUser | undefined)?.userId ?? null,
      ]
    );

    const testId = insertResult.rows[0].id;
    const createdAt = insertResult.rows[0].created_at;

    res.status(201).json({
      id: testId,
      promptId: req.params.id,
      name,
      status: 'draft',
      variantA,
      variantB,
      metrics: testMetrics,
      sampleSize: testSampleSize,
      createdAt,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Create A/B test failed' });
  }
});

/** GET /v1/prompts/:id/ab-tests — List A/B tests */
router.get('/prompts/:id/ab-tests', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    const orgId = getOrgId(req);
    if (!pool || !orgId) return res.status(400).json({ error: 'Organization context required' });

    const result = await pool.query(
      `SELECT id, name, description, status, variant_a, variant_b, metrics, sample_size,
              started_at, completed_at, created_at, updated_at
       FROM ab_tests
       WHERE org_id = $1::uuid AND prompt_id = $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [orgId, req.params.id]
    );

    res.json({
      tests: result.rows.map(r => ({
        id: r.id,
        name: r.name,
        description: r.description,
        status: r.status,
        variantA: r.variant_a,
        variantB: r.variant_b,
        metrics: r.metrics,
        sampleSize: r.sample_size,
        startedAt: r.started_at,
        completedAt: r.completed_at,
        createdAt: r.created_at,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'List A/B tests failed' });
  }
});

/** GET /v1/ab-tests/:testId — Get A/B test details with results */
router.get('/ab-tests/:testId', ...mw, async (req, res) => {
  try {
    const pool = getPool();
    if (!pool) return res.status(503).json({ error: 'Database not available' });

    const testRow = await pool.query(
      `SELECT * FROM ab_tests WHERE id = $1::uuid`,
      [req.params.testId]
    );

    if (testRow.rows.length === 0) {
      return res.status(404).json({ error: 'A/B test not found' });
    }

    const test = testRow.rows[0];

    // Get variant results
    const variantResults = await pool.query(
      `SELECT variant, sample_index, output, metrics, provider, model, duration_ms, error, created_at
       FROM ab_test_variants
       WHERE test_id = $1::uuid
       ORDER BY variant, sample_index`,
      [test.id]
    );

    res.json({
      test: {
        id: test.id,
        promptId: test.prompt_id,
        name: test.name,
        description: test.description,
        status: test.status,
        variantA: test.variant_a,
        variantB: test.variant_b,
        metrics: test.metrics,
        sampleSize: test.sample_size,
        startedAt: test.started_at,
        completedAt: test.completed_at,
        createdAt: test.created_at,
      },
      results: {
        A: variantResults.rows.filter(r => r.variant === 'A').map(mapVariantRow),
        B: variantResults.rows.filter(r => r.variant === 'B').map(mapVariantRow),
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Get A/B test failed' });
  }
});

function mapVariantRow(r: any) {
  return {
    sampleIndex: r.sample_index,
    output: r.output,
    metrics: r.metrics,
    provider: r.provider,
    model: r.model,
    durationMs: r.duration_ms,
    error: r.error,
    createdAt: r.created_at,
  };
}

export default router;
