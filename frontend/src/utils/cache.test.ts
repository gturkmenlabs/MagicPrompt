import { describe, it, expect, beforeEach } from 'vitest';

describe('HybridIntentCache', () => {
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

    const hit = await cache.lookup('tamamen farklı xyzzy', ctx);
    expect(hit).toBeNull();
  });

  it('TTL — süresi dolan entry miss dönmeli', async () => {
    const { HybridIntentCache } = await import('./cache');
    const cache = new HybridIntentCache({ exactTtlMs: 10 });
    const ctx = { domainId: 'backend', framework: 'AUTO', provider: 'groq', language: 'en' as const };
    const mockResult = { masterPrompt: 'expired', reasoning: '', resolvedProvider: 'groq', resolvedModel: 'llama' };

    await cache.store('test intent', ctx, mockResult as any);
    await new Promise(r => setTimeout(r, 25));
    const hit = await cache.lookup('test intent', ctx);

    expect(hit).toBeNull();
  });
});
