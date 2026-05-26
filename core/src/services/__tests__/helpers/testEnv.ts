// Preloaded by bun test via bunfig.toml. MUST stay synchronous to avoid
// races with the DatabaseService singleton.
//
// Sets the Postgres credentials for the ephemeral test DB (see
// docker-compose.test.yml) before any application module is imported,
// so `config` resolves to the test database.
//
// Override with SEARCH_TEST_POSTGRES_* if you point tests at a
// different instance (e.g. CI with a service container).

process.env.SEARCH_POSTGRES_HOST =
  process.env.SEARCH_TEST_POSTGRES_HOST ?? "127.0.0.1";
process.env.SEARCH_POSTGRES_PORT =
  process.env.SEARCH_TEST_POSTGRES_PORT ?? "55432";
process.env.SEARCH_POSTGRES_DB =
  process.env.SEARCH_TEST_POSTGRES_DB ?? "search_test";
process.env.SEARCH_POSTGRES_USER =
  process.env.SEARCH_TEST_POSTGRES_USER ?? "search_test";
process.env.SEARCH_POSTGRES_PASSWORD =
  process.env.SEARCH_TEST_POSTGRES_PASSWORD ?? "search_test";

// Required by config schema - the embedding service is not exercised by
// auth tests but the config parser rejects an unset value.
process.env.SEARCH_EMBEDDING_API_KEY ??= "test-key";

// Stable session secret for test runs
process.env.SEARCH_SESSION_SECRET ??= "test-session-secret-test-session-secret";

// Clear bootstrap vars so `config` doesn't pick up values from a local .env
// file. Individual bootstrap tests set these explicitly via process.env
// before calling bootstrapFromEnv(), but config is frozen at import time so
// we must ensure they start unset here.
delete process.env.SEARCH_BOOTSTRAP_ADMIN_EMAIL;
delete process.env.SEARCH_BOOTSTRAP_ADMIN_PASSWORD;
delete process.env.SEARCH_BOOTSTRAP_FAKTENFORUM_KEY;
delete process.env.SEARCH_BOOTSTRAP_MCP_KEY;

// Shorter idle timeout so the pool lets the process exit quickly after
// the last test - bun test doesn't call db.end() itself and leaving the
// pool open would hang the run.
process.env.SEARCH_TEST_MODE = "1";
