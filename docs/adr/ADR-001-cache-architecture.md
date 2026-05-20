# ADR-001: Three-Tier Cache Architecture (L1 → L2 → L3)

- **Status**: Accepted (Phase 1.1)
- **Date**: 2026-05-20
- **Supersedes**: ad-hoc `shared/services/semanticCache.ts` (in-memory Jaccard, MAX_SIZE=100, TTL=30 min)

## Context

The existing semantic cache:
- Lives in process memory only; lost on restart
- Uses Jaccard word-set similarity (cheap but recall-limited)
- Has no cross-instance sharing
- Max 100 entries; TTL 30 min

v4.0 targets ≥60 % hit rate and p95<200 ms. Existing cache cannot meet either at scale.

## Decision

Three-tier read-through, write-through cache:

```
read:   L1 (in-proc LRU) → L2 (Redis) → L3 (pg+pgvector) → origin
write:  origin → write to L3 → publish invalidation → backfill L1+L2 lazily
```

### L1 — In-process LRU
- Library: hand-rolled (avoid new deps) wrapping a `Map` with access-order eviction
- Capacity: 1000 entries
- TTL: 5 min
- Purpose: <1 ms hot-path lookups, per-instance

### L2 — Redis
- Key: `nm:v4:cache:<fingerprint>`
- TTL: 1 hour
- Value: JSON-serialized `CacheEntry`
- Purpose: cross-instance share, survives single-pod restart
- Cluster-aware (uses ioredis if available; falls back to no-op if `REDIS_URL` absent)

### L3 — Postgres + pgvector
- Table: `prompt_cache_v4` (intent_embedding vector(1536), entry jsonb, fingerprint text PK, created_at timestamptz, hit_count int)
- TTL: 24 hours (configurable per org)
- Similarity: cosine, threshold ≥ 0.85 = hit
- Purpose: durable + semantic recall via embeddings

### Embeddings
- Generated via existing `backend/server/lib/embeddings.ts`
- Cached at write time; never re-computed at read time

### Invalidation
- `cacheInvalidate(filter)` publishes event on Redis pub/sub channel `nm:v4:cache:invalidate`
- All instances subscribe and purge matching L1 entries
- L2 entries deleted by pattern; L3 entries soft-deleted (set `tombstoned_at`)
- Provider update → invalidate all entries tagged with that provider

### Cache Warming
- Startup task reads top-100 prompts by hit_count from L3 → preloads L2
- Runs in `backend/server/lib/cacheWarm.ts` after DB connection ready
- Non-blocking; logged

### Observability
- Counters: `cache_l1_hits`, `cache_l2_hits`, `cache_l3_hits`, `cache_misses`
- Histograms: `cache_lookup_duration_ms` labeled by tier
- WebSocket dashboard: `/v1/cache/stats/ws` (Phase 1.3)

## Backward Compatibility

- `semanticCache.ts` exports unchanged: `cacheGet`, `cachePut`, `getCacheStats`, `cacheClear`
- Internally delegates to `advancedCache` when `featureFlags.advancedCache === true`
- Default OFF; flipping the flag is a single-line change

## Risks

- pgvector cold reads can be slow without proper IVFFlat index → migration includes `CREATE INDEX ... USING ivfflat`
- Cache stampede on cold cache → use `singleflight` style coalescing on origin lookups
- Embedding generation cost — only embed at write, never at read

## Alternatives Considered

- **Redis-only**: cheap but loses semantic recall benefits
- **pgvector-only**: works but high latency per request
- **External cache (Momento/Upstash)**: vendor lock-in, postponed
