/**
 * @file rules.test.ts
 * @description Unit tests for the deterministic fallback plan engine.
 */

import { describe, expect, it } from 'vitest';
import { generateDeterministicPlan } from '../../lib/rules/fallback-plan';
import { HouseholdProfile } from '../../lib/impact/types';

const sampleProfile: HouseholdProfile = {
  locationName: 'Noida',
  lat: 28.53,
  lon: 77.39,
  adultsCount: 2,
  childrenCount: 2,
  elderlyCount: 1,
  hasSensitiveMembers: true,
  commuteMode: 'car_diesel',
  commuteDistanceKm: 20,
  workFromHomeDays: 1,
  homeType: 'apartment_highrise',
  cookingFuel: 'lpg',
  hasAirPurifier: true,
  language: 'en',
};

describe('Deterministic Fallback Plan Generator', () => {
  it('generates all three mandatory sections with valid Action Cards', () => {
    const plan = generateDeterministicPlan({
      profile: sampleProfile,
      aqi: 380,
      dominantPollutant: 'pm25',
      isDegraded: true,
    });

    expect(plan.isDegraded).toBe(true);
    expect(plan.routineActions.length).toBeGreaterThanOrEqual(3);
    expect(plan.indoorActions.length).toBeGreaterThanOrEqual(3);
    expect(plan.sustainableActions.length).toBeGreaterThanOrEqual(3);

    // Verify each card contains complete, non-stub data
    const allCards = [
      ...plan.routineActions,
      ...plan.indoorActions,
      ...plan.sustainableActions,
    ];

    for (const card of allCards) {
      expect(card.id).toBeTruthy();
      expect(card.titleEn).toBeTruthy();
      expect(card.whyEn).toBeTruthy();
      expect(['Low', 'Medium', 'High']).toContain(card.effort);
      expect(['₹0', '₹100 - ₹500', '₹500 - ₹2,000', '₹2,000+']).toContain(card.costBand);

      // Verify Impact Block
      expect(card.impact.exposureChange.value).toBeTruthy();
      expect(card.impact.exposureChange.confidence).toBeTruthy();
      expect(card.impact.emissionsChange.value).toBeTruthy();
      expect(card.impact.communityMultiplier.value).toBeTruthy();
    }
  });

  it('adapts language summary based on Hindi vs English', () => {
    const planEn = generateDeterministicPlan({
      profile: sampleProfile,
      aqi: 250,
      dominantPollutant: 'pm25',
      isDegraded: false,
    });
    expect(planEn.summaryEn).toContain('Tailored clean air plan');

    const planHi = generateDeterministicPlan({
      profile: { ...sampleProfile, language: 'hi' },
      aqi: 250,
      dominantPollutant: 'pm25',
      isDegraded: true,
    });
    expect(planHi.summaryHi).toContain('नियम-आधारित स्वच्छ वायु योजना');
  });
});
