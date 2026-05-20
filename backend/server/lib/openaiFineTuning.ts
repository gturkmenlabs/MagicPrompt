import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const OPENAI_API_BASE = 'https://api.openai.com/v1';
const DEFAULT_BASE_MODEL = 'gpt-4.1-mini-2025-04-14';
const DEFAULT_OUTPUT_DIR = path.resolve(process.cwd(), 'data', 'fine-tuning');
const FILE_PROCESSING_TIMEOUT_MS = 3 * 60 * 1000;
const FILE_PROCESSING_POLL_INTERVAL_MS = 5000;

type OpenAIRole = 'system' | 'user' | 'assistant';

export interface OpenAIChatMessage {
  role: OpenAIRole;
  content: string;
}

interface RawFineTuneRecord {
  messages?: Array<{ role?: unknown; content?: unknown }>;
  text_input?: unknown;
  output?: unknown;
  prompt?: unknown;
  completion?: unknown;
  input?: unknown;
  response?: unknown;
  metadata?: Record<string, unknown>;
}

export interface PreparedFineTuneDataset {
  sourcePath: string;
  outputDir: string;
  totalRecords: number;
  selectedRecords: number;
  trainingCount: number;
  validationCount: number;
  trainingFilePath: string;
  validationFilePath?: string;
}

export interface CreateFineTuneJobInput {
  name: string;
  baseModel?: string;
  datasetSize?: number;
  datasetPath?: string;
  includeValidation?: boolean;
}

export interface FineTuneJobView {
  id: string;
  name: string;
  modelId?: string;
  baseModel: string;
  status: 'preparing' | 'training' | 'completed' | 'failed';
  progress: number;
  datasetSize: number;
  createdAt: string;
  completedAt?: string;
  error?: string;
}

export interface FineTuneJobDetail extends FineTuneJobView {
  rawStatus?: string;
}

export interface CustomModelView {
  id: string;
  name: string;
  baseModel: string;
  status: 'active' | 'training' | 'inactive';
  createdAt: string;
  promptCount: number;
}

interface OpenAIFileUploadResponse {
  id: string;
  filename?: string;
}

interface OpenAIFileObject extends OpenAIFileUploadResponse {
  status?: 'uploaded' | 'processed' | 'error' | string;
  status_details?: string | null;
}

interface OpenAIFineTuneJob {
  id: string;
  status?: string;
  model?: string;
  fine_tuned_model?: string | null;
  created_at?: number;
  finished_at?: number | null;
  error?: { message?: string } | string | null;
  trained_tokens?: number;
  training_file?: string;
  validation_file?: string | null;
  metadata?: Record<string, unknown> | null;
}

interface OpenAIListResponse<T> {
  data?: T[];
}

function getOpenAIApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.VITE_OPENAI_API_KEY ?? '';
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is required for fine-tuning.');
  }
  return apiKey;
}

function resolveBaseModel(model?: string): string {
  const normalized = (model ?? '').trim();
  if (!normalized) return DEFAULT_BASE_MODEL;
  if (normalized === 'gpt-4o-mini') return DEFAULT_BASE_MODEL;
  if (normalized === 'gpt-4o') return 'gpt-4o-2024-08-06';
  if (normalized === 'gpt-4.1-mini') return DEFAULT_BASE_MODEL;
  return normalized;
}

function resolveOutputDir(): string {
  const configured = process.env.OPENAI_FINETUNE_OUTPUT_DIR?.trim();
  return configured ? path.resolve(configured) : DEFAULT_OUTPUT_DIR;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveDatasetPath(explicitPath?: string): Promise<string> {
  const candidates = [
    explicitPath,
    process.env.OPENAI_FINETUNE_DATASET_PATH,
    path.resolve(process.cwd(), 'data', 'fine-tuning', 'training.jsonl'),
    path.resolve(process.cwd(), 'data', 'fine-tuning', 'prompt_teknikleri_finetuning_dataset_with_metadata.jsonl'),
    path.resolve(process.cwd(), 'data', 'fine-tuning', 'prompt_teknikleri_finetuning_dataset.jsonl'),
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .map((value) => path.resolve(value));

  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }

  throw new Error(
    'No fine-tuning dataset found. Set OPENAI_FINETUNE_DATASET_PATH or send datasetPath in the request.'
  );
}

async function readDatasetRecords(datasetPath: string): Promise<RawFineTuneRecord[]> {
  const raw = await fs.readFile(datasetPath, 'utf-8');
  const extension = path.extname(datasetPath).toLowerCase();

  if (extension === '.jsonl') {
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        try {
          return JSON.parse(line) as RawFineTuneRecord;
        } catch (error) {
          throw new Error(`Invalid JSONL at line ${index + 1}: ${(error as Error).message}`);
        }
      });
  }

  if (extension === '.json') {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as RawFineTuneRecord[];
    throw new Error('JSON dataset must be an array of records.');
  }

  throw new Error(`Unsupported dataset format: ${extension || 'unknown'}`);
}

function normalizeMessage(record: { role?: unknown; content?: unknown }): OpenAIChatMessage | null {
  const role = typeof record.role === 'string' ? record.role.trim() : '';
  const content = typeof record.content === 'string' ? record.content.trim() : '';
  if (!role || !content) return null;
  if (role !== 'system' && role !== 'user' && role !== 'assistant') return null;
  return { role, content };
}

function normalizeRecord(record: RawFineTuneRecord): { messages: OpenAIChatMessage[] } | null {
  if (Array.isArray(record.messages)) {
    const messages = record.messages
      .map((message) => normalizeMessage(message))
      .filter((message): message is OpenAIChatMessage => Boolean(message));

    if (messages.length >= 2 && messages.some((message) => message.role === 'assistant')) {
      return { messages };
    }
  }

  const userContent =
    typeof record.text_input === 'string' ? record.text_input.trim()
    : typeof record.prompt === 'string' ? record.prompt.trim()
    : typeof record.input === 'string' ? record.input.trim()
    : '';
  const assistantContent =
    typeof record.output === 'string' ? record.output.trim()
    : typeof record.completion === 'string' ? record.completion.trim()
    : typeof record.response === 'string' ? record.response.trim()
    : '';

  if (!userContent || !assistantContent) return null;

  return {
    messages: [
      { role: 'user', content: userContent },
      { role: 'assistant', content: assistantContent },
    ],
  };
}

function deterministicSortKey(record: { messages: OpenAIChatMessage[] }): string {
  return crypto.createHash('sha256').update(JSON.stringify(record.messages)).digest('hex');
}

function selectAndSplitRecords(
  records: Array<{ messages: OpenAIChatMessage[] }>,
  requestedSize?: number
): { selected: Array<{ messages: OpenAIChatMessage[] }>; training: Array<{ messages: OpenAIChatMessage[] }>; validation: Array<{ messages: OpenAIChatMessage[] }> } {
  const sorted = [...records].sort((left, right) => deterministicSortKey(left).localeCompare(deterministicSortKey(right)));
  const cappedSize = Math.min(
    sorted.length,
    Math.max(10, requestedSize ?? sorted.length)
  );
  const selected = sorted.slice(0, cappedSize);

  let validationCount = 0;
  if (selected.length >= 20) {
    validationCount = Math.max(1, Math.round(selected.length * 0.1));
  }
  if (selected.length - validationCount < 10) {
    validationCount = Math.max(0, selected.length - 10);
  }

  const validation = validationCount > 0 ? selected.slice(0, validationCount) : [];
  const training = selected.slice(validationCount);

  return { selected, training, validation };
}

async function writeJsonl(
  filePath: string,
  records: Array<{ messages: OpenAIChatMessage[] }>
): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const contents = records.map((record) => JSON.stringify(record)).join('\n');
  await fs.writeFile(filePath, contents ? `${contents}\n` : '', 'utf-8');
}

function toArtifactName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 48);
  return slug || 'neomagic';
}

export async function prepareFineTuneDataset(options: {
  datasetPath?: string;
  datasetSize?: number;
  name?: string;
  includeValidation?: boolean;
} = {}): Promise<PreparedFineTuneDataset> {
  const sourcePath = await resolveDatasetPath(options.datasetPath);
  const rawRecords = await readDatasetRecords(sourcePath);
  const normalizedRecords = rawRecords
    .map((record) => normalizeRecord(record))
    .filter((record): record is { messages: OpenAIChatMessage[] } => Boolean(record));

  if (normalizedRecords.length < 10) {
    throw new Error(`Dataset must contain at least 10 valid training examples. Found ${normalizedRecords.length}.`);
  }

  const { selected, training, validation } = selectAndSplitRecords(normalizedRecords, options.datasetSize);
  const outputDir = resolveOutputDir();
  const artifactBase = toArtifactName(options.name ?? path.basename(sourcePath, path.extname(sourcePath)));
  const includeValidation = options.includeValidation !== false;
  const trainingFilePath = path.join(outputDir, `${artifactBase}.train.jsonl`);
  const validationFilePath = includeValidation && validation.length > 0
    ? path.join(outputDir, `${artifactBase}.valid.jsonl`)
    : undefined;

  await writeJsonl(trainingFilePath, training);
  if (validationFilePath) {
    await writeJsonl(validationFilePath, validation);
  }

  return {
    sourcePath,
    outputDir,
    totalRecords: normalizedRecords.length,
    selectedRecords: selected.length,
    trainingCount: training.length,
    validationCount: validation.length,
    trainingFilePath,
    validationFilePath,
  };
}

async function uploadFineTuneFile(filePath: string): Promise<OpenAIFileUploadResponse> {
  const apiKey = getOpenAIApiKey();
  const fileBuffer = await fs.readFile(filePath);
  const form = new FormData();
  form.append('purpose', 'fine-tune');
  form.append('file', new Blob([fileBuffer], { type: 'application/jsonl' }), path.basename(filePath));

  const response = await fetch(`${OPENAI_API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI file upload failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  return response.json() as Promise<OpenAIFileUploadResponse>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForFineTuneFileReady(fileId: string): Promise<void> {
  const apiKey = getOpenAIApiKey();
  const startedAt = Date.now();

  while (Date.now() - startedAt < FILE_PROCESSING_TIMEOUT_MS) {
    const response = await fetch(`${OPENAI_API_BASE}/files/${encodeURIComponent(fileId)}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI file status fetch failed (${response.status}): ${errorText.slice(0, 300)}`);
    }

    const file = await response.json() as OpenAIFileObject;
    const status = typeof file.status === 'string' ? file.status : undefined;

    if (status === 'processed') {
      return;
    }

    if (status === 'error') {
      throw new Error(`OpenAI file processing failed for ${fileId}: ${file.status_details ?? 'unknown error'}`);
    }

    await sleep(FILE_PROCESSING_POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for OpenAI file ${fileId} to finish processing.`);
}

async function createFineTuneJobRequest(payload: Record<string, unknown>): Promise<OpenAIFineTuneJob> {
  const apiKey = getOpenAIApiKey();
  const response = await fetch(`${OPENAI_API_BASE}/fine_tuning/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI fine-tune job creation failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  return response.json() as Promise<OpenAIFineTuneJob>;
}

function mapJobState(status: string | undefined): FineTuneJobView['status'] {
  switch (status) {
    case 'succeeded':
      return 'completed';
    case 'failed':
    case 'cancelled':
      return 'failed';
    case 'running':
    case 'queued':
      return 'training';
    default:
      return 'preparing';
  }
}

function estimateProgress(status: string | undefined): number {
  switch (status) {
    case 'validating_files':
      return 20;
    case 'queued':
      return 35;
    case 'running':
      return 70;
    case 'succeeded':
    case 'failed':
    case 'cancelled':
      return 100;
    default:
      return 10;
  }
}

function formatTimestamp(timestamp?: number | null): string | undefined {
  if (!timestamp) return undefined;
  return new Date(timestamp * 1000).toISOString();
}

function getMetadataValue(metadata: Record<string, unknown> | null | undefined, key: string): string | undefined {
  const value = metadata?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getNumericMetadataValue(metadata: Record<string, unknown> | null | undefined, key: string): number | undefined {
  const value = metadata?.[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function toFineTuneJobView(job: OpenAIFineTuneJob): FineTuneJobView {
  const metadata = job.metadata ?? {};
  const datasetSize = getNumericMetadataValue(metadata, 'dataset_size') ?? 0;
  const name = getMetadataValue(metadata, 'job_name') ?? job.id;
  const modelId = typeof job.fine_tuned_model === 'string' ? job.fine_tuned_model : undefined;
  const errorMessage =
    typeof job.error === 'string' ? job.error
    : typeof job.error?.message === 'string' ? job.error.message
    : undefined;

  return {
    id: job.id,
    name,
    modelId,
    baseModel: job.model ?? DEFAULT_BASE_MODEL,
    status: mapJobState(job.status),
    progress: estimateProgress(job.status),
    datasetSize,
    createdAt: formatTimestamp(job.created_at) ?? new Date(0).toISOString(),
    completedAt: formatTimestamp(job.finished_at),
    error: errorMessage,
  };
}

function toFineTuneJobDetail(job: OpenAIFineTuneJob): FineTuneJobDetail {
  return {
    ...toFineTuneJobView(job),
    rawStatus: job.status,
  };
}

export async function listFineTuneJobs(limit = 20): Promise<FineTuneJobView[]> {
  const apiKey = getOpenAIApiKey();
  const query = new URLSearchParams({ limit: String(limit) });
  const response = await fetch(`${OPENAI_API_BASE}/fine_tuning/jobs?${query.toString()}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI fine-tune jobs listing failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await response.json() as OpenAIListResponse<OpenAIFineTuneJob>;
  return (data.data ?? []).map((job) => toFineTuneJobView(job));
}

export async function getFineTuneJob(jobId: string): Promise<FineTuneJobDetail> {
  const apiKey = getOpenAIApiKey();
  const response = await fetch(`${OPENAI_API_BASE}/fine_tuning/jobs/${encodeURIComponent(jobId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI fine-tune job fetch failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await response.json() as OpenAIFineTuneJob;
  return toFineTuneJobDetail(data);
}

export async function listCustomModels(): Promise<CustomModelView[]> {
  const apiKey = getOpenAIApiKey();
  const response = await fetch(`${OPENAI_API_BASE}/fine_tuning/jobs?limit=100`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI custom models listing failed (${response.status}): ${errorText.slice(0, 300)}`);
  }

  const data = await response.json() as OpenAIListResponse<OpenAIFineTuneJob>;
  return (data.data ?? [])
    .filter((job) => typeof job.fine_tuned_model === 'string' && job.fine_tuned_model.trim())
    .map((job) => {
      const metadata = job.metadata ?? {};
      return {
        id: String(job.fine_tuned_model),
        name: getMetadataValue(metadata, 'job_name') ?? String(job.fine_tuned_model),
        baseModel: job.model ?? DEFAULT_BASE_MODEL,
        status: job.status === 'succeeded' ? 'active' : job.status === 'running' ? 'training' : 'inactive',
        createdAt: formatTimestamp(job.created_at) ?? new Date(0).toISOString(),
        promptCount: getNumericMetadataValue(metadata, 'dataset_size') ?? 0,
      } satisfies CustomModelView;
    });
}

export async function deleteFineTunedModel(modelId: string): Promise<void> {
  const apiKey = getOpenAIApiKey();
  const response = await fetch(`${OPENAI_API_BASE}/models/${encodeURIComponent(modelId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI model deletion failed (${response.status}): ${errorText.slice(0, 300)}`);
  }
}

export async function createFineTuneJob(input: CreateFineTuneJobInput): Promise<{
  job: FineTuneJobView;
  dataset: PreparedFineTuneDataset;
}> {
  const name = input.name.trim();
  if (!name) {
    throw new Error('name is required');
  }

  const prepared = await prepareFineTuneDataset({
    datasetPath: input.datasetPath,
    datasetSize: input.datasetSize,
    name,
    includeValidation: input.includeValidation,
  });

  const [trainingUpload, validationUpload] = await Promise.all([
    uploadFineTuneFile(prepared.trainingFilePath),
    prepared.validationFilePath ? uploadFineTuneFile(prepared.validationFilePath) : Promise.resolve(undefined),
  ]);

  await Promise.all([
    waitForFineTuneFileReady(trainingUpload.id),
    validationUpload?.id ? waitForFineTuneFileReady(validationUpload.id) : Promise.resolve(),
  ]);

  const job = await createFineTuneJobRequest({
    model: resolveBaseModel(input.baseModel),
    training_file: trainingUpload.id,
    ...(validationUpload?.id ? { validation_file: validationUpload.id } : {}),
    metadata: {
      app: 'NeoMagic',
      job_name: name,
      dataset_path: prepared.sourcePath,
      dataset_size: String(prepared.selectedRecords),
      training_examples: String(prepared.trainingCount),
      validation_examples: String(prepared.validationCount),
    },
  });

  return {
    job: toFineTuneJobView(job),
    dataset: prepared,
  };
}
