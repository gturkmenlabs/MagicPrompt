-- Add Mistral to org BYOK provider check (provider_api_keys).
-- Run manually if you applied 016_provider_api_keys.sql earlier.

ALTER TABLE provider_api_keys DROP CONSTRAINT IF EXISTS provider_api_keys_provider_check;

ALTER TABLE provider_api_keys ADD CONSTRAINT provider_api_keys_provider_check CHECK (provider IN (
  'openai',
  'gemini',
  'groq',
  'claude',
  'openrouter',
  'deepseek',
  'huggingface',
  'fal',
  'mistral'
));
