import { rateLimiterService, config, RateLimiterRes } from "@checkbot/core";
import { defineEventHandler, setResponseStatus, setResponseHeader } from "h3";
import { rateLimitRejectedTotal } from "../utils/metrics";

function pointsForPath(path: string): number {
  if (path.startsWith("/api/v1/search")) return config.rateLimiting.searchPoints;
  if (path.startsWith("/api/v1/import") || path.startsWith("/api/v1/sync")) {
    return config.rateLimiting.importPoints;
  }
  return config.rateLimiting.defaultPoints;
}

function bucketForPath(path: string): string {
  if (path.startsWith("/api/v1/search")) return "search";
  if (path.startsWith("/api/v1/import") || path.startsWith("/api/v1/sync")) return "import";
  return "api";
}

function durationForPath(_path: string): number {
  return config.rateLimiting.defaultDurationSec;
}

export default defineEventHandler(async (event) => {
  if (!config.rateLimiting.enabled) return;

  const user = event.context.user;
  if (!user) return; // unauthenticated requests are rejected earlier

  const apiKey = event.context.apiKey;

  // Per-key rate limiting when authenticated via Bearer token.
  // API keys can define their own points/duration; fall back to route defaults.
  const points = apiKey?.rateLimitPoints ?? pointsForPath(event.path);
  if (points === null || points <= 0) return; // null = unlimited

  const duration = apiKey?.rateLimitDurationSec ?? durationForPath(event.path);
  const limiterKey = apiKey ? `key:${apiKey.id}` : `session:${user.id}`;

  try {
    await rateLimiterService.consume(limiterKey, points, duration);
  } catch (err) {
    if (err instanceof RateLimiterRes) {
      const retryAfter = Math.ceil(err.msBeforeNext / 1000);
      const bucket = bucketForPath(event.path);
      console.warn("[rate-limit] rejected", {
        path: event.path,
        limiterKey,
        bucket,
        retryAfterSeconds: retryAfter,
      });
      rateLimitRejectedTotal.inc({ bucket });
      setResponseStatus(event, 429);
      setResponseHeader(event, "Retry-After", retryAfter);
      setResponseHeader(event, "Content-Type", "application/json");
      return {
        error: "Too Many Requests",
        retryAfterSeconds: retryAfter,
      };
    }
    throw err;
  }
});
