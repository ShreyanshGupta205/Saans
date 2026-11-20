/**
 * @file routes.test.ts
 * @description API route handler tests verifying success, timeout, schema errors, and rate limits.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as aqiGet } from '../../app/api/aqi/route';
import { POST as planPost } from '../../app/api/plan/route';
import { POST as chatPost } from '../../app/api/chat/route';
import { GET as geocodeGet } from '../../app/api/geocode/route';
import { clearDataCaches } from '../../lib/data/open-meteo';
import { globalRateLimiter } from '../../lib/rate-limit/limiter';

describe('API Route Handlers', () => {
  beforeEach(() => {
    clearDataCaches();
    globalRateLimiter.reset();
    vi.restoreAllMocks();
  });

  describe('/api/aqi', () => {
    it('returns CPCB AQI, hourly forecast, and best outdoor window for valid coordinates', async () => {
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
          pm2_5: [180, 150],
          pm10: [290, 240],
          nitrogen_dioxide: [65, 55],
          ozone: [40, 42],
        },
      };

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponse,
      } as Response);

      const req = new NextRequest('http://localhost:3000/api/aqi?lat=28.61&lon=77.21');
      const res = await aqiGet(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.aqiResult).toBeDefined();
      expect(json.aqiResult.aqi).toBeGreaterThan(0);
      expect(json.outdoorWindow).toBeDefined();
    });

    it('rejects invalid or missing coordinates with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/aqi?lat=invalid&lon=77.21');
      const res = await aqiGet(req);
      expect(res.status).toBe(400);
    });

    it('falls back to degraded mode on upstream timeout or failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'));

      const req = new NextRequest('http://localhost:3000/api/aqi?lat=28.61&lon=77.21');
      const res = await aqiGet(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.isDegraded).toBe(true);
      expect(json.aqiResult).toBeDefined();
    });

    it('enforces rate limit and returns 429 when quota exceeded', async () => {
      const ip = '10.0.0.99';
      // Exhaust rate limit
      for (let i = 0; i < 60; i++) {
        globalRateLimiter.check(ip);
      }

      const req = new NextRequest('http://localhost:3000/api/aqi?lat=28.61&lon=77.21', {
        headers: { 'x-forwarded-for': ip },
      });
      const res = await aqiGet(req);
      expect(res.status).toBe(429);
      expect(res.headers.get('Retry-After')).toBeTruthy();
    });
  });

  describe('/api/plan', () => {
    it('returns tailored action plan with deterministic impacts', async () => {
      const body = {
        profile: {
          locationName: 'Delhi',
          lat: 28.61,
          lon: 77.21,
          adultsCount: 2,
          childrenCount: 1,
          elderlyCount: 1,
          hasSensitiveMembers: true,
          commuteMode: 'car_petrol',
          commuteDistanceKm: 15,
          workFromHomeDays: 2,
          homeType: 'apartment_highrise',
          cookingFuel: 'lpg',
          hasAirPurifier: true,
          language: 'en',
        },
        aqiData: {
          aqi: 350,
          dominantPollutant: 'pm25',
          category: 'Very Poor',
          categoryHi: 'बहुत खराब',
          healthAdvisoryEn: 'Health warning',
          healthAdvisoryHi: 'चेतावनी',
          pollutantBreakdown: {},
          whoMultiples: {},
          timestamp: new Date().toISOString(),
          isEmergency: false,
        },
        language: 'en',
      };

      const req = new NextRequest('http://localhost:3000/api/plan', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const res = await planPost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.plan).toBeDefined();
      expect(json.plan.routineActions.length).toBeGreaterThan(0);
    });

    it('rejects malformed request body with 400', async () => {
      const req = new NextRequest('http://localhost:3000/api/plan', {
        method: 'POST',
        body: JSON.stringify({ invalidField: true }),
      });
      const res = await planPost(req);
      expect(res.status).toBe(400);
    });
  });

  describe('/api/chat', () => {
    it('streams response or returns offline fallback', async () => {
      const body = {
        messages: [{ role: 'user', content: 'What mask should I wear?' }],
        profile: {
          locationName: 'Delhi',
          lat: 28.61,
          lon: 77.21,
          adultsCount: 2,
          childrenCount: 0,
          elderlyCount: 0,
          hasSensitiveMembers: false,
          commuteMode: 'metro',
          commuteDistanceKm: 10,
          workFromHomeDays: 0,
          homeType: 'apartment_highrise',
          cookingFuel: 'lpg',
          hasAirPurifier: false,
          language: 'en',
        },
        currentAqi: 380,
        dominantPollutant: 'pm25',
        language: 'en',
      };

      const req = new NextRequest('http://localhost:3000/api/chat', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const res = await chatPost(req);
      expect(res.status).toBe(200);
      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
    });
  });

  describe('/api/geocode', () => {
    it('returns curated Indian locations when query is empty or short', async () => {
      const req = new NextRequest('http://localhost:3000/api/geocode');
      const res = await geocodeGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.locations.length).toBeGreaterThan(0);
    });

    it('searches locations when query is provided', async () => {
      const req = new NextRequest('http://localhost:3000/api/geocode?q=Gurugram');
      const res = await geocodeGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.locations.length).toBeGreaterThan(0);
    });
  });
});
