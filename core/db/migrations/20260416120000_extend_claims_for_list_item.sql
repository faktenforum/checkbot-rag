-- migrate:up
ALTER TABLE claims
  ADD COLUMN IF NOT EXISTS submitter_notes TEXT,
  ADD COLUMN IF NOT EXISTS origins JSONB,
  ADD COLUMN IF NOT EXISTS created_at_source TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by TEXT;

-- migrate:down
ALTER TABLE claims
  DROP COLUMN IF EXISTS created_by,
  DROP COLUMN IF EXISTS created_at_source,
  DROP COLUMN IF EXISTS origins,
  DROP COLUMN IF EXISTS submitter_notes;
