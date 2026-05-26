import { apiKeyService } from "@search/core";
import type { ActorSource } from "@search/core";
import {
  defineEventHandler,
  getHeader,
  getRequestIP,
  setResponseStatus,
  setResponseHeader,
} from "h3";

const PROTECTED_PREFIXES = ["/api/", "/mcp"];
// Paths that handle their own auth (login creates the session)
const PUBLIC_PATHS = new Set([
  "/api/v1/auth/login",
  "/api/v1/auth/logout",
]);

function isProtectedPath(path: string): boolean {
  if (PUBLIC_PATHS.has(path)) return false;
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p));
}

/**
 * Classify the HTTP surface the request arrived on. Flows into
 * event.context.actorSource and from there into audit-log entries so
 * operators can tell an MCP call from a REST call when an API key shows
 * up in the logs.
 */
function resolveSource(event: { path: string; context: { sessionUser?: unknown } }): ActorSource {
  if (event.context.sessionUser) return "session";
  if (event.path === "/mcp" || event.path.startsWith("/mcp")) return "mcp";
  return "rest";
}

export default defineEventHandler(async (event) => {
  if (!isProtectedPath(event.path)) return;

  // Session middleware already resolved a cookie-based user
  if (event.context.sessionUser) {
    event.context.user = event.context.sessionUser;
    event.context.actorSource = "session";
    return;
  }

  const ip = getRequestIP(event, { xForwardedFor: true });

  // No Bearer token and no session → 401
  const auth = getHeader(event, "authorization");
  if (!auth?.startsWith("Bearer ")) {
    console.warn("[auth] missing token", { path: event.path, ip });
    setResponseStatus(event, 401);
    setResponseHeader(event, "Content-Type", "application/json");
    return { error: "Unauthorized" };
  }

  const rawKey = auth.slice(7).trim();
  const authenticated = await apiKeyService.validate(rawKey);
  if (!authenticated) {
    const prefix = rawKey.slice(0, 12) || "(empty)";
    console.warn("[auth] invalid api key", { path: event.path, keyPrefix: prefix, ip });
    setResponseStatus(event, 401);
    setResponseHeader(event, "Content-Type", "application/json");
    return { error: "Unauthorized" };
  }

  event.context.apiKey = authenticated.key;
  event.context.user = authenticated.user;
  event.context.effectivePermissions = authenticated.effectivePermissions;
  event.context.actorSource = resolveSource(event);

  // Fire-and-forget - do not await
  apiKeyService.touchLastUsed(authenticated.key.id);
});
