#!/usr/bin/env node
/**
 * Derives evaluation-style metrics from latest regression JSON (quality gates).
 * NeoMagic is not a single binary classifier; we report test-pass rates and category breakdown.
 * Classical Precision/Recall/F1/AUC-ROC require labeled classification predictions — see report.
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const reportsDir = join(root, 'reports');

function latestRegressionPath() {
  if (!existsSync(reportsDir)) return null;
  const files = readdirSync(reportsDir)
    .filter((f) => /^regression-\d+\.json$/.test(f))
    .sort((a, b) => b.localeCompare(a));
  return files.length ? join(reportsDir, files[0]) : null;
}

function categoryFromTestName(name) {
  const prefix = name.split(':')[0] || 'other';
  return prefix;
}

const path = latestRegressionPath();
if (!path) {
  console.error('No regression-*.json in reports/; run npm run regression first.');
  process.exit(1);
}

const data = JSON.parse(readFileSync(path, 'utf8'));
const results = Array.isArray(data.results) ? data.results : [];
const total = results.length;
const passed = results.filter((r) => r.passed === true).length;
const failed = total - passed;

const byCategory = {};
for (const r of results) {
  const cat = categoryFromTestName(String(r.testName || ''));
  if (!byCategory[cat]) byCategory[cat] = { passed: 0, failed: 0 };
  if (r.passed) byCategory[cat].passed += 1;
  else byCategory[cat].failed += 1;
}

const out = {
  generatedAt: new Date().toISOString(),
  sourceRegression: path,
  summary: {
    totalTests: total,
    passed,
    failed,
    /** Proxy for "accuracy" on pass/fail test suite */
    testPassRate: total ? passed / total : null,
  },
  byCategory,
  classicalClassificationMetrics: {
    precision: null,
    recall: null,
    f1Score: null,
    aucRoc: null,
    note:
      'Not applicable to the current regression suite (pass/fail gates, not thresholded class scores). ' +
      'Compute P/R/F1/AUC when you export y_true/y_pred from a labeled classification or ranking task.',
  },
};

if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
const outFile = join(reportsDir, 'evaluation-metrics.json');
writeFileSync(outFile, `${JSON.stringify(out, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(out.summary, null, 2));
console.log(`Wrote ${outFile}`);
