import {
  rateLimiterService,
  config,
  RateLimiterRes,
  auditLogService,
} from "@checkbot/core";
import {
  defineEventHandler,
  getRequestIP,
  readBody,
  setResponseStatus,
  setResponseHeader,
} from "h3";

// Runs BEFORE api-auth (04) and the authenticated rate-limit (05), because
// /api/v1/auth/login is a PUBLIC_PATH and otherwise unthrottled. Two parallel
// buckets: per-IP and per-email (lowercased). Either bucket exhausting returns
// 429, so we defend against both single-IP brute-force and email-spray over
// many residential proxies.

const LOGIN_PATH = "/api/v1/auth/login";

export default defineEventHandler(async (event) => {
  if (event.path !== LOGIN_PATH) return;
  if (event.method !== "POST") return;
  if (!config.rateLimiting.enabled) return;

  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "unknown";

  // h3's readBody caches on the event, so reading it here does not consume
  // the stream — the downstream handler still gets the body via readBody().
  let email: string | undefined;
  try {
    const body = (await readBody(event)) as { email?: unknown };
    if (typeof body?.email === "string") {
      email = body.email.trim().toLowerCase();
    }
  } catch {
    // Malformed body → let the route handler return its 400; skip rate limit.
    return;
  }

  const ipKey = `login_ip:${ip}`;
  const emailKey = email ? `login_email:${email}` : null;

  // Consume each bucket in its own try/catch so we know exactly which one
  // tripped. RateLimiterRes doesn't carry the limiter key, and deriving it
  // from consumedPoints is ambiguous when the two limits differ.
  let rejected: { bucket: "login_ip" | "login_email"; retryAfter: number } | null = null;

  try {
    await rateLimiterService.consume(
      ipKey,
      config.rateLimiting.loginIpPoints,
      config.rateLimiting.loginIpDurationSec
    );
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      rejected = { bucket: "login_ip", retryAfter: Math.ceil(err.msBeforeNext / 1000) };
    } else {
      throw err;
    }
  }

  if (!rejected && emailKey) {
    try {
      await rateLimiterService.consume(
        emailKey,
        config.rateLimiting.loginEmailPoints,
        config.rateLimiting.loginEmailDurationSec
      );
    } catch (err) {
      if (err instanceof RateLimiterRes) {
        rejected = { bucket: "login_email", retryAfter: Math.ceil(err.msBeforeNext / 1000) };
      } else {
        throw err;
      }
    }
  }

  if (rejected) {
    console.warn("[login-rate-limit] rejected", {
      ip,
      email,
      bucket: rejected.bucket,
      retryAfterSeconds: rejected.retryAfter,
    });

    // Fire-and-forget audit entry — do not block the response on DB write.
    void auditLogService.log("auth.login_rate_limited", {
      source: "session",
      metadata: { ip, email, bucket: rejected.bucket },
      ipAddress: ip,
    });

    setResponseStatus(event, 429);
    setResponseHeader(event, "Retry-After", rejected.retryAfter);
    setResponseHeader(event, "Content-Type", "application/json");
    return {
      error: "Too Many Requests",
      retryAfterSeconds: rejected.retryAfter,
    };
  }
});
