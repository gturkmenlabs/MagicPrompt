# Performans ve Ölçeklenebilirlik Tasarımı

**Tarih:** 2026-05-06  
**Kapsam:** Progressive Judge, Hybrid Intent Cache, Paralel IR Pipeline, Embedding-Based Intent Classifier  
**Durum:** Onaylandı

---

## 1. Progressive Judge

### Sorun
`pairwiseJudgeLLM.ts` her değerlendirmede `positionSwap=true` varsayılanıyla 2 LLM turu çalıştırıyor. Kötü senaryoda (V3 auto-revise + 2 iterasyon) 4-6 LLM turu mümkün. `judgePrompt()` senkron çalışıyor.

### Tasarım

Risk seviyesine göre kademeli judge çalıştırma:

```
detectRiskLevel(domain) → high / medium / low
    ↓
high   → her zaman çift model + positionSwap (mevcut davranış korunur)
medium → tek model → skor < 65 ise ikinci modeli çağır
low    → tek model → skor < 50 ise ikinci modeli çağır
```

**Eşik Değerleri:**

| Risk | İlk Model Eşiği | positionSwap |
|------|----------------|--------------|
| high | her zaman çift | true |
| medium | 65 | false (ikinci turda true) |
| low | 50 | false |

### Değişecek Dosyalar

- `server/lib/pairwiseJudgeLLM.ts` — `ProgressiveJudgeOptions` interface ekle; `positionSwap` kararını risk + skor bazlı yap
- `services/judgeEnsemble.ts` — `judgePrompt()` → async; `judgePromptProgressive()` wrapper ekle
- `server/routes/quality.ts` — `/judge` endpoint'ini async/await ile sarmal

### Beklenen Kazanım

- `low` risk isteklerin %70'i tek LLM turuyla tamamlanır
- `medium` risk'te %50 tek tur yeterli
- Ortalama latency: ~2000ms → ~800ms
- Maliyet: LLM çağrı sayısı ortalama %55 azalır

---

## 2. Hybrid Intent Cache

### Sorun
`utils/cache.ts`'deki `RedisCache` gerçek Redis bağlantısı yok (stub). Tek katmanlı in-memory cache, semantic similarity yok, 1000 entry limit.

### Tasarım

Üç katmanlı lookup zinciri:

```
Katman 1: Exact Hash (SHA-256, ~0ms)
    hit  → anında döner
    miss ↓
Katman 2: Semantic Similarity (pgvector cosine, ~50ms)
    cosine ≥ 0.92 → cache hit döner
    miss ↓
Katman 3: Full Pipeline
    → sonuç üret
    → exact hash + embedding ile her iki katmana kaydet
```

**TTL Stratejisi:**

| Katman | TTL | Gerekçe |
|--------|-----|---------|
| Exact hash | 24 saat | Birebir aynı intent değişmez |
| Semantic hit | 1 saat | Benzer ama farklı — kısa güvenli |
| Benchmark data | 5 dakika | Mevcut, korunur |

**Arayüz:**

```typescript
interface CacheContext {
  domainId: string;
  framework: string;
  provider: string;
  language: 'en' | 'tr';
}

interface CachedResult {
  hit: boolean;
  source: 'exact' | 'semantic';
  data: PromptResponse;
  similarity?: number; // semantic hit için cosine skoru
}

interface HybridIntentCache {
  lookup(intent: string, context: CacheContext): Promise<CachedResult | null>;
  store(intent: string, context: CacheContext, result: PromptResponse): Promise<void>;
}
```

### Değişecek Dosyalar

- `utils/cache.ts` — `HybridIntentCache` sınıfı ekle; SHA-256 hash; TTL katmanları
- `services/semanticCache.ts` — pgvector cosine similarity sorgusu entegre et
- `server/lib/generateAdapter.ts` — pipeline başında `HybridIntentCache.lookup()`, sonunda `store()`

### Beklenen Kazanım

- Exact hit rate: ilk 24 saatte %25-35
- Semantic hit rate: ek %15-20
- Toplam cache hit → full pipeline maliyeti %40-50 düşer

---

## 3. Paralel IR Pipeline

### Sorun
`generateAdapter.ts`'de Wikipedia fetch, embedding, vector arama ve self-learning adımları sırayla çalışıyor. Wikipedia timeout (8sn) tüm pipeline'ı blokluyor.

### Bağımlılık Grafiği

```
extractIR(intent)                    ← başlangıç
        ↓
    ┌───┴──────────────────────────┐
    │                              │
fetchWikipediaContext()    generateEmbedding(intent)
(IR'dan bağımsız)                  ↓
                           ┌───────┴───────┐
                           │               │
                     vectorSearch()  buildSelfLearningContext()
```

### Çalıştırma Planı

```typescript
// Aşama 1: IR ve Wikipedia paralel — ikisi de yalnızca ham intent'e bağımlı, birbirine değil
const [ir, wikiContext] = await Promise.all([
  extractIR(intent),
  fetchWikipediaContext(intent, language),
]);

// Aşama 2: Embedding (IR'a bağımlı değil ama aşama 3 için gerekli)
const embedding = await generateEmbedding(intent);

// Aşama 3: Vector ve self-learning paralel (embedding'e bağımlı)
const [vectorContext, selfLearningCtx] = await Promise.all([
  vectorSearch(embedding),
  buildSelfLearningContext(embedding),
]);

// Aşama 4: Derleme (tüm context hazır)
return compileIRForProvider(ir, { wikiContext, vectorContext, selfLearningCtx });
```

### Değişecek Dosyalar

- `server/lib/generateAdapter.ts` — pipeline yeniden yapılandır; `Promise.all` grupları

### Beklenen Kazanım

| Senaryo | Şimdiki | Yeni |
|---------|---------|------|
| Normal çalışma | ~3-4sn | ~2sn |
| Wikipedia timeout | ~9sn | ~1sn (paralel, etkilemez) |
| Wikipedia + embedding + vector | ~9.5sn | ~5sn |

---

## 4. Embedding-Based Intent Classifier

### Sorun
`intentAnalyzer.ts:33`'te domain/framework tespiti için tam `generateMasterPromptServer()` çağrısı yapılıyor. Her routing kararı için LLM maliyeti ödeniyor.

### Tasarım

Startup'ta bir kez embedding kataloğu oluştur, runtime'da LLM kullanma:

```
Startup (bir kez):
    57 framework tanımı → embed → belleğe yükle
    59 domain tanımı    → embed → belleğe yükle

Runtime (her istek):
    intent → embed (~50ms)
        ↓
    cosine similarity → top-3 domain + framework skoru
        ↓
    skor ≥ 0.75  → seçildi
    0.50-0.75    → weighted blend (top-2)
    < 0.50       → 'general' / 'AUTO' fallback
```

**Katalog Yapısı:**

```typescript
interface ClassifierCatalog {
  domains: Array<{ id: string; label: string; embedding: number[] }>;
  frameworks: Array<{ id: string; description: string; embedding: number[] }>;
  builtAt: number;
}
```

**Güven Eşikleri:**

| Skor | Karar |
|------|-------|
| ≥ 0.75 | Doğrudan seç |
| 0.50–0.75 | Top-2 weighted blend |
| < 0.50 | Fallback: `general` / `AUTO` |

### Değişecek Dosyalar

- `server/lib/intentAnalyzer.ts` — LLM çağrısı kaldır; `EmbeddingClassifier` sınıfı ekle
- `server/lib/generateAdapter.ts` — `analyzeIntentServer()` yerine `classifyIntent()` çağır
- `server/index.ts` — startup'ta `EmbeddingClassifier.warmup()` çağır

### Beklenen Kazanım

| Metrik | Şimdiki | Yeni |
|--------|---------|------|
| Intent analizi süresi | ~1500ms | ~50ms |
| Maliyet (1000 istek) | ~$1.50 | ~$0.05 |
| LLM bağımlılığı | Her istekte | Sıfır |
| Doğruluk | %85-90 | %80-85 (kabul edilebilir) |

---

## Uygulama Sırası

1. **Paralel IR Pipeline** — en düşük risk, en hızlı kazanım
2. **Embedding-Based Intent Classifier** — bağımsız, LLM maliyetini anında keser
3. **Hybrid Intent Cache** — 1 ve 2 tamamlandıktan sonra cache katmanı ekle
4. **Progressive Judge** — en son; diğer optimizasyonlar sonrası kalan latency'yi hedef alır

## Riskler

| Risk | Olasılık | Azaltma |
|------|---------|---------|
| Embedding classifier doğruluğu düşük | Orta | A/B test; LLM fallback eşiği 0.50'de tut |
| pgvector semantic cache yavaş | Düşük | Index oluştur; timeout ekle, miss olarak işle |
| Paralel pipeline race condition | Düşük | `Promise.allSettled` kullan; hata izolasyonu |
| Progressive judge low skor eşiği çok yüksek | Orta | Eşikleri metrik bazlı ayarla ilk 2 haftada |
