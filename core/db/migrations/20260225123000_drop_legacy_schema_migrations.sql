-- migrate:up
DROP TABLE IF EXISTS schema_migrations;

-- migrate:down
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

