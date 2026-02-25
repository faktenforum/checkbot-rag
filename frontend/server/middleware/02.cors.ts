const CORS_ORIGINS = [
  "",
  "http://localhost:3020",
  "http://127.0.0.1:3020",
  "http://checkbot-rag.localhost",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

export default defineEventHandler((event) => {
  const origin = getHeader(event, "origin") ?? "";
  const allow = CORS_ORIGINS.includes(origin) || origin.endsWith(".localhost");
  if (allow) {
    setResponseHeader(event, "Access-Control-Allow-Origin", origin || "*");
  }
  setResponseHeader(event, "Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  setResponseHeader(event, "Access-Control-Allow-Headers", "Content-Type, mcp-session-id, Authorization");
  setResponseHeader(event, "Access-Control-Max-Age", "86400");
  if (getMethod(event) === "OPTIONS") {
    setResponseStatus(event, 204);
    return null;
  }
});
