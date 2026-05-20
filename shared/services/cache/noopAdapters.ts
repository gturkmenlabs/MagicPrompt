/**
 * No-op L2/L3 adapters. Used when Redis / pgvector is not configured.
 * Lets the cache stack degrade gracefully to L1-only.
 */

import type { CacheEntry, L2CacheAdapter, L3CacheAdapter } from './types';

export const noopL2: L2CacheAdapter = {
  async get(): Promise<CacheEntry | null> { return null; },
  async set(): Promise<void> { /* no-op */ },
  async delete(): Promise<void> { /* no-op */ },
  async deletePattern(): Promise<number> { return 0; },
  onInvalidate(): () => void { return () => undefined; },
  async publishInvalidate(): Promise<void> { /* no-op */ },
};

export const noopL3: L3CacheAdapter = {
  async getByFingerprint(): Promise<CacheEntry | null> { return null; },
  async getBySimilarity(): Promise<null> { return null; },
  async set(): Promise<void> { /* no-op */ },
  async delete(): Promise<void> { /* no-op */ },
  async invalidateProvider(): Promise<number> { return 0; },
  async topN(): Promise<readonly CacheEntry[]> { return []; },
};
