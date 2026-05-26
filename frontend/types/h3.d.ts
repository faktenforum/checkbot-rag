import type { ActorSource, ApiKey, Session, User } from "@search/core";

declare module "h3" {
  interface H3EventContext {
    /** Resolved from session cookie by 03.session.ts */
    sessionUser?: User;
    /** Active session when authenticated via cookie */
    session?: Session;
    /** Resolved user (from session or API key). Set by 04.api-auth.ts. */
    user?: User;
    /** Set when authenticated via Bearer token */
    apiKey?: ApiKey;
    /** user.permissions ∩ key.permissions; set when authenticated via Bearer */
    effectivePermissions?: string[];
    /** HTTP surface this request came in on. Set by 04.api-auth.ts. */
    actorSource?: ActorSource;
  }
}
