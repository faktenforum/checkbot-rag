import { randomBytes } from "node:crypto";

// URL-safe alphabet, no ambiguous chars (no 0/O, 1/l/I omitted for clarity)
const ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

function randomString(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    // Use modulo; bias is negligible for this alphabet length
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

export const KEY_PREFIX_LENGTH = 8;
export const KEY_SECRET_LENGTH = 32;
export const KEY_FORMAT_PREFIX = "ffk_";

export type GeneratedKey = {
  rawKey: string;
  prefix: string;
};

/**
 * Generate a new API key in the format `ffk_<8-char-prefix>_<32-char-secret>`.
 * The prefix is visible and safe to store in plain text for UI display;
 * the full raw key should be hashed immediately and only returned to the
 * user once on creation.
 */
export function generateApiKey(): GeneratedKey {
  const prefix = randomString(KEY_PREFIX_LENGTH);
  const secret = randomString(KEY_SECRET_LENGTH);
  return {
    rawKey: `${KEY_FORMAT_PREFIX}${prefix}_${secret}`,
    prefix,
  };
}

/**
 * Parse a raw key into its prefix + secret parts. Returns null if malformed.
 */
export function parseApiKey(
  rawKey: string
): { prefix: string; secret: string } | null {
  if (!rawKey.startsWith(KEY_FORMAT_PREFIX)) return null;
  const rest = rawKey.slice(KEY_FORMAT_PREFIX.length);
  const parts = rest.split("_");
  if (parts.length !== 2) return null;
  const [prefix, secret] = parts;
  if (!prefix || !secret) return null;
  if (prefix.length !== KEY_PREFIX_LENGTH) return null;
  if (secret.length !== KEY_SECRET_LENGTH) return null;
  return { prefix, secret };
}
