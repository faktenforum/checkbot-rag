import { describe, it, expect, beforeEach } from "bun:test";
import { RateLimiterService, RateLimiterRes } from "../RateLimiterService";

describe("RateLimiterService", () => {
  let limiter: RateLimiterService;

  beforeEach(() => {
    limiter = new RateLimiterService();
  });

  it("allows consume calls up to the limit", async () => {
    const result = await limiter.consume("key-a", 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remainingPoints).toBe(4);
  });

  it("rejects once the limit is exhausted", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("key-a", 5, 60);
    }
    expect(limiter.consume("key-a", 5, 60)).rejects.toBeInstanceOf(
      RateLimiterRes
    );
  });

  it("rejection result carries msBeforeNext", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("key-a", 5, 60);
    }
    try {
      await limiter.consume("key-a", 5, 60);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimiterRes);
      const res = err as RateLimiterRes;
      expect(res.msBeforeNext).toBeGreaterThan(0);
    }
  });

  it("different keys have independent buckets", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("key-a", 5, 60);
    }
    // key-a exhausted, key-b fresh
    const result = await limiter.consume("key-b", 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remainingPoints).toBe(4);
  });

  it("different points+duration combos have separate limiters", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("key-a", 5, 60);
    }
    // Same key, different limit config → separate bucket
    const result = await limiter.consume("key-a", 10, 60);
    expect(result.allowed).toBe(true);
  });

  it("reset clears a single key across all limiters", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("key-a", 5, 60);
    }
    await limiter.reset("key-a");
    const result = await limiter.consume("key-a", 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remainingPoints).toBe(4);
  });

  it("supports short windows for fast tests", async () => {
    // 2-second window, 3 points
    for (let i = 0; i < 3; i++) {
      await limiter.consume("key-short", 3, 2);
    }
    expect(limiter.consume("key-short", 3, 2)).rejects.toBeInstanceOf(
      RateLimiterRes
    );
    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 2100));
    const result = await limiter.consume("key-short", 3, 2);
    expect(result.allowed).toBe(true);
  }, 5000);

  it("supports a cost parameter", async () => {
    const result = await limiter.consume("key-cost", 10, 60, 3);
    expect(result.remainingPoints).toBe(7);
  });

  it("clearAll drops all state", async () => {
    for (let i = 0; i < 5; i++) {
      await limiter.consume("key-a", 5, 60);
    }
    limiter.clearAll();
    const result = await limiter.consume("key-a", 5, 60);
    expect(result.allowed).toBe(true);
    expect(result.remainingPoints).toBe(4);
  });
});
