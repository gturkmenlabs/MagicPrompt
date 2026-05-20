import { API_BASE, getAuthHeaders } from '@/services/apiClient';

export interface FalModelCatalogItem {
  endpointId: string;
  displayName: string;
  category: string;
  status: string;
}

export async function fetchFalModelsViaApi(params: {
  apiKey: string;
  status?: 'active' | 'deprecated' | 'all';
  q?: string;
  category?: string;
}): Promise<{ models: FalModelCatalogItem[] }> {
  const headers = await getAuthHeaders();
  const query = new URLSearchParams();
  query.set('apiKey', params.apiKey);
  if (params.status) query.set('status', params.status);
  if (params.q?.trim()) query.set('q', params.q.trim());
  if (params.category?.trim()) query.set('category', params.category.trim());

  const res = await fetch(`${API_BASE}/fal/models?${query.toString()}`, {
    method: 'GET',
    headers,
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `fal models API ${res.status}`);
  }
  const models = Array.isArray(data.models) ? data.models as FalModelCatalogItem[] : [];
  return { models };
}

export async function generateFalImageViaApi(params: {
  apiKey: string;
  modelId: string;
  prompt: string;
}): Promise<{ imageUrl: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/fal/image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `fal image API ${res.status}`);
  }
  const imageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : '';
  if (!imageUrl) throw new Error('Image URL missing from fal response');
  return { imageUrl };
}

export async function generateFalSpeechViaApi(params: {
  apiKey: string;
  modelId: string;
  text: string;
  voice?: string;
}): Promise<{ audioUrl: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/fal/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : `fal speech API ${res.status}`);
  }
  const audioUrl = typeof data.audioUrl === 'string' ? data.audioUrl : '';
  if (!audioUrl) throw new Error('Audio URL missing from fal response');
  return { audioUrl };
}
