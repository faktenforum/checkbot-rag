import fs from "node:fs";
import path from "node:path";
import Koa from "koa";
import bodyParser from "koa-bodyparser";
import serve from "koa-static";
import { config } from "./config/index.js";
import { createMcpRouter } from "./mcp/McpServer.js";
import { apiRouter } from "./controllers/index.js";

const CORS_ORIGINS = [
  "",
  "http://localhost:3020",
  "http://127.0.0.1:3020",
  "http://checkbot-rag.localhost",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export function createApp(): Koa {
  const app = new Koa();

  // CORS: allow browser requests from Admin UI (same host or dev server)
  app.use(async (ctx, next) => {
    const origin = ctx.get("Origin") ?? "";
    const allow = CORS_ORIGINS.includes(origin) || origin.endsWith(".localhost");
    if (allow) {
      ctx.set("Access-Control-Allow-Origin", origin || "*");
    }
    ctx.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    ctx.set("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Authorization");
    ctx.set("Access-Control-Max-Age", "86400");
    if (ctx.method === "OPTIONS") {
      ctx.status = 204;
      return;
    }
    await next();
  });

  // Global error handler — catches errors from all middleware below
  app.use(async (ctx, next) => {
    try {
      await next();
    } catch (err: unknown) {
      const error = err as { httpCode?: number; message?: string; status?: number };
      const status = error.httpCode ?? error.status ?? 500;
      ctx.status = status;
      ctx.body = {
        error: status < 500 ? error.message : "Internal server error",
      };
      if (status >= 500) {
        console.error("[App] Unhandled error:", err);
      }
    }
  });

  // Parse request bodies for all routes (required by router handlers and MCP)
  app.use(bodyParser({ enableTypes: ["json"], strict: false }));

  // MCP API key: when configured, require Authorization: Bearer <key> for /mcp
  app.use(async (ctx, next) => {
    if (ctx.path !== "/mcp") return next();
    const expected = config.mcpApiKey;
    if (!expected) return next();
    const auth = ctx.get("Authorization");
    const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== expected) {
      ctx.status = 401;
      ctx.body = { error: "Unauthorized" };
      return;
    }
    return next();
  });

  // MCP endpoint at /mcp — must be registered before API routes
  const mcpRouter = createMcpRouter();
  app.use(mcpRouter.routes());
  app.use(mcpRouter.allowedMethods());

  // REST API routes
  app.use(apiRouter.routes());
  app.use(apiRouter.allowedMethods());

  // Serve Nuxt frontend static files (production only)
  if (config.staticDir) {
    const staticPath = path.isAbsolute(config.staticDir)
      ? config.staticDir
      : path.join(process.cwd(), config.staticDir);
    app.use(serve(staticPath, { index: "index.html" }));
    // SPA fallback: serve index.html for GET when nothing was served (e.g. /import, /claims) so client-side routing works on reload
    app.use(async (ctx) => {
      if (ctx.method === "GET" && (!ctx.body || ctx.status === 404)) {
        try {
          const indexPath = path.join(staticPath, "index.html");
          ctx.status = 200;
          ctx.type = "html";
          ctx.body = fs.readFileSync(indexPath);
        } catch {
          if (!ctx.body) ctx.status = 404;
        }
      }
    });
  }

  return app;
}
