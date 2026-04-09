import { hasPermission } from "@checkbot/core";
import { createError } from "h3";
import type { H3Event } from "h3";

/**
 * Throws a 401/403 error if the current request's resolved user does not
 * hold `required`. Call at the top of every protected route handler.
 *
 * Permission resolution:
 * - Session user: uses user.permissions directly
 * - API key bearer: uses the precomputed effectivePermissions (user ∩ key)
 */
export function assertPermission(event: H3Event, required: string): void {
  const user = event.context.user;
  if (!user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  if (!user.active) {
    throw createError({ statusCode: 403, message: "Account disabled" });
  }

  const effective: string[] = event.context.effectivePermissions ?? user.permissions;
  if (!hasPermission({ permissions: effective }, required)) {
    throw createError({ statusCode: 403, message: "Forbidden" });
  }
}
