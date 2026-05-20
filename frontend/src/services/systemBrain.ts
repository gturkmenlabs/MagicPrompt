import { Framework } from '@/types';

export type OutputLanguage = 'tr' | 'en';
export type OutputFormat = 'auto' | 'markdown' | 'json' | 'numbered' | 'table' | 'code' | 'xml';
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

export interface SystemBrainConfig {
  enabled: boolean;
  globalLock: boolean;
  forceAgentBlueprint: boolean;
  enforceAutoRoute: boolean;
  enforceAutoFramework: boolean;
  forceSearchAndThinking: boolean;
  forcedDomainId: string;
  forcedOutputLanguage: 'auto' | OutputLanguage;
  forcedOutputFormat: OutputFormat;
}

export interface SystemBrainInputs {
  intent: string;
  provider: ClientProvider;
  framework: Framework;
  domainId: string;
  outputLanguage: OutputLanguage;
  outputFormat: OutputFormat;
  useSearch: boolean;
  thinkingMode: boolean;
  agentBlueprintMode: boolean;
}

export interface SystemBrainDecision {
  blocked: boolean;
  reason?: string;
  provider: ClientProvider;
  framework: Framework;
  domainId: string;
  outputLanguage: OutputLanguage;
  outputFormat: OutputFormat;
  useSearch: boolean;
  thinkingMode: boolean;
  agentBlueprintMode: boolean;
}

const CONTROL_PASSWORD_HASH = '4b23235f9ecb9bf5bb80e04af1eda104aeb32535457d979993e5d037334e7e12';
const CONTROL_SECRET = 'sr_system_control_aes_v1';

export const SYSTEM_CONTROL_STORAGE_KEY = 'sr_system_control_config_encrypted';

export const DEFAULT_SYSTEM_BRAIN_CONFIG: SystemBrainConfig = {
  enabled: false,
  globalLock: false,
  forceAgentBlueprint: true,
  enforceAutoRoute: true,
  enforceAutoFramework: true,
  forceSearchAndThinking: true,
  forcedDomainId: 'auto',
  forcedOutputLanguage: 'auto',
  forcedOutputFormat: 'auto',
};

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function encodeBase64(bytes: Uint8Array): string {
  let text = '';
  for (const b of bytes) text += String.fromCharCode(b);
  return btoa(text);
}

function decodeBase64(input: string): Uint8Array {
  const raw = atob(input);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function deriveAesKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const raw = await crypto.subtle.digest('SHA-256', encoder.encode(`${CONTROL_SECRET}:${password}`));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function verifySystemControlPassword(password: string): Promise<boolean> {
  const trimmed = password.trim();
  if (!trimmed) return false;
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(trimmed));
  return bytesToHex(new Uint8Array(digest)) === CONTROL_PASSWORD_HASH;
}

export async function encryptSystemControlConfig(
  config: SystemBrainConfig,
  password: string
): Promise<string> {
  const key = await deriveAesKey(password);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const payload = encoder.encode(JSON.stringify(config));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, payload);
  return `${encodeBase64(iv)}.${encodeBase64(new Uint8Array(cipher))}`;
}

export async function decryptSystemControlConfig(
  encryptedValue: string,
  password: string
): Promise<SystemBrainConfig | null> {
  const parts = encryptedValue.split('.');
  if (parts.length !== 2) return null;
  const [ivB64, cipherB64] = parts;
  if (!ivB64 || !cipherB64) return null;
  const key = await deriveAesKey(password);
  const iv = decodeBase64(ivB64);
  const cipher = decodeBase64(cipherB64);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  const json = new TextDecoder().decode(plain);
  const parsed = JSON.parse(json) as Partial<SystemBrainConfig>;
  return { ...DEFAULT_SYSTEM_BRAIN_CONFIG, ...parsed };
}

export function evaluateSystemBrain(
  config: SystemBrainConfig,
  inputs: SystemBrainInputs
): SystemBrainDecision {
  if (!config.enabled) {
    return { blocked: false, ...inputs };
  }

  if (config.globalLock) {
    return {
      blocked: true,
      reason: 'System Control global lock is active.',
      ...inputs,
    };
  }

  const outputLanguage =
    config.forcedOutputLanguage === 'auto' ? inputs.outputLanguage : config.forcedOutputLanguage;
  const outputFormat =
    config.forcedOutputFormat === 'auto' ? inputs.outputFormat : config.forcedOutputFormat;

  return {
    blocked: false,
    provider: config.enforceAutoRoute ? 'auto' : inputs.provider,
    framework: config.enforceAutoFramework ? Framework.AUTO : inputs.framework,
    domainId: config.forcedDomainId && config.forcedDomainId !== 'auto' ? config.forcedDomainId : inputs.domainId,
    outputLanguage,
    outputFormat,
    useSearch: config.forceSearchAndThinking ? true : inputs.useSearch,
    thinkingMode: config.forceSearchAndThinking ? true : inputs.thinkingMode,
    agentBlueprintMode: config.forceAgentBlueprint ? true : inputs.agentBlueprintMode,
  };
}
