/**
 * L1 in-process LRU cache.
 *
 * Implementation: relies on JS Map's insertion-order iteration for LRU.
 * On every get hit we re-insert to bump position to most-recent.
 * Capacity defaults to 1000; TTL defaults to 5 min (per ADR-001).
 */

import type { CacheEntry } from './types';

export interface L1Options {
  capacity?: number;
  ttlMs?: number;
  now?: () => number;
}

export class L1LruCache {
  private readonly capacity: number;
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly store = new Map<string, CacheEntry>();
  private _hits = 0;
  private _misses = 0;

  constructor(opts: L1Options = {}) {
    this.capacity = opts.capacity ?? 1000;
    this.ttlMs = opts.ttlMs ?? 5 * 60 * 1000;
    this.now = opts.now ?? Date.now;
  }

  get(fingerprint: string): CacheEntry | null {
    const entry = this.store.get(fingerprint);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (this.now() - entry.createdAt > this.ttlMs) {
      this.store.delete(fingerprint);
      this._misses++;
      return null;
    }
    // Re-insert to mark as most-recently-used
    this.store.delete(fingerprint);
    this.store.set(fingerprint, entry);
    entry.hitCount++;
    this._hits++;
    return entry;
  }

  set(entry: CacheEntry): void {
    if (this.store.has(entry.fingerprint)) {
      this.store.delete(entry.fingerprint);
    } else if (this.store.size >= this.capacity) {
      // Evict least-recently-used = first inserted
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(entry.fingerprint, entry);
  }

  delete(fingerprint: string): void {
    this.store.delete(fingerprint);
  }

  /** Drop entries whose fingerprint matches glob-ish pattern (supports trailing `*`). */
  deletePattern(pattern: string): number {
    if (!pattern.includes('*')) {
      return this.store.delete(pattern) ? 1 : 0;
    }
    const prefix = pattern.replace(/\*+$/, '');
    let count = 0;
    for (const key of [...this.store.keys()]) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.store.clear();
    this._hits = 0;
    this._misses = 0;
  }

  get hits(): number { return this._hits; }
  get misses(): number { return this._misses; }
  get size(): number { return this.store.size; }
}
