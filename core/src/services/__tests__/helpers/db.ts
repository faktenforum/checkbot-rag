// Helper for DB-backed service tests. Env vars pointing at the test DB
// are set in ./testEnv.ts which is preloaded via bunfig.toml.
// The test DB is spun up by `docker compose -f docker-compose.test.yml up -d`.

import { db } from "../../DatabaseService";

/**
 * Reset all auth-related tables. Uses TRUNCATE for speed - no migrations
 * are re-run between tests.
 */
export async function resetAuthTables(): Promise<void> {
  await db.query(`
    TRUNCATE TABLE audit_log, sessions, api_keys, users
    RESTART IDENTITY CASCADE
  `);
}

/**
 * Close the DB pool. Call in afterAll to let the test process exit.
 */
export async function closeDb(): Promise<void> {
  await db.end();
}

export { db };
