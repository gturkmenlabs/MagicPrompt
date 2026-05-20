/**
 * OpenRouter model catalog — dinamik liste, bellek ici cache.
 * GET https://openrouter.ai/api/v1/models → normalize edilmis format.
 *
 * Cache: 10 dakika. Refresh icin `force=true`.
 */

export interface OpenRouterModelEntry {
  id: string;
  label: string;
  free: boolean;
  contextLength?: number;
  promptPrice?: number;
  completionPrice?: number;
  provider?: string;
  description?: string;
}

export interface OpenRouterModelCatalog {
  models: OpenRouterModelEntry[];
  total: number;
  updatedAt: number;
  /** Cache kaynagi: 'fresh' (API'den yeni geldi) veya 'cache' (bellekten). */
  source: 'fresh' | 'cache';
}

interface CacheEntry {
  catalog: OpenRouterModelCatalog;
  expiresAt: number;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
let cache: CacheEntry | null = null;

function parsePrice(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function normalize(raw: any): OpenRouterModelEntry | null {
  const id = typeof raw?.id === 'string' ? raw.id : null;
  if (!id) return null;
  const name = typeof raw?.name === 'string' && raw.name.trim().length > 0 ? raw.name.trim() : id;
  const prompt = parsePrice(raw?.pricing?.prompt);
  const completion = parsePrice(raw?.pricing?.completion);
  const free = id.endsWith(':free') || (prompt === 0 && (completion === undefined || completion === 0));
  const provider = id.includes('/') ? id.split('/')[0] : undefined;
  const ctx = typeof raw?.context_length === 'number' ? raw.context_length : undefined;
  const desc = typeof raw?.description === 'string' ? raw.description.slice(0, 200) : undefined;
  return {
    id,
    label: free ? `🆓 ${name}` : name,
    free,
    contextLength: ctx,
    promptPrice: prompt,
    completionPrice: completion,
    provider,
    description: desc,
  };
}

/**
 * OpenRouter'dan tum modelleri cek. 10dk bellek cache.
 * Auth: OpenRouter /models endpoint'i key gerektirmez ama varsa gonderiyoruz.
 */
export async function getOpenRouterModelCatalog(options: { force?: boolean } = {}): Promise<OpenRouterModelCatalog> {
  if (!options.force && cache && cache.expiresAt > Date.now()) {
    return { ...cache.catalog, source: 'cache' };
  }

  const key = process.env.OPENROUTER_API_KEY;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (key && !/^your[_-]?openrouter/i.test(key)) {
    headers.Authorization = `Bearer ${key}`;
  }

  const res = await fetch('https://openrouter.ai/api/v1/models', { headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenRouter models API ${res.status}: ${text.slice(0, 200)}`);
  }
  const body = (await res.json()) as { data?: unknown[] };
  const raw = Array.isArray(body.data) ? body.data : [];

  const models = raw
    .map(normalize)
    .filter((m): m is OpenRouterModelEntry => m !== null)
    // Ucretsizler once, sonra saglayiciya gore alfabetik.
    .sort((a, b) => {
      if (a.free !== b.free) return a.free ? -1 : 1;
      return a.id.localeCompare(b.id);
    });

  const catalog: OpenRouterModelCatalog = {
    models,
    total: models.length,
    updatedAt: Date.now(),
    source: 'fresh',
  };

  cache = { catalog, expiresAt: Date.now() + CACHE_TTL_MS };
  return catalog;
}

/** Tests icin cache'i sifirlar. */
export function resetOpenRouterCatalogCache(): void {
  cache = null;
}
