-- 018_prompt_cache_v4.sql
-- L3 durable cache for the v4 three-tier cache architecture.
-- See docs/adr/ADR-001-cache-architecture.md
--
-- Default embedding dim = 1536 (text-embedding-3-small).
-- Adjust via ALTER TABLE if you switch to a different provider/dim.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS prompt_cache_v4 (
  fingerprint        TEXT PRIMARY KEY,
  intent             TEXT NOT NULL,
  domain_id          TEXT NOT NULL,
  framework          TEXT NOT NULL,
  provider           TEXT NOT NULL,
  provider_version   TEXT,
  style_profile_id   TEXT,
  response           JSONB NOT NULL,
  embedding          vector(1536),
  hit_count          INTEGER NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_hit_at        TIMESTAMPTZ,
  tombstoned_at      TIMESTAMPTZ
);

-- IVFFlat cosine similarity index. lists=100 is a reasonable default for
-- mid-size caches; tune up to sqrt(n_rows) at scale.
CREATE INDEX IF NOT EXISTS idx_prompt_cache_v4_embedding
  ON prompt_cache_v4
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100)
  WHERE tombstoned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prompt_cache_v4_filter
  ON prompt_cache_v4 (domain_id, framework, provider, style_profile_id)
  WHERE tombstoned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prompt_cache_v4_provider_version
  ON prompt_cache_v4 (provider, provider_version)
  WHERE tombstoned_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prompt_cache_v4_hit_count
  ON prompt_cache_v4 (hit_count DESC)
  WHERE tombstoned_at IS NULL;
