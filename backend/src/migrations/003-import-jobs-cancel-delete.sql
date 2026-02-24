-- Extend import_jobs with cancellation timestamp and helpful index.
-- This migration is idempotent and safe to run multiple times.

ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMPTZ;

-- Optional helper index for common queries by status and creation time.
CREATE INDEX IF NOT EXISTS import_jobs_status_created_idx
  ON public.import_jobs (status, created_at);

