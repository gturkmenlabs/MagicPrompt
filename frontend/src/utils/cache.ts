interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>>;
  private maxSize: number;

  constructor(maxSize: number = 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set<T>(key: string, value: T, ttl: number = 3600000): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value ?? '';
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  has(key: string): boolean {
    return this.cache.has(key) && this.get(key) !== null;
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  cleanExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const memoryCache = new MemoryCache();

setInterval(() => {
  memoryCache.cleanExpired();
}, 60000);

export interface RedisConfig {
  url: string;
  ttl?: number;
}

export class RedisCache {
  private ttl: number;

  constructor(config: RedisConfig) {
    this.ttl = config.ttl || 3600;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = memoryCache.get<string>(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      console.error('Redis get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    try {
      memoryCache.set(key, JSON.stringify(value), (ttl || this.ttl) * 1000);
    } catch (error) {
      console.error('Redis set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    memoryCache.delete(key);
  }

  async clear(): Promise<void> {
    memoryCache.clear();
  }
}

export function createCacheKey(...parts: (string | number)[]): string {
  return parts.map(p => String(p).trim()).join(':');
}

export function hashKey(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

import crypto from 'crypto';

export interface CacheContext {
  domainId: string;
  framework: string;
  provider: string;
  language: 'en' | 'tr';
}

export interface CachedResult {
  hit: boolean;
  source: 'exact' | 'semantic';
  data: Record<string, unknown>;
  similarity?: number;
}

interface HybridCacheOptions {
  exactTtlMs?: number;
  semanticTtlMs?: number;
  maxEntries?: number;
}

export class HybridIntentCache {
  private exactStore: Map<string, { result: Record<string, unknown>; expiresAt: number }> = new Map();
  private readonly exactTtlMs: number;
  private readonly semanticTtlMs: number;
  private readonly maxEntries: number;

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
    const key = this.hashKey(intent, ctx);
    const entry = this.exactStore.get(key);
    if (entry) {
      if (Date.now() < entry.expiresAt) {
        return { hit: true, source: 'exact', data: entry.result };
      }
      this.exactStore.delete(key);
    }
    return null;
  }

  async store(intent: string, ctx: CacheContext, result: Record<string, unknown>): Promise<void> {
    if (this.exactStore.size >= this.maxEntries) {
      const firstKey = this.exactStore.keys().next().value;
      if (firstKey !== undefined) this.exactStore.delete(firstKey);
    }
    const key = this.hashKey(intent, ctx);
    this.exactStore.set(key, { result, expiresAt: Date.now() + this.exactTtlMs });
  }

  stats(): { exactSize: number } {
    return { exactSize: this.exactStore.size };
  }
}

export const hybridIntentCache = new HybridIntentCache();
