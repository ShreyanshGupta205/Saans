/**
 * @file route.ts
 * @description API route handler for personalized clean air plan generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ComputedAQIResult } from '@/lib/aqi/types';
import { HouseholdProfileSchema } from '@/lib/llm/schema';
import { getOrGeneratePlan } from '@/lib/llm/service';
import { globalRateLimiter } from '@/lib/rate-limit/limiter';

const PlanRequestSchema = z
  .object({
    profile: HouseholdProfileSchema,
    aqiData: z.custom<ComputedAQIResult>(),
    language: z.enum(['en', 'hi']).default('en'),
  })
  .strict();

export async function POST(request: NextRequest) {
  // 1. IP Rate Limiting
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1';

  const rateCheck = globalRateLimiter.check(clientIp);
  if (!rateCheck.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Please wait before retrying.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(rateCheck.retryAfterSeconds ?? 60),
          'X-RateLimit-Limit': String(rateCheck.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  try {
    const body = await request.json();
    const parseResult = PlanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid profile or request body.', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { profile, aqiData, language } = parseResult.data;
    const plan = await getOrGeneratePlan(profile, aqiData, language);

    return NextResponse.json(
      { plan },
      {
        status: 200,
        headers: {
          'X-RateLimit-Limit': String(rateCheck.limit),
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Plan generation failed' },
      { status: 500 }
    );
  }
}
