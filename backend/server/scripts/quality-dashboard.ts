/**
 * Quality dashboard aggregator.
 *
 * Reads latest regression + canary outputs and produces:
 *   reports/quality-dashboard.json
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface RegressionSummary {
  passed: number;
  failed: number;
  total: number;
}

interface CanarySummary {
  passed: number;
  totalTests: number;
  passRate: number;
}

interface DashboardReport {
  timestamp: string;
  availability: {
    ok: boolean;
    statusCode: number;
    detail: string;
  };
  security: {
    score: number;
    passed: number;
    total: number;
    detail: string;
  };
  coverage: {
    promptCount: number;
    totalTests: number;
    detail: string;
  };
  consistency: {
    passRate: number;
    varianceNote: string;
  };
  typecheck: {
    maxErrors: number;
    detail: string;
  };
  compositeScore: number;
}

function safeReadJson<T = any>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function latestRegressionReportPath(reportsDir: string): string | null {
  if (!existsSync(reportsDir)) return null;
  const candidates = readdirSync(reportsDir)
    .filter((file) => /^regression-\d+\.json$/.test(file))
    .sort((a, b) => b.localeCompare(a));
  return candidates.length > 0 ? join(reportsDir, candidates[0] as string) : null;
}

function readTypecheckBudget(rootDir: string): number {
  const budget = safeReadJson<{ maxErrors?: number }>(join(rootDir, '.typecheck-budget.json'));
  return Number.isFinite(Number(budget?.maxErrors)) ? Number(budget?.maxErrors) : 0;
}

function buildDashboard(rootDir: string): DashboardReport {
  const reportsDir = join(rootDir, 'reports');
  const regressionPath = latestRegressionReportPath(reportsDir);
  const regression = regressionPath
    ? safeReadJson<{ summary?: RegressionSummary }>(regressionPath)
    : null;
  const canary = safeReadJson<CanarySummary>(join(reportsDir, 'canary-risk.json'));

  const regressionSummary: RegressionSummary = {
    passed: regression?.summary?.passed ?? 0,
    failed: regression?.summary?.failed ?? 0,
    total: regression?.summary?.total ?? 0,
  };
  const canarySummary: CanarySummary = {
    passed: canary?.passed ?? 0,
    totalTests: canary?.totalTests ?? 0,
    passRate: canary?.passRate ?? 0,
  };

  const totalSecurityTests = canarySummary.totalTests;
  const securityScore = totalSecurityTests > 0
    ? Math.round((canarySummary.passed / totalSecurityTests) * 100)
    : 0;

  const consistencyPassRate = regressionSummary.total > 0
    ? Math.round((regressionSummary.passed / regressionSummary.total) * 10000) / 100
    : canarySummary.passRate;

  const availabilityScore = 100;
  const coverageScore = regressionSummary.total > 0 ? 100 : 40;
  const consistencyScore = Math.round(consistencyPassRate);
  const compositeScore = Math.round(
    availabilityScore * 0.2 +
    securityScore * 0.35 +
    coverageScore * 0.25 +
    consistencyScore * 0.2
  );

  const typecheckBudget = readTypecheckBudget(rootDir);

  return {
    timestamp: new Date().toISOString(),
    availability: {
      ok: true,
      statusCode: 200,
      detail: 'Backend health assumed OK for offline quality aggregation',
    },
    security: {
      score: securityScore,
      passed: canarySummary.passed,
      total: totalSecurityTests,
      detail: totalSecurityTests > 0
        ? `${canarySummary.passed}/${totalSecurityTests} adversarial+canary checks passed`
        : 'Canary report not found',
    },
    coverage: {
      promptCount: regressionSummary.total > 0 ? Math.max(1, Math.round(regressionSummary.total / 7)) : 0,
      totalTests: regressionSummary.total,
      detail: regressionSummary.total > 0
        ? `${regressionSummary.total} tests in latest regression run`
        : 'Regression report not found',
    },
    consistency: {
      passRate: consistencyPassRate,
      varianceNote: 'Single-run consistency; compare consecutive runs for variance tracking',
    },
    typecheck: {
      maxErrors: typecheckBudget,
      detail: `Typecheck budget set to ${typecheckBudget}`,
    },
    compositeScore,
  };
}

function main(): void {
  const rootDir = process.cwd();
  const report = buildDashboard(rootDir);
  const reportsDir = join(rootDir, 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  const outputPath = join(reportsDir, 'quality-dashboard.json');
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  console.log(`[quality:dashboard] composite score: ${report.compositeScore}`);
  console.log(`[quality:dashboard] report: ${outputPath}`);
}

main();
