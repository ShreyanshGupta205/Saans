/**
 * @file impact.test.ts
 * @description Unit tests for the deterministic exposure, emissions, and community scaling models.
 */

import { describe, expect, it } from 'vitest';
import { calculateCommunityImpact } from '../../lib/impact/community';
import { calculateHouseholdEmissions } from '../../lib/impact/emissions';
import { calculateHouseholdExposure, getInfiltrationParams } from '../../lib/impact/exposure';
import { HouseholdProfile } from '../../lib/impact/types';

const defaultProfile: HouseholdProfile = {
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
  hasAirPurifier: false,
  language: 'en',
};

describe('Infiltration Parameters', () => {
  it('returns appropriate infiltration rates for home types', () => {
    const highrise = getInfiltrationParams('apartment_highrise');
    expect(highrise.baselineInfiltration).toBe(0.65);
    expect(highrise.withPurifierInfiltration).toBe(0.18);

    const semiPucca = getInfiltrationParams('semi_pucca');
    expect(semiPucca.baselineInfiltration).toBe(0.85);
  });
});

describe('calculateHouseholdExposure', () => {
  it('calculates significant exposure reduction with True HEPA and N95 mask', () => {
    const ambientPm25 = 300; // Delhi smog episode
    const exposure = calculateHouseholdExposure(defaultProfile, ambientPm25);

    expect(exposure.baselineInhaledMicrogramsPerDay).toBeGreaterThan(0);
    expect(exposure.optimizedInhaledMicrogramsPerDay).toBeLessThan(
      exposure.baselineInhaledMicrogramsPerDay
    );
    expect(exposure.exposureReductionPct).toBeGreaterThanOrEqual(60);
  });

  it('handles 0 ambient concentration without crashing or division by zero', () => {
    const exposure = calculateHouseholdExposure(defaultProfile, 0);
    expect(exposure.baselineInhaledMicrogramsPerDay).toBe(0);
    expect(exposure.optimizedInhaledMicrogramsPerDay).toBe(0);
    expect(exposure.exposureReductionPct).toBe(0);
  });
});

describe('calculateHouseholdEmissions', () => {
  it('computes daily commute and cooking emissions accurately', () => {
    const emissions = calculateHouseholdEmissions(defaultProfile);

    // 15 km each way = 30 km round trip. WFH 2 days = 5 in-office days.
    // Daily average km = (30 * 5) / 7 = 21.43 km/day.
    // Petrol car = 142 g CO2/km -> ~3.04 kg CO2/day.
    expect(emissions.dailyCommuteKgCO2).toBeGreaterThan(2.0);
    expect(emissions.dailyCookingKgCO2).toBe(0.82); // LPG baseline
    expect(emissions.potentialMonthlyKgCO2Reduction).toBeGreaterThan(0);
  });

  it('computes zero tailpipe emissions for walking or remote workers', () => {
    const remoteProfile: HouseholdProfile = {
      ...defaultProfile,
      commuteMode: 'walk_cycle',
      commuteDistanceKm: 2,
      workFromHomeDays: 7,
    };

    const emissions = calculateHouseholdEmissions(remoteProfile);
    expect(emissions.dailyCommuteKgCO2).toBe(0);
    expect(emissions.dailyCommuteGramsPM25).toBe(0);
  });
});

describe('calculateCommunityImpact', () => {
  it('scales aggregate impact linearly across 50 households over 90 smog days', () => {
    const impact50 = calculateCommunityImpact(50);
    expect(impact50.householdsCount).toBe(50);
    expect(impact50.winterSeasonDays).toBe(90);
    expect(impact50.kgPm25Prevented).toBeGreaterThan(3);
    expect(impact50.tonsCO2eReduced).toBeGreaterThan(1);
    expect(impact50.carTripsAvoided).toBeGreaterThan(100);
    expect(impact50.highExposureHoursAverted).toBeGreaterThan(1000);
  });

  it('clamps invalid household counts safely between 1 and 10000', () => {
    const minImpact = calculateCommunityImpact(-5);
    expect(minImpact.householdsCount).toBe(1);

    const maxImpact = calculateCommunityImpact(50000);
    expect(maxImpact.householdsCount).toBe(10000);
  });
});
