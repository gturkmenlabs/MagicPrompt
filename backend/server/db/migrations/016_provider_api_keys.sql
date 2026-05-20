-- Org-level provider API keys (encrypted at application layer via SR_ENCRYPTION_KEY).

CREATE TABLE IF NOT EXISTS provider_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN (
    'openai',
    'gemini',
    'groq',
    'claude',
    'openrouter',
    'deepseek',
    'huggingface',
    'fal'
  )),
  encrypted_key TEXT NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_provider_api_keys_org ON provider_api_keys (org_id);
CREATE INDEX IF NOT EXISTS idx_provider_api_keys_provider ON provider_api_keys (provider);
