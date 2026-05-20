/**
 * Seed NotebookLM + Dataset Prompt Kutuphanesi
 * Kullanim: npx tsx server/scripts/seed-notebooklm.ts
 *
 * Bu script artik hem NotebookLM prompt'larini hem de
 * tum veri setlerinden cikarilan dataset prompt'larini seed eder.
 */
import 'dotenv/config';
import { getPromptStore } from '../store/promptStore';
import { NOTEBOOKLM_PROMPTS } from '@/data/notebookLmPrompts';
import { ALL_DATASET_PROMPTS } from '@/data/datasetPrompts';

async function seed() {
  const store = getPromptStore();
  let ok = 0;
  let skip = 0;
  let errors = 0;

  // Benzersiz ID seti (NotebookLM zaten datasetPrompts push edilmis olabilir)
  const seenIds = new Set<string>();
  const allPrompts = NOTEBOOKLM_PROMPTS.filter(p => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  console.log(`Toplam benzersiz prompt: ${allPrompts.length}`);
  console.log(`  ↳ NotebookLM: ${allPrompts.length - ALL_DATASET_PROMPTS.length}`);
  console.log(`  ↳ Dataset: ${ALL_DATASET_PROMPTS.length}\n`);

  for (const p of allPrompts) {
    try {
      // Check if already exists
      const existing = await store.get(p.id, '1.0', null);
      if (existing) {
        skip++;
        continue;
      }

      await store.save({
        id: p.id,
        version: '1.0',
        name: p.name,
        masterPrompt: p.prompt,
        reasoning: p.promptEn,
        meta: {
          intent: p.category,
        } as Record<string, unknown>,
      }, null);
      ok++;
      console.log(`  ✓ ${p.id} — ${p.name}`);
    } catch (e: any) {
      errors++;
      console.error(`  ✗ ${p.id}: ${e.message}`);
    }
  }

  console.log(`\nSeed tamamlandi: ${ok} eklendi, ${skip} atlandi (zaten var), ${errors} error, toplam ${allPrompts.length}`);
  process.exit(0);
}

seed().catch(e => {
  console.error('Seed hatasi:', e);
  process.exit(1);
});
