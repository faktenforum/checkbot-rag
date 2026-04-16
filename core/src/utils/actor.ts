import type { Actor, ActorSource } from "../types/auth.js";

/** The user id of an Actor, or null for system/null actors. */
export function actorUserId(actor: Actor): string | null {
  return actor && actor.type === "user" ? actor.userId : null;
}

/**
 * The HTTP surface an Actor operated on. Lands in audit-log metadata.source.
 * Defaults to "system" when the actor is null or doesn't specify a surface
 * (e.g. bootstrap code or old call sites that predate surface threading).
 */
export function actorSource(actor: Actor): ActorSource {
  if (!actor) return "system";
  return actor.source ?? "system";
}
