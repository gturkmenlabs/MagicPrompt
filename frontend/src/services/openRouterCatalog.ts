/**
 * OpenRouter catalog client — GET /v1/openrouter/models.
 * Backend 10dk bellek cache tutuyor; FE ek caching yapmaz (sessiona ozel).
 *
 * @see server/lib/openRouterCatalog.ts
 */

import { API_BASE, getAuthHeaders } from './apiClient';
import { OPENROUTER_MODELS, type OpenRouterModelOption } from '@/data/openRouterModels';

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
  source: 'fresh' | 'cache';
}

/**
 * OpenRouter'in tum modellerini getir. Hata durumunda statik fallback listeyi
 * OpenRouterModelEntry formatina cevirip dondurur — UI bosta kalmaz.
 */
export async function fetchOpenRouterCatalog(options: { force?: boolean } = {}): Promise<OpenRouterModelCatalog> {
  const headers = await getAuthHeaders();
  const url = `${API_BASE}/openrouter/models${options.force ? '?force=1' : ''}`;
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as OpenRouterModelCatalog;
  } catch {
    return {
      models: OPENROUTER_MODELS.map(fallbackToEntry),
      total: OPENROUTER_MODELS.length,
      updatedAt: Date.now(),
      source: 'cache',
    };
  }
}

function fallbackToEntry(m: OpenRouterModelOption): OpenRouterModelEntry {
  return {
    id: m.id,
    label: m.label,
    free: m.free ?? false,
  };
}
