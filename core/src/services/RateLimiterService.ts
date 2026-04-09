import { RateLimiterMemory, RateLimiterRes } from "rate-limiter-flexible";

export interface ConsumeResult {
  allowed: boolean;
  remainingPoints: number;
  msBeforeNext: number;
}

/**
 * In-memory per-key rate limiter. Based on rate-limiter-flexible.
 *
 * Limiter instances are cached by `points_duration` composite key, so
 * different api keys sharing the same limits share the same limiter
 * (and thus the same bucket namespace keyed on the api key id).
 *
 * Pattern adapted from the beabee reference implementation at
 * refs/beabee/monorepo/packages/core/src/utils/rate-limiter.ts.
 */
export class RateLimiterService {
  private limiters = new Map<string, RateLimiterMemory>();

  private getLimiter(points: number, duration: number): RateLimiterMemory {
    const cacheKey = `${points}_${duration}`;
    let limiter = this.limiters.get(cacheKey);
    if (!limiter) {
      limiter = new RateLimiterMemory({
        points,
        duration,
        keyPrefix: `rl_${cacheKey}`,
      });
      this.limiters.set(cacheKey, limiter);
    }
    return limiter;
  }

  /**
   * Consume `cost` points from the bucket for `key`. Throws RateLimiterRes
   * on exhaustion (caller can read `msBeforeNext` for the Retry-After header).
   * Returns a success result on allow.
   */
  async consume(
    key: string,
    points: number,
    duration: number,
    cost = 1
  ): Promise<ConsumeResult> {
    const limiter = this.getLimiter(points, duration);
    const res = await limiter.consume(key, cost);
    return {
      allowed: true,
      remainingPoints: res.remainingPoints,
      msBeforeNext: res.msBeforeNext,
    };
  }

  /**
   * Clear a single key across all buckets. Useful for admin reset actions
   * and in tests after exhausting a limiter.
   */
  async reset(key: string): Promise<void> {
    for (const limiter of this.limiters.values()) {
      await limiter.delete(key);
    }
  }

  /**
   * Drop all in-memory state. Test helper only.
   */
  clearAll(): void {
    this.limiters.clear();
  }
}

export const rateLimiterService = new RateLimiterService();

/** Re-export so callers can `instanceof` check rejections */
export { RateLimiterRes };
