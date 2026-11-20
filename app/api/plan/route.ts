/**
 * @file route.ts
 * @description API route handler for personalized clean air plan generation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ComputedAQIResult } from '@/lib/aqi/types';
import { HouseholdProfileSchema } from '@/lib/llm/schema';
import { getOrGeneratePlan } from '@/lib/llm/service';
import { enforceRateLimit } from '@/lib/rate-limit/helpers';

const PlanRequestSchema = z
  .object({
    profile: HouseholdProfileSchema,
    aqiData: z.custom<ComputedAQIResult>(),
    language: z.enum(['en', 'hi']).default('en'),
  })
  .strict();

export async function POST(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body: unknown = await request.json();
    const parseResult = PlanRequestSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid profile or request body.', details: parseResult.error.format() },
        { status: 400 }
      );
    }

    const { profile, aqiData, language } = parseResult.data;
    const plan = await getOrGeneratePlan(profile, aqiData, language, 8000);

    return NextResponse.json(
      { plan, isBasicMode: plan.isDegraded },
      {
        status: 200,
        headers: { 'X-Plan-Mode': plan.isDegraded ? 'basic' : 'personalized' },
      }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Plan generation failed' },
      { status: 500 }
    );
  }
}
