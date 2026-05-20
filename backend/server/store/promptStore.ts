/**
 * Prompt store soyutlamasi — docs/MULTI_TENANCY_AND_KEYS.md.
 * MVP: file tabanli implementasyon. SaaS: DB implementasyonu takilip org_id ile filtreleme.
 */

import * as fileStore from './prompts';
import { getPool } from '../db/client';
import { DbPromptStore } from './dbPromptStore';

export type StoredPrompt = fileStore.StoredPrompt;

export interface ListOptions {
  /** Tenant izolasyonu (DB store'da kullanilir; file store'da yok sayilir) */
  orgId?: string | null;
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}

export interface SavePromptPayload extends Omit<StoredPrompt, 'createdAt'> {
  createdAt?: string;
}

export interface IPromptStore {
  list(options?: ListOptions): Promise<StoredPrompt[]>;
  get(id: string, version?: string, orgId?: string | null): Promise<StoredPrompt | null>;
  save(payload: SavePromptPayload, orgId?: string | null): Promise<StoredPrompt>;
  delete(id: string, version?: string, orgId?: string | null): Promise<boolean>;
  /** Bir prompt'un tum versiyonlarini listele (en yeniden eskiye) */
  listVersions(id: string, orgId?: string | null): Promise<StoredPrompt[]>;
  /** Toplam sayiyi dondur (sayfalama for) */
  count(options?: Omit<ListOptions, 'page' | 'limit'>): Promise<number>;
}

/** File tabanli store (mevcut .prompts/index.json). orgId su an kullanilmiyor. */
const fileStoreAdapter: IPromptStore = {
  async list(options?: ListOptions) {
    let all = fileStore.listPrompts();
    
    if (options?.search) {
      const q = options.search.toLowerCase();
      all = all.filter(p => 
        (p.name || '').toLowerCase().includes(q) || 
        p.masterPrompt.toLowerCase().includes(q)
      );
    }
    
    if (options?.category && options.category !== 'all') {
      all = all.filter(p => (p.meta as any)?.intent === options.category);
    }
    
    if (options?.limit) {
      const page = options.page || 1;
      const start = (page - 1) * options.limit;
      all = all.slice(start, start + options.limit);
    }
    
    return all;
  },
  async count(options?: Omit<ListOptions, 'page' | 'limit'>) {
    let all = fileStore.listPrompts();
    
    if (options?.search) {
      const q = options.search.toLowerCase();
      all = all.filter(p => 
        (p.name || '').toLowerCase().includes(q) || 
        p.masterPrompt.toLowerCase().includes(q)
      );
    }
    
    if (options?.category && options.category !== 'all') {
      all = all.filter(p => (p.meta as any)?.intent === options.category);
    }
    
    return all.length;
  },
  async get(id: string, version?: string, _orgId?: string | null) {
    return fileStore.getPrompt(id, version);
  },
  async save(payload: SavePromptPayload, _orgId?: string | null) {
    return fileStore.savePrompt(payload);
  },
  async delete(id: string, version?: string, _orgId?: string | null) {
    return fileStore.deletePrompt(id, version);
  },
  async listVersions(id: string, _orgId?: string | null) {
    const all = fileStore.listPrompts();
    return all
      .filter((p) => p.id === id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasUsableDbTenant(): boolean {
  const defaultOrgId = process.env.SR_DEFAULT_ORG_ID?.trim();
  if (!defaultOrgId) return true;
  return UUID_RE.test(defaultOrgId);
}

/**
 * Aktif prompt store.
 * SR_USE_DB_STORE=true ve DATABASE_URL/SR_DATABASE_URL tanimliysa DB store kullanilir.
 * Local demo/dev modunda SR_DEFAULT_ORG_ID UUID degilse dosya store'a duser;
 * aksi halde /v1/prompts gibi gerçek UI yüzeyleri 500 ile kirilir.
 */
export function getPromptStore(): IPromptStore {
  if (process.env.SR_USE_DB_STORE === 'true' && hasUsableDbTenant()) {
    const pool = getPool();
    if (pool) return new DbPromptStore(pool);
  }
  return fileStoreAdapter;
}
