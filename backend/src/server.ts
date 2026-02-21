import { config } from "./config/index.js";
import { db } from "./services/DatabaseService.js";
import { createApp } from "./app.js";

async function main() {
  console.log("[Server] Starting checkbot-rag...");
  console.log(`[Server] Embedding: ${config.embedding.provider}/${config.embedding.model} (${config.embedding.dimensions} dims)`);

  try {
    await db.initialize();
  } catch (err) {
    console.error("[Server] Database initialization failed:", err);
    process.exit(1);
  }

  const app = createApp();

  app.listen(config.port, () => {
    console.log(`[Server] Listening on port ${config.port}`);
    console.log(`[Server] REST API: http://localhost:${config.port}/api/v1`);
    console.log(`[Server] MCP endpoint: http://localhost:${config.port}/mcp`);
    console.log(`[Server] Health: http://localhost:${config.port}/health`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[Server] Received ${signal}, shutting down gracefully...`);
    await db.end();
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error("[Server] Fatal startup error:", err);
  process.exit(1);
});
