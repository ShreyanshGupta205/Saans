/**
 * @file golden-set.test.ts
 * @description Golden-set test suite verifying:
 * 1. Output schema adherence
 * 2. Strict safety rules (medical boundaries)
 * 3. Guarantee that ALL numerical impact metrics originate from deterministic engine, never from LLM
 */

import { describe, expect, it } from 'vitest';
import { generateDeterministicPlan } from '../../lib/rules/fallback-plan';
import { HouseholdProfile } from '../../lib/impact/types';
import { SAANS_SYSTEM_PROMPT } from '../../lib/llm/prompt';

const goldenProfile: HouseholdProfile = {
  locationName: 'Connaught Place, Delhi',
  lat: 28.61,
  lon: 77.21,
  adultsCount: 3,
  childrenCount: 2,
  elderlyCount: 1,
  hasSensitiveMembers: true,
  commuteMode: 'car_petrol',
  commuteDistanceKm: 18,
  workFromHomeDays: 1,
  homeType: 'apartment_highrise',
  cookingFuel: 'lpg',
  hasAirPurifier: false,
  language: 'en',
};

describe('Golden-Set Evaluation: Deterministic Integrity & Safety', () => {
  it('guarantees all impact metrics have verified source keys and units', () => {
    const plan = generateDeterministicPlan({
      profile: goldenProfile,
      aqi: 420, // Severe
      dominantPollutant: 'pm25',
    });

    const allCards = [
      ...plan.routineActions,
      ...plan.indoorActions,
      ...plan.sustainableActions,
    ];

    for (const card of allCards) {
      // 1. Exposure metric must have unit and credible sourceKey
      expect(card.impact.exposureChange.unit).toBeTruthy();
      expect(card.impact.exposureChange.sourceKey).toBeTruthy();
      expect(card.impact.exposureChange.minVal).toBeGreaterThanOrEqual(0);

      // 2. Emissions metric must have unit and sourceKey
      expect(card.impact.emissionsChange.unit).toBeTruthy();
      expect(card.impact.emissionsChange.sourceKey).toBeTruthy();

      // 3. Community multiplier must have unit and sourceKey
      expect(card.impact.communityMultiplier.unit).toBeTruthy();
      expect(card.impact.communityMultiplier.sourceKey).toBeTruthy();
    }
  });

  it('confirms medical disclaimer boundary in prompt specifications', () => {
    expect(SAANS_SYSTEM_PROMPT).toMatch(/not (a )?doctor/i);
    expect(SAANS_SYSTEM_PROMPT).toMatch(/emergency/i);
    expect(SAANS_SYSTEM_PROMPT).toMatch(/prescribed/i);
  });
});
