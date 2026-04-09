// Preloaded by bun test via bunfig.toml. MUST stay synchronous to avoid
// races with the DatabaseService singleton.
//
// Sets the Postgres credentials for the ephemeral test DB (see
// docker-compose.test.yml) before any application module is imported,
// so `config` resolves to the test database.
//
// Override with CHECKBOT_RAG_TEST_POSTGRES_* if you point tests at a
// different instance (e.g. CI with a service container).

process.env.CHECKBOT_RAG_POSTGRES_HOST =
  process.env.CHECKBOT_RAG_TEST_POSTGRES_HOST ?? "127.0.0.1";
process.env.CHECKBOT_RAG_POSTGRES_PORT =
  process.env.CHECKBOT_RAG_TEST_POSTGRES_PORT ?? "55432";
process.env.CHECKBOT_RAG_POSTGRES_DB =
  process.env.CHECKBOT_RAG_TEST_POSTGRES_DB ?? "checkbot_rag_test";
process.env.CHECKBOT_RAG_POSTGRES_USER =
  process.env.CHECKBOT_RAG_TEST_POSTGRES_USER ?? "checkbot_rag_test";
process.env.CHECKBOT_RAG_POSTGRES_PASSWORD =
  process.env.CHECKBOT_RAG_TEST_POSTGRES_PASSWORD ?? "checkbot_rag_test";

// Required by config schema - the embedding service is not exercised by
// auth tests but the config parser rejects an unset value.
process.env.CHECKBOT_RAG_EMBEDDING_API_KEY ??= "test-key";

// Stable session secret for test runs
process.env.CHECKBOT_RAG_SESSION_SECRET ??= "test-session-secret-test-session-secret";

// Shorter idle timeout so the pool lets the process exit quickly after
// the last test - bun test doesn't call db.end() itself and leaving the
// pool open would hang the run.
process.env.CHECKBOT_RAG_TEST_MODE = "1";
