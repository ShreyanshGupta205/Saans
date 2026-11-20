/**
 * @file route.ts
 * @description API route handler for searching Indian cities and towns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { POPULAR_INDIAN_LOCATIONS, IndianLocation } from '@/data/locations';
import { searchOpenMeteoLocations, GeocodingResult } from '@/lib/data/open-meteo';
import { GeocodeQuerySchema } from '@/lib/llm/schema';
import { enforceRateLimit } from '@/lib/rate-limit/helpers';

interface MergedLocation {
  id: string;
  name: string;
  nameHi?: string;
  admin1: string;
  latitude: number;
  longitude: number;
  isNCR: boolean;
}

function mergeLocations(local: IndianLocation[], remote: GeocodingResult[]): MergedLocation[] {
  const combined: MergedLocation[] = [
    ...local.map((l) => ({
      id: l.id,
      name: l.nameEn,
      nameHi: l.nameHi,
      admin1: l.stateEn,
      latitude: l.lat,
      longitude: l.lon,
      isNCR: l.isNCR,
    })),
    ...remote.map((r) => ({
      id: String(r.id),
      name: r.name,
      admin1: r.admin1 || 'India',
      latitude: r.latitude,
      longitude: r.longitude,
      isNCR: false,
    })),
  ];

  const uniqueMap = new Map<string, MergedLocation>();
  for (const item of combined) {
    const key = `${item.latitude.toFixed(1)}_${item.longitude.toFixed(1)}`;
    if (!uniqueMap.has(key)) uniqueMap.set(key, item);
  }
  return Array.from(uniqueMap.values()).slice(0, 10);
}

function findLocalMatches(query: string): IndianLocation[] {
  return POPULAR_INDIAN_LOCATIONS.filter(
    (loc) =>
      loc.nameEn.toLowerCase().includes(query) ||
      loc.nameHi.includes(query) ||
      loc.stateEn.toLowerCase().includes(query)
  );
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const parseResult = GeocodeQuerySchema.safeParse({ q: searchParams.get('q') });

  if (!parseResult.success) {
    return NextResponse.json({ locations: POPULAR_INDIAN_LOCATIONS });
  }

  const query = parseResult.data.q.toLowerCase().trim();
  const localMatches = findLocalMatches(query);

  try {
    const remoteResults = await searchOpenMeteoLocations(query);
    return NextResponse.json({ locations: mergeLocations(localMatches, remoteResults) });
  } catch {
    return NextResponse.json({ locations: localMatches });
  }
}
