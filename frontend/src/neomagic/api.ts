// NeoMagic — backend API client (Vite proxy → http://localhost:4000)
import { useEffect, useState } from "react";

const BASE = "/v1";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json())?.error ?? ""; } catch { /* ignore */ }
    throw new Error(`${res.status} ${res.statusText}${detail ? ` — ${detail}` : ""}`);
  }
  return res.json() as Promise<T>;
}

// ---------- Types ----------
export interface BackendPrompt {
  id: string;
  version: string;
  name?: string;
  masterPrompt: string;
  reasoning?: string;
  meta?: {
    framework?: string;
    domain?: string;
    domainId?: string;
    judge?: number;
    score?: number;
    tags?: string[];
    category?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PromptListResponse {
  prompts: BackendPrompt[];
  total: number;
  page: number;
  limit: number;
}

export interface LearningStats {
  ok: boolean;
  totalEvents: number;
  filePath?: string;
}

export interface VectorStats {
  ready: boolean;
  backend: string;
  vectorCount: number;
  embeddingCacheSize: number;
  embedding: { provider: string; model: string; dim: number };
}

export interface OpenRouterModel {
  id: string;
  label: string;
  free: boolean;
  contextLength: number;
  promptPrice: number;
  completionPrice: number;
  provider: string;
}

export interface OpenRouterCatalog {
  models: OpenRouterModel[];
}

export interface GenerateRequest {
  intent: string;
  framework?: string;
  domainId?: string;
  provider?: string;
  language?: "tr" | "en";
  outputFormat?: string;
  useSearch?: boolean;
  thinkingMode?: boolean;
  systemPrompt?: string;
  contextRules?: string;
}

export interface GenerateResponse {
  masterPrompt: string;
  reasoning?: string;
  resolvedProvider?: string;
  resolvedModel?: string;
  framework?: string;
  domainId?: string;
  meta?: Record<string, unknown>;
}

export interface JudgeScore {
  criterionId: string;
  score: number;
  reasoning?: string;
  reasoningTr?: string;
  details?: Array<{ rule: string; met: boolean; impact?: number; note?: string; noteTr?: string }>;
}
export interface JudgeResult {
  scores?: JudgeScore[];
  overall?: number;
}

export interface LintIssueDTO {
  ruleId: string;
  severity: "error" | "warning" | "info" | "ok";
  message: string;
  messageTr?: string;
  line?: number | null;
}
export interface LintResult {
  issues: LintIssueDTO[];
}

export interface SemanticSearchHit {
  id: string;
  name?: string;
  text: string;
  score: number;
  metadata?: { name?: string; category?: string; tags?: string[]; lang?: string };
}

// ---------- API ----------
export const api = {
  listPrompts: (opts: { page?: number; limit?: number; search?: string; category?: string } = {}) =>
    jsonFetch<PromptListResponse>(
      `/prompts?page=${opts.page ?? 1}&limit=${opts.limit ?? 50}` +
      (opts.search ? `&search=${encodeURIComponent(opts.search)}` : "") +
      (opts.category ? `&category=${encodeURIComponent(opts.category)}` : "")
    ),

  getPrompt: (id: string, version?: string) =>
    jsonFetch<BackendPrompt>(`/prompts/${encodeURIComponent(id)}${version ? `?version=${encodeURIComponent(version)}` : ""}`),

  semanticSearch: (query: string, topK = 10) =>
    jsonFetch<{ results: SemanticSearchHit[] }>(`/prompts/semantic-search`, {
      method: "POST",
      body: JSON.stringify({ query, topK }),
    }).catch(() => ({ results: [] as SemanticSearchHit[] })),

  vectorStats: () => jsonFetch<VectorStats>(`/prompts/vector-stats`),

  learningStats: () => jsonFetch<LearningStats>(`/learning/stats`),

  openRouterModels: async () => {
    try {
      const catalog = await jsonFetch<OpenRouterCatalog>(`/openrouter/models`);
      return { models: Array.isArray(catalog?.models) ? catalog.models : [] };
    } catch {
      return { models: [] };
    }
  },

  ragHealth: () =>
    jsonFetch<{ ok: boolean; service?: string; backend?: string }>(`/rag/health`)
      .catch(() => ({ ok: false })),

  generate: (req: GenerateRequest) =>
    jsonFetch<GenerateResponse>(`/generate`, { method: "POST", body: JSON.stringify(req) }),

  lint: (masterPrompt: string) =>
    jsonFetch<LintResult>(`/lint`, { method: "POST", body: JSON.stringify({ masterPrompt }) }),

  judge: (masterPrompt: string, intent?: string) =>
    jsonFetch<JudgeResult>(`/judge`, { method: "POST", body: JSON.stringify({ masterPrompt, intent }) }),

  health: () => jsonFetch<{ status: string; service: string }>(`/health`),
};

// ---------- React hook ----------
export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: string | undefined;
  reload: () => void;
}

export function useAsync<T>(loader: () => Promise<T>, deps: ReadonlyArray<unknown> = []): AsyncState<T> {
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<Omit<AsyncState<T>, "reload">>({ data: undefined, loading: true, error: undefined });
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    loader()
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: undefined }); })
      .catch((err: Error) => { if (!cancelled) setState({ data: undefined, loading: false, error: err.message }); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);
  return { ...state, reload: () => setNonce((n) => n + 1) };
}

// ---------- Helpers ----------
export function relativeTime(iso: string | undefined): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "şimdi";
  if (m < 60) return `${m}dk önce`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}s önce`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}g önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
}
