import { createHmac, randomBytes } from "node:crypto";

// 48 raw bytes → 64 base64url chars, ~384 bits of entropy.
const SESSION_TOKEN_BYTES = 48;

export function generateSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

/**
 * Hash a session token with an HMAC-SHA256 using the configured session
 * secret as pepper. A leaked DB without the pepper still can't be used to
 * mint or validate tokens.
 */
export function hashSessionToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}
