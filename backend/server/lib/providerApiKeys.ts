import crypto from 'node:crypto';
import { getPool } from '../db/client';

export type ProviderKeyName =
  | 'openai'
  | 'gemini'
  | 'groq'
  | 'claude'
  | 'openrouter'
  | 'deepseek'
  | 'huggingface'
  | 'fal'
  | 'mistral';

export const SUPPORTED_PROVIDER_KEYS: ProviderKeyName[] = [
  'openai',
  'gemini',
  'groq',
  'claude',
  'openrouter',
  'deepseek',
  'huggingface',
  'fal',
  'mistral',
];

export interface ResolvedProviderApiKey {
  provider: ProviderKeyName;
  source: 'org' | 'server' | 'none';
  apiKey: string | null;
  updatedAt?: string | null;
}

const PROVIDER_ENV_KEYS: Record<ProviderKeyName, string[]> = {
  openai: ['OPENAI_API_KEY'],
  gemini: ['GEMINI_API_KEY', 'API_KEY'],
  groq: ['GROQ_API_KEY'],
  claude: ['ANTHROPIC_API_KEY'],
  openrouter: ['OPENROUTER_API_KEY'],
  deepseek: ['DEEPSEEK_API_KEY'],
  huggingface: ['HUGGING_FACE_HUB_TOKEN'],
  fal: ['FAL_API_KEY'],
  mistral: ['MISTRAL_API_KEY'],
};

const PROVIDER_CHECK_VALUES = SUPPORTED_PROVIDER_KEYS.map((provider) => `'${provider}'`).join(', ');

let providerTableReady = false;
let providerTablePromise: Promise<void> | null = null;

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function normalizeProviderKeyName(input: string): ProviderKeyName | null {
  switch (input) {
    case 'openai':
    case 'gemini':
    case 'groq':
    case 'claude':
    case 'openrouter':
    case 'deepseek':
    case 'huggingface':
    case 'fal':
    case 'mistral':
      return input;
    case 'claude-opus':
      return 'claude';
    default:
      return null;
  }
}

function getEncryptionKey(): Buffer {
  const raw = asNonEmptyString(process.env.SR_ENCRYPTION_KEY);
  if (!raw) {
    throw new Error('SR_ENCRYPTION_KEY is required for org BYOK operations');
  }
  if (/^[a-f0-9]{64}$/i.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  try {
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length === 32) return decoded;
  } catch {
    // Continue with hash fallback.
  }
  return crypto.createHash('sha256').update(raw).digest();
}

function encryptApiKey(apiKey: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1.${iv.toString('base64url')}.${encrypted.toString('base64url')}.${tag.toString('base64url')}`;
}

function decryptApiKey(payload: string): string {
  const [version, ivRaw, encryptedRaw, tagRaw] = payload.split('.');
  if (version !== 'v1' || !ivRaw || !encryptedRaw || !tagRaw) {
    throw new Error('Invalid provider key payload format');
  }
  const key = getEncryptionKey();
  const iv = Buffer.from(ivRaw, 'base64url');
  const encrypted = Buffer.from(encryptedRaw, 'base64url');
  const tag = Buffer.from(tagRaw, 'base64url');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

export async function ensureProviderApiKeysTable(): Promise<void> {
  if (providerTableReady) return;
  if (providerTablePromise) return providerTablePromise;

  providerTablePromise = (async () => {
    const pool = getPool();
    if (!pool) return;

    await pool.query(`
      CREATE TABLE IF NOT EXISTS provider_api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
        provider TEXT NOT NULL CHECK (provider IN (${PROVIDER_CHECK_VALUES})),
        encrypted_key TEXT NOT NULL,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (org_id, provider)
      );
    `);
  })()
    .finally(() => {
      providerTableReady = true;
      providerTablePromise = null;
    });

  return providerTablePromise;
}

function isPlaceholder(key: string): boolean {
  const t = key.trim();
  if (t.length < 12) return true;
  return /^(your[_-]|change[_-]?me|xxx+|placeholder|replace[_-]?me)/i.test(t);
}

function getServerManagedKey(provider: ProviderKeyName): string | null {
  const envKeys = PROVIDER_ENV_KEYS[provider] ?? [];
  for (const envKey of envKeys) {
    const value = asNonEmptyString(process.env[envKey]);
    if (value && !isPlaceholder(value)) return value;
  }
  return null;
}

export function hasServerManagedKey(provider: ProviderKeyName): boolean {
  return !!getServerManagedKey(provider);
}

export async function upsertOrgProviderApiKey(params: {
  orgId: string;
  provider: ProviderKeyName;
  apiKey: string;
  actorUserId?: string | null;
}): Promise<void> {
  await ensureProviderApiKeysTable();
  const pool = getPool();
  if (!pool) throw new Error('Database not available');

  const encrypted = encryptApiKey(params.apiKey.trim());
  await pool.query(
    `INSERT INTO provider_api_keys (org_id, provider, encrypted_key, created_by, updated_at)
     VALUES ($1::uuid, $2, $3, $4::uuid, NOW())
     ON CONFLICT (org_id, provider)
     DO UPDATE SET encrypted_key = EXCLUDED.encrypted_key, created_by = EXCLUDED.created_by, updated_at = NOW()`,
    [params.orgId, params.provider, encrypted, params.actorUserId ?? null]
  );
}

export async function deleteOrgProviderApiKey(orgId: string, provider: ProviderKeyName): Promise<boolean> {
  await ensureProviderApiKeysTable();
  const pool = getPool();
  if (!pool) throw new Error('Database not available');

  const result = await pool.query(
    `DELETE FROM provider_api_keys
     WHERE org_id = $1::uuid AND provider = $2`,
    [orgId, provider]
  );
  return (result.rowCount ?? 0) > 0;
}

async function getOrgProviderApiKey(orgId: string, provider: ProviderKeyName): Promise<{ apiKey: string; updatedAt: string | null } | null> {
  if (!asNonEmptyString(process.env.SR_ENCRYPTION_KEY)) return null;

  await ensureProviderApiKeysTable();
  const pool = getPool();
  if (!pool) return null;

  try {
    const result = await pool.query(
      `SELECT encrypted_key, updated_at
       FROM provider_api_keys
       WHERE org_id = $1::uuid AND provider = $2
       LIMIT 1`,
      [orgId, provider]
    );

    const row = result.rows[0];
    if (!row?.encrypted_key) return null;
    try {
      return {
        apiKey: decryptApiKey(String(row.encrypted_key)),
        updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
      };
    } catch (decryptErr) {
      console.warn(
        '[providerApiKeys] Failed to decrypt org key; skipping org BYOK for provider',
        provider,
        decryptErr instanceof Error ? decryptErr.message : decryptErr
      );
      return null;
    }
  } catch (error: any) {
    if (error?.code === '42P01') {
      return null;
    }
    throw error;
  }
}

export async function markProviderApiKeyUsed(orgId: string, provider: string): Promise<void> {
  const normalized = normalizeProviderKeyName(provider);
  if (!normalized) return;
  await ensureProviderApiKeysTable();
  const pool = getPool();
  if (!pool) return;
  await pool.query(
    `UPDATE provider_api_keys
     SET last_used_at = NOW(), updated_at = NOW()
     WHERE org_id = $1::uuid AND provider = $2`,
    [orgId, normalized]
  );
}

export async function resolveProviderApiKey(providerInput: string, orgId?: string | null): Promise<ResolvedProviderApiKey> {
  const provider = normalizeProviderKeyName(providerInput);
  if (!provider) {
    return { provider: 'openai', source: 'none', apiKey: null };
  }

  const normalizedOrgId = asNonEmptyString(orgId ?? '');
  if (normalizedOrgId) {
    try {
      const orgKey = await getOrgProviderApiKey(normalizedOrgId, provider);
      if (orgKey?.apiKey) {
        return {
          provider,
          source: 'org',
          apiKey: orgKey.apiKey,
          updatedAt: orgKey.updatedAt ?? null,
        };
      }
    } catch (orgErr) {
      console.warn(
        '[providerApiKeys] Org key lookup failed; falling back to server env if set:',
        provider,
        orgErr instanceof Error ? orgErr.message : orgErr
      );
    }
  }

  const serverKey = getServerManagedKey(provider);
  if (serverKey) {
    return {
      provider,
      source: 'server',
      apiKey: serverKey,
      updatedAt: null,
    };
  }

  return {
    provider,
    source: 'none',
    apiKey: null,
    updatedAt: null,
  };
}

export async function getProviderKeyStatus(orgId: string): Promise<Record<ProviderKeyName, { configured: boolean; source: 'org' | 'server' | 'none' }>> {
  const entries = await Promise.all(
    SUPPORTED_PROVIDER_KEYS.map(async (provider) => {
      const resolved = await resolveProviderApiKey(provider, orgId);
      return [
        provider,
        {
          configured: Boolean(resolved.apiKey),
          source: resolved.source,
        },
      ] as const;
    })
  );

  return Object.fromEntries(entries) as Record<ProviderKeyName, { configured: boolean; source: 'org' | 'server' | 'none' }>;
}
