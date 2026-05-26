import { auditLogService, hasPermission } from "@search/core";
import { createError, getRequestIP } from "h3";
import type { H3Event } from "h3";

/**
 * Throws a 401/403 error if the current request's resolved user does not
 * hold `required`. Call at the top of every protected route handler.
 *
 * Permission resolution:
 * - Session user: uses user.permissions directly
 * - API key bearer: uses the precomputed effectivePermissions (user ∩ key)
 *
 * 403s are written to the audit log as `api_key.access_denied`
 * (fire-and-forget) with the required permission, the path, and the actor
 * source — so operators can spot patterns like "MCP-scoped key tries REST
 * admin routes" or "disabled account keeps hitting the API".
 */
export function assertPermission(event: H3Event, required: string): void {
  const user = event.context.user;
  if (!user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  if (!user.active) {
    void auditLogService.log("api_key.access_denied", {
      userId: user.id,
      source: event.context.actorSource,
      targetType: event.context.apiKey ? "api_key" : "user",
      targetId: event.context.apiKey?.id ?? user.id,
      ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null,
      metadata: { reason: "account_disabled", required, path: event.path },
    });
    throw createError({ statusCode: 403, message: "Account disabled" });
  }

  const effective: string[] = event.context.effectivePermissions ?? user.permissions;
  if (!hasPermission({ permissions: effective }, required)) {
    void auditLogService.log("api_key.access_denied", {
      userId: user.id,
      source: event.context.actorSource,
      targetType: event.context.apiKey ? "api_key" : "user",
      targetId: event.context.apiKey?.id ?? user.id,
      ipAddress: getRequestIP(event, { xForwardedFor: true }) ?? null,
      metadata: {
        reason: "missing_permission",
        required,
        effective,
        path: event.path,
      },
    });
    throw createError({ statusCode: 403, message: "Forbidden" });
  }
}
