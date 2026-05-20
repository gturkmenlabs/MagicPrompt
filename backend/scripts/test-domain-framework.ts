/**
 * Tests domain + framework combinations.
 * Simulates /v1/generate for each combination and reports validity.
 *
 * Usage while API server is running:
 *   curl -s -X POST http://localhost:4000/v1/generate -H "Content-Type: application/json" \
 *     -d '{"intent":"Design a secure REST API","framework":"KERNEL","domainId":"backend","language":"en"}' | jq .
 *
 * Or run directly via generate adapter:
 *   npx tsx scripts/test-domain-framework.ts
 */

import { Framework } from '@/types';
import { generateMasterPromptServer } from '../server/lib/generateAdapter';
import { en } from '@/locales/en';
import { DOMAIN_IDS } from '@/data';

const SAMPLE_INTENT = 'Design a secure and scalable REST API.';
const TEST_DOMAINS = ['general', 'frontend', 'backend', 'ml-ai', 'cybersecurity'];
const TEST_FRAMEWORKS = [Framework.KERNEL, Framework.RTF, Framework.RISEN, Framework.CHAIN];

async function runOne(domainId: string, framework: Framework): Promise<{ ok: boolean; error?: string; len?: number }> {
  const domainMeta = en.domains[domainId as keyof typeof en.domains];
  const contextRules = domainMeta?.contextRules ?? 'General best practices.';
  try {
    const res = await generateMasterPromptServer({
      intent: SAMPLE_INTENT,
      framework,
      domainId,
      provider: 'openai',
      contextRules,
    });
    const hasPrompt = typeof res.masterPrompt === 'string' && res.masterPrompt.trim().length > 50;
    return { ok: hasPrompt, len: res.masterPrompt?.length ?? 0 };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.slice(0, 80) };
  }
}

async function main() {
  console.log('Domain + Framework test');
  console.log('Sample intent:', SAMPLE_INTENT);
  console.log('Domain list (locales):', Object.keys(en.domains).length);
  console.log('DOMAIN_IDS (data):', DOMAIN_IDS.length);
  console.log('');

  const missingDomains = DOMAIN_IDS.filter((id) => !en.domains[id as keyof typeof en.domains]);
  if (missingDomains.length > 0) {
    console.log('Warning: undefined domain in locales:', missingDomains.slice(0, 10).join(', '), missingDomains.length > 10 ? `... +${missingDomains.length - 10}` : '');
  }

  console.log('Selected domains:', TEST_DOMAINS.join(', '));
  console.log('Selected frameworks:', TEST_FRAMEWORKS.join(', '));
  console.log('');

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const domainId of TEST_DOMAINS) {
    for (const framework of TEST_FRAMEWORKS) {
      const result = await runOne(domainId, framework);
      const label = `${domainId} + ${framework}`;
      if (result.error?.includes('API key') || result.error?.includes('OPENAI')) {
        skipped++;
        console.log(`  SKIP ${label} (API key required)`);
      } else if (result.ok) {
        passed++;
        console.log(`  OK   ${label} (${result.len} char)`);
      } else {
        failed++;
        console.log(`  FAIL ${label} ${result.error ?? 'empty/too short output'}`);
      }
    }
  }

  console.log('');
  console.log('Summary:', { passed, failed, skipped });
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
