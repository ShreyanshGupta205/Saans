/**
 * @file helpers.ts
 * @description HTTP request rate-limiting helper for Next.js App Router route handlers.
 */

import { NextRequest, NextResponse } from 'next/server';
import { globalRateLimiter } from './limiter';

/**
 * Extracts client IP from standard proxy headers.
 */
function extractClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Checks client IP rate limit; returns 429 response if throttled, or null if allowed.
 */
export async function enforceRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = extractClientIp(request);
  const result = await globalRateLimiter.check(ip);

  if (!result.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before retrying.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(result.retryAfterSeconds ?? 60),
          'X-RateLimit-Limit': String(result.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }
  return null;
}
