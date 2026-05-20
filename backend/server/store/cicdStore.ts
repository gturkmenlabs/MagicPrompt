/**
 * File-based CI/CD Store — DB-free fallback for contracts, test cases,
 * regression runs, version lifecycle, and approvals.
 * Data persisted to .prompts/cicd/ directory as JSON files.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type {
  ContractRule,
  PromptTestCase,
  MatchMode,
  RegressionRunSummary,
  VersionStatus,
  VersionLifecycleInfo,
  TriggerType,
  RegressionRunConfig,
} from '@/types/regression';

const CICD_DIR = process.env.SR_CICD_DIR || join(process.cwd(), '.prompts', 'cicd');

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try { return JSON.parse(readFileSync(path, 'utf-8')); } catch { return fallback; }
}

function writeJson(filePath: string, data: unknown) {
  const dir = filePath.replace(/[/\\][^/\\]+$/, '');
  if (dir && dir !== filePath) ensureDir(dir);
  else ensureDir(CICD_DIR);
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── Paths ────────────────────────────────────────────────────────────────────

const contractsFile = () => { ensureDir(CICD_DIR); return join(CICD_DIR, 'contracts.json'); };
const testCasesFile = () => { ensureDir(CICD_DIR); return join(CICD_DIR, 'test-cases.json'); };
const runsFile = () => { ensureDir(CICD_DIR); return join(CICD_DIR, 'regression-runs.json'); };
const resultsFile = () => { ensureDir(CICD_DIR); return join(CICD_DIR, 'regression-results.json'); };
const versionStatusFile = () => { ensureDir(CICD_DIR); return join(CICD_DIR, 'version-status.json'); };
const approvalsFile = () => { ensureDir(CICD_DIR); return join(CICD_DIR, 'approvals.json'); };

// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════

interface StoredContract {
  id: string;
  orgId: string;
  promptId: string;
  name: string;
  description?: string;
  rules: ContractRule;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function listContracts(promptId: string): StoredContract[] {
  const all: StoredContract[] = readJson(contractsFile(), []);
  return all.filter(c => c.promptId === promptId);
}

export function saveContract(promptId: string, orgId: string, name: string, description: string | undefined, rules: ContractRule): StoredContract {
  const all: StoredContract[] = readJson(contractsFile(), []);
  const existing = all.find(c => c.promptId === promptId && c.name === name);
  const now = new Date().toISOString();

  if (existing) {
    existing.description = description;
    existing.rules = rules;
    existing.updatedAt = now;
    writeJson(contractsFile(), all);
    return existing;
  }

  const contract: StoredContract = {
    id: randomUUID(), orgId, promptId, name,
    description, rules, isActive: true,
    createdAt: now, updatedAt: now,
  };
  all.push(contract);
  writeJson(contractsFile(), all);
  return contract;
}

export function deleteContract(contractId: string): boolean {
  const all: StoredContract[] = readJson(contractsFile(), []);
  const filtered = all.filter(c => c.id !== contractId);
  if (filtered.length === all.length) return false;
  writeJson(contractsFile(), filtered);
  return true;
}

export function getActiveContractRules(promptId: string): ContractRule[] {
  return listContracts(promptId).filter(c => c.isActive).map(c => c.rules);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════════════

interface StoredTestCase {
  id: string;
  orgId: string;
  promptId: string;
  name: string;
  description?: string;
  inputVars: Record<string, string>;
  expectedOutput?: string;
  matchMode: MatchMode;
  tags: string[];
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export function listTestCases(promptId: string): StoredTestCase[] {
  const all: StoredTestCase[] = readJson(testCasesFile(), []);
  return all.filter(tc => tc.promptId === promptId).sort((a, b) => b.priority - a.priority);
}

export function saveTestCase(promptId: string, orgId: string, data: {
  name: string; description?: string; inputVars?: Record<string, string>;
  expectedOutput?: string; matchMode?: MatchMode; tags?: string[]; priority?: number;
}): StoredTestCase {
  const all: StoredTestCase[] = readJson(testCasesFile(), []);
  const now = new Date().toISOString();
  const tc: StoredTestCase = {
    id: randomUUID(), orgId, promptId,
    name: data.name, description: data.description,
    inputVars: data.inputVars ?? {},
    expectedOutput: data.expectedOutput,
    matchMode: data.matchMode || 'contains',
    tags: data.tags || [],
    isActive: true,
    priority: data.priority ?? 0,
    createdAt: now, updatedAt: now,
  };
  all.push(tc);
  writeJson(testCasesFile(), all);
  return tc;
}

export function updateTestCase(tcId: string, updates: Partial<StoredTestCase>): StoredTestCase | null {
  const all: StoredTestCase[] = readJson(testCasesFile(), []);
  const tc = all.find(t => t.id === tcId);
  if (!tc) return null;
  Object.assign(tc, { ...updates, updatedAt: new Date().toISOString() });
  writeJson(testCasesFile(), all);
  return tc;
}

export function deleteTestCase(tcId: string): boolean {
  const all: StoredTestCase[] = readJson(testCasesFile(), []);
  const filtered = all.filter(t => t.id !== tcId);
  if (filtered.length === all.length) return false;
  writeJson(testCasesFile(), filtered);
  return true;
}

export function getActiveTestCases(promptId: string): PromptTestCase[] {
  return listTestCases(promptId).filter(tc => tc.isActive).map(tc => ({
    id: tc.id, orgId: tc.orgId, promptId: tc.promptId,
    name: tc.name, description: tc.description,
    inputVars: tc.inputVars, expectedOutput: tc.expectedOutput,
    matchMode: tc.matchMode, tags: tc.tags,
    isActive: tc.isActive, priority: tc.priority,
    createdAt: tc.createdAt, updatedAt: tc.updatedAt,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGRESSION RUNS & RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

interface StoredRun {
  id: string;
  orgId: string;
  promptId: string;
  version: string;
  triggerType: TriggerType;
  status: string;
  config: RegressionRunConfig;
  summary: RegressionRunSummary | Record<string, unknown>;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
}

interface StoredResult {
  id: string;
  runId: string;
  testType: string;
  testCaseId?: string;
  provider?: string;
  model?: string;
  status: string;
  input?: string;
  actualOutput?: string;
  expected?: string;
  score?: number;
  details: Record<string, unknown>;
  durationMs?: number;
  createdAt: string;
}

export function createRun(orgId: string, promptId: string, version: string, triggerType: TriggerType, config: RegressionRunConfig): StoredRun {
  const all: StoredRun[] = readJson(runsFile(), []);
  const now = new Date().toISOString();
  const run: StoredRun = {
    id: randomUUID(), orgId, promptId, version,
    triggerType, status: 'running', config,
    summary: {}, startedAt: now, createdAt: now,
  };
  all.push(run);
  writeJson(runsFile(), all);
  return run;
}

export function updateRun(runId: string, status: string, summary: RegressionRunSummary | Record<string, unknown>): void {
  const all: StoredRun[] = readJson(runsFile(), []);
  const run = all.find(r => r.id === runId);
  if (run) {
    run.status = status;
    run.summary = summary;
    run.completedAt = new Date().toISOString();
    writeJson(runsFile(), all);
  }
}

export function getRun(runId: string): StoredRun | null {
  const all: StoredRun[] = readJson(runsFile(), []);
  return all.find(r => r.id === runId) ?? null;
}

export function getLatestRun(promptId: string, version: string): StoredRun | null {
  const all: StoredRun[] = readJson(runsFile(), []);
  return all.filter(r => r.promptId === promptId && r.version === version)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

export function listRuns(promptId: string, limit = 50): StoredRun[] {
  const all: StoredRun[] = readJson(runsFile(), []);
  return all.filter(r => r.promptId === promptId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

export function insertResult(params: {
  runId: string; testType: string; testCaseId?: string;
  provider?: string; model?: string; status: string;
  input?: string; actualOutput?: string; expected?: string;
  score?: number; details?: Record<string, unknown>; durationMs?: number;
}): StoredResult {
  const all: StoredResult[] = readJson(resultsFile(), []);
  const result: StoredResult = {
    id: randomUUID(),
    runId: params.runId,
    testType: params.testType,
    testCaseId: params.testCaseId,
    provider: params.provider,
    model: params.model,
    status: params.status,
    input: params.input,
    actualOutput: params.actualOutput,
    expected: params.expected,
    score: params.score,
    details: params.details ?? {},
    durationMs: params.durationMs,
    createdAt: new Date().toISOString(),
  };
  all.push(result);
  writeJson(resultsFile(), all);
  return result;
}

export function getRunResults(runId: string): StoredResult[] {
  const all: StoredResult[] = readJson(resultsFile(), []);
  return all.filter(r => r.runId === runId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

interface StoredVersionStatus {
  promptId: string;
  version: string;
  status: VersionStatus;
  promotedAt?: string;
  promotedBy?: string;
}

export function getVersionStatus(promptId: string, version: string): StoredVersionStatus {
  const all: StoredVersionStatus[] = readJson(versionStatusFile(), []);
  return all.find(v => v.promptId === promptId && v.version === version) ?? {
    promptId, version, status: 'draft',
  };
}

export function setVersionStatus(promptId: string, version: string, status: VersionStatus, userId?: string): void {
  const all: StoredVersionStatus[] = readJson(versionStatusFile(), []);
  const existing = all.find(v => v.promptId === promptId && v.version === version);
  if (existing) {
    existing.status = status;
    existing.promotedAt = new Date().toISOString();
    existing.promotedBy = userId;
  } else {
    all.push({ promptId, version, status, promotedAt: new Date().toISOString(), promotedBy: userId });
  }
  writeJson(versionStatusFile(), all);
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVALS
// ═══════════════════════════════════════════════════════════════════════════════

interface StoredApproval {
  id: string;
  promptId: string;
  version: string;
  fromStatus: VersionStatus;
  toStatus: VersionStatus;
  requestedBy?: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  requiredApprovers: number;
  approvals: Array<{ userId: string; email?: string; decision: string; comment?: string; votedAt: string }>;
  gateResults?: VersionLifecycleInfo['gates'];
  resolvedAt?: string;
}

export function listApprovals(status = 'pending'): StoredApproval[] {
  const all: StoredApproval[] = readJson(approvalsFile(), []);
  return all.filter(a => a.status === status).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function getApproval(id: string): StoredApproval | null {
  const all: StoredApproval[] = readJson(approvalsFile(), []);
  return all.find(a => a.id === id) ?? null;
}

export function createApproval(data: Omit<StoredApproval, 'id' | 'requestedAt' | 'approvals' | 'status'>): StoredApproval {
  const all: StoredApproval[] = readJson(approvalsFile(), []);
  const approval: StoredApproval = {
    ...data, id: randomUUID(),
    requestedAt: new Date().toISOString(),
    status: 'pending', approvals: [],
  };
  all.push(approval);
  writeJson(approvalsFile(), all);
  return approval;
}

export function updateApproval(id: string, updates: Partial<StoredApproval>): StoredApproval | null {
  const all: StoredApproval[] = readJson(approvalsFile(), []);
  const approval = all.find(a => a.id === id);
  if (!approval) return null;
  Object.assign(approval, updates);
  writeJson(approvalsFile(), all);
  return approval;
}
