-- migrate:up
ALTER TABLE public.claims
  ADD COLUMN IF NOT EXISTS language TEXT;

CREATE INDEX IF NOT EXISTS claims_language_idx
  ON public.claims (language);

-- Optional: track import language per job for observability
ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS language TEXT;

CREATE INDEX IF NOT EXISTS import_jobs_language_idx
  ON public.import_jobs (language);

-- migrate:down
DROP INDEX IF EXISTS import_jobs_language_idx;

ALTER TABLE public.import_jobs
  DROP COLUMN IF EXISTS language;

DROP INDEX IF EXISTS claims_language_idx;

ALTER TABLE public.claims
  DROP COLUMN IF EXISTS language;
