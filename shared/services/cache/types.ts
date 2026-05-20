/**
 * Cache types — shared by all tiers (L1 in-proc, L2 Redis adapter, L3 Postgres adapter).
 *
 * See ADR-001-cache-architecture.md.
 */

import type { PromptResponse } from '../../types';

export interface CacheEntry {
  fingerprint: string;
  response: PromptResponse;
  createdAt: number;
  hitCount: number;
  intent: string;
  domainId: string;
  framework: string;
  provider: string;
  styleProfileId?: string;
  /** Optional embedding for L3 similarity search (length depends on provider). */
  embedding?: readonly number[];
  /** Provider version tag — used to invalidate on provider updates. */
  providerVersion?: string;
}

export interface CacheLookupKey {
  intent: string;
  domainId: string;
  framework: string;
  provider: string;
  styleProfileId?: string;
}

export type CacheTier = 'l1' | 'l2' | 'l3';

export interface CacheHit {
  entry: CacheEntry;
  tier: CacheTier;
  /** Cosine similarity (0..1) when L3 semantic hit; else exact-match → 1. */
  similarity: number;
}

export interface CacheTierStats {
  hits: number;
  misses: number;
  size: number;
}

export interface AdvancedCacheStats {
  l1: CacheTierStats;
  l2: CacheTierStats;
  l3: CacheTierStats;
  /** Overall hit rate (0..1). */
  hitRate: number;
  /** Total lookups since process start. */
  totalLookups: number;
}

/** Adapter interface for L2 (Redis). Backend provides a real impl; tests use no-op. */
export interface L2CacheAdapter {
  get(fingerprint: string): Promise<CacheEntry | null>;
  set(entry: CacheEntry, ttlSec: number): Promise<void>;
  delete(fingerprint: string): Promise<void>;
  /** Pattern-based delete for invalidation (e.g. `provider:openai:*`). */
  deletePattern(pattern: string): Promise<number>;
  /** Subscribe to invalidation events from other instances. */
  onInvalidate(handler: (pattern: string) => void): () => void;
  /** Publish invalidation to all instances. */
  publishInvalidate(pattern: string): Promise<void>;
}

/** Adapter interface for L3 (Postgres + pgvector). */
export interface L3CacheAdapter {
  /** Exact fingerprint lookup. */
  getByFingerprint(fingerprint: string): Promise<CacheEntry | null>;
  /**
   * Semantic lookup via pgvector cosine similarity.
   * Returns the best match if similarity ≥ threshold, else null.
   */
  getBySimilarity(
    embedding: readonly number[],
    filter: { domainId: string; framework: string; provider: string; styleProfileId?: string },
    threshold: number,
  ): Promise<{ entry: CacheEntry; similarity: number } | null>;
  set(entry: CacheEntry): Promise<void>;
  delete(fingerprint: string): Promise<void>;
  invalidateProvider(provider: string, providerVersion?: string): Promise<number>;
  /** Top-N entries by hit_count, for cache warming. */
  topN(limit: number): Promise<readonly CacheEntry[]>;
}
