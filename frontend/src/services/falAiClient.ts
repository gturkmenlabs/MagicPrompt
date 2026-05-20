const FAL_QUEUE_BASE = 'https://queue.fal.run';

export interface FalQueueResponse {
  request_id?: string;
  status_url?: string;
  response_url?: string;
  [key: string]: unknown;
}

function withAuthHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Key ${apiKey.trim()}`,
    'Content-Type': 'application/json',
  };
}

async function submitQueueJob(modelId: string, input: Record<string, unknown>, apiKey: string): Promise<FalQueueResponse> {
  const res = await fetch(`${FAL_QUEUE_BASE}/${modelId}`, {
    method: 'POST',
    headers: withAuthHeaders(apiKey),
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `fal.ai submit failed (${res.status})`);
  }
  return data as FalQueueResponse;
}

async function getJson(url: string, apiKey: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    headers: { Authorization: `Key ${apiKey.trim()}` },
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `fal.ai polling failed (${res.status})`);
  }
  return data;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForQueueResult(
  modelId: string,
  queue: FalQueueResponse,
  apiKey: string
): Promise<Record<string, unknown>> {
  const requestId = typeof queue.request_id === 'string' ? queue.request_id : '';
  const statusUrl = typeof queue.status_url === 'string'
    ? queue.status_url
    : `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}/status`;
  const resultUrl = typeof queue.response_url === 'string'
    ? queue.response_url
    : `${FAL_QUEUE_BASE}/${modelId}/requests/${requestId}`;

  for (let attempt = 0; attempt < 120; attempt++) {
    const statusData = await getJson(statusUrl, apiKey);
    const statusValue = String(statusData.status ?? statusData.state ?? '').toUpperCase();
    if (statusValue === 'COMPLETED') {
      return getJson(resultUrl, apiKey);
    }
    if (statusValue === 'FAILED' || statusValue === 'ERROR') {
      throw new Error(String(statusData.error ?? 'fal.ai request failed'));
    }
    await sleep(1200);
  }
  throw new Error('fal.ai request timed out');
}

function extractImageUrl(payload: Record<string, unknown>): string | null {
  const direct = payload.image && typeof payload.image === 'object' ? (payload.image as Record<string, unknown>).url : null;
  if (typeof direct === 'string') return direct;
  const images = Array.isArray(payload.images) ? payload.images : [];
  const first = images[0] as Record<string, unknown> | undefined;
  if (first && typeof first.url === 'string') return first.url;
  if (typeof payload.url === 'string') return payload.url;
  return null;
}

function extractAudioUrl(payload: Record<string, unknown>): string | null {
  const audio = payload.audio as Record<string, unknown> | undefined;
  if (audio && typeof audio.url === 'string') return audio.url;
  if (typeof payload.audio_url === 'string') return payload.audio_url;
  if (typeof payload.url === 'string') return payload.url;
  return null;
}

export async function generateFalImage(params: {
  apiKey: string;
  modelId: string;
  prompt: string;
}): Promise<{ imageUrl: string; raw: Record<string, unknown> }> {
  const queue = await submitQueueJob(params.modelId, { prompt: params.prompt }, params.apiKey);
  const result = await waitForQueueResult(params.modelId, queue, params.apiKey);
  const imageUrl = extractImageUrl(result);
  if (!imageUrl) throw new Error('fal.ai image URL not found in result');
  return { imageUrl, raw: result };
}

export async function generateFalSpeech(params: {
  apiKey: string;
  modelId: string;
  text: string;
  voice?: string;
}): Promise<{ audioUrl: string; raw: Record<string, unknown> }> {
  const input: Record<string, unknown> = { text: params.text };
  if (params.voice?.trim()) input.voice = params.voice.trim();
  const queue = await submitQueueJob(params.modelId, input, params.apiKey);
  const result = await waitForQueueResult(params.modelId, queue, params.apiKey);
  const audioUrl = extractAudioUrl(result);
  if (!audioUrl) throw new Error('fal.ai audio URL not found in result');
  return { audioUrl, raw: result };
}
