/**
 * Semantik Arama API Route'lari.
 * POST /v1/prompts/semantic-search — Dogal dil sorgusu ile prompt arama
 * GET  /v1/prompts/vector-stats   — Vektor koleksiyon istatistikleri
 * POST /v1/prompts/seed-vectors   — Embedding uret + vektor DB doldur (admin)
 */

import { Router } from 'express';
import { requireAnyAuth } from '../middleware/supabaseAuth';
import { apiRateLimiter } from '../middleware/rateLimit';
import { optionalApiKey } from '../middleware/auth';
import { generateEmbedding, generateEmbeddings, getCacheSize, getProviderInfo } from '../lib/embeddings';
import { getVectorStore, initVectorStore } from '../lib/vectorStore';
import type { VectorDoc } from '../lib/vectorStore';

const router = Router();
const withKey = [optionalApiKey];

/** POST /v1/prompts/semantic-search */
router.post('/prompts/semantic-search', ...withKey, apiRateLimiter, requireAnyAuth, async (req, res) => {
  try {
    const { query, topK = 10, language } = req.body ?? {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'query (string) required' });
    }

    const store = getVectorStore();
    if (!store || !store.isReady() || store.count() === 0) {
      return res.status(503).json({
        error: 'Vector store not ready. Run POST /v1/prompts/seed-vectors first.',
        code: 'VECTOR_STORE_NOT_READY',
      });
    }

    const k = Math.min(Math.max(1, Number(topK) || 10), 50);
    const queryVector = await generateEmbedding(query);
    let results = await store.search(queryVector, k);

    // Dil filtresi
    if (language === 'tr' || language === 'en') {
      results = results.filter((r) => r.metadata.lang === language);
    }

    res.json({
      query,
      topK: k,
      results: results.map((r) => ({
        id: r.id,
        score: Math.round(r.score * 10000) / 10000,
        name: r.metadata.name,
        category: r.metadata.category,
        tags: r.metadata.tags,
        lang: r.metadata.lang,
      })),
      total: results.length,
      backend: store.name,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Semantic search failed' });
  }
});

/** GET /v1/prompts/vector-stats */
router.get('/prompts/vector-stats', ...withKey, apiRateLimiter, requireAnyAuth, async (_req, res) => {
  try {
    const store = getVectorStore();
    const embedding = getProviderInfo();
    res.json({
      ready: store?.isReady() ?? false,
      backend: store?.name ?? 'none',
      vectorCount: store?.count() ?? 0,
      embeddingCacheSize: getCacheSize(),
      embedding,
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Stats failed' });
  }
});

/** POST /v1/prompts/seed-vectors */
router.post('/prompts/seed-vectors', ...withKey, apiRateLimiter, requireAnyAuth, async (_req, res) => {
  try {
    // Lazy import — notebookLmPrompts buyuk file
    const { NOTEBOOKLM_PROMPTS } = await import('../../data/notebookLmPrompts.ts');

    const store = await initVectorStore();

    // Embedding text olustur
    const texts: string[] = [];
    const promptMap = new Map<
      string,
      { id: string; text: string; metadata: VectorDoc['metadata'] }
    >();

    const lang: 'en' = 'en';
    for (const p of NOTEBOOKLM_PROMPTS) {
      const text = `${p.promptEn} | ${p.nameEn} | ${p.tags.join(', ')}`;
      texts.push(text);
      promptMap.set(text, {
        id: p.id,
        text,
        metadata: {
          name: p.nameEn,
          category: p.categoryEn,
          tags: p.tags,
          lang,
        },
      });
    }

    // Toplu embedding uret
    const vectors = await generateEmbeddings(texts);

    // Store'a upload
    const docs: VectorDoc[] = [];
    for (let i = 0; i < texts.length; i++) {
      const text = texts[i];
      if (!text) continue;
      const info = promptMap.get(text);
      const vector = vectors[i];
      if (info && vector) {
        docs.push({ id: info.id, vector, metadata: info.metadata });
      }
    }

    const upserted = await store.upsert(docs);

    res.json({
      success: true,
      totalPrompts: NOTEBOOKLM_PROMPTS.length,
      vectorsUpserted: upserted,
      backend: store.name,
      embeddingCacheSize: getCacheSize(),
      embedding: getProviderInfo(),
    });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'Seeding failed' });
  }
});

export default router;
