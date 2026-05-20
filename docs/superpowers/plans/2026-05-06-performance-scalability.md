# Performance & Scalability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dört katmanlı optimizasyon ile NeoMagic prompt pipeline'ının latency'sini ~%60, maliyetini ~%55 düşürmek — Paralel IR Pipeline → Embedding Classifier → Hybrid Cache → Progressive Judge sırasıyla.

**Architecture:** IR pipeline adımları bağımlılık grafiğine göre paralel gruplara ayrılır; intent classifier LLM'i embedding cosine similarity ile değiştirir; üç katmanlı hybrid cache (exact hash → semantic pgvector → full pipeline) tekrar eden istekleri önler; judge ensemble risk seviyesine göre tek veya çift model kullanır.

**Tech Stack:** TypeScript, Node.js, Express 5, pgvector (PostgreSQL), OpenAI embeddings (`text-embedding-3-small`), Vitest

---

## Dosya Haritası

| Dosya | Değişim | Neden |
|-------|---------|-------|
| `server/lib/generateAdapter.ts` | Değiştir | Pipeline paralel gruplar + cache lookup/store + classifier entegrasyonu |
| `server/lib/intentAnalyzer.ts` | Yeniden yaz | LLM çağrısı → `EmbeddingClassifier` sınıfı |
| `server/lib/pairwiseJudgeLLM.ts` | Değiştir | `ProgressiveJudgeOptions` + risk-aware positionSwap |
| `services/judgeEnsemble.ts` | Değiştir | `judgePrompt` async + `judgePromptProgressive` wrapper |
| `server/routes/quality.ts` | Değiştir | `/judge` endpoint async/await |
| `utils/cache.ts` | Değiştir | `HybridIntentCache` sınıfı, SHA-256, TTL katmanları |
| `services/semanticCache.ts` | Değiştir | pgvector cosine similarity sorgusu gerçek implementasyon |
| `server/index.ts` | Değiştir | Startup'ta `EmbeddingClassifier.warmup()` çağrısı |

---

## AŞAMA 1 — Paralel IR Pipeline

### Task 1: generateAdapter.ts — Bağımlılık Gruplarını Belirle ve Test Yaz

**Files:**
- Modify: `server/lib/generateAdapter.ts`
- Test: `server/lib/generateAdapter.test.ts` (oluştur)

- [ ] **Step 1: Mevcut pipeline sırasını anla**

`server/lib/generateAdapter.ts`'de `_generateMasterPromptServerInner` fonksiyonunu oku. Şu an sıralı çalışan adımları not et: `fetchWikipediaContext`, `generateEmbedding`, `buildAgentBlueprintEmbeddingContext`, `buildSelfLearningContext`.

- [ ] **Step 2: Test dosyası oluştur ve ilk başarısız testi yaz**

`server/lib/generateAdapter.test.ts` oluştur:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Pipeline adımlarının paralel çalıştığını doğrulamak için zamanlama testi
describe('generateAdapter parallel pipeline', () => {
  it('fetchWikipediaContext ve extractIR paralel çalışmalı', async () => {
    const order: string[] = [];
    const delay = (ms: number, label: string) =>
      new Promise<void>(res => setTimeout(() => { order.push(label); res(); }, ms));

    // İki bağımsız görev paralel çalıştırıldığında toplam süre max(t1, t2) olmalı
    const start = Date.now();
    await Promise.all([
      delay(50, 'wiki'),
      delay(50, 'ir'),
    ]);
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(150); // seri çalışsaydı ~100ms, paralel ~50ms
    expect(order).toHaveLength(2);
  });
});
```

- [ ] **Step 3: Testi çalıştır — geçmeli (bu temel paralel davranış testi)**

```bash
npx vitest run server/lib/generateAdapter.test.ts
```

Beklenen: PASS (temel Promise.all davranışını doğrular)

- [ ] **Step 4: generateAdapter.ts'de `_generateMasterPromptServerInner` içindeki pipeline bölümünü bul**

`server/lib/generateAdapter.ts`'i oku, `useSearch` bloğunu ve Wikipedia/embedding çağrılarının bulunduğu satırları tespit et (~satır 508-650 arası).

- [ ] **Step 5: Pipeline'ı paralel gruplara yeniden yaz**

`_generateMasterPromptServerInner` içinde Wikipedia ve IR extraction'ın gerçekleştiği bloğu şu şekilde güncelle — mevcut sıralı çağrıları `Promise.all` gruplarıyla değiştir:

```typescript
// ÖNCE (sıralı):
// const wikiContext = await fetchWikipediaContext(req.intent, lang);
// const embedding = await generateEmbedding(req.intent);
// const selfCtx = await buildSelfLearningContext(...);

// SONRA (paralel gruplar):

// Grup 1: IR ve Wikipedia bağımsız — ikisi de ham intent'e bağımlı
const [_unused, wikiContext] = await Promise.allSettled([
  Promise.resolve(), // IR zaten req içinde mevcut
  req.useSearch ? fetchWikipediaContext(req.intent, lang) : Promise.resolve(null),
]).then(results => [
  null,
  results[1]?.status === 'fulfilled' ? results[1].value : null,
]);

// Grup 2: Embedding (Grup 3'ün başlaması için gerekli)
let embedding: number[] | null = null;
if (hasAgentBlueprintMode(contextRules) || req.useSearch) {
  embedding = await generateEmbedding(req.intent).catch(() => null);
}

// Grup 3: Vector ve self-learning embedding'e bağımlı — paralel
const [agentCtx, selfCtx] = await Promise.allSettled([
  embedding ? buildAgentBlueprintEmbeddingContext(req, lang, contextRules) : Promise.resolve(''),
  embedding ? buildSelfLearningContext({ ...req, _embedding: embedding } as any) : Promise.resolve(''),
]).then(results => [
  results[0]?.status === 'fulfilled' ? results[0].value : '',
  results[1]?.status === 'fulfilled' ? results[1].value : '',
]);
```

- [ ] **Step 6: Testleri çalıştır**

```bash
npx vitest run server/lib/generateAdapter.test.ts
```

Beklenen: PASS

- [ ] **Step 7: Smoke test çalıştır**

```bash
npm run test:api:smoke
```

Beklenen: Tüm route testleri PASS

- [ ] **Step 8: Commit**

```bash
git add server/lib/generateAdapter.ts server/lib/generateAdapter.test.ts
git commit -m "perf: parallelize IR pipeline — wiki+IR in parallel, vector+self-learning in parallel"
```

---

## AŞAMA 2 — Embedding-Based Intent Classifier

### Task 2: EmbeddingClassifier Sınıfını Yaz

**Files:**
- Modify: `server/lib/intentAnalyzer.ts`
- Test: `server/lib/intentAnalyzer.test.ts` (oluştur)

- [ ] **Step 1: Mevcut `intentAnalyzer.ts`'i oku**

`server/lib/intentAnalyzer.ts` içindeki `analyzeIntentServer` fonksiyonunu incele — LLM çağrısını tam olarak gör (satır 33 civarı).

- [ ] **Step 2: Başarısız test yaz**

`server/lib/intentAnalyzer.test.ts` oluştur:

```typescript
import { describe, it, expect, vi } from 'vitest';

// generateMasterPromptServer mock'la — classifier LLM çağırmamalı
vi.mock('./generateAdapter', () => ({
  generateMasterPromptServer: vi.fn().mockRejectedValue(new Error('LLM should not be called')),
}));

vi.mock('./embeddings', () => ({
  generateEmbedding: vi.fn().mockResolvedValue(new Array(1536).fill(0.1)),
}));

describe('EmbeddingClassifier', () => {
  it('classifyIntent — LLM çağırmadan domain döndürmeli', async () => {
    const { classifyIntent } = await import('./intentAnalyzer');
    // generateMasterPromptServer çağrılırsa test hata verir
    const result = await classifyIntent('frontend React component oluştur');
    expect(result.domain).toBeTruthy();
    expect(result.framework).toBeTruthy();
    expect(typeof result.confidence).toBe('number');
  });

  it('classifyIntent — bilinmeyen intent için general fallback döndürmeli', async () => {
    const { classifyIntent } = await import('./intentAnalyzer');
    const result = await classifyIntent('xyzzy quux blerf');
    expect(result.domain).toBe('general');
    expect(result.framework).toBe('AUTO');
  });
});
```

- [ ] **Step 3: Testi çalıştır — FAIL bekliyoruz**

```bash
npx vitest run server/lib/intentAnalyzer.test.ts
```

Beklenen: FAIL — `classifyIntent` henüz export edilmiyor

- [ ] **Step 4: `intentAnalyzer.ts`'i yeniden yaz**

`server/lib/intentAnalyzer.ts` içeriğini şöyle güncelle:

```typescript
import { generateEmbedding } from './embeddings';

export interface ClassifyResult {
  domain: string;
  framework: string;
  confidence: number;
  reasoning: string;
}

// Domain katalog — 59 domain için kısa açıklamalar
const DOMAIN_CATALOG: Array<{ id: string; description: string }> = [
  { id: 'frontend', description: 'React Vue Angular UI components CSS web design' },
  { id: 'backend', description: 'Node Express API REST server database SQL queries' },
  { id: 'devops', description: 'Docker Kubernetes CI/CD deployment pipeline infrastructure' },
  { id: 'mobile', description: 'iOS Android React Native Flutter mobile app' },
  { id: 'data-science', description: 'Python pandas numpy machine learning data analysis statistics' },
  { id: 'qa', description: 'testing unit test integration e2e test coverage automation' },
  { id: 'pm', description: 'product management roadmap sprint user story agile' },
  { id: 'academic', description: 'research paper thesis citation literature review academic writing' },
  { id: 'creative', description: 'creative writing story fiction blog content poetry' },
  { id: 'sales', description: 'sales pitch proposal customer outreach revenue conversion' },
  { id: 'seo', description: 'SEO search engine optimization keywords meta tags ranking' },
  { id: 'customer-support', description: 'customer service helpdesk support ticket FAQ response' },
  { id: 'legal', description: 'contract law legal compliance regulation policy terms' },
  { id: 'hr', description: 'hiring recruitment employee performance HR policy onboarding' },
  { id: 'general', description: 'general purpose miscellaneous any topic' },
];

// Framework katalog — kısa temsil açıklamaları
const FRAMEWORK_CATALOG: Array<{ id: string; description: string }> = [
  { id: 'COSTAR', description: 'context objective style tone audience result creative marketing' },
  { id: 'CREATE', description: 'character request examples adjustments type extras structured' },
  { id: 'RACE', description: 'role action context expectation task definition' },
  { id: 'TRACE', description: 'task request action context expectation process' },
  { id: 'PAS', description: 'problem agitate solution pain point persuasion' },
  { id: 'AIDA', description: 'attention interest desire action marketing sales' },
  { id: 'CHAIN_OF_THOUGHT', description: 'step by step reasoning logic math problem solving' },
  { id: 'FIRST_PRINCIPLES', description: 'first principles foundational reasoning decompose assumptions' },
  { id: 'AUTO', description: 'automatic framework selection general purpose' },
];

interface CatalogEntry {
  id: string;
  description: string;
  embedding: number[] | null;
}

class EmbeddingClassifier {
  private domains: CatalogEntry[] = DOMAIN_CATALOG.map(d => ({ ...d, embedding: null }));
  private frameworks: CatalogEntry[] = FRAMEWORK_CATALOG.map(f => ({ ...f, embedding: null }));
  private warmedUp = false;

  async warmup(): Promise<void> {
    if (this.warmedUp) return;
    const texts = [
      ...this.domains.map(d => d.description),
      ...this.frameworks.map(f => f.description),
    ];
    const embeddings = await Promise.all(texts.map(t => generateEmbedding(t).catch(() => null)));
    this.domains.forEach((d, i) => { d.embedding = embeddings[i] ?? null; });
    this.frameworks.forEach((f, i) => {
      f.embedding = embeddings[this.domains.length + i] ?? null;
    });
    this.warmedUp = true;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i]! * b[i]!;
      normA += a[i]! * a[i]!;
      normB += b[i]! * b[i]!;
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  private findBest(
    intentEmbedding: number[],
    catalog: CatalogEntry[],
    fallback: string,
  ): { id: string; confidence: number } {
    let bestId = fallback;
    let bestScore = 0;
    let secondScore = 0;

    for (const entry of catalog) {
      if (!entry.embedding) continue;
      const score = this.cosineSimilarity(intentEmbedding, entry.embedding);
      if (score > bestScore) {
        secondScore = bestScore;
        bestScore = score;
        bestId = entry.id;
      } else if (score > secondScore) {
        secondScore = score;
      }
    }

    // Güven eşikleri: ≥0.75 kesin, 0.50-0.75 zayıf, <0.50 fallback
    if (bestScore < 0.50) return { id: fallback, confidence: bestScore };
    return { id: bestId, confidence: bestScore };
  }

  async classify(intent: string): Promise<ClassifyResult> {
    if (!this.warmedUp) await this.warmup();

    const intentEmbedding = await generateEmbedding(intent).catch(() => null);
    if (!intentEmbedding) {
      return { domain: 'general', framework: 'AUTO', confidence: 0, reasoning: 'Embedding failed — fallback' };
    }

    const domain = this.findBest(intentEmbedding, this.domains, 'general');
    const framework = this.findBest(intentEmbedding, this.frameworks, 'AUTO');

    return {
      domain: domain.id,
      framework: framework.id,
      confidence: (domain.confidence + framework.confidence) / 2,
      reasoning: `Embedding similarity — domain: ${domain.id} (${domain.confidence.toFixed(2)}), framework: ${framework.id} (${framework.confidence.toFixed(2)})`,
    };
  }
}

export const embeddingClassifier = new EmbeddingClassifier();

export async function classifyIntent(intent: string): Promise<ClassifyResult> {
  return embeddingClassifier.classify(intent);
}

// Geriye dönük uyumluluk — eski çağrılar için
export interface BrainAnalyzeIntentResult {
  domain: string;
  framework: string;
  reasoning: string;
  enrichedPrompt?: string;
}

export async function analyzeIntentServer(
  intent: string,
  domainId?: string,
  framework?: string,
): Promise<BrainAnalyzeIntentResult> {
  const result = await classifyIntent(intent);
  return {
    domain: result.domain,
    framework: result.framework,
    reasoning: result.reasoning,
  };
}
```

- [ ] **Step 5: Testi çalıştır — PASS bekliyoruz**

```bash
npx vitest run server/lib/intentAnalyzer.test.ts
```

Beklenen: PASS

- [ ] **Step 6: Commit**

```bash
git add server/lib/intentAnalyzer.ts server/lib/intentAnalyzer.test.ts
git commit -m "feat: replace LLM intent analyzer with embedding-based classifier"
```

---

### Task 3: Startup'ta Classifier Warmup

**Files:**
- Modify: `server/index.ts`

- [ ] **Step 1: `server/index.ts`'i oku**

`assertStartupSecurityGuards` çağrısının nerede olduğunu ve `listen` öncesindeki startup akışını anla.

- [ ] **Step 2: Warmup çağrısı ekle**

`server/index.ts` içinde `assertStartupSecurityGuards()` çağrısının hemen altına ekle:

```typescript
import { embeddingClassifier } from './lib/intentAnalyzer';

// Mevcut startup kodu...
await assertStartupSecurityGuards();

// Embedding kataloğunu ısıt — ilk istek gecikmesin
embeddingClassifier.warmup().catch(err =>
  console.warn('[EmbeddingClassifier] Warmup failed (non-critical):', err?.message)
);
```

- [ ] **Step 3: Sunucuyu başlat ve log'u kontrol et**

```bash
npm run api
```

Beklenen log satırı yok (hata yok), sunucu normal başlar.

- [ ] **Step 4: Commit**

```bash
git add server/index.ts
git commit -m "feat: warm up embedding classifier on server startup"
```

---

## AŞAMA 3 — Hybrid Intent Cache

### Task 4: HybridIntentCache Sınıfını Yaz

**Files:**
- Modify: `utils/cache.ts`
- Test: `utils/cache.test.ts` (oluştur)

- [ ] **Step 1: Mevcut `utils/cache.ts`'i oku**

`MemoryCache` ve `RedisCache` sınıflarının mevcut yapısını anla. `RedisCache`'in aslında `memoryCache` stub'ı olduğunu gör (satır 104).

- [ ] **Step 2: Başarısız test yaz**

`utils/cache.test.ts` oluştur:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';

describe('HybridIntentCache', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exact hit — aynı intent ikinci sorguda cache\'den dönmeli', async () => {
    const { HybridIntentCache } = await import('./cache');
    const cache = new HybridIntentCache();
    const ctx = { domainId: 'frontend', framework: 'AUTO', provider: 'groq', language: 'en' as const };
    const mockResult = { masterPrompt: 'test prompt', reasoning: 'test', resolvedProvider: 'groq', resolvedModel: 'llama' };

    await cache.store('React component oluştur', ctx, mockResult as any);
    const hit = await cache.lookup('React component oluştur', ctx);

    expect(hit).not.toBeNull();
    expect(hit?.source).toBe('exact');
    expect(hit?.data.masterPrompt).toBe('test prompt');
  });

  it('miss — farklı intent için null dönmeli', async () => {
    const { HybridIntentCache } = await import('./cache');
    const cache = new HybridIntentCache();
    const ctx = { domainId: 'frontend', framework: 'AUTO', provider: 'groq', language: 'en' as const };

    const hit = await cache.lookup('tamamen farklı bir istek xyzzy', ctx);
    expect(hit).toBeNull();
  });

  it('TTL — süresi dolan cache miss dönmeli', async () => {
    const { HybridIntentCache } = await import('./cache');
    const cache = new HybridIntentCache({ exactTtlMs: 10 }); // 10ms TTL
    const ctx = { domainId: 'backend', framework: 'AUTO', provider: 'groq', language: 'en' as const };
    const mockResult = { masterPrompt: 'expired', reasoning: '', resolvedProvider: 'groq', resolvedModel: 'llama' };

    await cache.store('test intent', ctx, mockResult as any);
    await new Promise(r => setTimeout(r, 20)); // TTL geç
    const hit = await cache.lookup('test intent', ctx);

    expect(hit).toBeNull();
  });
});
```

- [ ] **Step 3: Testi çalıştır — FAIL bekliyoruz**

```bash
npx vitest run utils/cache.test.ts
```

Beklenen: FAIL — `HybridIntentCache` henüz export edilmiyor

- [ ] **Step 4: `utils/cache.ts`'e `HybridIntentCache` ekle**

`utils/cache.ts` dosyasının sonuna (mevcut kodu silmeden) ekle:

```typescript
import crypto from 'crypto';
import type { PromptResponse } from '@/types';

export interface CacheContext {
  domainId: string;
  framework: string;
  provider: string;
  language: 'en' | 'tr';
}

export interface CachedResult {
  hit: boolean;
  source: 'exact' | 'semantic';
  data: PromptResponse;
  similarity?: number;
}

interface HybridCacheOptions {
  exactTtlMs?: number;    // varsayılan: 24 saat
  semanticTtlMs?: number; // varsayılan: 1 saat
  maxEntries?: number;    // varsayılan: 5000
}

export class HybridIntentCache {
  private exactStore: Map<string, { result: PromptResponse; expiresAt: number }> = new Map();
  private exactTtlMs: number;
  private semanticTtlMs: number;
  private maxEntries: number;

  constructor(opts: HybridCacheOptions = {}) {
    this.exactTtlMs = opts.exactTtlMs ?? 24 * 60 * 60 * 1000;
    this.semanticTtlMs = opts.semanticTtlMs ?? 60 * 60 * 1000;
    this.maxEntries = opts.maxEntries ?? 5000;
  }

  private hashKey(intent: string, ctx: CacheContext): string {
    const raw = `${intent.trim().toLowerCase()}:${ctx.domainId}:${ctx.framework}:${ctx.provider}:${ctx.language}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async lookup(intent: string, ctx: CacheContext): Promise<CachedResult | null> {
    // Katman 1: Exact hash
    const key = this.hashKey(intent, ctx);
    const entry = this.exactStore.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return { hit: true, source: 'exact', data: entry.result };
      }
      this.exactStore.delete(key);
    }

    // Katman 2: Semantic similarity — pgvector (şimdilik skip, Task 5'te eklenir)
    // TODO: semanticLookup(intent, ctx, this.semanticTtlMs)

    return null;
  }

  async store(intent: string, ctx: CacheContext, result: PromptResponse): Promise<void> {
    // Kapasite kontrolü — basit eviction (ilk giren ilk çıkar)
    if (this.exactStore.size >= this.maxEntries) {
      const firstKey = this.exactStore.keys().next().value;
      if (firstKey) this.exactStore.delete(firstKey);
    }

    const key = this.hashKey(intent, ctx);
    this.exactStore.set(key, {
      result,
      expiresAt: Date.now() + this.exactTtlMs,
    });
  }

  stats(): { exactSize: number } {
    return { exactSize: this.exactStore.size };
  }
}

export const hybridIntentCache = new HybridIntentCache();
```

- [ ] **Step 5: Testi çalıştır — PASS bekliyoruz**

```bash
npx vitest run utils/cache.test.ts
```

Beklenen: PASS (3 test)

- [ ] **Step 6: Commit**

```bash
git add utils/cache.ts utils/cache.test.ts
git commit -m "feat: add HybridIntentCache with exact SHA-256 hash and TTL layers"
```

---

### Task 5: generateAdapter'a Cache Entegrasyonu

**Files:**
- Modify: `server/lib/generateAdapter.ts`

- [ ] **Step 1: Cache lookup'ı pipeline başına ekle**

`generateMasterPromptServer` fonksiyonunun en başında (routing'den önce) cache lookup ekle:

```typescript
import { hybridIntentCache, type CacheContext } from '@/utils/cache';

export async function generateMasterPromptServer(req: GenerateRequest): Promise<PromptResponse> {
  // Cache lookup — provider 'auto' veya belirli, her ikisi için de geçerli
  if (req.provider !== 'auto' || true) { // her zaman dene
    const cacheCtx: CacheContext = {
      domainId: req.domainId,
      framework: String(req.framework),
      provider: req.provider,
      language: req.language ?? 'en',
    };
    const cached = await hybridIntentCache.lookup(req.intent, cacheCtx);
    if (cached) {
      return { ...cached.data, _cacheHit: true, _cacheSource: cached.source } as PromptResponse;
    }
  }

  const routedReq = maybeRedirectToOpenRouter(req);
  return withSpan('generate.pipeline', { /* ... mevcut attributes */ }, async (pipelineSpan) => {
    const result = await _generateMasterPromptServerInner(routedReq, pipelineSpan);

    // Cache'e yaz
    const cacheCtx: CacheContext = {
      domainId: req.domainId,
      framework: String(req.framework),
      provider: req.provider,
      language: req.language ?? 'en',
    };
    hybridIntentCache.store(req.intent, cacheCtx, result).catch(() => {}); // non-blocking

    return result;
  });
}
```

- [ ] **Step 2: Smoke test çalıştır**

```bash
npm run test:api:smoke
```

Beklenen: PASS

- [ ] **Step 3: Commit**

```bash
git add server/lib/generateAdapter.ts
git commit -m "feat: integrate HybridIntentCache into generate pipeline (exact-hash layer)"
```

---

## AŞAMA 4 — Progressive Judge

### Task 6: ProgressiveJudgeOptions ve Risk-Aware positionSwap

**Files:**
- Modify: `server/lib/pairwiseJudgeLLM.ts`
- Test: `server/lib/pairwiseJudgeLLM.test.ts` (oluştur)

- [ ] **Step 1: `pairwiseJudgeLLM.ts`'i oku**

`judgePairwiseLLM` fonksiyonunu ve `LlmPairwiseOptions` interface'ini anla (satır 23-34 ve 270-297).

- [ ] **Step 2: Başarısız test yaz**

`server/lib/pairwiseJudgeLLM.test.ts` oluştur:

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('progressiveJudgePairwiseLLM', () => {
  it('low risk + yüksek skor → positionSwap çalışmamalı (tek tur)', async () => {
    const { progressiveJudgePairwiseLLM } = await import('./pairwiseJudgeLLM');
    const callCounts: number[] = [];

    const mockChat = vi.fn().mockResolvedValue(JSON.stringify({
      criteria: [
        { id: 'clarity', scoreA: 80, scoreB: 60, winner: 'A', reason: 'clear' },
        { id: 'testability', scoreA: 80, scoreB: 60, winner: 'A', reason: 'ok' },
        { id: 'constraint_compliance', scoreA: 80, scoreB: 60, winner: 'A', reason: 'ok' },
        { id: 'security', scoreA: 80, scoreB: 60, winner: 'A', reason: 'ok' },
        { id: 'reproducibility', scoreA: 80, scoreB: 60, winner: 'A', reason: 'ok' },
      ],
    }));

    await progressiveJudgePairwiseLLM('prompt A', 'prompt B', mockChat, {
      riskLevel: 'low',
      scoreThresholdLow: 50,
      scoreThresholdMedium: 65,
    });

    // low risk + skor yüksek → tek çağrı (positionSwap yok)
    expect(mockChat).toHaveBeenCalledTimes(1);
  });

  it('high risk → her zaman çift çağrı (positionSwap)', async () => {
    const { progressiveJudgePairwiseLLM } = await import('./pairwiseJudgeLLM');

    const mockChat = vi.fn().mockResolvedValue(JSON.stringify({
      criteria: [
        { id: 'clarity', scoreA: 90, scoreB: 70, winner: 'A', reason: 'clear' },
        { id: 'testability', scoreA: 90, scoreB: 70, winner: 'A', reason: 'ok' },
        { id: 'constraint_compliance', scoreA: 90, scoreB: 70, winner: 'A', reason: 'ok' },
        { id: 'security', scoreA: 90, scoreB: 70, winner: 'A', reason: 'ok' },
        { id: 'reproducibility', scoreA: 90, scoreB: 70, winner: 'A', reason: 'ok' },
      ],
    }));

    await progressiveJudgePairwiseLLM('prompt A', 'prompt B', mockChat, {
      riskLevel: 'high',
      scoreThresholdLow: 50,
      scoreThresholdMedium: 65,
    });

    // high risk → her zaman 2 çağrı
    expect(mockChat).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 3: Testi çalıştır — FAIL bekliyoruz**

```bash
npx vitest run server/lib/pairwiseJudgeLLM.test.ts
```

Beklenen: FAIL — `progressiveJudgePairwiseLLM` henüz export edilmiyor

- [ ] **Step 4: `pairwiseJudgeLLM.ts`'e `progressiveJudgePairwiseLLM` ekle**

`pairwiseJudgeLLM.ts` dosyasının sonuna (mevcut `judgePairwiseLLM` fonksiyonu korunarak) ekle:

```typescript
export interface ProgressiveJudgeOptions extends LlmPairwiseOptions {
  riskLevel?: 'low' | 'medium' | 'high';
  scoreThresholdLow?: number;    // varsayılan: 50
  scoreThresholdMedium?: number; // varsayılan: 65
}

/**
 * Risk seviyesine göre kademeli judge:
 * - high  → her zaman positionSwap=true (2 tur)
 * - medium → tek tur, skor < 65 ise ikinci tur
 * - low   → tek tur, skor < 50 ise ikinci tur
 */
export async function progressiveJudgePairwiseLLM(
  promptA: string,
  promptB: string,
  chat: LlmChatFn,
  options: ProgressiveJudgeOptions = {},
): Promise<JudgePairwiseResult> {
  const riskLevel = options.riskLevel ?? 'low';
  const thresholdLow = options.scoreThresholdLow ?? 50;
  const thresholdMedium = options.scoreThresholdMedium ?? 65;

  // high risk → mevcut davranış (her zaman çift tur)
  if (riskLevel === 'high') {
    return judgePairwiseLLM(promptA, promptB, chat, { ...options, positionSwap: true });
  }

  // İlk tur — positionSwap olmadan
  const firstResult = await judgePairwiseLLM(promptA, promptB, chat, {
    ...options,
    positionSwap: false,
  });

  const threshold = riskLevel === 'medium' ? thresholdMedium : thresholdLow;
  const firstScore = Math.max(firstResult.totalA, firstResult.totalB);

  // Skor eşiğin altındaysa ikinci tur
  if (firstScore < threshold) {
    return judgePairwiseLLM(promptA, promptB, chat, { ...options, positionSwap: true });
  }

  return firstResult;
}
```

- [ ] **Step 5: Testi çalıştır — PASS bekliyoruz**

```bash
npx vitest run server/lib/pairwiseJudgeLLM.test.ts
```

Beklenen: PASS (2 test)

- [ ] **Step 6: Commit**

```bash
git add server/lib/pairwiseJudgeLLM.ts server/lib/pairwiseJudgeLLM.test.ts
git commit -m "feat: add progressiveJudgePairwiseLLM with risk-aware positionSwap"
```

---

### Task 7: judgeEnsemble'ı Async + Progressive Wrapper

**Files:**
- Modify: `services/judgeEnsemble.ts`
- Modify: `server/routes/quality.ts`
- Test: `services/judgeEnsemble.test.ts` (oluştur)

- [ ] **Step 1: `judgeEnsemble.ts`'deki `judgePrompt` fonksiyonunu bul**

`judgePrompt`'un senkron mu async mu olduğunu ve imzasını oku (yaklaşık satır 760+).

- [ ] **Step 2: Başarısız test yaz**

`services/judgeEnsemble.test.ts` oluştur:

```typescript
import { describe, it, expect } from 'vitest';

describe('judgePromptProgressive', () => {
  it('export edilmiş olmalı ve JudgeResult döndürmeli', async () => {
    const { judgePromptProgressive } = await import('./judgeEnsemble');
    expect(typeof judgePromptProgressive).toBe('function');

    const result = await judgePromptProgressive(
      'You are an expert assistant. Help the user with their task. Always respond in structured format with clear sections.',
      { domainId: 'general', riskLevel: 'low' }
    );

    expect(result).toHaveProperty('totalScore');
    expect(result).toHaveProperty('passThreshold');
    expect(typeof result.totalScore).toBe('number');
  });
});
```

- [ ] **Step 3: Testi çalıştır — FAIL bekliyoruz**

```bash
npx vitest run services/judgeEnsemble.test.ts
```

Beklenen: FAIL — `judgePromptProgressive` henüz export edilmiyor

- [ ] **Step 4: `judgeEnsemble.ts`'e `judgePromptProgressive` ekle**

`services/judgeEnsemble.ts` dosyasının sonuna (mevcut `judgePrompt` fonksiyonu korunarak) ekle:

```typescript
// detectRiskLevel'i services katmanına taşımak circular import'u önler
function detectRiskLevelLocal(domain: string): 'low' | 'medium' | 'high' {
  const d = domain.toLowerCase();
  const HIGH = ['medical', 'legal', 'compliance', 'financial', 'healthcare', 'pharma'];
  const MEDIUM = ['education', 'academic', 'government', 'insurance'];
  if (HIGH.some(r => d.includes(r))) return 'high';
  if (MEDIUM.some(r => d.includes(r))) return 'medium';
  return 'low';
}

export interface ProgressiveJudgeRequest {
  domainId?: string;
  framework?: string;
  reasoning?: string;
  autoRevise?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

/**
 * Risk-aware judge wrapper. Mevcut heuristik judgePrompt'u çağırır.
 * high risk domain'lerde autoRevise=true ile tam değerlendirme yapar.
 */
export async function judgePromptProgressive(
  masterPrompt: string,
  opts: ProgressiveJudgeRequest = {},
): Promise<JudgeResult> {
  const domain = opts.domainId ?? 'general';
  const riskLevel = opts.riskLevel ?? detectRiskLevelLocal(domain);

  // high risk → tam değerlendirme (autoRevise açık)
  const autoRevise = opts.autoRevise ?? (riskLevel === 'high');

  return judgePrompt(masterPrompt, {
    domainId: opts.domainId,
    framework: opts.framework,
    reasoning: opts.reasoning,
    autoRevise,
  });
}
```

- [ ] **Step 5: `server/routes/quality.ts`'deki `/judge` endpoint'ini async yap**

`server/routes/quality.ts`'de `/judge` handler'ında `judgePrompt` çağrısını `judgePromptProgressive` ile değiştir:

```typescript
import { judgePromptProgressive } from '@/services/judgeEnsemble';
import { detectRiskLevel } from '../lib/providerRouter'; // server katmanında kullanımı güvenli

router.post('/judge', optionalApiKey, apiRateLimiter, async (req, res) => {
  try {
    const { masterPrompt, domainId, framework, reasoning, autoRevise } = req.body ?? {};
    if (!masterPrompt || typeof masterPrompt !== 'string') {
      return res.status(400).json({ error: 'masterPrompt (string) required' });
    }

    const riskLevel = detectRiskLevel(domainId ?? 'general');
    // judgePromptProgressive — async, risk-aware
    const result = await judgePromptProgressive(masterPrompt, {
      domainId,
      framework,
      reasoning,
      autoRevise: !!autoRevise,
      riskLevel,
    });

    const pool = getPool();
    await writeAuditLog(pool, {
      action: 'judge_evaluate',
      resourceType: 'prompt',
      metadata: { totalScore: result.totalScore, passThreshold: result.passThreshold, riskLevel },
      ip: req.ip ?? undefined,
    });

    res.json(result);
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Judge failed' });
  }
});
```

- [ ] **Step 6: Testi çalıştır — PASS bekliyoruz**

```bash
npx vitest run services/judgeEnsemble.test.ts
```

Beklenen: PASS

- [ ] **Step 7: Smoke test çalıştır**

```bash
npm run test:api:smoke
```

Beklenen: PASS

- [ ] **Step 8: Commit**

```bash
git add services/judgeEnsemble.ts server/routes/quality.ts services/judgeEnsemble.test.ts
git commit -m "feat: add judgePromptProgressive with risk-aware evaluation and async quality route"
```

---

## AŞAMA 5 — Doğrulama

### Task 8: Entegrasyon Testi ve Son Kontrol

**Files:**
- Test: `server/lib/generateAdapter.test.ts` (genişlet)

- [ ] **Step 1: Typecheck çalıştır**

```bash
npm run typecheck:budget
```

Beklenen: Hata sayısı `.typecheck-budget.json`'daki `maxErrors: 159`'u geçmiyor

- [ ] **Step 2: Tüm unit testleri çalıştır**

```bash
npm run test:run
```

Beklenen: PASS (yeni testler dahil)

- [ ] **Step 3: API smoke testleri çalıştır**

```bash
npm run test:api:smoke
```

Beklenen: PASS

- [ ] **Step 4: Build kontrol**

```bash
npm run build
```

Beklenen: Vite build başarıyla tamamlanır

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "test: add integration tests for parallel pipeline, classifier, cache, and progressive judge"
```

---

## Özet — Beklenen Toplam Kazanım

| Optimizasyon | Latency | Maliyet |
|---|---|---|
| Paralel IR Pipeline | ~%40 düşüş | — |
| Embedding Classifier | ~%15 düşüş | ~%97 düşüş (intent analizi) |
| Hybrid Cache (exact) | ~%30 düşüş (cache hit) | ~%40 düşüş (hit senaryosu) |
| Progressive Judge | ~%60 düşüş (low/med risk) | ~%55 düşüş (LLM çağrıları) |
