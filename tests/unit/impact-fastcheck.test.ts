import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateHouseholdExposure } from '../../lib/impact/exposure';
import { calculateHouseholdEmissions } from '../../lib/impact/emissions';
import { calculateCommunityImpact } from '../../lib/impact/community';
import { getProfileArchetype, ALL_PROFILE_ARCHETYPES } from '../../lib/impact/archetypes';
import { calculateChoiceImpact } from '../../lib/impact/choice-impact';
import { IMPACT_FACTORS } from '../../data/impact-factors';
import { CommuteMode, CookingFuel, HomeType, HouseholdProfile } from '../../lib/impact/types';

describe('Property-Based Testing (fast-check) for Impact Engine', () => {
  const commuteModes: CommuteMode[] = [
    'car_petrol',
    'car_diesel',
    'car_ev',
    'two_wheeler',
    'auto',
    'bus',
    'metro',
    'walk_cycle',
    'none',
  ];
  const cookingFuels: CookingFuel[] = ['lpg', 'png', 'electric_induction', 'biomass'];
  const homeTypes: HomeType[] = ['apartment_highrise', 'apartment_lowrise', 'independent_house', 'semi_pucca'];

  const profileArbitrary = fc.record({
    location: fc.constant({ latitude: 28.61, longitude: 77.23, cityName: 'Delhi' }),
    household: fc.record({
      adults: fc.integer({ min: 1, max: 10 }),
      children: fc.integer({ min: 0, max: 6 }),
      elderly: fc.integer({ min: 0, max: 6 }),
    }),
    hasSensitiveMembers: fc.boolean(),
    commuteMode: fc.constantFrom(...commuteModes),
    commuteDistanceKm: fc.float({ min: 0, max: 100, noNaN: true }),
    homeType: fc.constantFrom(...homeTypes),
    cookingFuel: fc.constantFrom(...cookingFuels),
    hasAirPurifier: fc.boolean(),
    workFromHomeDays: fc.integer({ min: 0, max: 7 }),
  }) as fc.Arbitrary<HouseholdProfile>;

  it('Property: Exposure values are strictly non-negative and reduction % is between 0 and 95', () => {
    fc.assert(
      fc.property(profileArbitrary, fc.float({ min: 0, max: 1000, noNaN: true }), (profile, ambientPm25) => {
        const exposure = calculateHouseholdExposure(profile, ambientPm25);
        expect(exposure.baselineInhaledMicrogramsPerDay).toBeGreaterThanOrEqual(0);
        expect(exposure.optimizedInhaledMicrogramsPerDay).toBeGreaterThanOrEqual(0);
        expect(exposure.exposureReductionPct).toBeGreaterThanOrEqual(0);
        expect(exposure.exposureReductionPct).toBeLessThanOrEqual(95);
        expect(exposure.highExposureHoursPerDay).toBeGreaterThanOrEqual(0);
        expect(exposure.highExposureHoursPerDay).toBeLessThanOrEqual(24);
      })
    );
  });

  it('Property: Emissions values and potential savings are non-negative', () => {
    fc.assert(
      fc.property(profileArbitrary, (profile) => {
        const emissions = calculateHouseholdEmissions(profile);
        expect(emissions.dailyCommuteKgCO2).toBeGreaterThanOrEqual(0);
        expect(emissions.dailyCommuteGramsPM25).toBeGreaterThanOrEqual(0);
        expect(emissions.dailyCookingKgCO2).toBeGreaterThanOrEqual(0);
        expect(emissions.potentialMonthlyKgCO2Reduction).toBeGreaterThanOrEqual(0);
        expect(emissions.potentialMonthlyGramsPM25Reduction).toBeGreaterThanOrEqual(0);
      })
    );
  });

  it('Property: Community scaling is strictly positive for any N >= 1', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10000 }), (n) => {
        const comm = calculateCommunityImpact(n);
        expect(comm.householdsCount).toBe(n);
        expect(comm.kgPm25Prevented).toBeGreaterThan(0);
        expect(comm.tonsCO2eReduced).toBeGreaterThan(0);
        expect(comm.carTripsAvoided).toBeGreaterThanOrEqual(0);
        expect(comm.highExposureHoursAverted).toBeGreaterThan(0);
      })
    );
  });

  it('Property: Profile classification covers all profiles and maps to bounded archetypes', () => {
    fc.assert(
      fc.property(profileArbitrary, (profile) => {
        const archetype = getProfileArchetype(profile);
        expect(ALL_PROFILE_ARCHETYPES).toContain(archetype);
      })
    );
  });

  it('Property: All impact factors in data/impact-factors.ts satisfy minReductionPct <= maxReductionPct', () => {
    const factors = Object.values(IMPACT_FACTORS);
    for (const factor of factors) {
      expect(factor.minReductionPct).toBeLessThanOrEqual(factor.maxReductionPct);
      expect(factor.sourceName.length).toBeGreaterThan(0);
      expect(factor.sourceUrl.length).toBeGreaterThan(0);
    }
  });

  it('Property: Choice impact produces Grade 6-8 reading level before/after comparisons', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('n95_commute', 'metro_shift', 'hepa_purifier'),
        profileArbitrary,
        fc.float({ min: 10, max: 600, noNaN: true }),
        (actionKey, profile, pm25) => {
          const res = calculateChoiceImpact(actionKey, profile, pm25);
          expect(res.readingLevel).toBe('Grade 6-8');
          expect(res.beforeExposureEn.length).toBeGreaterThan(15);
          expect(res.afterExposureEn.length).toBeGreaterThan(15);
          expect(res.exposureCutPercent).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });
});
