import { config, db, EmbeddingService } from "@checkbot/core";

// Default: fast DB-only probe. Scrapers hit this frequently, so we don't
// contact the embedding provider by default (would consume quota and add
// latency). Pass `?deep=1` to also probe the embedding provider — useful for
// diagnostics when the search API reports `degraded: true`.
export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const deep = query.deep === "1" || query.deep === "true";

  let dbOk = false;
  try {
    await db.query("SELECT 1");
    dbOk = true;
  } catch {
    dbOk = false;
  }

  if (!deep) {
    return dbOk
      ? { status: "ok", db: "ok" }
      : { status: "down", db: "unreachable" };
  }

  // Embedding not configured → report as "disabled", not "unreachable".
  // Search still works via FTS; status is degraded but expected.
  if (!config.embedding.apiKey) {
    return {
      status: !dbOk ? "down" : "degraded",
      db: dbOk ? "ok" : "unreachable",
      embeddings: "disabled",
    };
  }

  const embeddingService = new EmbeddingService();
  const embeddingsOk = await embeddingService.probeAvailability(2000);

  const status = !dbOk ? "down" : embeddingsOk ? "ok" : "degraded";
  return {
    status,
    db: dbOk ? "ok" : "unreachable",
    embeddings: embeddingsOk ? "ok" : "unreachable",
  };
});
