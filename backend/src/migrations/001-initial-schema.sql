-- Enable vector extension (provided by pgvector/pgvector Docker image)
CREATE EXTENSION IF NOT EXISTS vector;

-- Stores imported fact-checks from faktenforum.
-- external_id maps to faktenforum's claim.id for future sync.
CREATE TABLE IF NOT EXISTS claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id UUID UNIQUE NOT NULL,
  short_id TEXT UNIQUE,
  process_id INTEGER,
  status TEXT NOT NULL DEFAULT 'imported',
  synopsis TEXT,
  rating_statement TEXT,
  rating_summary TEXT,
  rating_label TEXT,
  categories TEXT[] DEFAULT '{}',
  publishing_url TEXT,
  publishing_date TIMESTAMPTZ,
  internal BOOLEAN DEFAULT false,
  -- MD5 hash of the original JSON for idempotent re-import
  version_hash TEXT NOT NULL,
  -- Full original claim JSON for reference and future re-chunking
  raw_data JSONB NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS claims_status_idx ON claims (status);
CREATE INDEX IF NOT EXISTS claims_rating_label_idx ON claims (rating_label);
CREATE INDEX IF NOT EXISTS claims_categories_idx ON claims USING GIN (categories);
CREATE INDEX IF NOT EXISTS claims_publishing_date_idx ON claims (publishing_date);

-- Tracks async import jobs (BullMQ integration planned; simple in-memory state for MVP)
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | running | done | failed
  source TEXT NOT NULL,                      -- filename or description
  total INTEGER DEFAULT 0,
  processed INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores chunks derived from claims.
-- embedding dimension is set dynamically via ALTER TABLE after extension setup.
-- The actual vector column is added by DatabaseService after reading config.
CREATE TABLE IF NOT EXISTS chunks (
  id SERIAL PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  -- 'claim_overview': synopsis + rating fields + categories
  -- 'fact_detail': individual fact.text + source excerpts
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('claim_overview', 'fact_detail')),
  fact_index INTEGER,            -- NULL for claim_overview, 1-based for fact_detail
  content TEXT NOT NULL,
  -- JSONB metadata for filtering: claim_id, short_id, categories, rating_label,
  -- publishing_date, publishing_url, fact_index, chunk_type
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chunks_claim_id_idx ON chunks (claim_id);
CREATE INDEX IF NOT EXISTS chunks_chunk_type_idx ON chunks (chunk_type);
CREATE INDEX IF NOT EXISTS chunks_metadata_idx ON chunks USING GIN (metadata);

-- FTS index using German dictionary for stemming and stop words.
-- The generated column is added in a separate migration step after TABLE creation
-- because the column definition references to_tsvector which needs the table to exist.
