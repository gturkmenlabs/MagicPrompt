/**
 * Vektor DB Seed Script.
 * Tum prompt'lar for OpenAI embedding uretir ve vektor store'a yukler.
 *
 * Kullanim: npm run seed:vectors
 */

import 'dotenv/config';
import { NOTEBOOKLM_PROMPTS } from '@/data/notebookLmPrompts';
import { ALL_DATASET_PROMPTS } from '@/data/datasetPrompts';
import { generateEmbeddings, getCacheSize, getProviderInfo } from '../lib/embeddings';
import { initVectorStore } from '../lib/vectorStore';
import type { VectorDoc } from '../lib/vectorStore';

async function main() {
  const info = getProviderInfo();
  const lang: 'en' = 'en';

  // NotebookLM prompt'lari zaten datasetPrompts'u iceriyor (push ile)
  // Ama duplicate kontrolu for benzersiz ID setini kullaniyoruz
  const seenIds = new Set<string>();
  const allPrompts = NOTEBOOKLM_PROMPTS.filter(p => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });

  console.log(`[seed:vectors] Provider: ${info.provider} (${info.model}, ${info.dim || '?'}-dim)`);
  console.log(`[seed:vectors] ${allPrompts.length} benzersiz prompt bulundu (NotebookLM + Datasets)`);
  console.log(`[seed:vectors]   ↳ NotebookLM: ${NOTEBOOKLM_PROMPTS.length - ALL_DATASET_PROMPTS.length}`);
  console.log(`[seed:vectors]   ↳ Dataset: ${ALL_DATASET_PROMPTS.length}`);

  // Embedding text'leri olustur
  const texts: string[] = [];
  const promptInfos: Array<{ id: string; metadata: VectorDoc['metadata'] }> = [];

  for (const p of allPrompts) {
    const text = `${p.promptEn} | ${p.nameEn} | ${p.tags.join(', ')}`;
    texts.push(text);
    promptInfos.push({
      id: p.id,
      metadata: {
        name: p.nameEn,
        category: p.categoryEn,
        tags: p.tags,
        lang,
      },
    });
  }

  // Embedding uret (batch, cache'li)
  console.log('[seed:vectors] Embedding uretiliyor...');
  const vectors = await generateEmbeddings(texts, (done, total) => {
    process.stdout.write(`\r[seed:vectors] Embedding: ${done}/${total}`);
  });
  console.log('');
  console.log(`[seed:vectors] ${vectors.length} embedding uretildi (cache: ${getCacheSize()})`);

  // Vektor store init
  const store = await initVectorStore();

  // Upsert
  const docs: VectorDoc[] = [];
  for (let i = 0; i < texts.length; i++) {
    const vec = vectors[i];
    const info = promptInfos[i];
    if (vec !== undefined && info !== undefined) {
      docs.push({
        id: info.id,
        vector: vec,
        metadata: info.metadata,
      });
    }
  }

  const upserted = await store.upsert(docs);
  console.log(`[seed:vectors] ${upserted} vektor ${store.name} backend'e yuklendi`);
  console.log(`[seed:vectors] Toplam: ${store.count()} vektor`);
  console.log('[seed:vectors] Tamamlandi!');
}

main().catch((err) => {
  console.error('[seed:vectors] Error:', err.message);
  process.exit(1);
});
