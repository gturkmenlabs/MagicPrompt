/**
 * Unified provider service (frontend).
 * Provider API keys are never read from the browser runtime.
 * All generation calls are proxied through /v1/generate on the backend.
 */

import { Framework, PromptResponse, Attachment, Language } from '@/types';
import { API_BASE, getAuthHeaders } from './apiClient';

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

const AUTO_ORDER: Exclude<ClientProvider, 'auto'>[] = [
  'groq',
  'huggingface',
  'gemini',
  'openai',
  'deepseek',
  'mistral',
  'openrouter',
  'claude',
  'ollama',
];

export function hasProviderKey(_provider: Exclude<ClientProvider, 'auto'>): boolean {
  return true;
}

export function getAvailableProviders(): Exclude<ClientProvider, 'auto'>[] {
  return [...AUTO_ORDER];
}

export interface GenerateParams {
  intent: string;
  framework: Framework;
  domainId: string;
  useSearch: boolean;
  thinkingMode: boolean;
  language?: Language;
  outputFormat?: 'auto' | 'markdown' | 'json' | 'numbered' | 'table' | 'code' | 'xml';
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

function normalizeServerProvider(
  provider: string | undefined,
  fallback: ClientProvider,
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
  const response = await fetch(`${API_BASE}/generate`, {
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

  const data = await response.json().catch(() => ({} as Record<string, unknown>));
  if (!response.ok) {
    const message = typeof data.error === 'string' ? data.error : `Generate API ${response.status}`;
    throw new Error(message);
  }

  const promptResponse = data as PromptResponse;
  return {
    response: promptResponse,
    usedProvider: normalizeServerProvider(promptResponse.resolvedProvider, provider),
  };
}

export function getProviderLabel(provider: ClientProvider, claudeModel?: 'sonnet' | 'opus'): string {
  if (provider === 'auto') return 'Otomatik';
  switch (provider) {
    case 'groq': return 'Groq';
    case 'huggingface': return 'HF';
    case 'gemini': return 'Gemini';
    case 'openai': return 'OpenAI';
    case 'deepseek': return 'DeepSeek';
    case 'openrouter': return 'OpenRouter';
    case 'claude': return claudeModel === 'opus' ? 'Claude Opus 4.6' : 'Claude';
    case 'ollama': return 'Ollama';
    case 'mistral': return 'Mistral';
    default: return provider;
  }
}

export function getModelLabel(provider: ClientProvider, opts?: { openRouterModel?: string; claudeModel?: 'sonnet' | 'opus' }): string {
  if (provider === 'auto') return 'Auto';
  switch (provider) {
    case 'groq': return 'Groq-Preview';
    case 'huggingface': return 'HF-Inference';
    case 'openrouter': return opts?.openRouterModel?.split('/').pop() || 'OpenRouter';
    case 'claude': return opts?.claudeModel === 'opus' ? 'Claude-Opus-4.6' : 'Claude-Sonnet';
    case 'deepseek': return 'DeepSeek-V3';
    case 'openai': return 'OpenAI-GPT-4o-mini';
    case 'gemini': return 'Gemini-Pro';
    case 'ollama': return 'Ollama-Local';
    case 'mistral': return 'Mistral-API';
    default: return provider;
  }
}
