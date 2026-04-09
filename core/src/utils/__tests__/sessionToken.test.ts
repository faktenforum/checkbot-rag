import { describe, it, expect } from "bun:test";
import { generateSessionToken, hashSessionToken } from "../sessionToken";

describe("generateSessionToken", () => {
  it("produces a URL-safe base64 string", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("produces at least 64 characters (48 raw bytes)", () => {
    const token = generateSessionToken();
    expect(token.length).toBeGreaterThanOrEqual(64);
  });

  it("produces unique tokens", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const t = generateSessionToken();
      expect(seen.has(t)).toBe(false);
      seen.add(t);
    }
  });
});

describe("hashSessionToken", () => {
  it("is deterministic for the same token + secret", () => {
    const token = "fixed-token-value";
    const secret = "some-pepper-value-long-enough";
    expect(hashSessionToken(token, secret)).toBe(hashSessionToken(token, secret));
  });

  it("changes when the token changes", () => {
    const secret = "some-pepper-value-long-enough";
    expect(hashSessionToken("a", secret)).not.toBe(hashSessionToken("b", secret));
  });

  it("changes when the pepper changes (leaked DB without pepper is useless)", () => {
    const token = "fixed-token-value";
    expect(hashSessionToken(token, "pepperA")).not.toBe(
      hashSessionToken(token, "pepperB")
    );
  });

  it("produces a 64-char hex string (HMAC-SHA256)", () => {
    const hash = hashSessionToken("token", "secret");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
