/**
 * AdvancedCache — read-through, write-through L1 → L2 → L3 stack.
 *
 * Per ADR-001:
 *   read:  L1 (in-proc LRU) → L2 (Redis) → L3 (pg+pgvector) → origin
 *   write: caller persists origin, then advancedCache.put() writes L3+L2+L1
 *
 * Adapters are injected. When Redis / pgvector are absent, no-op adapters keep
 * the stack functional as L1-only.
 *
 * Single-flight: concurrent lookups for the same fingerprint share one origin call.
 */

import type {
  AdvancedCacheStats,
  CacheEntry,
  CacheHit,
  CacheLookupKey,
  CacheTier,
  L2CacheAdapter,
  L3CacheAdapter,
} from './types';
import { L1LruCache, type L1Options } from './l1Lru';
import { noopL2, noopL3 } from './noopAdapters';
import { generateFingerprint } from './fingerprint';
import type { PromptResponse } from '../../types';

export interface AdvancedCacheOptions {
  l1?: L1Options;
  l2?: L2CacheAdapter;
  l3?: L3CacheAdapter;
  /** Cosine similarity threshold for L3 semantic hit. */
  l3SimilarityThreshold?: number;
  /** L2 TTL in seconds. */
  l2TtlSec?: number;
  /** Optional embedder used when caller doesn't supply embedding at write time. */
  embedder?: (text: string) => Promise<readonly number[]>;
  /** Optional logger; defaults to silent. */
  logger?: { warn(msg: string, ctx?: unknown): void };
}

export class AdvancedCache {
  private readonly l1: L1LruCache;
  private readonly l2: L2CacheAdapter;
  private readonly l3: L3CacheAdapter;
  private readonly threshold: number;
  private readonly l2TtlSec: number;
  private readonly embedder?: (text: string) => Promise<readonly number[]>;
  private readonly logger: { warn(msg: string, ctx?: unknown): void };
  private readonly inflight = new Map<string, Promise<CacheHit | null>>();
  private _totalLookups = 0;

  constructor(opts: AdvancedCacheOptions = {}) {
    this.l1 = new L1LruCache(opts.l1);
    this.l2 = opts.l2 ?? noopL2;
    this.l3 = opts.l3 ?? noopL3;
    this.threshold = opts.l3SimilarityThreshold ?? 0.85;
    this.l2TtlSec = opts.l2TtlSec ?? 3600;
    this.embedder = opts.embedder;
    this.logger = opts.logger ?? { warn: () => undefined };

    // Cross-instance invalidation
    this.l2.onInvalidate((pattern) => {
      this.l1.deletePattern(pattern);
    });
  }

  /**
   * Read-through lookup. Walks L1 → L2 → L3.
   * Returns null on miss; caller must compute origin and call `put()`.
   * Concurrent identical lookups are coalesced (single-flight).
   */
  async get(key: CacheLookupKey): Promise<CacheHit | null> {
    this._totalLookups++;
    const fingerprint = generateFingerprint(key);

    const pending = this.inflight.get(fingerprint);
    if (pending) return pending;

    const lookup = this.doLookup(fingerprint, key);
    this.inflight.set(fingerprint, lookup);
    try {
      return await lookup;
    } finally {
      this.inflight.delete(fingerprint);
    }
  }

  private async doLookup(fingerprint: string, key: CacheLookupKey): Promise<CacheHit | null> {
    // L1
    const l1Entry = this.l1.get(fingerprint);
    if (l1Entry) return { entry: l1Entry, tier: 'l1', similarity: 1 };

    // L2
    try {
      const l2Entry = await this.l2.get(fingerprint);
      if (l2Entry) {
        this.l1.set(l2Entry);
        return { entry: l2Entry, tier: 'l2', similarity: 1 };
      }
    } catch (err) {
      this.logger.warn('cache.l2.get failed', err);
    }

    // L3 exact
    try {
      const l3Exact = await this.l3.getByFingerprint(fingerprint);
      if (l3Exact) {
        this.l1.set(l3Exact);
        void this.l2.set(l3Exact, this.l2TtlSec).catch((e) =>
          this.logger.warn('cache.l2.set backfill failed', e),
        );
        return { entry: l3Exact, tier: 'l3', similarity: 1 };
      }
    } catch (err) {
      this.logger.warn('cache.l3.getByFingerprint failed', err);
    }

    // L3 semantic
    if (this.embedder) {
      try {
        const embedding = await this.embedder(key.intent);
        const semantic = await this.l3.getBySimilarity(
          embedding,
          {
            domainId: key.domainId,
            framework: key.framework,
            provider: key.provider,
            styleProfileId: key.styleProfileId,
          },
          this.threshold,
        );
        if (semantic) {
          this.l1.set(semantic.entry);
          void this.l2.set(semantic.entry, this.l2TtlSec).catch((e) =>
            this.logger.warn('cache.l2.set backfill failed', e),
          );
          return { entry: semantic.entry, tier: 'l3', similarity: semantic.similarity };
        }
      } catch (err) {
        this.logger.warn('cache.l3.getBySimilarity failed', err);
      }
    }

    return null;
  }

  /**
   * Write-through: caller has fresh response. Writes L3 (durable) then L2 then L1.
   * Embedding is computed lazily via the configured embedder if not provided.
   */
  async put(
    key: CacheLookupKey,
    response: PromptResponse,
    extras: { embedding?: readonly number[]; providerVersion?: string } = {},
  ): Promise<CacheEntry> {
    const fingerprint = generateFingerprint(key);
    let embedding = extras.embedding;
    if (!embedding && this.embedder) {
      try { embedding = await this.embedder(key.intent); } catch (err) {
        this.logger.warn('cache.put embed failed', err);
      }
    }
    const entry: CacheEntry = {
      fingerprint,
      response,
      createdAt: Date.now(),
      hitCount: 0,
      intent: key.intent,
      domainId: key.domainId,
      framework: key.framework,
      provider: key.provider,
      styleProfileId: key.styleProfileId,
      embedding,
      providerVersion: extras.providerVersion,
    };
    // Order matters: durable first, then propagate up.
    try { await this.l3.set(entry); } catch (err) {
      this.logger.warn('cache.l3.set failed', err);
    }
    try { await this.l2.set(entry, this.l2TtlSec); } catch (err) {
      this.logger.warn('cache.l2.set failed', err);
    }
    this.l1.set(entry);
    return entry;
  }

  /** Invalidate by fingerprint or glob pattern across all tiers + publish to peers. */
  async invalidate(patternOrFp: string): Promise<void> {
    this.l1.deletePattern(patternOrFp);
    try {
      if (patternOrFp.includes('*')) await this.l2.deletePattern(patternOrFp);
      else await this.l2.delete(patternOrFp);
    } catch (err) { this.logger.warn('cache.l2 invalidate failed', err); }
    try { await this.l2.publishInvalidate(patternOrFp); } catch (err) {
      this.logger.warn('cache.l2 publish invalidate failed', err);
    }
    if (!patternOrFp.includes('*')) {
      try { await this.l3.delete(patternOrFp); } catch (err) {
        this.logger.warn('cache.l3.delete failed', err);
      }
    }
  }

  async invalidateProvider(provider: string, providerVersion?: string): Promise<number> {
    // L1 has no provider tag → flush; cheap.
    this.l1.clear();
    let count = 0;
    try { count = await this.l3.invalidateProvider(provider, providerVersion); } catch (err) {
      this.logger.warn('cache.l3.invalidateProvider failed', err);
    }
    const pattern = `provider:${provider}:*`;
    try { await this.l2.deletePattern(pattern); } catch (err) {
      this.logger.warn('cache.l2 invalidateProvider failed', err);
    }
    try { await this.l2.publishInvalidate(pattern); } catch { /* noop */ }
    return count;
  }

  /** Warm L1+L2 with top-N entries from L3 on startup. Non-blocking. */
  async warm(limit = 100): Promise<number> {
    let warmed = 0;
    try {
      const top = await this.l3.topN(limit);
      for (const entry of top) {
        this.l1.set(entry);
        try { await this.l2.set(entry, this.l2TtlSec); } catch { /* noop */ }
        warmed++;
      }
    } catch (err) {
      this.logger.warn('cache.warm failed', err);
    }
    return warmed;
  }

  stats(): AdvancedCacheStats {
    const l1 = { hits: this.l1.hits, misses: this.l1.misses, size: this.l1.size };
    // L2/L3 stats not tracked in shared layer (adapter responsibility); zeros are placeholders.
    const l2 = { hits: 0, misses: 0, size: 0 };
    const l3 = { hits: 0, misses: 0, size: 0 };
    const totalHits = l1.hits + l2.hits + l3.hits;
    return {
      l1,
      l2,
      l3,
      hitRate: this._totalLookups > 0 ? totalHits / this._totalLookups : 0,
      totalLookups: this._totalLookups,
    };
  }

  // Test helpers
  /** @internal */
  _l1ForTests(): L1LruCache { return this.l1; }
}

/** Convenience: stable tier ordering for metrics labels. */
export const CACHE_TIERS: readonly CacheTier[] = ['l1', 'l2', 'l3'] as const;
