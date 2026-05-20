/**
 * Canary risk runner.
 *
 * Usage:
 *   npm run canary
 *   npm run canary -- --fail-on-risk
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateContract } from '@/services/contractValidator';
import { validateGodModeOutput } from '@/services/godModeValidator';
import { ADVERSARIAL_SCENARIOS, evaluateAdversarialScenario } from '../lib/adversarialTests';
import { CANARY_PROMPTS } from './canary-prompts';
import type { ContractRule } from '@/types/regression';

interface CanaryResult {
  testName: string;
  passed: boolean;
  message: string;
}

interface CanaryReport {
  timestamp: string;
  canaryCount: number;
  totalTests: number;
  passed: number;
  failed: number;
  riskScore: number;
  passRate: number;
  riskLevel: 'low' | 'medium' | 'high';
  results: CanaryResult[];
  recommendation: string;
}

const args = process.argv.slice(2);
const failOnRisk = args.includes('--fail-on-risk');

const DEFAULT_CONTRACT: ContractRule = {
  minLength: 100,
  maxLength: 50000,
  requiredSections: [],
  forbiddenKeywords: ['TODO:', 'FIXME:', 'HACK:'],
  regexPatterns: [],
};

function evaluateCanarySet(): CanaryResult[] {
  const results: CanaryResult[] = [];

  for (const prompt of CANARY_PROMPTS) {
    const contract = validateContract(prompt.masterPrompt, DEFAULT_CONTRACT);
    results.push({
      testName: `contract:${prompt.id}`,
      passed: contract.passed,
      message: contract.passed ? `Contract OK (${contract.score}/100)` : 'Contract validation failed',
    });

    const godMode = validateGodModeOutput(prompt.masterPrompt, {
      requireSteps: false,
      requireExamples: false,
      minLength: 100,
    });
    results.push({
      testName: `godmode:${prompt.id}`,
      passed: godMode.passed,
      message: godMode.passed ? `God Mode OK (${godMode.score}/100)` : 'God Mode validation failed',
    });

    for (const adversarial of ADVERSARIAL_SCENARIOS) {
      const adv = evaluateAdversarialScenario(adversarial, prompt.masterPrompt);
      results.push({
        testName: `adversarial:${adversarial.testType}:${prompt.id}`,
        passed: adv.passed,
        message: adv.passed
          ? 'OK'
          : (typeof adv.details === 'string' ? adv.details : JSON.stringify(adv.details)),
      });
    }
  }

  return results;
}

function classifyRisk(passRate: number): 'low' | 'medium' | 'high' {
  if (passRate >= 98) return 'low';
  if (passRate >= 90) return 'medium';
  return 'high';
}

function recommendationForRisk(risk: 'low' | 'medium' | 'high'): string {
  if (risk === 'low') return 'Release risk: low. Canary set passed.';
  if (risk === 'medium') return 'Release risk: medium. Investigate failing canary checks before release.';
  return 'Release risk: high. Block release until canary failures are resolved.';
}

function writeReport(report: CanaryReport): string {
  const reportsDir = join(process.cwd(), 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });
  const outputPath = join(reportsDir, 'canary-risk.json');
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
  return outputPath;
}

function main(): void {
  const results = evaluateCanarySet();
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const passRate = results.length > 0 ? Math.round((passed / results.length) * 10000) / 100 : 0;
  const riskScore = Math.round((100 - passRate) * 100) / 100;
  const riskLevel = classifyRisk(passRate);

  const report: CanaryReport = {
    timestamp: new Date().toISOString(),
    canaryCount: CANARY_PROMPTS.length,
    totalTests: results.length,
    passed,
    failed,
    riskScore,
    passRate,
    riskLevel,
    results,
    recommendation: recommendationForRisk(riskLevel),
  };

  const reportPath = writeReport(report);
  console.log(`[canary] results: ${passed}/${results.length} passed (${passRate}%)`);
  console.log(`[canary] risk level: ${riskLevel}`);
  console.log(`[canary] report: ${reportPath}`);

  if (failOnRisk && riskLevel !== 'low') {
    process.exit(1);
  }
}

main();
