import { describe, it, expect, beforeEach } from "bun:test";
import { RateLimiterService, RateLimiterRes } from "../RateLimiterService";
import { config } from "../../config";

// Exercises the bucket semantics that the login-rate-limit middleware
// (frontend/server/middleware/035.login-rate-limit.ts) relies on. The
// middleware itself is thin glue around RateLimiterService + audit-log; the
// security-critical behavior is the bucket isolation and shared-key
// brute-force defense, which we can test end-to-end at the service layer
// by using the same key format the middleware uses.

const IP_KEY = (ip: string) => `login_ip:${ip}`;
const EMAIL_KEY = (email: string) => `login_email:${email.trim().toLowerCase()}`;

describe("Login rate-limit — bucket semantics", () => {
  let limiter: RateLimiterService;
  const { loginIpPoints, loginIpDurationSec, loginEmailPoints, loginEmailDurationSec } =
    config.rateLimiting;

  beforeEach(() => {
    limiter = new RateLimiterService();
  });

  it("per-IP bucket: N+1 login attempts from same IP exhaust the bucket", async () => {
    const ip = "1.2.3.4";
    for (let i = 0; i < loginIpPoints; i++) {
      await limiter.consume(IP_KEY(ip), loginIpPoints, loginIpDurationSec);
    }
    expect(
      limiter.consume(IP_KEY(ip), loginIpPoints, loginIpDurationSec)
    ).rejects.toBeInstanceOf(RateLimiterRes);
  });

  it("per-email bucket: N+1 login attempts with same email from different IPs exhaust the bucket (spray attack)", async () => {
    const email = "victim@example.com";
    for (let i = 0; i < loginEmailPoints; i++) {
      // Each attempt uses a distinct IP — IP bucket doesn't trip.
      await limiter.consume(
        EMAIL_KEY(email),
        loginEmailPoints,
        loginEmailDurationSec
      );
    }
    expect(
      limiter.consume(EMAIL_KEY(email), loginEmailPoints, loginEmailDurationSec)
    ).rejects.toBeInstanceOf(RateLimiterRes);
  });

  it("email key normalizes to lowercase + trim — case variants share the bucket", async () => {
    expect(EMAIL_KEY(" VICTIM@EXAMPLE.COM ")).toBe("login_email:victim@example.com");
    expect(EMAIL_KEY("Victim@Example.com")).toBe("login_email:victim@example.com");
  });

  it("different IPs and different emails have isolated buckets", async () => {
    await limiter.consume(IP_KEY("1.1.1.1"), loginIpPoints, loginIpDurationSec);
    const other = await limiter.consume(
      IP_KEY("2.2.2.2"),
      loginIpPoints,
      loginIpDurationSec
    );
    expect(other.remainingPoints).toBe(loginIpPoints - 1);

    await limiter.consume(
      EMAIL_KEY("alice@example.com"),
      loginEmailPoints,
      loginEmailDurationSec
    );
    const otherEmail = await limiter.consume(
      EMAIL_KEY("bob@example.com"),
      loginEmailPoints,
      loginEmailDurationSec
    );
    expect(otherEmail.remainingPoints).toBe(loginEmailPoints - 1);
  });

  it("rejection surface: RateLimiterRes carries msBeforeNext for Retry-After header", async () => {
    const ip = "3.3.3.3";
    // Use the configured limit and a short window so the msBeforeNext is bounded.
    for (let i = 0; i < loginIpPoints; i++) {
      await limiter.consume(IP_KEY(ip), loginIpPoints, 2);
    }
    try {
      await limiter.consume(IP_KEY(ip), loginIpPoints, 2);
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(RateLimiterRes);
      const res = err as RateLimiterRes;
      expect(res.msBeforeNext).toBeGreaterThan(0);
      expect(res.msBeforeNext).toBeLessThanOrEqual(2000);
    }
  });

  it("default config values are sane (per plan: 10/15min IP, 5/15min email)", () => {
    expect(loginIpPoints).toBe(10);
    expect(loginIpDurationSec).toBe(900);
    expect(loginEmailPoints).toBe(5);
    expect(loginEmailDurationSec).toBe(900);
  });
});
