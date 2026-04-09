import { createHash } from "node:crypto";

/**
 * Hash an API key for storage. SHA-256 is sufficient here because the key
 * itself carries 32 chars of random entropy (~190 bits) - brute-forcing the
 * preimage is infeasible without an additional work factor. No per-key salt
 * needed since keys are globally unique and never chosen by users.
 */
export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}
