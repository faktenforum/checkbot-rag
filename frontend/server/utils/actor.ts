import type { Actor } from "@search/core";
import { createError, type H3Event } from "h3";

/**
 * The narrowed user-actor shape. Call sites that need to override permissions
 * (e.g. api-key creation using effectivePermissions) can spread this and
 * replace `permissions` without the type widening to the Actor-null branch.
 */
export type UserActor = {
  type: "user";
  userId: string;
  permissions: string[];
  source: NonNullable<Exclude<Actor, null>["source"]>;
};

/**
 * Build a user Actor for service calls from the event context. Requires that
 * api-auth middleware has already populated `user` and `actorSource` — throws
 * otherwise, because passing a null actor to a mutating service call would
 * produce ambiguous audit-log entries.
 */
export function actorFromEvent(event: H3Event): UserActor {
  const user = event.context.user;
  if (!user) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  return {
    type: "user",
    userId: user.id,
    permissions: user.permissions,
    source: event.context.actorSource ?? "rest",
  };
}
