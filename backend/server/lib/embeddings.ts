/**
 * Embedding servisi — OpenAI + Ollama destegi.
 *
 * Env:
 *   EMBEDDING_PROVIDER = 'openai' | 'ollama'  (varsayilan: openai)
 *   OPENAI_API_KEY / VITE_OPENAI_API_KEY       (openai for)
 *   OLLAMA_URL          = 'http://localhost:11434' (ollama sunucu adresi)
 *   OLLAMA_EMBED_MODEL  = 'nomic-embed-text'      (ollama embedding modeli)
 *
 * Cache: data/prompt-embeddings-{provider}.json (provider basina ayri)
 */

import fs from 'fs';
import path from 'path';

// ---------- Provider Config ----------

export type EmbeddingProvider = 'openai' | 'ollama';

function getProvider(): EmbeddingProvider {
  const p = (process.env.EMBEDDING_PROVIDER ?? 'openai').toLowerCase();
  return p === 'ollama' ? 'ollama' : 'openai';
}

// OpenAI config
const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const OPENAI_MODEL = 'text-embedding-3-small';
const OPENAI_MAX_BATCH = 2048;

function getOpenAIKey(): string {
  const raw =
    process.env.OPENAI_API_KEY ?? process.env.VITE_OPENAI_API_KEY ?? '';
  return raw.trim();
}

// Ollama config
function getOllamaUrl(): string {
  return process.env.OLLAMA_URL ?? 'http://localhost:11434';
}

function getOllamaModel(): string {
  return process.env.OLLAMA_EMBED_MODEL ?? 'nomic-embed-text';
}

const OLLAMA_MAX_BATCH = 100;

// ---------- Dimension Lookup ----------

const KNOWN_DIMS: Record<string, number> = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
  'nomic-embed-text': 768,
  'mxbai-embed-large': 1024,
  'all-minilm': 384,
  'snowflake-arctic-embed': 1024,
  'bge-m3': 1024,
};

let detectedDim: number | null = null;

/** Embedding boyutu. Bilinen modeller for sabit, yoksa ilk uretimde tespit edilir. */
export function getEmbeddingDim(): number {
  if (detectedDim) return detectedDim;
  const provider = getProvider();
  const model = provider === 'ollama' ? getOllamaModel() : OPENAI_MODEL;
  return KNOWN_DIMS[model] ?? 0; // 0 = henuz bilinmiyor
}

// ---------- Cache ----------

type EmbeddingCache = Record<string, number[]>;
let cache: EmbeddingCache | null = null;
let currentCacheProvider: string | null = null;

function getCachePath(): string {
  const provider = getProvider();
  const model = provider === 'ollama' ? getOllamaModel() : OPENAI_MODEL;
  const slug = `${provider}-${model}`.replace(/[^a-z0-9-]/gi, '_');
  return path.resolve(process.cwd(), 'data', `prompt-embeddings-${slug}.json`);
}

/** Eski cache path (backward compat — openai default) */
const LEGACY_CACHE = path.resolve(process.cwd(), 'data', 'prompt-embeddings.json');

function loadCache(): EmbeddingCache {
  const cp = getCachePath();
  if (cache && currentCacheProvider === cp) return cache;

  currentCacheProvider = cp;
  try {
    // Yeni format
    if (fs.existsSync(cp)) {
      cache = JSON.parse(fs.readFileSync(cp, 'utf-8'));
      return cache!;
    }
    // Legacy openai cache migration
    if (getProvider() === 'openai' && fs.existsSync(LEGACY_CACHE)) {
      cache = JSON.parse(fs.readFileSync(LEGACY_CACHE, 'utf-8'));
      // Yeni dosyaya yaz
      saveCache();
      return cache!;
    }
  } catch {
    // corrupt — start fresh
  }
  cache = {};
  return cache;
}

function saveCache(): void {
  if (!cache) return;
  const cp = getCachePath();
  const dir = path.dirname(cp);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(cp, JSON.stringify(cache), 'utf-8');
}

// ---------- OpenAI Backend ----------

async function openaiEmbed(texts: string[]): Promise<number[][]> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: OPENAI_MODEL, input: texts }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`OpenAI Embeddings API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json().catch(() => ({}));
  const items: Array<{ embedding: number[]; index: number }> = data?.data ?? [];
  // Sort by index (OpenAI returns sorted but just in case)
  items.sort((a, b) => a.index - b.index);
  return items.map((i) => i.embedding);
}

// ---------- Ollama Backend ----------

async function ollamaEmbed(texts: string[]): Promise<number[][]> {
  const url = `${getOllamaUrl()}/api/embed`;
  const model = getOllamaModel();

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama Embed API ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json().catch(() => ({}));
  const embeddings: number[][] = data?.embeddings;
  if (!embeddings || !Array.isArray(embeddings)) {
    throw new Error('Unexpected Ollama embed response format');
  }
  return embeddings;
}

// ---------- Unified API ----------

async function embedBatch(texts: string[]): Promise<number[][]> {
  const provider = getProvider();
  if (provider === 'ollama') {
    return ollamaEmbed(texts);
  }
  return openaiEmbed(texts);
}

function getMaxBatch(): number {
  return getProvider() === 'ollama' ? OLLAMA_MAX_BATCH : OPENAI_MAX_BATCH;
}

function ensureVectors(
  vectors: Array<number[] | undefined>,
  expectedLength: number,
  context: string,
): number[][] {
  const normalized = vectors.filter((v): v is number[] => Array.isArray(v));
  if (normalized.length !== expectedLength) {
    throw new Error(`${context}: embedding vector count mismatch`);
  }
  return normalized;
}

/** Tek metin for embedding uret (cache'li) */
export async function generateEmbedding(text: string): Promise<number[]> {
  const c = loadCache();
  const cached = c[text];
  if (cached) return cached;

  const [vector] = await embedBatch([text]);
  if (!vector) {
    throw new Error('Embedding backend returned empty vector');
  }

  // Auto-detect dim
  if (!detectedDim && vector) detectedDim = vector.length;

  c[text] = vector;
  saveCache();
  return vector;
}

/** Toplu embedding uret (batch, cache'li) */
export async function generateEmbeddings(
  texts: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<number[][]> {
  const c = loadCache();
  const results: Array<number[] | undefined> = new Array(texts.length);
  const uncachedIndices: number[] = [];
  const uncachedTexts: string[] = [];

  for (let i = 0; i < texts.length; i++) {
    const text = texts[i];
    if (text === undefined) continue;
    const cached = c[text];
    if (cached) {
      results[i] = cached;
    } else {
      uncachedIndices.push(i);
      uncachedTexts.push(text);
    }
  }

  if (uncachedTexts.length === 0) {
    onProgress?.(texts.length, texts.length);
    return ensureVectors(results, texts.length, 'cache-only');
  }

  let done = texts.length - uncachedTexts.length;
  onProgress?.(done, texts.length);

  const maxBatch = getMaxBatch();

  for (let start = 0; start < uncachedTexts.length; start += maxBatch) {
    const batch = uncachedTexts.slice(start, start + maxBatch);
    const vectors = await embedBatch(batch);

    for (let j = 0; j < vectors.length; j++) {
      const globalIdx = uncachedIndices[start + j];
      const textKey = uncachedTexts[start + j];
      const vector = vectors[j];
      if (globalIdx === undefined || textKey === undefined || !vector) continue;
      results[globalIdx] = vector;
      c[textKey] = vector;
    }

    // Auto-detect dim
    if (!detectedDim && vectors[0]) detectedDim = vectors[0].length;

    done += batch.length;
    onProgress?.(done, texts.length);
  }

  saveCache();
  return ensureVectors(results, texts.length, 'batch');
}

/** Cache'deki tum embedding'leri dondur */
export function getCachedEmbeddings(): EmbeddingCache {
  return loadCache();
}

/** Cache'de kac embedding var? */
export function getCacheSize(): number {
  return Object.keys(loadCache()).length;
}

/** Aktif provider bilgisi */
export function getProviderInfo(): { provider: EmbeddingProvider; model: string; dim: number } {
  const provider = getProvider();
  const model = provider === 'ollama' ? getOllamaModel() : OPENAI_MODEL;
  return { provider, model, dim: getEmbeddingDim() };
}

export { getCachePath as CACHE_PATH_FN };
