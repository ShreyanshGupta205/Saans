/**
 * @file route.ts
 * @description API route handler for searching Indian cities and towns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { POPULAR_INDIAN_LOCATIONS } from '@/data/locations';
import { searchOpenMeteoLocations } from '@/lib/data/open-meteo';
import { GeocodeQuerySchema } from '@/lib/llm/schema';
import { globalRateLimiter } from '@/lib/rate-limit/limiter';

export async function GET(request: NextRequest) {
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
        },
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const parseResult = GeocodeQuerySchema.safeParse({
    q: searchParams.get('q'),
  });

  if (!parseResult.success) {
    // Return top curated Indian locations if no query
    return NextResponse.json({ locations: POPULAR_INDIAN_LOCATIONS });
  }

  const query = parseResult.data.q.toLowerCase().trim();

  // Search curated popular locations first
  const localMatches = POPULAR_INDIAN_LOCATIONS.filter(
    (loc) =>
      loc.nameEn.toLowerCase().includes(query) ||
      loc.nameHi.includes(query) ||
      loc.stateEn.toLowerCase().includes(query)
  );

  try {
    const remoteResults = await searchOpenMeteoLocations(query);
    const combined = [
      ...localMatches.map((l) => ({
        id: l.id,
        name: l.nameEn,
        nameHi: l.nameHi,
        admin1: l.stateEn,
        latitude: l.lat,
        longitude: l.lon,
        isNCR: l.isNCR,
      })),
      ...remoteResults.map((r) => ({
        id: String(r.id),
        name: r.name,
        admin1: r.admin1 || 'India',
        latitude: r.latitude,
        longitude: r.longitude,
        isNCR: false,
      })),
    ];

    // Deduplicate by close lat/lon
    const uniqueMap = new Map<string, (typeof combined)[0]>();
    for (const item of combined) {
      const key = `${item.latitude.toFixed(1)}_${item.longitude.toFixed(1)}`;
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      }
    }

    return NextResponse.json({
      locations: Array.from(uniqueMap.values()).slice(0, 10),
    });
  } catch {
    // Fall back to local matches
    return NextResponse.json({
      locations: localMatches,
    });
  }
}
