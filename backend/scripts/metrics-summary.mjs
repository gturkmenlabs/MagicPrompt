#!/usr/bin/env node
/**
 * Aggregates metric JSON under reports/ into a single summary for dashboards/CI.
 * Reads: quality-dashboard.json, leakage-report.json (optional), latest regression-*.json (optional)
 */

import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const reportsDir = join(root, 'reports');

function readJson(p) {
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function latestRegression() {
  if (!existsSync(reportsDir)) return null;
  const files = readdirSync(reportsDir)
    .filter((f) => /^regression-\d+\.json$/.test(f))
    .sort((a, b) => b.localeCompare(a));
  if (!files.length) return null;
  return readJson(join(reportsDir, files[0]));
}

const quality = readJson(join(reportsDir, 'quality-dashboard.json'));
const leakage = readJson(join(reportsDir, 'leakage-report.json'));
const evaluation = readJson(join(reportsDir, 'evaluation-metrics.json'));
const regression = latestRegression();

const summary = {
  generatedAt: new Date().toISOString(),
  qualityDashboard: quality
    ? {
        compositeScore: quality.compositeScore,
        availability: quality.availability,
        security: quality.security,
        consistency: quality.consistency,
        typecheck: quality.typecheck,
      }
    : null,
  leakage: leakage
    ? {
        pass: leakage.pass,
        exactLine: leakage.exactLine ?? null,
        userMessageFingerprint: leakage.userMessageFingerprint ?? null,
        temporalAndGroupAudit: leakage.temporalAndGroupAudit ?? null,
      }
    : null,
  evaluation: evaluation?.summary
    ? {
        testPassRate: evaluation.summary.testPassRate,
        totalTests: evaluation.summary.totalTests,
        passed: evaluation.summary.passed,
        failed: evaluation.summary.failed,
        classicalClassificationMetrics: evaluation.classicalClassificationMetrics ?? null,
      }
    : null,
  regression: regression?.summary ?? regression ?? null,
};

if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
const out = join(reportsDir, 'metrics-summary.json');
writeFileSync(out, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(`Wrote ${out}`);
