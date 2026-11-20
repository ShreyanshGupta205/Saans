import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InMemoryRateLimiter, UpstashRedisRateLimiter, createRateLimiter } from '../../lib/rate-limit/limiter';

describe('RateLimiter Interface with Fake Clock Tests', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('InMemoryRateLimiter: strictly throttles beyond limit within window and resets after expiry', () => {
    const limiter = new InMemoryRateLimiter(3, 60_000); // 3 requests per 60s
    const baseTime = 1700000000000;
    vi.setSystemTime(baseTime);

    // First 3 requests succeed
    expect(limiter.check('client-ip-1', baseTime).success).toBe(true);
    expect(limiter.check('client-ip-1', baseTime + 1000).success).toBe(true);
    expect(limiter.check('client-ip-1', baseTime + 2000).success).toBe(true);

    // 4th request in the same window fails with 429 Retry-After
    const fourth = limiter.check('client-ip-1', baseTime + 3000);
    expect(fourth.success).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);

    // Advance clock past the 60s window
    vi.advanceTimersByTime(61_000);
    const newTime = baseTime + 61_000;

    // Next request succeeds again
    const postReset = limiter.check('client-ip-1', newTime);
    expect(postReset.success).toBe(true);
    expect(postReset.remaining).toBe(2);
  });

  it('UpstashRedisRateLimiter: operates cleanly through mock fetch and handles 429 appropriately', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ result: 1 }, { result: 'OK' }],
    });
    vi.stubGlobal('fetch', mockFetch);

    const limiter = new UpstashRedisRateLimiter('https://fake-upstash.io', 'fake-token', 2, 60);
    const res1 = await limiter.check('client-upstash-1', 1700000000000);
    expect(res1.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://fake-upstash.io/pipeline',
      expect.objectContaining({ method: 'POST' })
    );

    // Simulate counter exceeding limit in Upstash
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ result: 3 }, { result: 'OK' }],
    });

    const resOver = await limiter.check('client-upstash-1', 1700000000000);
    expect(resOver.success).toBe(false);
    expect(resOver.remaining).toBe(0);

    vi.unstubAllGlobals();
  });

  it('UpstashRedisRateLimiter: falls back seamlessly to in-memory store when network fails', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network timeout'));
    vi.stubGlobal('fetch', mockFetch);

    const limiter = new UpstashRedisRateLimiter('https://fake-upstash.io', 'fake-token', 5, 60);
    const res = await limiter.check('client-fallback', 1700000000000);
    expect(res.success).toBe(true);

    vi.unstubAllGlobals();
  });

  it('createRateLimiter factory returns valid RateLimiter instance', () => {
    const limiter = createRateLimiter(50);
    expect(limiter).toBeDefined();
    const result = limiter.check('test-factory-ip', Date.now());
    expect(result).toBeDefined();
  });
});
