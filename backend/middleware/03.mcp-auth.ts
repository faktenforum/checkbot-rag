import { defineHandler } from "nitro/h3";
import { config } from "@checkbot/core";

export default defineHandler((event) => {
  if (event.url.pathname !== "/mcp") return;
  const expected = config.mcpApiKey;
  if (!expected) return;
  const auth = event.req.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  if (token !== expected) {
    event.res.status = 401;
    event.res.headers.set("Content-Type", "application/json");
    return { error: "Unauthorized" };
  }
});
