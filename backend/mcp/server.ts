/**
 * Super Reasoning MCP Server — Tum API ozelliklerini MCP tool olarak sunar.
 * - generate_api_key: Yerel key uretir (API gerekmez).
 * - super_reasoning_api: Herhangi bir /v1 endpoint'ini cagirir (tum ozellikler).
 * - Kolaylik toollari: api_validate, health, generate, enrich, optimize, prompts_list, prompt_get, prompt_save, prompt_versions, prompt_diff, prompt_delete, org_prompts, agent_run, agent_orchestrate, quality_judge, quality_lint, rag_ask, rag_search, vector_search, runs_list, run_get, compile_dsl, langextract_analyze.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import crypto from 'node:crypto';

const PREFIX = 'sr_';
const BYTES = 32;

const defaultBaseUrl = (): string =>
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  process.env?.API_URL ||
  'http://localhost:4000/v1';

async function apiRequest(
  baseUrl: string,
  apiKey: string | undefined,
  method: string,
  path: string,
  body?: unknown
): Promise<{ status: number; data: unknown }> {
  const url = path.startsWith('http') ? path : `${baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey && apiKey.trim()) headers['x-api-key'] = apiKey.trim();
  const opts: RequestInit = { method, headers };
  if (body !== undefined && body !== null && ['POST', 'PUT', 'PATCH'].includes(method)) {
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  const data = await res.json().catch(() => ({ error: 'Invalid JSON response' }));
  return { status: res.status, data };
}

function generateApiKey(): string {
  const raw = crypto.randomBytes(BYTES).toString('base64url');
  return `${PREFIX}${raw}`;
}

function textContent(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

const server = new McpServer(
  { name: 'super-reasoning', version: '1.0.0' },
  { capabilities: {} }
);

// ——— Yerel (API gerektirmez) ———
server.registerTool(
  'generate_api_key',
  {
    description:
      'Super Reasoning platform API key uretir. Key .env API_KEYS ve isteklerde x-api-key header ile kullanilir.',
  },
  async () => {
    const key = generateApiKey();
    return textContent(
      `Yeni API key:\n  ${key}\n\n.env: API_KEYS=${key}\nHeader: x-api-key: ${key}\n\nKey\'i guvenli saklayin.`
    );
  }
);

// ——— Genel API cagrisi (tum ozellikler) ———
server.registerTool(
  'super_reasoning_api',
  {
    description:
      "Super Reasoning API'nin herhangi bir endpoint'ini cagirir. Example path: generate, prompts, prompts/ID, auth/validate, orgs/ORG_ID/prompts, agent/run, agent/orchestrate, judge, lint, rag/ask, rag/search, prompts/semantic-search, runs, runs/ID, templates/community, templates/recommend, compile-dsl, enrich, langextract/analyze, prompts/ID/versions, prompts/ID/diff, prompts/ID/diff/risk, prompts/ID/versions/V/sign, prompts/ID/versions/V/verify, prompts/ID/provenance vb.",
    inputSchema: {
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).default('GET'),
      path: z.string().describe('Endpoint path (or: generate, prompts/abc-123)'),
      body: z.union([z.string(), z.record(z.string(), z.unknown())]).optional().describe('JSON body (POST/PUT/PATCH)'),
      base_url: z.string().optional().describe('API base URL (varsayilan: http://localhost:4000/v1)'),
      api_key: z.string().optional().describe('x-api-key (opsiyonel)'),
    },
  },
  async ({ method, path, body, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const parsed = typeof body === 'string' ? (body ? JSON.parse(body) : undefined) : body;
    const { status, data } = await apiRequest(base, api_key, method, path, parsed);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

// ——— Kolaylik toollari ———
server.registerTool(
  'api_validate',
  {
    description: 'API key dogrular (POST /auth/validate). Gecerlilik ve plan bilgisi doner.',
    inputSchema: {
      api_key: z.string().optional(),
      base_url: z.string().optional(),
    },
  },
  async ({ api_key, base_url }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'auth/validate', api_key ? { 'x-api-key': api_key } : {});
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'health',
  {
    description: 'API saglik kontrolu (GET /health).',
    inputSchema: { base_url: z.string().optional() },
  },
  async ({ base_url }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, undefined, 'GET', 'health');
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'generate',
  {
    description: 'Master prompt uretir (POST /generate). intent zorunlu; framework, domainId, provider, contextRules, openRouterModel, enrichment opsiyonel.',
    inputSchema: {
      intent: z.string(),
      framework: z.string().optional(),
      domainId: z.string().optional(),
      provider: z.string().optional(),
      contextRules: z.string().optional(),
      openRouterModel: z.string().optional(),
      enrichment_mode: z.enum(['fast', 'deep', 'off']).optional(),
      enrichment_auto_apply: z.boolean().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, enrichment_mode, enrichment_auto_apply, ...rest } = args;
    const body = {
      ...rest,
      enrichment: enrichment_mode != null ? { mode: enrichment_mode, autoApply: enrichment_auto_apply } : undefined,
    };
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'generate', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'optimize',
  {
    description: '.prompt DSL icerigini optimize eder (POST /optimize). content zorunlu.',
    inputSchema: {
      content: z.string(),
      provider: z.string().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ content, provider, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'optimize', { content, provider });
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'enrich',
  {
    description: 'Master prompt zenginlestirir (POST /enrich). masterPrompt zorunlu.',
    inputSchema: {
      masterPrompt: z.string(),
      domainId: z.string().optional(),
      framework: z.string().optional(),
      mode: z.enum(['fast', 'deep']).optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...body } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'enrich', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'compile_dsl',
  {
    description: '.prompt dosyasini derleyip kaydeder (POST /compile-dsl). filePath zorunlu.',
    inputSchema: {
      filePath: z.string(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ filePath, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'compile-dsl', { filePath });
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'langextract_analyze',
  {
    description: 'Metin/prompt analizi (POST /langextract/analyze). text zorunlu.',
    inputSchema: {
      text: z.string(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ text, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'langextract/analyze', { text });
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'prompts_list',
  {
    description: 'Prompt listesi (GET /prompts). page, limit, search, category opsiyonel.',
    inputSchema: {
      page: z.number().optional(),
      limit: z.number().optional(),
      search: z.string().optional(),
      category: z.string().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...q } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const params = new URLSearchParams();
    if (q.page != null) params.set('page', String(q.page));
    if (q.limit != null) params.set('limit', String(q.limit));
    if (q.search) params.set('search', q.search);
    if (q.category) params.set('category', q.category);
    const path = params.toString() ? `prompts?${params}` : 'prompts';
    const { status, data } = await apiRequest(base, api_key, 'GET', path);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'prompt_get',
  {
    description: 'Tek prompt getirir (GET /prompts/:id). version opsiyonel query.',
    inputSchema: {
      id: z.string(),
      version: z.string().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ id, version, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const path = version ? `prompts/${encodeURIComponent(id)}?version=${encodeURIComponent(version)}` : `prompts/${encodeURIComponent(id)}`;
    const { status, data } = await apiRequest(base, api_key, 'GET', path);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'prompt_save',
  {
    description: 'Prompt kaydeder (POST /prompts). id, version, masterPrompt zorunlu.',
    inputSchema: {
      id: z.string(),
      version: z.string(),
      masterPrompt: z.string(),
      name: z.string().optional(),
      reasoning: z.string().optional(),
      meta: z.record(z.string(), z.unknown()).optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...body } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'prompts', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'prompt_versions',
  {
    description: 'Prompt versiyonlarini listeler (GET /prompts/:id/versions).',
    inputSchema: {
      id: z.string(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ id, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'GET', `prompts/${encodeURIComponent(id)}/versions`);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'prompt_diff',
  {
    description: 'Iki versiyon arasi diff (GET /prompts/:id/diff?v1=...&v2=...).',
    inputSchema: {
      id: z.string(),
      v1: z.string(),
      v2: z.string(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ id, v1, v2, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const path = `prompts/${encodeURIComponent(id)}/diff?v1=${encodeURIComponent(v1)}&v2=${encodeURIComponent(v2)}`;
    const { status, data } = await apiRequest(base, api_key, 'GET', path);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'prompt_delete',
  {
    description: 'Prompt siler (DELETE /prompts/:id). version opsiyonel.',
    inputSchema: {
      id: z.string(),
      version: z.string().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ id, version, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const path = version ? `prompts/${encodeURIComponent(id)}?version=${encodeURIComponent(version)}` : `prompts/${encodeURIComponent(id)}`;
    const { status, data } = await apiRequest(base, api_key, 'DELETE', path);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'org_prompts',
  {
    description: 'Organizasyon promptlarini listeler (GET /orgs/:orgId/prompts).',
    inputSchema: {
      orgId: z.string(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ orgId, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'GET', `orgs/${encodeURIComponent(orgId)}/prompts`);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'prompt_diff_risk',
  {
    description: 'Iki versiyon for risk analizi (POST /prompts/:id/diff/risk).',
    inputSchema: {
      id: z.string(),
      v1: z.string(),
      v2: z.string(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ id, v1, v2, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', `prompts/${encodeURIComponent(id)}/diff/risk`, { v1, v2 });
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'prompt_version_sign',
  {
    description: 'Versiyon imzala (POST /prompts/:id/versions/:ver/sign).',
    inputSchema: {
      id: z.string(),
      ver: z.string(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ id, ver, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', `prompts/${encodeURIComponent(id)}/versions/${encodeURIComponent(ver)}/sign`);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'prompt_version_verify',
  {
    description: 'Versiyon dogrula (GET /prompts/:id/versions/:ver/verify).',
    inputSchema: {
      id: z.string(),
      ver: z.string(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ id, ver, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'GET', `prompts/${encodeURIComponent(id)}/versions/${encodeURIComponent(ver)}/verify`);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'prompt_provenance',
  {
    description: 'Prompt provenance zinciri (GET /prompts/:id/provenance).',
    inputSchema: {
      id: z.string(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ id, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'GET', `prompts/${encodeURIComponent(id)}/provenance`);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'agent_run',
  {
    description: 'Prompt Library Agent calistirir (POST /agent/run). query zorunlu.',
    inputSchema: {
      query: z.string(),
      context: z.record(z.string(), z.unknown()).optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...body } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key ?? undefined, 'POST', 'agent/run', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'agent_orchestrate',
  {
    description: 'Orchestrator calistirir (POST /agent/orchestrate). query zorunlu.',
    inputSchema: {
      query: z.string(),
      userId: z.string().optional(),
      context: z.record(z.string(), z.unknown()).optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...body } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key ?? undefined, 'POST', 'agent/orchestrate', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'agent_status',
  {
    description: 'Agent durumu (GET /agent/status).',
    inputSchema: { base_url: z.string().optional() },
  },
  async ({ base_url }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, undefined, 'GET', 'agent/status');
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'quality_judge',
  {
    description: 'Judge Ensemble ile prompt degerlendirir (POST /judge). masterPrompt zorunlu.',
    inputSchema: {
      masterPrompt: z.string(),
      domainId: z.string().optional(),
      framework: z.string().optional(),
      reasoning: z.string().optional(),
      autoRevise: z.boolean().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...body } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'judge', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'quality_lint',
  {
    description: 'Prompt lint (POST /lint). masterPrompt zorunlu.',
    inputSchema: {
      masterPrompt: z.string(),
      reasoning: z.string().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...body } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'lint', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'rag_ask',
  {
    description: 'RAG sentezli yanit (POST /rag/ask). query zorunlu.',
    inputSchema: {
      query: z.string(),
      topK: z.number().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...body } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'rag/ask', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'rag_search',
  {
    description: 'RAG arama (POST /rag/search). query zorunlu.',
    inputSchema: {
      query: z.string(),
      topK: z.number().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...body } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'rag/search', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'vector_search',
  {
    description: 'Semantik prompt arama (POST /prompts/semantic-search).',
    inputSchema: {
      query: z.string(),
      topK: z.number().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...body } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'prompts/semantic-search', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'runs_list',
  {
    description: 'Calistirma gecmisi listesi (GET /runs).',
    inputSchema: {
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'GET', 'runs');
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'run_get',
  {
    description: 'Tek run detayi (GET /runs/:id).',
    inputSchema: {
      id: z.string(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ id, base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'GET', `runs/${encodeURIComponent(id)}`);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'templates_community',
  {
    description: 'Topluluk sablonlari (GET /templates/community).',
    inputSchema: {
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async ({ base_url, api_key }) => {
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'GET', 'templates/community');
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

server.registerTool(
  'templates_recommend',
  {
    description: 'template onerisi (POST /templates/recommend).',
    inputSchema: {
      intent: z.string().optional(),
      domainId: z.string().optional(),
      framework: z.string().optional(),
      base_url: z.string().optional(),
      api_key: z.string().optional(),
    },
  },
  async (args) => {
    const { base_url, api_key, ...body } = args;
    const base = base_url?.trim() || defaultBaseUrl();
    const { status, data } = await apiRequest(base, api_key, 'POST', 'templates/recommend', body);
    return textContent(JSON.stringify({ status, data }, null, 2));
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error('MCP server error:', err);
  process.exit(1);
});
