import { defineHandler, noContent } from "nitro/h3";

const CORS_ORIGINS = [
  "",
  "http://localhost:3020",
  "http://127.0.0.1:3020",
  "http://checkbot-rag.localhost",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export default defineHandler((event) => {
  const origin = event.req.headers.get("origin") ?? "";
  const allow = CORS_ORIGINS.includes(origin) || origin.endsWith(".localhost");
  if (allow) {
    event.res.headers.set("Access-Control-Allow-Origin", origin || "*");
  }
  event.res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  event.res.headers.set("Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Authorization");
  event.res.headers.set("Access-Control-Max-Age", "86400");
  if (event.req.method === "OPTIONS") {
    return noContent(204);
  }
});
