-- migrate:up

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_type TEXT NOT NULL CHECK (user_type IN ('human', 'service')),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  password_hash TEXT,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'env_bootstrap')),
  env_var_name TEXT UNIQUE,
  active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT users_human_requires_email    CHECK (user_type = 'service' OR email IS NOT NULL),
  CONSTRAINT users_human_requires_password CHECK (user_type = 'service' OR password_hash IS NOT NULL),
  CONSTRAINT users_service_no_password     CHECK (user_type = 'human' OR password_hash IS NULL)
);

CREATE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS users_active_idx ON users (active) WHERE active = true;

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT '{}',
  rate_limit_points INTEGER,
  rate_limit_duration_sec INTEGER NOT NULL DEFAULT 60,
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON api_keys (key_hash);
CREATE INDEX IF NOT EXISTS api_keys_user_idx ON api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_active_idx ON api_keys (active) WHERE active = true;

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_user_idx ON audit_log (user_id);
CREATE INDEX IF NOT EXISTS audit_log_action_idx ON audit_log (action);

-- migrate:down

DROP INDEX IF EXISTS audit_log_action_idx;
DROP INDEX IF EXISTS audit_log_user_idx;
DROP INDEX IF EXISTS audit_log_created_at_idx;
DROP TABLE IF EXISTS audit_log;

DROP INDEX IF EXISTS sessions_expires_at_idx;
DROP INDEX IF EXISTS sessions_user_idx;
DROP TABLE IF EXISTS sessions;

DROP INDEX IF EXISTS api_keys_active_idx;
DROP INDEX IF EXISTS api_keys_user_idx;
DROP INDEX IF EXISTS api_keys_hash_idx;
DROP TABLE IF EXISTS api_keys;

DROP INDEX IF EXISTS users_active_idx;
DROP INDEX IF EXISTS users_email_lower_idx;
DROP TABLE IF EXISTS users;
