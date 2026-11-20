/**
 * @file coverage-boost.test.ts
 * @description Targeted unit tests to ensure >= 90% statement and >= 85% branch coverage on all lib/ modules.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { computeIndianAQI } from '../../lib/aqi/cpcb';
import { computeBestOutdoorWindow } from '../../lib/aqi/forecast';
import { calculateWhoMultiple, formatWhoGuidelineStatement } from '../../lib/aqi/who';
import { getGeminiModelName, getGenAIClient, resetGenAIClientForTesting } from '../../lib/llm/client';
import { env } from '../../lib/env';
import { buildChatPrompt, buildPlanUserPrompt } from '../../lib/llm/prompt';
import { clearPlanCache, getOrGeneratePlan } from '../../lib/llm/service';
import { clearDataCaches, fetchOpenMeteoAirQuality, searchOpenMeteoLocations } from '../../lib/data/open-meteo';
import { SlidingWindowRateLimiter, UpstashRedisRateLimiter } from '../../lib/rate-limit/limiter';
import { HouseholdProfile } from '../../lib/impact/types';
import { HourlyForecastItem } from '../../lib/aqi/types';
import { calculateHouseholdExposure } from '../../lib/impact/exposure';
import { calculateHouseholdEmissions } from '../../lib/impact/emissions';
import { getProfileArchetype, ALL_PROFILE_ARCHETYPES } from '../../lib/impact/archetypes';
import { validateLLMOutputSafety } from '../../lib/llm/guard';
import * as clientModule from '../../lib/llm/client';

const testProfile: HouseholdProfile = {
  locationName: 'Delhi',
  lat: 28.61,
  lon: 77.21,
  adultsCount: 2,
  childrenCount: 1,
  elderlyCount: 0,
  hasSensitiveMembers: false,
  commuteMode: 'two_wheeler',
  commuteDistanceKm: 8,
  workFromHomeDays: 0,
  homeType: 'apartment_lowrise',
  cookingFuel: 'biomass',
  hasAirPurifier: false,
  language: 'hi',
};

describe('AQI Engine Edge Cases', () => {
  it('handles computeIndianAQI with empty pollutant object', () => {
    const res = computeIndianAQI({});
    expect(res.aqi).toBe(0);
    expect(res.category).toBe('Good');
    expect(res.dominantPollutant).toBe('pm25');
  });

  it('handles computeBestOutdoorWindow with empty forecast array', () => {
    const res = computeBestOutdoorWindow([]);
    expect(res.startHour).toBe(13);
    expect(res.endHour).toBe(15);
    expect(res.isSafeWindow).toBe(false);
  });

  it('handles safe window branch in computeBestOutdoorWindow', () => {
    const safeForecast: HourlyForecastItem[] = Array.from({ length: 24 }, (_, i) => ({
      time: `2026-11-20T${i.toString().padStart(2, '0')}:00:00Z`,
      hour: i,
      pm25: 40,
      pm10: 60,
      aqi: 60,
      category: 'Satisfactory',
    }));

    const res = computeBestOutdoorWindow(safeForecast);
    expect(res.isSafeWindow).toBe(true);
    expect(res.avgPm25).toBe(40);
    expect(res.recommendationEn).toContain('Safe window');
    expect(res.ventilationDurationMinutes).toBe(30);
  });

  it('handles moderate outdoor window branch', () => {
    const modForecast: HourlyForecastItem[] = Array.from({ length: 24 }, (_, i) => ({
      time: `2026-11-20T${i.toString().padStart(2, '0')}:00:00Z`,
      hour: i,
      pm25: 140, // Not severe (>=250), but not safe (<=120) -> goes to else if (!isSafeWindow)
      pm10: 180,
      aqi: 220,
      category: 'Poor',
    }));

    const res = computeBestOutdoorWindow(modForecast);
    expect(res.isSafeWindow).toBe(false);
    expect(res.ventilationDurationMinutes).toBe(15);
    expect(res.recommendationEn).toContain('Shift any necessary errands to this window');
  });

  it('handles WHO multiples edge cases (0, non-covered pollutant, Hindi within limit)', () => {
    expect(calculateWhoMultiple('pm25', 0)).toBe(0);
    expect(calculateWhoMultiple('so2', 100)).toBeUndefined();

    const withinLimitHi = formatWhoGuidelineStatement(0.5, 'PM2.5', 'hi');
    expect(withinLimitHi).toContain('सीमा के भीतर है');
  });
});

describe('Open-Meteo Edge & Error Branches', () => {
  beforeEach(() => {
    clearDataCaches();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearDataCaches();
    vi.restoreAllMocks();
  });

  it('handles empty or whitespace query in searchOpenMeteoLocations', async () => {
    const res1 = await searchOpenMeteoLocations('');
    expect(res1).toEqual([]);
    const res2 = await searchOpenMeteoLocations('   ');
    expect(res2).toEqual([]);
  });

  it('handles AbortError timeout in fetchOpenMeteoAirQuality', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

    await expect(fetchOpenMeteoAirQuality(28.61, 77.21)).rejects.toThrow(
      'Open-Meteo Air Quality API timed out'
    );
  });

  it('handles AbortError timeout in searchOpenMeteoLocations', async () => {
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';

    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

    await expect(searchOpenMeteoLocations('Delhi')).rejects.toThrow(
      'Open-Meteo Geocoding API timed out'
    );
  });

  it('handles Geocoding API HTTP error response', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    } as Response);

    await expect(searchOpenMeteoLocations('Delhi')).rejects.toThrow(
      'Open-Meteo Geocoding HTTP 503'
    );
  });
});

describe('LLM Service Edge & Cache Hit Branches', () => {
  beforeEach(() => {
    clearPlanCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearPlanCache();
    vi.restoreAllMocks();
  });

  it('exercises action card fallback id and general protective action', async () => {
    const mockGeminiJson = JSON.stringify({
      summary: 'Action plan with generic action.',
      routineActions: [
        {
          id: '',
          section: 'routine',
          timeOfDay: 'morning',
          title: 'General Wellness Routine',
          why: 'Drink warm water and stay hydrated during smog.',
          effort: 'Low',
          costBand: '₹0',
        },
        {
          id: 'act-2',
          section: 'routine',
          timeOfDay: 'day',
          title: 'General Indoor Cleanliness',
          why: 'Keep doors closed during morning and evening peaks.',
          effort: 'Low',
          costBand: '₹0',
        },
      ],
      indoorActions: [
        {
          id: 'gen-indoor-1',
          section: 'indoor',
          title: 'General Indoor Cleanliness',
          why: 'Keep indoor air fresh.',
          effort: 'Low',
          costBand: '₹0',
        },
        {
          id: 'gen-indoor-2',
          section: 'indoor',
          title: 'General Dust Control',
          why: 'Keep surfaces wiped clean.',
          effort: 'Low',
          costBand: '₹0',
        },
      ],
      sustainableActions: [
        {
          id: 'gen-sust-1',
          section: 'sustainable',
          title: 'General Community Switch',
          why: 'Encourage low energy use.',
          effort: 'Low',
          costBand: '₹0',
        },
        {
          id: 'gen-sust-2',
          section: 'sustainable',
          title: 'Shared Transport Community',
          why: 'Coordinate shared rides.',
          effort: 'Low',
          costBand: '₹0',
        },
      ],
    });

    const mockClient = {
      models: {
        generateContent: vi.fn().mockResolvedValueOnce({
          text: mockGeminiJson,
        }),
      },
    };

    vi.spyOn(clientModule, 'getGenAIClient').mockReturnValue(mockClient as unknown as GoogleGenAI);

    const aqiSample = {
      aqi: 200,
      dominantPollutant: 'pm25' as const,
      category: 'Moderate' as const,
      categoryHi: 'मध्यम',
      healthAdvisoryEn: 'Advisory',
      healthAdvisoryHi: 'सलाह',
      pollutantBreakdown: {},
      whoMultiples: {},
      timestamp: new Date().toISOString(),
      isEmergency: false,
    };

    const plan = await getOrGeneratePlan(testProfile, aqiSample, 'en');
    expect(plan.isDegraded).toBe(false);
    expect(plan.routineActions[0]?.id).toMatch(/^act-/);
    expect(plan.routineActions[0]?.impact.exposureChange.sourceKey).toBe('CEEW_EXPOSURE_2021');
  });

  it('exercises plan cache hit branch', async () => {
    vi.spyOn(clientModule, 'getGenAIClient').mockReturnValue(null);

    const aqiSample = {
      aqi: 200,
      dominantPollutant: 'pm25' as const,
      category: 'Moderate' as const,
      categoryHi: 'मध्यम',
      healthAdvisoryEn: 'Advisory',
      healthAdvisoryHi: 'सलाह',
      pollutantBreakdown: {},
      whoMultiples: {},
      timestamp: new Date().toISOString(),
      isEmergency: false,
    };

    // First call caches plan
    const plan1 = await getOrGeneratePlan(testProfile, aqiSample, 'en');
    expect(plan1.isDegraded).toBe(true);

    // Second call hits cache
    const plan2 = await getOrGeneratePlan(testProfile, aqiSample, 'en');
    expect(plan2).toBe(plan1);
  });

  it('handles Gemini returning empty text response', async () => {
    const mockClient = {
      models: {
        generateContent: vi.fn().mockResolvedValueOnce({
          text: '', // Empty text
        }),
      },
    };

    vi.spyOn(clientModule, 'getGenAIClient').mockReturnValue(mockClient as unknown as GoogleGenAI);

    const aqiSample = {
      aqi: 200,
      dominantPollutant: 'pm25' as const,
      category: 'Moderate' as const,
      categoryHi: 'मध्यम',
      healthAdvisoryEn: 'Advisory',
      healthAdvisoryHi: 'सलाह',
      pollutantBreakdown: {},
      whoMultiples: {},
      timestamp: new Date().toISOString(),
      isEmergency: false,
    };

    const plan = await getOrGeneratePlan(testProfile, aqiSample, 'en');
    // Empty text causes error in try, falls back to deterministic rules
    expect(plan.isDegraded).toBe(true);
  });
});

describe('Rate Limiter Cache Pruning & Reset', () => {
  it('resets store properly', () => {
    const limiter = new SlidingWindowRateLimiter(10, 60_000);
    limiter.check('ip1');
    limiter.reset();
    const res = limiter.check('ip1');
    expect(res.remaining).toBe(9);
  });

  it('prunes expired entries when store size exceeds 5000', () => {
    const limiter = new SlidingWindowRateLimiter(10, 1000);
    const now = 100000;
    // Insert expired records
    for (let i = 0; i < 5005; i++) {
      limiter.check(`ip-${i}`, now - 2000);
    }
    const res = limiter.check('new-ip', now);
    expect(res.success).toBe(true);
  });
});

describe('Prompt Builder Chat Context & Delimiters', () => {
  it('builds chat context in Hindi and English', () => {
    const chatEn = buildChatPrompt(testProfile, 350, 'pm25', 'en');
    expect(chatEn).toContain('<live_context>');
    expect(chatEn).toContain('English');

    const chatHi = buildChatPrompt(testProfile, 350, 'pm25', 'hi');
    expect(chatHi).toContain('हिंदी');
  });

  it('builds plan prompt in Hindi and English', () => {
    const aqiSample = {
      aqi: 200,
      dominantPollutant: 'pm25' as const,
      category: 'Moderate' as const,
      categoryHi: 'मध्यम',
      healthAdvisoryEn: 'Advisory',
      healthAdvisoryHi: 'सलाह',
      pollutantBreakdown: {},
      whoMultiples: {},
      timestamp: new Date().toISOString(),
      isEmergency: false,
    };

    const promptHi = buildPlanUserPrompt(testProfile, aqiSample, 'hi');
    expect(promptHi).toContain('Devanagari');

    const promptEn = buildPlanUserPrompt(testProfile, aqiSample, 'en');
    expect(promptEn).toContain('English');
  });
});

describe('Client & Environment Helpers', () => {
  it('returns model name from env', () => {
    const model = getGeminiModelName();
    expect(model).toBe('gemini-2.0-flash');
  });

  it('instantiates and caches GoogleGenAI client when apiKey is provided', () => {
    resetGenAIClientForTesting();
    const originalKey = env.GEMINI_API_KEY;
    (env as Record<string, unknown>).GEMINI_API_KEY = 'test-fake-key-12345';

    const client1 = getGenAIClient();
    expect(client1).toBeDefined();

    // Singleton check
    const client2 = getGenAIClient();
    expect(client2).toBe(client1);

    (env as Record<string, unknown>).GEMINI_API_KEY = originalKey;
    resetGenAIClientForTesting();
  });

  it('returns null when API key is empty or placeholder', () => {
    resetGenAIClientForTesting();
    const originalKey = env.GEMINI_API_KEY;
    (env as Record<string, unknown>).GEMINI_API_KEY = 'your_gemini_api_key_here';

    const client = getGenAIClient();
    expect(client).toBeNull();

    (env as Record<string, unknown>).GEMINI_API_KEY = originalKey;
    resetGenAIClientForTesting();
  });

  it('throws if getGenAIClient is invoked in browser context in production', () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
    expect(() => getGenAIClient()).toThrow('Security violation');
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });
});

describe('Alternative Home & Fuel Impact Branches', () => {
  it('covers independent house and semi-pucca home types', () => {
    const indExp = calculateHouseholdExposure({ ...testProfile, homeType: 'independent_house' }, 200);
    expect(indExp.baselineInhaledMicrogramsPerDay).toBeGreaterThan(0);

    const semiExp = calculateHouseholdExposure({ ...testProfile, homeType: 'semi_pucca' }, 200);
    expect(semiExp.baselineInhaledMicrogramsPerDay).toBeGreaterThan(0);
  });

  it('covers biomass and PNG cooking fuels', () => {
    const biomassEmissions = calculateHouseholdEmissions(testProfile);
    expect(biomassEmissions.dailyCookingKgCO2).toBe(4.8);
    expect(biomassEmissions.potentialMonthlyKgCO2Reduction).toBeGreaterThan(100);

    const pngEmissions = calculateHouseholdEmissions({ ...testProfile, cookingFuel: 'png' });
    expect(pngEmissions.dailyCookingKgCO2).toBe(0.74);
  });
});

describe('12 Profile Archetypes & Remaining Edge Branches', () => {
  const base: HouseholdProfile = {
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
  };

  it('classifies every one of the 12 archetypes correctly', () => {
    expect(getProfileArchetype({ ...base, cookingFuel: 'biomass' })).toBe('solid_fuel_vulnerable');
    expect(getProfileArchetype({ ...base, hasSensitiveMembers: true })).toBe('sensitive_solo_commuter');
    expect(getProfileArchetype({ ...base, elderlyCount: 1, hasAirPurifier: true })).toBe('elderly_purifier_owner');
    expect(getProfileArchetype({ ...base, elderlyCount: 1, hasAirPurifier: false })).toBe('elderly_no_purifier');
    expect(getProfileArchetype({ ...base, childrenCount: 2, commuteMode: 'car_petrol' })).toBe('young_kids_car_commute');
    expect(getProfileArchetype({ ...base, childrenCount: 1, commuteMode: 'bus' })).toBe('young_kids_transit');
    expect(getProfileArchetype({ ...base, workFromHomeDays: 4, hasAirPurifier: true })).toBe('remote_worker_with_purifier');
    expect(getProfileArchetype({ ...base, workFromHomeDays: 3, hasAirPurifier: false })).toBe('remote_worker_no_purifier');
    expect(getProfileArchetype({ ...base, commuteMode: 'car_diesel', commuteDistanceKm: 20 })).toBe('high_commute_motorized');
    expect(getProfileArchetype({ ...base, commuteMode: 'two_wheeler', commuteDistanceKm: 5 })).toBe('short_commute_motorized');
    expect(getProfileArchetype({ ...base, commuteMode: 'walk_cycle' })).toBe('transit_user_pucca');
    expect(getProfileArchetype({ ...base, commuteMode: 'other' as unknown as HouseholdProfile['commuteMode'] })).toBe('baseline_family');
    expect(ALL_PROFILE_ARCHETYPES.length).toBe(12);
  });

  it('covers Upstash reset and fetch failure branches', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    vi.stubGlobal('fetch', mockFetch);

    const limiter = new UpstashRedisRateLimiter('https://fake-upstash.io', 'fake-token', 5, 60);
    const res = await limiter.check('test-key', Date.now());
    expect(res.success).toBe(true);

    limiter.reset('test-key');
    limiter.reset();

    vi.unstubAllGlobals();
  });

  it('covers geocode cache hit branch in searchOpenMeteoLocations', async () => {
    clearDataCaches();
    const mockResults = [{ id: 1, name: 'Delhi', latitude: 28.61, longitude: 77.21, country: 'India' }];
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: mockResults }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const first = await searchOpenMeteoLocations('Delhi');
    expect(first).toEqual(mockResults);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second call hits cache, fetch is not called again
    const second = await searchOpenMeteoLocations('Delhi');
    expect(second).toEqual(mockResults);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it('validates empty or whitespace strings as unsafe in validateLLMOutputSafety', () => {
    expect(validateLLMOutputSafety('')).toBe(false);
    expect(validateLLMOutputSafety('   ')).toBe(false);
  });
});
