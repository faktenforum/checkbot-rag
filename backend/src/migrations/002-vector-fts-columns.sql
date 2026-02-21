-- This migration is run after 001 and after the embedding dimension is known.
-- DatabaseService calls ALTER TABLE with the configured dimension at startup.
-- The FTS column is added here as a GENERATED ALWAYS column.

-- Full-text search column with German dictionary.
-- Using GENERATED ALWAYS AS ensures it stays in sync with content automatically.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chunks' AND column_name = 'fts_vector'
  ) THEN
    ALTER TABLE chunks
      ADD COLUMN fts_vector TSVECTOR
      GENERATED ALWAYS AS (to_tsvector('german', content)) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS chunks_fts_idx ON chunks USING GIN (fts_vector);

-- Note: The embedding vector column is added by DatabaseService.ensureVectorColumn()
-- because its dimension depends on CHECKBOT_RAG_EMBEDDING_DIMENSIONS.
-- HNSW index is also created there after the column exists.
