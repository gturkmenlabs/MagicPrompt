-- Template Marketplace Tables
-- Shared Templates (community templates)
CREATE TABLE IF NOT EXISTS shared_templates (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  description   TEXT,
  description_en TEXT,
  domain_id     TEXT NOT NULL DEFAULT 'general',
  framework     TEXT NOT NULL DEFAULT 'AUTO',
  intent_tr     TEXT NOT NULL,
  intent_en     TEXT NOT NULL,
  tags          TEXT[] DEFAULT '{}',
  author_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  author_name   TEXT,
  forked_from   TEXT,
  rating        NUMERIC(3,2) NOT NULL DEFAULT 0.0,
  rating_count  INT NOT NULL DEFAULT 0,
  use_count     INT NOT NULL DEFAULT 0,
  fork_count    INT NOT NULL DEFAULT 0,
  is_official   BOOLEAN NOT NULL DEFAULT false,
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  is_approved   BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shared_templates_domain ON shared_templates(domain_id);
CREATE INDEX IF NOT EXISTS idx_shared_templates_framework ON shared_templates(framework);
CREATE INDEX IF NOT EXISTS idx_shared_templates_author ON shared_templates(author_id);
CREATE INDEX IF NOT EXISTS idx_shared_templates_rating ON shared_templates(rating DESC);
CREATE INDEX IF NOT EXISTS idx_shared_templates_use_count ON shared_templates(use_count DESC);
CREATE INDEX IF NOT EXISTS idx_shared_templates_created ON shared_templates(created_at DESC);

-- Template Ratings (user ratings for templates)
CREATE TABLE IF NOT EXISTS template_ratings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id  TEXT NOT NULL REFERENCES shared_templates(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating       INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_template_ratings_template ON template_ratings(template_id);
CREATE INDEX IF NOT EXISTS idx_template_ratings_user ON template_ratings(user_id);

-- Template Collections (user-created folders)
CREATE TABLE IF NOT EXISTS template_collections (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT,
  icon          TEXT NOT NULL DEFAULT '📁',
  color         TEXT NOT NULL DEFAULT '#06e8f9',
  template_ids  TEXT[] DEFAULT '{}',
  is_public     BOOLEAN NOT NULL DEFAULT false,
  is_pinned     BOOLEAN NOT NULL DEFAULT false,
  author_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  use_count     INT NOT NULL DEFAULT 0,
  tags          TEXT[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_template_collections_author ON template_collections(author_id);
CREATE INDEX IF NOT EXISTS idx_template_collections_public ON template_collections(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_template_collections_pinned ON template_collections(author_id, is_pinned DESC) WHERE is_pinned = true;

-- Template Collection Followers (for public collections)
CREATE TABLE IF NOT EXISTS template_collection_follows (
  collection_id TEXT NOT NULL REFERENCES template_collections(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, user_id)
);

-- Template Embeddings (for semantic search)
CREATE TABLE IF NOT EXISTS template_embeddings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('builtin', 'shared')),
  embedding     VECTOR(1536),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, template_type)
);
CREATE INDEX IF NOT EXISTS idx_template_embeddings_vector ON template_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Template View History (for recommendations)
CREATE TABLE IF NOT EXISTS template_view_history (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id  TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('builtin', 'shared')),
  view_count   INT NOT NULL DEFAULT 1,
  last_viewed  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, template_id, template_type)
);
CREATE INDEX IF NOT EXISTS idx_template_view_history_user ON template_view_history(user_id, last_viewed DESC);

-- Template Usage Stats (aggregate analytics)
CREATE TABLE IF NOT EXISTS template_usage_stats (
  template_id   TEXT NOT NULL,
  template_type TEXT NOT NULL CHECK (template_type IN ('builtin', 'shared')),
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  use_count     INT NOT NULL DEFAULT 0,
  unique_users  INT NOT NULL DEFAULT 0,
  avg_rating    NUMERIC(3,2),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (template_id, template_type, period_start)
);

-- Function to update template rating
CREATE OR REPLACE FUNCTION update_template_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE shared_templates
  SET rating = (
    SELECT AVG(rating) FROM template_ratings WHERE template_id = NEW.template_id
  ),
  rating_count = (
    SELECT COUNT(*) FROM template_ratings WHERE template_id = NEW.template_id
  )
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_template_rating ON template_ratings;
CREATE TRIGGER trg_update_template_rating
  AFTER INSERT OR UPDATE ON template_ratings
  FOR EACH ROW EXECUTE FUNCTION update_template_rating();

-- Insert some official templates (seed data)
INSERT INTO shared_templates (id, name, name_en, description, description_en, domain_id, framework, intent_tr, intent_en, is_official, is_approved, rating, rating_count, use_count)
VALUES
  ('official-react-component', 'React Bilesen Sablonu', 'React Component Template', 'Uretime ready React bileseni for kapsamli template', 'Comprehensive template for production-ready React components', 'frontend', 'RTF', 'React + TypeScript for erisilebilir ve performansli bir bilesen tasarla: props arayuzu, state yonetimi, edge-case senaryolari, test yaklasimi ve example kullanim dahil olsun.', 'Design an accessible and performant React + TypeScript component including props interface, state strategy, edge cases, testing approach, and usage examples.', true, true, 4.8, 156, 2340),
  ('official-api-design', 'REST API Tasarim Sablonu', 'REST API Design Template', 'OWASP uyumlu guvenli REST API tasarimi', 'OWASP-compliant secure REST API design', 'backend', 'KERNEL', 'E-ticaret for guvenli REST API tasarla. OWASP Top 10, AuthN/AuthZ, rate limiting, OpenAPI 3.0.', 'Design a secure REST API for e-commerce. OWASP Top 10, AuthN/AuthZ, rate limiting, OpenAPI 3.0.', true, true, 4.9, 203, 3120),
  ('official-rag-chatbot', 'RAG Chatbot Sablonu', 'RAG Chatbot Template', 'RAG tabanli akilli chatbot sistemi', 'RAG-based intelligent chatbot system', 'nlp-llm', 'CHAIN', 'RAG tabanli chatbot sistemi tasarla: dokuman parsing, chunking stratejisi, embedding modeli secimi, vector store, retrieval kalitesi metrikleri, prompt injection onleme.', 'Design a RAG-based chatbot system: document parsing, chunking strategy, embedding model selection, vector store, retrieval quality metrics, prompt injection prevention.', true, true, 4.7, 89, 1890)
ON CONFLICT (id) DO NOTHING;