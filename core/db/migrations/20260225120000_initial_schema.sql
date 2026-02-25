-- migrate:up
CREATE EXTENSION IF NOT EXISTS vector;

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
  version_hash TEXT NOT NULL,
  raw_data JSONB NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS claims_status_idx ON claims (status);
CREATE INDEX IF NOT EXISTS claims_rating_label_idx ON claims (rating_label);
CREATE INDEX IF NOT EXISTS claims_categories_idx ON claims USING GIN (categories);
CREATE INDEX IF NOT EXISTS claims_publishing_date_idx ON claims (publishing_date);

CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL,
  total INTEGER DEFAULT 0,
  processed INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunks (
  id SERIAL PRIMARY KEY,
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  chunk_type TEXT NOT NULL CHECK (chunk_type IN ('claim_overview', 'fact_detail')),
  fact_index INTEGER,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chunks_claim_id_idx ON chunks (claim_id);
CREATE INDEX IF NOT EXISTS chunks_chunk_type_idx ON chunks (chunk_type);
CREATE INDEX IF NOT EXISTS chunks_metadata_idx ON chunks USING GIN (metadata);

-- migrate:down
DROP INDEX IF EXISTS chunks_metadata_idx;
DROP INDEX IF EXISTS chunks_chunk_type_idx;
DROP INDEX IF EXISTS chunks_claim_id_idx;

DROP TABLE IF EXISTS chunks;
DROP TABLE IF EXISTS import_jobs;
DROP INDEX IF EXISTS claims_publishing_date_idx;
DROP INDEX IF EXISTS claims_categories_idx;
DROP INDEX IF EXISTS claims_rating_label_idx;
DROP INDEX IF EXISTS claims_status_idx;
DROP TABLE IF EXISTS claims;

