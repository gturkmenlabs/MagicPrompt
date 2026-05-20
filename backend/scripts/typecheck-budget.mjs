#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Resolve `backend/` regardless of where the script is invoked from.
const __filename = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(__filename), '..');
const budgetPath = path.join(backendRoot, '.typecheck-budget.json');
const updateBaseline = process.argv.includes('--update-baseline');

function loadBudget() {
  try {
    const raw = fs.readFileSync(budgetPath, 'utf8');
    const parsed = JSON.parse(raw);
    const maxErrors = Number(parsed?.maxErrors);
    return Number.isFinite(maxErrors) ? Math.max(0, Math.floor(maxErrors)) : 0;
  } catch {
    return 0;
  }
}

function writeBudget(maxErrors) {
  const payload = {
    maxErrors,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(budgetPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function runTypecheck() {
  const result = spawnSync('npx', ['tsc', '--noEmit'], {
    cwd: backendRoot,
    encoding: 'utf8',
    stdio: 'pipe',
    shell: process.platform === 'win32',
  });
  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim();
  const matches = output.match(/error TS\d+:/g);
  const errors = matches ? matches.length : 0;
  return {
    status: result.status ?? 1,
    output,
    errors,
  };
}

const currentBudget = loadBudget();
const run = runTypecheck();

if (updateBaseline) {
  writeBudget(run.errors);
  console.log(`[typecheck:budget] Baseline updated: ${run.errors} errors`);
  process.exit(0);
}

console.log(`[typecheck:budget] current=${run.errors} | budget=${currentBudget}`);
if (run.errors > currentBudget) {
  if (run.output) {
    console.error(run.output);
  }
  console.error(
    `[typecheck:budget] Failed: TypeScript error count increased above budget (${run.errors} > ${currentBudget}).`
  );
  process.exit(1);
}

if (run.errors === 0 && run.status !== 0) {
  console.error(run.output || '[typecheck:budget] tsc failed without diagnostics');
  process.exit(run.status);
}

console.log('[typecheck:budget] Passed.');
