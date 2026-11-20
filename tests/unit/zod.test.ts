/**
 * @file zod.test.ts
 * @description Unit tests for input sanitization, coordinate bounds, and strict schema validation.
 */

import { describe, expect, it } from 'vitest';
import {
  AQIQuerySchema,
  ChatRequestSchema,
  GeocodeQuerySchema,
  HouseholdProfileSchema,
  LLMPlanResponseSchema,
} from '../../lib/llm/schema';

describe('HouseholdProfileSchema Validation', () => {
  const validProfile = {
    locationName: 'Delhi NCR',
    lat: 28.61,
    lon: 77.21,
    adultsCount: 2,
    childrenCount: 1,
    elderlyCount: 0,
    hasSensitiveMembers: false,
    commuteMode: 'metro',
    commuteDistanceKm: 12,
    workFromHomeDays: 3,
    homeType: 'apartment_highrise',
    cookingFuel: 'lpg',
    hasAirPurifier: true,
    language: 'en',
  };

  it('accepts valid profile inputs', () => {
    const parsed = HouseholdProfileSchema.safeParse(validProfile);
    expect(parsed.success).toBe(true);
  });

  it('rejects out-of-bounds latitude and longitude', () => {
    const invalidLat = HouseholdProfileSchema.safeParse({ ...validProfile, lat: 95.0 });
    expect(invalidLat.success).toBe(false);

    const invalidLon = HouseholdProfileSchema.safeParse({ ...validProfile, lon: -195.0 });
    expect(invalidLon.success).toBe(false);
  });

  it('rejects unknown fields strictly to prevent parameter injection', () => {
    const withInjectedField = {
      ...validProfile,
      maliciousPayload: 'DROP TABLE users;',
    };
    const parsed = HouseholdProfileSchema.safeParse(withInjectedField);
    expect(parsed.success).toBe(false);
  });

  it('rejects invalid enum values', () => {
    const invalidCommute = HouseholdProfileSchema.safeParse({
      ...validProfile,
      commuteMode: 'rocket_ship',
    });
    expect(invalidCommute.success).toBe(false);
  });
});

describe('ChatRequestSchema', () => {
  it('validates grounded chat requests with message history', () => {
    const validChat = {
      messages: [{ role: 'user', content: 'What mask should I wear?' }],
      profile: {
        locationName: 'Delhi',
        lat: 28.61,
        lon: 77.21,
      },
      currentAqi: 350,
      dominantPollutant: 'pm25',
      language: 'en',
    };
    const parsed = ChatRequestSchema.safeParse(validChat);
    expect(parsed.success).toBe(true);
  });
});

describe('AQI & Geocode Query Schemas', () => {
  it('validates AQI query coordinates', () => {
    const valid = AQIQuerySchema.safeParse({ lat: '28.61', lon: '77.21' });
    expect(valid.success).toBe(true);

    const invalid = AQIQuerySchema.safeParse({ lat: 'invalid', lon: '77.21' });
    expect(invalid.success).toBe(false);
  });

  it('sanitizes geocode query length', () => {
    const tooShort = GeocodeQuerySchema.safeParse({ q: 'a' });
    expect(tooShort.success).toBe(false);

    const valid = GeocodeQuerySchema.safeParse({ q: 'Gurgaon' });
    expect(valid.success).toBe(true);
  });
});

describe('LLMPlanResponseSchema', () => {
  it('validates structured plan output from Gemini', () => {
    const validResponse = {
      summary: 'Action plan for high smog conditions in Delhi NCR.',
      routineActions: [
        {
          id: 'act-1',
          section: 'routine',
          timeOfDay: 'morning',
          title: 'Wear N95',
          why: 'Filters fine particles during high morning inversion.',
          effort: 'Low',
          costBand: '₹100 - ₹500',
        },
        {
          id: 'act-2',
          section: 'routine',
          timeOfDay: 'day',
          title: 'Ventilate midday',
          why: 'Ventilate when boundary layer lifts at 1 PM.',
          effort: 'Low',
          costBand: '₹0',
        },
      ],
      indoorActions: [
        {
          id: 'act-3',
          section: 'indoor',
          title: 'Wet mopping',
          why: 'Prevents resuspending dust particles.',
          effort: 'Low',
          costBand: '₹100 - ₹500',
        },
        {
          id: 'act-4',
          section: 'indoor',
          title: 'Weatherstrip doors',
          why: 'Reduces outdoor infiltration.',
          effort: 'Medium',
          costBand: '₹100 - ₹500',
        },
      ],
      sustainableActions: [
        {
          id: 'act-5',
          section: 'sustainable',
          title: 'Shift to Metro',
          why: 'Reduces tailpipe particulate emissions.',
          effort: 'Medium',
          costBand: '₹500 - ₹2,000',
        },
        {
          id: 'act-6',
          section: 'sustainable',
          title: 'Clean heater for guards',
          why: 'Eliminates open biomass burning smoke.',
          effort: 'Medium',
          costBand: '₹500 - ₹2,000',
        },
      ],
    };

    const parsed = LLMPlanResponseSchema.safeParse(validResponse);
    expect(parsed.success).toBe(true);
  });
});
