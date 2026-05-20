const FAL_QUEUE_BASE = 'https://queue.fal.run';
const FAL_API_BASE = 'https://api.fal.ai/v1';

interface FalQueueResponse {
  request_id?: string;
  status_url?: string;
  response_url?: string;
}

function authHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Key ${apiKey.trim()}`,
    'Content-Type': 'application/json',
  };
}

async function submitJob(
  modelId: string,
  input: Record<string, unknown>,
  apiKey: string
): Promise<FalQueueResponse> {
  const res = await fetch(`${FAL_QUEUE_BASE}/${modelId}`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `fal.ai submit failed (${res.status})`);
  }
  return data as FalQueueResponse;
}

async function getJson(url: string, apiKey: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, { headers: { Authorization: `Key ${apiKey.trim()}` } });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `fal.ai polling failed (${res.status})`);
  }
  return data;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForResult(modelId: string, queue: FalQueueResponse, apiKey: string): Promise<Record<string, unknown>> {
  const requestId = typeof queue.request_id === 'string' ? queue.request_id : '';
  const statusUrl = typeof queue.status_url === 'string'
    ? queue.status_url
    : `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}/status`;
  const resultUrl = typeof queue.response_url === 'string'
    ? queue.response_url
    : `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}`;

  for (let i = 0; i < 120; i++) {
    const statusData = await getJson(statusUrl, apiKey);
    const status = String(statusData.status ?? statusData.state ?? '').toUpperCase();
    if (status === 'COMPLETED') {
      return getJson(resultUrl, apiKey);
    }
    if (status === 'FAILED' || status === 'ERROR') {
      throw new Error(String(statusData.error ?? 'fal.ai request failed'));
    }
    await sleep(1200);
  }
  throw new Error('fal.ai request timed out');
}

function extractImageUrl(payload: Record<string, unknown>): string | null {
  const imageObj = payload.image as Record<string, unknown> | undefined;
  if (imageObj && typeof imageObj.url === 'string') return imageObj.url;
  const images = Array.isArray(payload.images) ? payload.images : [];
  const first = images[0] as Record<string, unknown> | undefined;
  if (first && typeof first.url === 'string') return first.url;
  if (typeof payload.url === 'string') return payload.url;
  return null;
}

function extractAudioUrl(payload: Record<string, unknown>): string | null {
  const audioObj = payload.audio as Record<string, unknown> | undefined;
  if (audioObj && typeof audioObj.url === 'string') return audioObj.url;
  if (typeof payload.audio_url === 'string') return payload.audio_url;
  if (typeof payload.url === 'string') return payload.url;
  return null;
}

export async function generateFalImageServer(params: {
  apiKey: string;
  modelId: string;
  prompt: string;
}): Promise<{ imageUrl: string; raw: Record<string, unknown> }> {
  const queue = await submitJob(params.modelId, { prompt: params.prompt }, params.apiKey);
  const result = await waitForResult(params.modelId, queue, params.apiKey);
  const imageUrl = extractImageUrl(result);
  if (!imageUrl) throw new Error('fal.ai image URL not found');
  return { imageUrl, raw: result };
}

export async function generateFalSpeechServer(params: {
  apiKey: string;
  modelId: string;
  text: string;
  voice?: string;
}): Promise<{ audioUrl: string; raw: Record<string, unknown> }> {
  const input: Record<string, unknown> = {
    text: params.text,
    prompt: params.text,
  };
  if (params.voice?.trim()) input.voice = params.voice.trim();
  const queue = await submitJob(params.modelId, input, params.apiKey);
  const result = await waitForResult(params.modelId, queue, params.apiKey);
  const audioUrl = extractAudioUrl(result);
  if (!audioUrl) throw new Error('fal.ai audio URL not found');
  return { audioUrl, raw: result };
}

type FalModelMetadata = {
  display_name?: string;
  category?: string;
  status?: string;
  description?: string;
};

type FalModelRecord = {
  endpoint_id?: string;
  metadata?: FalModelMetadata;
};

type FalModelPage = {
  models?: FalModelRecord[];
  next_cursor?: string | null;
  has_more?: boolean;
};

export async function listFalModelsServer(params: {
  apiKey: string;
  status?: 'active' | 'deprecated' | 'all';
  q?: string;
  category?: string;
  limitPerPage?: number;
  maxPages?: number;
}): Promise<{ models: Array<{ endpointId: string; displayName: string; category: string; status: string }> }> {
  const status = params.status ?? 'active';
  const q = params.q?.trim() ?? '';
  const category = params.category?.trim() ?? '';
  const pageLimit = Math.max(10, Math.min(100, params.limitPerPage ?? 100));
  const maxPages = Math.max(1, Math.min(50, params.maxPages ?? 20));

  const results = new Map<string, { endpointId: string; displayName: string; category: string; status: string }>();
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page += 1) {
    const url = new URL(`${FAL_API_BASE}/models`);
    url.searchParams.set('limit', String(pageLimit));
    if (cursor) url.searchParams.set('cursor', cursor);
    if (status !== 'all') url.searchParams.set('status', status);
    if (q) url.searchParams.set('q', q);
    if (category) url.searchParams.set('category', category);

    const pageData = await getJson(url.toString(), params.apiKey) as FalModelPage;
    const models = Array.isArray(pageData.models) ? pageData.models : [];

    for (const model of models) {
      const endpointId = typeof model.endpoint_id === 'string' ? model.endpoint_id : '';
      if (!endpointId) continue;
      const metadata = model.metadata ?? {};
      const displayName = typeof metadata.display_name === 'string' && metadata.display_name.trim()
        ? metadata.display_name.trim()
        : endpointId;
      const itemCategory = typeof metadata.category === 'string' && metadata.category.trim()
        ? metadata.category.trim()
        : 'unknown';
      const itemStatus = typeof metadata.status === 'string' && metadata.status.trim()
        ? metadata.status.trim()
        : 'unknown';
      results.set(endpointId, { endpointId, displayName, category: itemCategory, status: itemStatus });
    }

    cursor = typeof pageData.next_cursor === 'string' && pageData.next_cursor.trim()
      ? pageData.next_cursor
      : null;
    if (!pageData.has_more || !cursor) break;
  }

  return {
    models: Array.from(results.values()).sort((a, b) => a.displayName.localeCompare(b.displayName)),
  };
}
