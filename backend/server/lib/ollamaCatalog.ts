import {
  type OllamaModelInfo,
  OLLAMA_AUTO_BEST_CLOUD,
  OLLAMA_KNOWN_CLOUD_MODELS,
  getFallbackBestOllamaCloudModel,
  isOllamaCloudModel,
  normalizeOllamaModelInfo,
  resolveBestOllamaCloudModel,
  sortOllamaModels,
} from '@/lib/ollamaModels';

export interface OllamaModelCatalog {
  source: 'runtime' | 'fallback';
  models: OllamaModelInfo[];
  localModels: OllamaModelInfo[];
  cloudModels: OllamaModelInfo[];
  bestCloudModel: string | null;
  autoBestModelId: typeof OLLAMA_AUTO_BEST_CLOUD;
}

async function fetchRuntimeOllamaModels(ollamaUrl: string): Promise<OllamaModelInfo[]> {
  const res = await fetch(`${ollamaUrl}/api/tags`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama tags ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => ({}));
  const models = Array.isArray(data?.models)
    ? (data.models as OllamaModelInfo[]).map(normalizeOllamaModelInfo)
    : [];
  return sortOllamaModels(models.filter((m: OllamaModelInfo) => m.model));
}

function buildCatalog(models: OllamaModelInfo[], source: OllamaModelCatalog['source']): OllamaModelCatalog {
  const sorted = sortOllamaModels(models);
  const cloudModels = sorted.filter(isOllamaCloudModel);
  const localModels = sorted.filter((model) => !isOllamaCloudModel(model));
  return {
    source,
    models: sorted,
    localModels,
    cloudModels,
    bestCloudModel: resolveBestOllamaCloudModel(cloudModels)?.model ?? null,
    autoBestModelId: OLLAMA_AUTO_BEST_CLOUD,
  };
}

export async function getOllamaModelCatalog(ollamaUrl: string): Promise<OllamaModelCatalog> {
  try {
    const runtimeModels = await fetchRuntimeOllamaModels(ollamaUrl);
    return buildCatalog(runtimeModels, 'runtime');
  } catch (error) {
    console.warn('[OllamaCatalog] Falling back to bundled cloud catalog:', error);
    return buildCatalog(OLLAMA_KNOWN_CLOUD_MODELS, 'fallback');
  }
}

export async function resolveOllamaModelSelection(opts: {
  ollamaUrl: string;
  mode: 'local' | 'cloud';
  requestedModel?: string;
  defaultLocalModel: string;
  defaultCloudModel: string;
}): Promise<{ model: string; catalog?: OllamaModelCatalog }> {
  const requestedModel = opts.requestedModel?.trim();
  if (opts.mode === 'local') {
    return { model: requestedModel || opts.defaultLocalModel };
  }

  const configuredDefault = opts.defaultCloudModel.trim() || OLLAMA_AUTO_BEST_CLOUD;
  const selection = requestedModel || configuredDefault;
  if (selection !== OLLAMA_AUTO_BEST_CLOUD) {
    return { model: selection };
  }

  const catalog = await getOllamaModelCatalog(opts.ollamaUrl);
  return {
    model: catalog.bestCloudModel || getFallbackBestOllamaCloudModel(),
    catalog,
  };
}
