/**
 * AdvancedCache unit tests — L1-only path + adapter contract.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AdvancedCache } from './advancedCache';
import { L1LruCache } from './l1Lru';
import { generateFingerprint, normalizeIntent, stableHash } from './fingerprint';
import type { CacheEntry, L2CacheAdapter, L3CacheAdapter } from './types';
import type { PromptResponse } from '../../types';

const dummyResponse = (label: string): PromptResponse => ({
  masterPrompt: `prompt-${label}`,
  detectedFramework: 'CoT',
  detectedDomain: 'general',
});

const baseKey = {
  intent: 'Summarize quarterly revenue',
  domainId: 'finance',
  framework: 'CoT',
  provider: 'openai',
};

describe('fingerprint', () => {
  it('stableHash is deterministic', () => {
    expect(stableHash('hello world')).toEqual(stableHash('hello world'));
  });

  it('normalizeIntent is order-independent and case-insensitive', () => {
    expect(normalizeIntent('Hello, World!')).toEqual(normalizeIntent('world hello'));
  });

  it('generateFingerprint differs by domain/framework/provider', () => {
    const a = generateFingerprint(baseKey);
    const b = generateFingerprint({ ...baseKey, provider: 'anthropic' });
    expect(a).not.toEqual(b);
  });
});

describe('L1LruCache', () => {
  let l1: L1LruCache;
  beforeEach(() => { l1 = new L1LruCache({ capacity: 3, ttlMs: 60_000 }); });

  const entry = (fp: string): CacheEntry => ({
    fingerprint: fp,
    response: dummyResponse(fp),
    createdAt: Date.now(),
    hitCount: 0,
    intent: fp,
    domainId: 'd',
    framework: 'CoT',
    provider: 'openai',
  });

  it('evicts least-recently-used when over capacity', () => {
    l1.set(entry('a'));
    l1.set(entry('b'));
    l1.set(entry('c'));
    l1.get('a'); // bump a to most-recent
    l1.set(entry('d')); // should evict b
    expect(l1.get('b')).toBeNull();
    expect(l1.get('a')).not.toBeNull();
    expect(l1.get('d')).not.toBeNull();
  });

  it('honors TTL', () => {
    const past = Date.now() - 120_000;
    const e = entry('old');
    e.createdAt = past;
    l1.set(e);
    expect(l1.get('old')).toBeNull();
  });

  it('deletePattern with trailing star', () => {
    l1.set(entry('user:1:a'));
    l1.set(entry('user:1:b'));
    l1.set(entry('user:2:a'));
    expect(l1.deletePattern('user:1:*')).toBe(2);
    expect(l1.get('user:2:a')).not.toBeNull();
  });
});

describe('AdvancedCache', () => {
  it('returns null on miss with no adapters', async () => {
    const cache = new AdvancedCache();
    expect(await cache.get(baseKey)).toBeNull();
  });

  it('write-through populates L1 and serves from L1', async () => {
    const cache = new AdvancedCache();
    await cache.put(baseKey, dummyResponse('a'));
    const hit = await cache.get(baseKey);
    expect(hit).not.toBeNull();
    expect(hit?.tier).toBe('l1');
  });

  it('coalesces concurrent lookups (single-flight)', async () => {
    let calls = 0;
    const fakeL2: L2CacheAdapter = {
      async get() {
        calls++;
        await new Promise((r) => setTimeout(r, 20));
        return null;
      },
      async set() { /* noop */ },
      async delete() { /* noop */ },
      async deletePattern() { return 0; },
      onInvalidate() { return () => undefined; },
      async publishInvalidate() { /* noop */ },
    };
    const cache = new AdvancedCache({ l2: fakeL2 });
    await Promise.all([cache.get(baseKey), cache.get(baseKey), cache.get(baseKey)]);
    expect(calls).toBe(1);
  });

  it('promotes L2 hit into L1', async () => {
    const fp = generateFingerprint(baseKey);
    const stored: CacheEntry = {
      fingerprint: fp,
      response: dummyResponse('l2-hit'),
      createdAt: Date.now(),
      hitCount: 0,
      intent: baseKey.intent,
      domainId: baseKey.domainId,
      framework: baseKey.framework,
      provider: baseKey.provider,
    };
    const fakeL2: L2CacheAdapter = {
      async get(f) { return f === fp ? stored : null; },
      async set() {},
      async delete() {},
      async deletePattern() { return 0; },
      onInvalidate() { return () => undefined; },
      async publishInvalidate() {},
    };
    const cache = new AdvancedCache({ l2: fakeL2 });
    const first = await cache.get(baseKey);
    expect(first?.tier).toBe('l2');
    const second = await cache.get(baseKey);
    expect(second?.tier).toBe('l1');
  });

  it('semantic L3 hit when above threshold', async () => {
    const fakeL3: L3CacheAdapter = {
      async getByFingerprint() { return null; },
      async getBySimilarity() {
        return {
          entry: {
            fingerprint: 'semantic-fp',
            response: dummyResponse('sem'),
            createdAt: Date.now(),
            hitCount: 0,
            intent: 'similar intent',
            domainId: baseKey.domainId,
            framework: baseKey.framework,
            provider: baseKey.provider,
          },
          similarity: 0.91,
        };
      },
      async set() {},
      async delete() {},
      async invalidateProvider() { return 0; },
      async topN() { return []; },
    };
    const cache = new AdvancedCache({
      l3: fakeL3,
      embedder: async () => [0.1, 0.2, 0.3],
    });
    const hit = await cache.get(baseKey);
    expect(hit?.tier).toBe('l3');
    expect(hit?.similarity).toBeGreaterThan(0.85);
  });

  it('invalidateProvider clears L1 and calls L3', async () => {
    let l3Calls = 0;
    const fakeL3: L3CacheAdapter = {
      async getByFingerprint() { return null; },
      async getBySimilarity() { return null; },
      async set() {},
      async delete() {},
      async invalidateProvider() { l3Calls++; return 5; },
      async topN() { return []; },
    };
    const cache = new AdvancedCache({ l3: fakeL3 });
    await cache.put(baseKey, dummyResponse('x'));
    const count = await cache.invalidateProvider('openai');
    expect(count).toBe(5);
    expect(l3Calls).toBe(1);
    expect(await cache.get(baseKey)).toBeNull();
  });

  it('cross-instance invalidate purges L1', async () => {
    const handlerHolder: { fn: ((p: string) => void) | null } = { fn: null };
    const fakeL2: L2CacheAdapter = {
      async get() { return null; },
      async set() {},
      async delete() {},
      async deletePattern() { return 0; },
      onInvalidate(h) { handlerHolder.fn = h; return () => undefined; },
      async publishInvalidate() {},
    };
    const cache = new AdvancedCache({ l2: fakeL2 });
    await cache.put(baseKey, dummyResponse('a'));
    expect(await cache.get(baseKey)).not.toBeNull();
    // simulate invalidate event from another instance
    handlerHolder.fn?.('*');
    expect(await cache.get(baseKey)).toBeNull();
  });
});
