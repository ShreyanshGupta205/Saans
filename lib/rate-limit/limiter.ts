/**
 * @file limiter.ts
 * @description In-memory sliding-window rate limiter per client IP.
 *
 * NOTE FOR SERVERLESS / EDGE RUNTIMES:
 * In-memory state is isolated per serverless instance and ephemeral.
 * For distributed production deployments across multi-region serverless clusters,
 * an external key-value store (such as Upstash Redis) is recommended.
 * Documented in DECISIONS.md.
 */

export interface RateLimitResult {
  readonly success: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number; // Unix timestamp in seconds
  readonly retryAfterSeconds?: number;
}

interface WindowRecord {
  count: number;
  resetTime: number;
}

export class SlidingWindowRateLimiter {
  private readonly store = new Map<string, WindowRecord>();
  private readonly limit: number;
  private readonly windowMs: number;

  /**
   * @param limit Max allowed requests per window
   * @param windowMs Window duration in milliseconds (default: 60,000 ms = 1 min)
   */
  constructor(limit = 60, windowMs = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  /**
   * Checks and consumes a token for the given client identifier.
   *
   * @param key Client IP or session key
   * @param now Optional timestamp (for deterministic unit testing)
   * @returns RateLimitResult
   */
  public check(key: string, now: number = Date.now()): RateLimitResult {
    // Clean up expired entries periodically
    if (this.store.size > 5000) {
      for (const [k, v] of this.store.entries()) {
        if (v.resetTime <= now) {
          this.store.delete(k);
        }
      }
    }

    const record = this.store.get(key);

    if (!record || record.resetTime <= now) {
      // New or expired window
      const resetTime = now + this.windowMs;
      this.store.set(key, { count: 1, resetTime });
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - 1,
        reset: Math.ceil(resetTime / 1000),
      };
    }

    if (record.count < this.limit) {
      record.count += 1;
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - record.count,
        reset: Math.ceil(record.resetTime / 1000),
      };
    }

    // Exceeded limit
    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return {
      success: false,
      limit: this.limit,
      remaining: 0,
      reset: Math.ceil(record.resetTime / 1000),
      retryAfterSeconds,
    };
  }

  /**
   * Resets all stored limits (for unit testing).
   */
  public reset(): void {
    this.store.clear();
  }
}

// Global default limiter instance
export const globalRateLimiter = new SlidingWindowRateLimiter(60, 60_000);
