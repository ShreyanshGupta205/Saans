/**
 * @file service.test.ts
 * @description Unit tests for LLM execution service, deterministic binding, and degraded fallback.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleGenAI } from '@google/genai';
import { clearPlanCache, getOrGeneratePlan } from '../../lib/llm/service';
import { ComputedAQIResult } from '../../lib/aqi/types';
import { HouseholdProfile } from '../../lib/impact/types';
import * as clientModule from '../../lib/llm/client';

const sampleProfile: HouseholdProfile = {
  locationName: 'Delhi',
  lat: 28.61,
  lon: 77.21,
  adultsCount: 2,
  childrenCount: 1,
  elderlyCount: 0,
  hasSensitiveMembers: false,
  commuteMode: 'car_petrol',
  commuteDistanceKm: 15,
  workFromHomeDays: 2,
  homeType: 'apartment_highrise',
  cookingFuel: 'lpg',
  hasAirPurifier: true,
  language: 'en',
};

const sampleAqi: ComputedAQIResult = {
  aqi: 320,
  dominantPollutant: 'pm25',
  category: 'Very Poor',
  categoryHi: 'बहुत खराब',
  healthAdvisoryEn: 'Respiratory illness on prolonged exposure.',
  healthAdvisoryHi: 'गंभीर सांस की बीमारियां हो सकती हैं।',
  pollutantBreakdown: {},
  whoMultiples: { pm25: 15 },
  timestamp: new Date().toISOString(),
  isEmergency: false,
};

describe('LLM Service & Deterministic Impact Binding', () => {
  beforeEach(() => {
    clearPlanCache();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearPlanCache();
    vi.restoreAllMocks();
  });

  it('falls back seamlessly to deterministic rule engine when no Gemini key is set', async () => {
    vi.spyOn(clientModule, 'getGenAIClient').mockReturnValue(null);

    const plan = await getOrGeneratePlan(sampleProfile, sampleAqi, 'en');

    expect(plan.isDegraded).toBe(true);
    expect(plan.routineActions.length).toBeGreaterThan(0);
    expect(plan.indoorActions.length).toBeGreaterThan(0);
    expect(plan.sustainableActions.length).toBeGreaterThan(0);
    expect(plan.summaryEn).toContain('Deterministic rule-based clean air plan activated');
  });

  it('binds deterministic impact metrics to valid Gemini JSON output', async () => {
    const mockGeminiJson = JSON.stringify({
      summary: 'Personalized AI clean air plan for your Delhi commute.',
      routineActions: [
        {
          id: 'gemini-mask',
          section: 'routine',
          timeOfDay: 'morning',
          title: 'Wear N95 Respirator',
          why: 'Blocks fine particulates during high morning inversion.',
          effort: 'Low',
          costBand: '₹100 - ₹500',
        },
        {
          id: 'gemini-air',
          section: 'routine',
          timeOfDay: 'day',
          title: 'Brief Midday Ventilation',
          why: 'Ventilate when boundary layer lifts at 1 PM.',
          effort: 'Low',
          costBand: '₹0',
        },
      ],
      indoorActions: [
        {
          id: 'gemini-purifier',
          section: 'indoor',
          title: 'HEPA Purifier Operation',
          why: 'Cleans enclosed bedrooms effectively.',
          effort: 'Low',
          costBand: '₹0',
        },
        {
          id: 'gemini-mop',
          section: 'indoor',
          title: 'Microfiber Wet Mopping',
          why: 'Stops dust resuspension.',
          effort: 'Low',
          costBand: '₹100 - ₹500',
        },
      ],
      sustainableActions: [
        {
          id: 'gemini-metro',
          section: 'sustainable',
          title: 'Shift to Delhi Metro',
          why: 'Reduces tailpipe car emissions.',
          effort: 'Medium',
          costBand: '₹500 - ₹2,000',
        },
        {
          id: 'gemini-heaters',
          section: 'sustainable',
          title: 'Electric Quartz Heaters for Guards',
          why: 'Avoids wood burning smoke.',
          effort: 'Medium',
          costBand: '₹500 - ₹2,000',
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

    const plan = await getOrGeneratePlan(sampleProfile, sampleAqi, 'en');

    expect(plan.isDegraded).toBe(false);
    expect(plan.summaryEn).toBe('Personalized AI clean air plan for your Delhi commute.');

    // Check that ALL cards have calibrated impact blocks attached deterministically
    const maskCard = plan.routineActions.find((a) => a.id === 'gemini-mask');
    expect(maskCard).toBeDefined();
    expect(maskCard?.impact.exposureChange.unit).toBe('% inhaled PM2.5 reduced');
    expect(maskCard?.impact.exposureChange.confidence).toBe('High');
    expect(maskCard?.impact.exposureChange.value).toBe('90% - 95%');

    const metroCard = plan.sustainableActions.find((a) => a.id === 'gemini-metro');
    expect(metroCard).toBeDefined();
    expect(metroCard?.impact.emissionsChange.unit).toBe('kg CO2e / month');
  });

  it('falls back to rule engine if Gemini returns invalid or malformed schema', async () => {
    const invalidJson = JSON.stringify({
      summary: 'Bad schema response with missing fields',
      // Missing mandatory routineActions, indoorActions, sustainableActions
    });

    const mockClient = {
      models: {
        generateContent: vi.fn().mockResolvedValueOnce({
          text: invalidJson,
        }),
      },
    };

    vi.spyOn(clientModule, 'getGenAIClient').mockReturnValue(mockClient as unknown as GoogleGenAI);

    const plan = await getOrGeneratePlan(sampleProfile, sampleAqi, 'en');
    expect(plan.isDegraded).toBe(true);
    expect(plan.routineActions.length).toBeGreaterThanOrEqual(3);
  });
});
