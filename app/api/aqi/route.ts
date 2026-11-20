/**
 * @file route.ts
 * @description API route handler for real-time and 24h forecast CPCB Air Quality Index.
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeIndianAQI } from '@/lib/aqi/cpcb';
import { computeBestOutdoorWindow } from '@/lib/aqi/forecast';
import { fetchOpenMeteoAirQuality, OpenMeteoAirQualityData } from '@/lib/data/open-meteo';
import { HourlyForecastItem } from '@/lib/aqi/types';
import { AQIQuerySchema } from '@/lib/llm/schema';
import { enforceRateLimit } from '@/lib/rate-limit/helpers';

function buildAqiResult(raw: OpenMeteoAirQualityData) {
  return computeIndianAQI({
    pm25: raw.current.pm2_5,
    pm10: raw.current.pm10,
    no2: raw.current.nitrogen_dioxide,
    o3: raw.current.ozone,
    so2: raw.current.sulphur_dioxide,
    co: raw.current.carbon_monoxide ? raw.current.carbon_monoxide / 1000 : undefined,
  });
}

function buildDegradedResponse(err: unknown): NextResponse {
  return NextResponse.json(
    {
      aqiResult: computeIndianAQI({ pm25: 180, pm10: 280, no2: 60 }),
      hourlyForecast: [] as HourlyForecastItem[],
      outdoorWindow: computeBestOutdoorWindow([]),
      isDegraded: true,
      degradedReason: err instanceof Error ? err.message : 'Upstream air quality service unavailable',
    },
    {
      status: 200,
      headers: { 'X-Degraded-Mode': 'true' },
    }
  );
}

export async function GET(request: NextRequest) {
  const rateLimitResponse = await enforceRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  const { searchParams } = new URL(request.url);
  const parseResult = AQIQuerySchema.safeParse({
    lat: searchParams.get('lat'),
    lon: searchParams.get('lon'),
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Invalid coordinates provided. Latitude must be -90..90, longitude -180..180.' },
      { status: 400 }
    );
  }

  try {
    const { raw, hourlyForecast } = await fetchOpenMeteoAirQuality(parseResult.data.lat, parseResult.data.lon);
    return NextResponse.json(
      {
        aqiResult: buildAqiResult(raw),
        hourlyForecast,
        outdoorWindow: computeBestOutdoorWindow(hourlyForecast),
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300' },
      }
    );
  } catch (err) {
    return buildDegradedResponse(err);
  }
}
