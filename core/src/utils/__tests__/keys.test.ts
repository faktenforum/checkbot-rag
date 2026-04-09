import { describe, it, expect } from "bun:test";
import {
  generateApiKey,
  parseApiKey,
  KEY_PREFIX_LENGTH,
  KEY_SECRET_LENGTH,
  KEY_FORMAT_PREFIX,
} from "../keyGenerator";
import { hashApiKey } from "../keyHasher";

describe("generateApiKey", () => {
  it("produces a key in the expected format", () => {
    const { rawKey, prefix } = generateApiKey();
    expect(rawKey).toStartWith(KEY_FORMAT_PREFIX);
    const parts = rawKey.slice(KEY_FORMAT_PREFIX.length).split("_");
    expect(parts).toHaveLength(2);
    expect(parts[0]).toBe(prefix);
    expect(parts[0]!.length).toBe(KEY_PREFIX_LENGTH);
    expect(parts[1]!.length).toBe(KEY_SECRET_LENGTH);
  });

  it("produces keys using the safe alphabet only", () => {
    const { rawKey } = generateApiKey();
    // No 0, O, 1, I, l
    const body = rawKey.slice(KEY_FORMAT_PREFIX.length).replace("_", "");
    expect(body).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);
  });

  it("10k generated keys produce 10k unique raw values", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 10_000; i++) {
      const { rawKey } = generateApiKey();
      expect(seen.has(rawKey)).toBe(false);
      seen.add(rawKey);
    }
    expect(seen.size).toBe(10_000);
  });
});

describe("parseApiKey", () => {
  it("parses a valid generated key back to its parts", () => {
    const { rawKey, prefix } = generateApiKey();
    const parsed = parseApiKey(rawKey);
    expect(parsed).not.toBeNull();
    expect(parsed!.prefix).toBe(prefix);
    expect(parsed!.secret.length).toBe(KEY_SECRET_LENGTH);
  });

  it("returns null for missing format prefix", () => {
    expect(parseApiKey("not-a-key")).toBeNull();
    expect(parseApiKey("abc_def_ghi")).toBeNull();
  });

  it("returns null for wrong segment count", () => {
    expect(parseApiKey("ffk_abc")).toBeNull();
    expect(parseApiKey("ffk_a_b_c")).toBeNull();
  });

  it("returns null for wrong segment lengths", () => {
    expect(parseApiKey("ffk_short_toolongtoolongtoolongtoolong")).toBeNull();
    expect(parseApiKey("ffk_abcdefgh_tooshort")).toBeNull();
  });
});

describe("hashApiKey", () => {
  it("is deterministic for the same input", () => {
    const key = "ffk_testtest_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    expect(hashApiKey(key)).toBe(hashApiKey(key));
  });

  it("produces different hashes for different inputs", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });

  it("is sensitive to every character", () => {
    const a = hashApiKey("ffk_testtest_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    const b = hashApiKey("ffk_testtest_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab");
    expect(a).not.toBe(b);
  });

  it("produces a 64-char hex string (SHA-256)", () => {
    const hash = hashApiKey("anything");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
