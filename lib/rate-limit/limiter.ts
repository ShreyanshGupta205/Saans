/**
 * @file limiter.ts
 * @description Rate limiter abstraction with two implementations:
 * 1. InMemoryRateLimiter (local sliding-window token bucket)
 * 2. UpstashRedisRateLimiter (distributed REST client with in-memory fallback)
 */

import { env } from '../env';

export interface RateLimitResult {
  readonly success: boolean;
  readonly limit: number;
  readonly remaining: number;
  readonly reset: number; // Unix timestamp in seconds
  readonly retryAfterSeconds?: number;
}

export interface RateLimiter {
  check(key: string, now?: number): Promise<RateLimitResult> | RateLimitResult;
  reset(key?: string): void;
}

interface WindowRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory sliding-window token bucket implementation.
 */
export class InMemoryRateLimiter implements RateLimiter {
  private readonly store = new Map<string, WindowRecord>();
  private readonly limit: number;
  private readonly windowMs: number;

  constructor(limit = 60, windowMs = 60_000) {
    this.limit = limit;
    this.windowMs = windowMs;
  }

  public check(key: string, now: number = Date.now()): RateLimitResult {
    // Evict expired records periodically
    if (this.store.size > 2000) {
      for (const [k, v] of this.store.entries()) {
        if (v.resetTime <= now) {
          this.store.delete(k);
        }
      }
    }

    const record = this.store.get(key);
    if (!record || record.resetTime <= now) {
      const resetTime = now + this.windowMs;
      this.store.set(key, { count: 1, resetTime });
      return {
        success: true,
        limit: this.limit,
        remaining: this.limit - 1,
        reset: Math.ceil(resetTime / 1000),
      };
    }

    if (record.count >= this.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
      return {
        success: false,
        limit: this.limit,
        remaining: 0,
        reset: Math.ceil(record.resetTime / 1000),
        retryAfterSeconds,
      };
    }

    record.count += 1;
    return {
      success: true,
      limit: this.limit,
      remaining: this.limit - record.count,
      reset: Math.ceil(record.resetTime / 1000),
    };
  }

  public reset(key?: string): void {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }

  public resetAll(): void {
    this.store.clear();
  }
}

// Backward compatibility alias
export const SlidingWindowRateLimiter = InMemoryRateLimiter;

async function fetchUpstashCount(
  url: string,
  token: string,
  redisKey: string,
  windowSeconds: number
): Promise<number | null> {
  const response = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, windowSeconds * 2],
    ]),
  });

  if (!response.ok) {
    return null;
  }
  const results = (await response.json()) as Array<{ result: number }>;
  return Number(results[0]?.result ?? 1);
}

/**
 * Upstash Redis distributed rate limiter using the HTTP REST pipeline.
 * Falls back to InMemoryRateLimiter if Upstash is unreachable or returns 5xx.
 */
export class UpstashRedisRateLimiter implements RateLimiter {
  private readonly fallback: InMemoryRateLimiter;
  private readonly url?: string;
  private readonly token?: string;
  private readonly limit: number;
  private readonly windowSeconds: number;

  constructor(url?: string, token?: string, limit = 60, windowSeconds = 60) {
    this.url = url;
    this.token = token;
    this.limit = limit;
    this.windowSeconds = windowSeconds;
    this.fallback = new InMemoryRateLimiter(limit, windowSeconds * 1000);
  }

  public async check(key: string, now: number = Date.now()): Promise<RateLimitResult> {
    if (!this.url || !this.token) {
      return this.fallback.check(key, now);
    }

    try {
      const redisKey = `saans_rate:${key}:${Math.floor(now / (this.windowSeconds * 1000))}`;
      const count = await fetchUpstashCount(this.url, this.token, redisKey, this.windowSeconds);
      if (count === null) {
        return this.fallback.check(key, now);
      }

      const resetTime = now + this.windowSeconds * 1000;
      if (count > this.limit) {
        const retryAfterSeconds = Math.max(1, Math.ceil((resetTime - now) / 1000));
        return {
          success: false,
          limit: this.limit,
          remaining: 0,
          reset: Math.ceil(resetTime / 1000),
          retryAfterSeconds,
        };
      }

      return {
        success: true,
        limit: this.limit,
        remaining: Math.max(0, this.limit - count),
        reset: Math.ceil(resetTime / 1000),
      };
    } catch {
      return this.fallback.check(key, now);
    }
  }

  public reset(key?: string): void {
    this.fallback.reset(key);
  }
}

/**
 * Factory function creating the best available RateLimiter based on environment config.
 */
export function createRateLimiter(limit?: number): RateLimiter {
  const maxReq = limit ?? env.RATE_LIMIT_PER_MINUTE;
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    return new UpstashRedisRateLimiter(
      env.UPSTASH_REDIS_REST_URL,
      env.UPSTASH_REDIS_REST_TOKEN,
      maxReq,
      60
    );
  }
  return new InMemoryRateLimiter(maxReq, 60_000);
}

export const globalRateLimiter = createRateLimiter();
