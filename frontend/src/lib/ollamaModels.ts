export interface OllamaModelInfo {
  name: string;
  model: string;
  remoteModel?: string;
  remoteHost?: string;
  family?: string;
  parameterSize?: string;
}

export const OLLAMA_AUTO_BEST_CLOUD = 'auto-best-cloud';
export const OLLAMA_AUTO_BEST_CLOUD_LABEL = 'Auto (Best Cloud)';
export const OLLAMA_LEGACY_DEFAULT_CLOUD_MODEL = 'gpt-oss:120b-cloud';
export const OLLAMA_DEFAULT_LOCAL_MODEL = 'gemma3:4b';
export const OLLAMA_RECOMMENDED_LOCAL_MODELS = [
  'gemma3:4b',
  'hf.co/ytu-ce-cosmos/Turkish-Gemma-9b-T1-GGUF:Q4_K_M',
] as const;

const OLLAMA_CLOUD_MODEL_PRIORITY = [
  'deepseek-v3.1:671b-cloud',
  'gpt-oss:120b-cloud',
  'minimax-m2.5:cloud',
  'glm-5:cloud',
  'kimi-k2.5:cloud',
  'minimax-m2:cloud',
  'gemini-3-flash-preview:cloud',
  'nemotron-3-nano:30b-cloud',
] as const;

export const OLLAMA_KNOWN_CLOUD_MODELS: OllamaModelInfo[] = [
  { name: 'deepseek-v3.1:671b-cloud', model: 'deepseek-v3.1:671b-cloud', remoteModel: 'deepseek-v3.1:671b', remoteHost: 'https://ollama.com:443', family: 'deepseek2', parameterSize: '671.0B' },
  { name: 'gpt-oss:120b-cloud', model: 'gpt-oss:120b-cloud', remoteModel: 'gpt-oss:120b', remoteHost: 'https://ollama.com:443', family: 'gptoss', parameterSize: '116.8B' },
  { name: 'minimax-m2.5:cloud', model: 'minimax-m2.5:cloud', remoteModel: 'minimax-m2.5', remoteHost: 'https://ollama.com:443' },
  { name: 'glm-5:cloud', model: 'glm-5:cloud', remoteModel: 'glm-5', remoteHost: 'https://ollama.com:443' },
  { name: 'kimi-k2.5:cloud', model: 'kimi-k2.5:cloud', remoteModel: 'kimi-k2.5', remoteHost: 'https://ollama.com:443' },
  { name: 'minimax-m2:cloud', model: 'minimax-m2:cloud', remoteModel: 'minimax-m2', remoteHost: 'https://ollama.com:443', family: 'minimaxm2', parameterSize: '230B' },
  { name: 'gemini-3-flash-preview:cloud', model: 'gemini-3-flash-preview:cloud', remoteModel: 'gemini-3-flash-preview', remoteHost: 'https://ollama.com:443' },
  { name: 'nemotron-3-nano:30b-cloud', model: 'nemotron-3-nano:30b-cloud', remoteModel: 'nemotron-3-nano:30b', remoteHost: 'https://ollama.com:443', family: 'nemotron_h_moe', parameterSize: '32B' },
];

export function normalizeOllamaModelInfo(raw: any): OllamaModelInfo {
  const name = String(raw?.name ?? raw?.model ?? '').trim();
  const model = String(raw?.model ?? raw?.name ?? '').trim() || name;
  return {
    name: name || model,
    model,
    remoteModel: typeof raw?.remote_model === 'string' ? raw.remote_model : undefined,
    remoteHost: typeof raw?.remote_host === 'string' ? raw.remote_host : undefined,
    family: typeof raw?.details?.family === 'string'
      ? raw.details.family
      : (typeof raw?.family === 'string' ? raw.family : undefined),
    parameterSize: typeof raw?.details?.parameter_size === 'string'
      ? raw.details.parameter_size
      : (typeof raw?.parameterSize === 'string' ? raw.parameterSize : undefined),
  };
}

export function isOllamaCloudModel(model: Pick<OllamaModelInfo, 'model' | 'name' | 'remoteHost'>): boolean {
  const modelId = (model.model || model.name || '').trim().toLowerCase();
  const remoteHost = (model.remoteHost || '').trim().toLowerCase();
  return modelId.endsWith(':cloud') || modelId.endsWith('-cloud') || remoteHost.includes('ollama.com');
}

function getCloudPriority(modelId: string): number {
  const idx = OLLAMA_CLOUD_MODEL_PRIORITY.indexOf(modelId as typeof OLLAMA_CLOUD_MODEL_PRIORITY[number]);
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
}

export function sortOllamaModels(models: OllamaModelInfo[]): OllamaModelInfo[] {
  return [...models].sort((a, b) => {
    const aCloud = isOllamaCloudModel(a);
    const bCloud = isOllamaCloudModel(b);
    if (aCloud && bCloud) {
      const diff = getCloudPriority(a.model) - getCloudPriority(b.model);
      if (diff !== 0) return diff;
    } else if (aCloud !== bCloud) {
      return aCloud ? 1 : -1;
    }
    return a.model.localeCompare(b.model);
  });
}

export function resolveBestOllamaCloudModel(models: OllamaModelInfo[]): OllamaModelInfo | null {
  const cloudModels = sortOllamaModels(models.filter(isOllamaCloudModel));
  return cloudModels[0] ?? null;
}

export function getFallbackBestOllamaCloudModel(): string {
  return resolveBestOllamaCloudModel(OLLAMA_KNOWN_CLOUD_MODELS)?.model ?? OLLAMA_LEGACY_DEFAULT_CLOUD_MODEL;
}

export function formatOllamaModelOptionLabel(model: OllamaModelInfo): string {
  const detail = model.parameterSize?.trim() || model.remoteModel?.trim() || '';
  return detail && detail !== model.model ? `${model.model} · ${detail}` : model.model;
}
