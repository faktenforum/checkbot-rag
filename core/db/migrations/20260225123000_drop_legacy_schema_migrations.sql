-- migrate:up
-- Drop legacy migration tracking table only if it has the old custom structure
-- (dbmate also uses schema_migrations with a 'version' column, so we must not drop that)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'schema_migrations'
      AND column_name = 'filename'
  ) THEN
    DROP TABLE schema_migrations;
  END IF;
END $$;

-- migrate:down
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);
