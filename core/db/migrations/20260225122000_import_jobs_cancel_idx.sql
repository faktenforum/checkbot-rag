-- migrate:up
ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS import_jobs_status_created_idx
  ON public.import_jobs (status, created_at);

-- migrate:down
DROP INDEX IF EXISTS import_jobs_status_created_idx;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'import_jobs'
      AND column_name = 'canceled_at'
  ) THEN
    ALTER TABLE public.import_jobs
      DROP COLUMN canceled_at;
  END IF;
END $$;

