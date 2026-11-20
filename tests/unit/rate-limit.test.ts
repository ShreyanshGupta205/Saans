/**
 * @file rate-limit.test.ts
 * @description Unit tests for sliding-window rate limiter per client IP.
 */

import { describe, expect, it } from 'vitest';
import { InMemoryRateLimiter } from '../../lib/rate-limit/limiter';

describe('InMemoryRateLimiter', () => {
  it('allows requests within the configured rate limit', () => {
    const limiter = new InMemoryRateLimiter(5, 60_000); // 5 requests per minute
    const ip = '192.168.1.1';
    const now = 1000000;

    for (let i = 0; i < 5; i++) {
      const res = limiter.check(ip, now);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(5 - (i + 1));
    }
  });

  it('rejects requests exceeding the rate limit and provides retryAfterSeconds', () => {
    const limiter = new InMemoryRateLimiter(3, 60_000);
    const ip = '192.168.1.2';
    const now = 1000000;

    limiter.check(ip, now);
    limiter.check(ip, now);
    limiter.check(ip, now);

    const blocked = limiter.check(ip, now);
    expect(blocked.success).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBe(60);
  });

  it('resets quota after window expiration', () => {
    const limiter = new InMemoryRateLimiter(2, 60_000);
    const ip = '192.168.1.3';
    const t0 = 1000000;

    limiter.check(ip, t0);
    limiter.check(ip, t0);

    // Blocked at t0
    expect(limiter.check(ip, t0).success).toBe(false);

    // After 61 seconds (window expired)
    const t1 = t0 + 61_000;
    const res = limiter.check(ip, t1);
    expect(res.success).toBe(true);
    expect(res.remaining).toBe(1);
  });
});
