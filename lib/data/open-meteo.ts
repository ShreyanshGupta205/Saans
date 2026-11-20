/**
 * @file open-meteo.ts
 * @description Client for Open-Meteo Air Quality and Geocoding APIs.
 *
 * Security & Efficiency Features:
 * - Upstream URL allowlisting (SSRF prevention)
 * - Coordinate rounding to 2 decimal places (privacy and cache hits)
 * - 15-minute in-memory response cache
 * - Request timeouts via AbortController (prevents hanging sockets)
 */

import { HourlyForecastItem } from '../aqi/types';
import { computeIndianAQI } from '../aqi/cpcb';

const ALLOWED_UPSTREAM_HOSTS = new Set([
  'air-quality-api.open-meteo.com',
  'geocoding-api.open-meteo.com',
]);

export interface OpenMeteoAirQualityData {
  readonly latitude: number;
  readonly longitude: number;
  readonly current: {
    readonly pm2_5?: number;
    readonly pm10?: number;
    readonly nitrogen_dioxide?: number;
    readonly ozone?: number;
    readonly sulphur_dioxide?: number;
    readonly carbon_monoxide?: number;
    readonly time: string;
  };
  readonly hourly: {
    readonly time: string[];
    readonly pm2_5: number[];
    readonly pm10: number[];
    readonly nitrogen_dioxide?: number[];
    readonly ozone?: number[];
  };
}

export interface GeocodingResult {
  readonly id: number;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly admin1?: string; // State / Region
  readonly country: string;
  readonly country_code: string;
}

interface CacheEntry<T> {
  readonly data: T;
  readonly expiresAt: number;
}

// In-memory 15-minute cache
const aqiCache = new Map<string, CacheEntry<{ raw: OpenMeteoAirQualityData; hourlyForecast: HourlyForecastItem[] }>>();
const geocodeCache = new Map<string, CacheEntry<GeocodingResult[]>>();

const AQI_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const GEOCODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Validates that an upstream URL belongs strictly to the allowed hostnames.
 */
export function validateUpstreamUrl(urlStr: string): void {
  try {
    const parsed = new URL(urlStr);
    if (!ALLOWED_UPSTREAM_HOSTS.has(parsed.hostname)) {
      throw new Error(`SSRF blocked: Host ${parsed.hostname} is not in the upstream allowlist`);
    }
  } catch (err) {
    throw new Error(`Invalid upstream URL: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Rounds coordinate to 2 decimal places for user privacy and cache efficiency.
 */
export function roundCoordinate(coord: number): number {
  return Math.round(coord * 100) / 100;
}

function buildSingleHourlyItem(
  timeStr: string,
  pm25: number,
  pm10: number,
  no2?: number,
  o3?: number,
  fallbackHour = 0
): HourlyForecastItem {
  const parsedHour = new Date(timeStr).getHours();
  const aqiRes = computeIndianAQI({ pm25, pm10, no2, o3 });
  return {
    time: timeStr,
    hour: isNaN(parsedHour) ? fallbackHour : parsedHour,
    pm25: Math.round(pm25),
    pm10: Math.round(pm10),
    no2: no2 !== undefined ? Math.round(no2) : undefined,
    o3: o3 !== undefined ? Math.round(o3) : undefined,
    aqi: aqiRes.aqi,
    category: aqiRes.category,
  };
}

function parseHourlyForecast(hourly?: OpenMeteoAirQualityData['hourly']): HourlyForecastItem[] {
  if (!hourly) return [];
  const items: HourlyForecastItem[] = [];
  const limit = Math.min(24, hourly.time.length);

  for (let i = 0; i < limit; i++) {
    const timeStr = hourly.time[i] || '';
    const pm25 = hourly.pm2_5[i] || 0;
    const pm10 = hourly.pm10[i] || 0;
    const no2 = hourly.nitrogen_dioxide?.[i];
    const o3 = hourly.ozone?.[i];
    items.push(buildSingleHourlyItem(timeStr, pm25, pm10, no2, o3, i));
  }
  return items;
}

/**
 * Fetches real-time and forecast air quality data from Open-Meteo.
 */
export async function fetchOpenMeteoAirQuality(
  lat: number,
  lon: number,
  timeoutMs = 8000
): Promise<{ raw: OpenMeteoAirQualityData; hourlyForecast: HourlyForecastItem[] }> {
  const roundedLat = roundCoordinate(lat);
  const roundedLon = roundCoordinate(lon);
  const cacheKey = `${roundedLat.toFixed(2)}_${roundedLon.toFixed(2)}`;

  const now = Date.now();
  const cached = aqiCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${roundedLat}&longitude=${roundedLon}&current=pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide&hourly=pm10,pm2_5,nitrogen_dioxide,ozone&forecast_days=2&timezone=auto`;
  validateUpstreamUrl(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Saans-CleanAir/1.0' },
    });

    if (!res.ok) {
      throw new Error(`Open-Meteo Air Quality HTTP ${res.status}: ${res.statusText}`);
    }

    const raw = (await res.json()) as OpenMeteoAirQualityData;
    const hourlyForecast = parseHourlyForecast(raw.hourly);
    const result = { raw, hourlyForecast };
    aqiCache.set(cacheKey, { data: result, expiresAt: now + AQI_CACHE_TTL_MS });
    return result;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Open-Meteo Air Quality API timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchGeocodingNetwork(url: string, timeoutMs: number): Promise<GeocodingResult[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'Saans-CleanAir/1.0' },
    });
    if (!res.ok) {
      throw new Error(`Open-Meteo Geocoding HTTP ${res.status}: ${res.statusText}`);
    }
    const json = (await res.json()) as { results?: GeocodingResult[] };
    return (json.results ?? []).filter((r) => r.country_code === 'IN' || r.country === 'India');
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Searches for Indian cities and towns using Open-Meteo Geocoding.
 */
export async function searchOpenMeteoLocations(
  query: string,
  timeoutMs = 5000
): Promise<GeocodingResult[]> {
  const sanitized = query.trim().toLowerCase().slice(0, 50);
  if (!sanitized || sanitized.length < 2) {
    return [];
  }

  const now = Date.now();
  const cached = geocodeCache.get(sanitized);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(sanitized)}&count=10&language=en&format=json&country_code=IN`;
  validateUpstreamUrl(url);

  try {
    const results = await fetchGeocodingNetwork(url, timeoutMs);
    geocodeCache.set(sanitized, { data: results, expiresAt: now + GEOCODE_CACHE_TTL_MS });
    return results;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Open-Meteo Geocoding API timed out after ${timeoutMs}ms`);
    }
    throw err;
  }
}

/**
 * Clears in-memory caches (for unit testing).
 */
export function clearDataCaches(): void {
  aqiCache.clear();
  geocodeCache.clear();
}
