import { Framework, PromptResponse, Attachment, Language } from '@/types';
import { API_BASE, getAuthHeaders } from './apiClient';
import { getProviderLabel, getModelLabel } from './unifiedProviderService';

export type ClientProvider =
  | 'auto'
  | 'groq'
  | 'huggingface'
  | 'gemini'
  | 'openai'
  | 'deepseek'
  | 'openrouter'
  | 'claude'
  | 'ollama'
  | 'mistral';

export type ClientOutputFormat =
  | 'auto'
  | 'markdown'
  | 'json'
  | 'numbered'
  | 'table'
  | 'code'
  | 'xml';

export interface GenerateParams {
  intent: string;
  framework: Framework;
  domainId: string;
  useSearch: boolean;
  thinkingMode: boolean;
  language?: Language;
  outputFormat?: ClientOutputFormat;
  localizedRules: string;
  attachments?: Attachment[];
  styleContext?: string;
  claudeModel?: 'sonnet' | 'opus';
  openRouterModel?: string;
  systemPrompt?: string;
}

export interface GenerateResult {
  response: PromptResponse;
  usedProvider: ClientProvider;
}

export function normalizeServerProvider(
  provider: string | undefined,
  fallback: ClientProvider = 'auto'
): ClientProvider {
  switch (provider) {
    case 'groq':
    case 'huggingface':
    case 'gemini':
    case 'openai':
    case 'deepseek':
    case 'openrouter':
    case 'ollama':
    case 'mistral':
      return provider;
    case 'claude':
    case 'claude-opus':
      return 'claude';
    default:
      return fallback;
  }
}

export async function generateMasterPromptUnified(
  provider: ClientProvider,
  params: GenerateParams
): Promise<GenerateResult> {
  const providerForApi =
    provider === 'claude' && params.claudeModel === 'opus'
      ? 'claude-opus'
      : provider;

  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      intent: params.intent,
      framework: params.framework,
      domainId: params.domainId,
      provider: providerForApi,
      language: params.language,
      outputFormat: params.outputFormat,
      useSearch: params.useSearch,
      thinkingMode: params.thinkingMode,
      contextRules: params.localizedRules,
      attachments: params.attachments,
      styleContext: params.styleContext,
      openRouterModel: params.openRouterModel,
      systemPrompt: params.systemPrompt,
    }),
  });

  const data = await res.json().catch(() => ({} as Record<string, unknown>));
  if (!res.ok) {
    const err = typeof data?.error === 'string' ? data.error : `Generate API ${res.status}`;
    throw new Error(err);
  }

  const response = data as PromptResponse;
  return {
    response,
    usedProvider: normalizeServerProvider(response.resolvedProvider, provider),
  };
}

export { getProviderLabel, getModelLabel };
