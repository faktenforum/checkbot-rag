-- migrate:up
-- Remove the generated fts_vector column and its index.
-- Full-text search now computes tsvector on the fly per language; this column can be
-- reintroduced later as a performance optimisation if needed.

DROP INDEX IF EXISTS chunks_fts_idx;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'chunks'
      AND column_name = 'fts_vector'
  ) THEN
    ALTER TABLE chunks
      DROP COLUMN fts_vector;
  END IF;
END $$;

-- migrate:down
-- Recreate the German full-text search column and index as before.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'chunks'
      AND column_name = 'fts_vector'
  ) THEN
    ALTER TABLE chunks
      ADD COLUMN fts_vector TSVECTOR
      GENERATED ALWAYS AS (to_tsvector('german', content)) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS chunks_fts_idx ON chunks USING GIN (fts_vector);

