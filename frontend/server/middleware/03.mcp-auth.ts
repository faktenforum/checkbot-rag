import { config } from "@checkbot/core";

export default defineEventHandler((event) => {
  if (event.path !== "/mcp") return;
  const expected = config.mcpApiKey;
  if (!expected) return;
  const auth = getHeader(event, "authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== expected) {
    setResponseStatus(event, 401);
    setResponseHeader(event, "Content-Type", "application/json");
    return { error: "Unauthorized" };
  }
});
