/**
 * L2 cache adapter — Redis (ioredis).
 *
 * Implements L2CacheAdapter from @shared/services/cache/types.
 *
 * Uses dynamic import for `ioredis` so the backend continues to build/run
 * even when ioredis isn't installed (e.g. dev without Redis). In that case
 * the factory returns null and callers should fall back to the no-op adapter.
 */

import type {
  CacheEntry,
  L2CacheAdapter,
} from '../../../../shared/services/cache/types';

const KEY_PREFIX = 'nm:v4:cache:';
const INVALIDATE_CHANNEL = 'nm:v4:cache:invalidate';

interface MinimalRedis {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode?: string, ttl?: number): Promise<unknown>;
  del(...keys: string[]): Promise<number>;
  scan(cursor: string, ...args: (string | number)[]): Promise<[string, string[]]>;
  publish(channel: string, message: string): Promise<number>;
  subscribe(channel: string): Promise<unknown>;
  on(event: string, handler: (...args: unknown[]) => void): unknown;
  duplicate(): MinimalRedis;
  quit?(): Promise<unknown>;
}

export interface RedisL2Options {
  ttlSec?: number;
  keyPrefix?: string;
}

export class RedisL2Adapter implements L2CacheAdapter {
  private readonly handlers = new Set<(p: string) => void>();
  private readonly subscriber: MinimalRedis;
  private readonly prefix: string;

  constructor(private readonly client: MinimalRedis, opts: RedisL2Options = {}) {
    this.prefix = opts.keyPrefix ?? KEY_PREFIX;
    this.subscriber = client.duplicate();
    void this.subscriber.subscribe(INVALIDATE_CHANNEL);
    this.subscriber.on('message', (channel: unknown, message: unknown) => {
      if (channel === INVALIDATE_CHANNEL && typeof message === 'string') {
        for (const h of this.handlers) h(message);
      }
    });
  }

  private key(fp: string): string { return `${this.prefix}${fp}`; }

  async get(fingerprint: string): Promise<CacheEntry | null> {
    const raw = await this.client.get(this.key(fingerprint));
    if (!raw) return null;
    try { return JSON.parse(raw) as CacheEntry; } catch { return null; }
  }

  async set(entry: CacheEntry, ttlSec: number): Promise<void> {
    await this.client.set(this.key(entry.fingerprint), JSON.stringify(entry), 'EX', ttlSec);
  }

  async delete(fingerprint: string): Promise<void> {
    await this.client.del(this.key(fingerprint));
  }

  async deletePattern(pattern: string): Promise<number> {
    // Normalize incoming pattern (may or may not include our prefix)
    const matchPattern = pattern.startsWith(this.prefix) ? pattern : `${this.prefix}${pattern}`;
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.client.scan(cursor, 'MATCH', matchPattern, 'COUNT', 200);
      cursor = next;
      if (keys.length > 0) {
        deleted += await this.client.del(...keys);
      }
    } while (cursor !== '0');
    return deleted;
  }

  onInvalidate(handler: (pattern: string) => void): () => void {
    this.handlers.add(handler);
    return () => { this.handlers.delete(handler); };
  }

  async publishInvalidate(pattern: string): Promise<void> {
    await this.client.publish(INVALIDATE_CHANNEL, pattern);
  }
}

/**
 * Create a RedisL2Adapter if ioredis is installed and REDIS_URL is set.
 * Returns null otherwise — callers should fall back to `noopL2`.
 */
export async function createRedisL2(redisUrl?: string): Promise<RedisL2Adapter | null> {
  const url = redisUrl ?? process.env.REDIS_URL;
  if (!url) return null;
  try {
    // Indirect specifier so TS doesn't statically resolve the optional dep.
    const specifier = 'ioredis';
    const mod = await import(/* @vite-ignore */ specifier).catch(() => null);
    if (!mod) return null;
    const RedisCtor = (mod as { default?: unknown }).default ?? mod;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = new (RedisCtor as any)(url) as MinimalRedis;
    return new RedisL2Adapter(client);
  } catch {
    return null;
  }
}
