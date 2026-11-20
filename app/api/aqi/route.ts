/**
 * @file route.ts
 * @description API route handler for real-time and 24h forecast CPCB Air Quality Index.
 */

import { NextRequest, NextResponse } from 'next/server';
import { computeIndianAQI } from '@/lib/aqi/cpcb';
import { computeBestOutdoorWindow } from '@/lib/aqi/forecast';
import { fetchOpenMeteoAirQuality } from '@/lib/data/open-meteo';
import { AQIQuerySchema } from '@/lib/llm/schema';
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
          'X-RateLimit-Limit': String(rateCheck.limit),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // 2. Validate input parameters
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

  const { lat, lon } = parseResult.data;

  try {
    const { raw, hourlyForecast } = await fetchOpenMeteoAirQuality(lat, lon);

    const aqiResult = computeIndianAQI({
      pm25: raw.current.pm2_5,
      pm10: raw.current.pm10,
      no2: raw.current.nitrogen_dioxide,
      o3: raw.current.ozone,
      so2: raw.current.sulphur_dioxide,
      co: raw.current.carbon_monoxide ? raw.current.carbon_monoxide / 1000 : undefined, // Open-Meteo returns µg/m³, CPCB requires mg/m³
    });

    const outdoorWindow = computeBestOutdoorWindow(hourlyForecast);

    return NextResponse.json(
      {
        aqiResult,
        hourlyForecast,
        outdoorWindow,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=300',
          'X-RateLimit-Limit': String(rateCheck.limit),
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      }
    );
  } catch (err) {
    // Degraded mode response: return reasonable default with degraded flag rather than raw 500
    const fallbackAqi = computeIndianAQI({ pm25: 180, pm10: 280, no2: 60 });
    const fallbackWindow = computeBestOutdoorWindow([]);

    return NextResponse.json(
      {
        aqiResult: fallbackAqi,
        hourlyForecast: [],
        outdoorWindow: fallbackWindow,
        isDegraded: true,
        degradedReason: err instanceof Error ? err.message : 'Upstream air quality service unavailable',
      },
      {
        status: 200, // Graceful degradation
        headers: {
          'X-Degraded-Mode': 'true',
        },
      }
    );
  }
}
