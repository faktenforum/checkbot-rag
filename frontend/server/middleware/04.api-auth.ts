import { apiKeyService } from "@checkbot/core";
import {
  defineEventHandler,
  getHeader,
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

export default defineEventHandler(async (event) => {
  if (!isProtectedPath(event.path)) return;

  // Session middleware already resolved a cookie-based user
  if (event.context.sessionUser) {
    event.context.user = event.context.sessionUser;
    return;
  }

  // No Bearer token and no session → 401
  const auth = getHeader(event, "authorization");
  if (!auth?.startsWith("Bearer ")) {
    setResponseStatus(event, 401);
    setResponseHeader(event, "Content-Type", "application/json");
    return { error: "Unauthorized" };
  }

  const rawKey = auth.slice(7).trim();
  const authenticated = await apiKeyService.validate(rawKey);
  if (!authenticated) {
    setResponseStatus(event, 401);
    setResponseHeader(event, "Content-Type", "application/json");
    return { error: "Unauthorized" };
  }

  event.context.apiKey = authenticated.key;
  event.context.user = authenticated.user;
  event.context.effectivePermissions = authenticated.effectivePermissions;

  // Fire-and-forget - do not await
  apiKeyService.touchLastUsed(authenticated.key.id);
});
