/**
 * @file data.test.ts
 * @description Unit & integration tests for Open-Meteo Air Quality & Geocoding client.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDataCaches,
  fetchOpenMeteoAirQuality,
  roundCoordinate,
  searchOpenMeteoLocations,
  validateUpstreamUrl,
} from '../../lib/data/open-meteo';

describe('Open-Meteo Client', () => {
  beforeEach(() => {
    clearDataCaches();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearDataCaches();
    vi.restoreAllMocks();
  });

  it('validates upstream URLs and blocks non-allowlisted hosts or malformed URLs (SSRF protection)', () => {
    expect(() =>
      validateUpstreamUrl('https://air-quality-api.open-meteo.com/v1/air-quality')
    ).not.toThrow();

    expect(() =>
      validateUpstreamUrl('https://malicious-internal-metadata.aws/api')
    ).toThrow('SSRF blocked');

    expect(() => validateUpstreamUrl('not-a-valid-url')).toThrow('Invalid upstream URL');
  });

  it('rounds coordinates to 2 decimal places for privacy and cache hits', () => {
    expect(roundCoordinate(28.613938)).toBe(28.61);
    expect(roundCoordinate(77.209021)).toBe(77.21);
    expect(roundCoordinate(0)).toBe(0);
  });

  it('fetches and computes hourly forecast successfully', async () => {
    const mockApiResponse = {
      latitude: 28.61,
      longitude: 77.21,
      current: {
        time: '2026-11-20T12:00:00Z',
        pm2_5: 180,
        pm10: 290,
        nitrogen_dioxide: 65,
        ozone: 40,
      },
      hourly: {
        time: ['2026-11-20T12:00:00Z', '2026-11-20T13:00:00Z'],
        pm2_5: [180, 160],
        pm10: [290, 260],
        nitrogen_dioxide: [65, 60],
        ozone: [40, 42],
      },
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const data = await fetchOpenMeteoAirQuality(28.613, 77.209);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(data.raw.current.pm2_5).toBe(180);
    expect(data.hourlyForecast.length).toBe(2);
    expect(data.hourlyForecast[0]?.pm25).toBe(180);
    expect(data.hourlyForecast[0]?.category).toBe('Very Poor');

    // Test in-memory 15-minute caching: second call with same rounded coords should NOT trigger fetch
    const cachedData = await fetchOpenMeteoAirQuality(28.61, 77.21);
    expect(fetchSpy).toHaveBeenCalledTimes(1); // Still 1!
    expect(cachedData.raw.current.pm2_5).toBe(180);
  });

  it('handles API error status gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(fetchOpenMeteoAirQuality(28.61, 77.21)).rejects.toThrow(
      'Open-Meteo Air Quality HTTP 500'
    );
  });

  it('handles searchOpenMeteoLocations and filters for India', async () => {
    const mockGeocodeResponse = {
      results: [
        {
          id: 1,
          name: 'Noida',
          latitude: 28.53,
          longitude: 77.39,
          admin1: 'Uttar Pradesh',
          country: 'India',
          country_code: 'IN',
        },
        {
          id: 2,
          name: 'Noida Foreign',
          latitude: 10.0,
          longitude: 20.0,
          country: 'Other Country',
          country_code: 'US',
        },
      ],
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockGeocodeResponse,
    } as Response);

    const results = await searchOpenMeteoLocations('Noida');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(results.length).toBe(1);
    expect(results[0]?.name).toBe('Noida');
    expect(results[0]?.country_code).toBe('IN');

    // Short queries (<2 chars) return empty without calling fetch
    const emptyResults = await searchOpenMeteoLocations('N');
    expect(emptyResults).toEqual([]);
  });
});
