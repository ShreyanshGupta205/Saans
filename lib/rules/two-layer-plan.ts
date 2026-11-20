/**
 * @file two-layer-plan.ts
 * @description Implements the Two-Layer Plan Architecture:
 * 1. Numbers Layer (deterministic, computed per-user from live AQI + profile in <100ms)
 * 2. Narrative Layer (cached by aqiBucket, profileArchetype, language)
 */

import { ActionCardData, ActionCardImpact, HouseholdProfile } from '../impact/types';
import { calculateHouseholdExposure } from '../impact/exposure';
import { calculateHouseholdEmissions } from '../impact/emissions';
import { calculateCommunityImpact } from '../impact/community';
import { getProfileArchetype, ProfileArchetype } from '../impact/archetypes';
import { IMPACT_FACTORS } from '../../data/impact-factors';
import { GeneratedPlanResult } from './fallback-plan';

export interface PlanNumbersLayer {
  readonly exposure: ReturnType<typeof calculateHouseholdExposure>;
  readonly emissions: ReturnType<typeof calculateHouseholdEmissions>;
  readonly community: ReturnType<typeof calculateCommunityImpact>;
  readonly computedAtMs: number;
  readonly archetype: ProfileArchetype;
}

export interface CardNarrative {
  readonly id: string;
  readonly titleEn: string;
  readonly titleHi: string;
  readonly whyEn: string;
  readonly whyHi: string;
  readonly effort: 'Low' | 'Medium' | 'High';
  readonly costBand: '₹0' | '₹100 - ₹500' | '₹500 - ₹2,000' | '₹2,000+';
  readonly timeOfDay?: 'morning' | 'day' | 'evening';
  readonly impactFactorKey: keyof typeof IMPACT_FACTORS;
}

export interface PlanNarrativeLayer {
  readonly cacheKey: string;
  readonly summaryEn: string;
  readonly summaryHi: string;
  readonly routineActions: readonly CardNarrative[];
  readonly indoorActions: readonly CardNarrative[];
  readonly sustainableActions: readonly CardNarrative[];
  readonly isBasicMode: boolean;
}

/**
 * Computes user-specific numbers in <100ms. Never shared across users.
 */
export function computeUserNumbersLayer(profile: HouseholdProfile, aqi: number): PlanNumbersLayer {
  const start = Date.now();
  const exposure = calculateHouseholdExposure(profile, aqi);
  const emissions = calculateHouseholdEmissions(profile);
  const community = calculateCommunityImpact(50);
  const archetype = getProfileArchetype(profile);

  return {
    exposure,
    emissions,
    community,
    computedAtMs: Date.now() - start,
    archetype,
  };
}

/**
 * Builds deterministic impact block for an action card using pre-computed numbers layer.
 */
function buildCardImpact(factorKey: keyof typeof IMPACT_FACTORS, numbers: PlanNumbersLayer): ActionCardImpact {
  const f = IMPACT_FACTORS[factorKey] ?? IMPACT_FACTORS.hepa_filtration;
  return {
    exposureChange: {
      value: `${f?.minReductionPct ?? 70}% - ${f?.maxReductionPct ?? 85}%`,
      minVal: f?.minReductionPct ?? 70,
      maxVal: f?.maxReductionPct ?? 85,
      unit: f?.unit ?? '% PM2.5 reduced',
      confidence: f?.confidence ?? 'High',
      sourceKey: f?.sourceName ?? 'CPCB_CEEW',
      isEstimate: f?.isEstimate ?? false,
    },
    emissionsChange: {
      value: `${numbers.emissions.potentialMonthlyKgCO2Reduction} kg CO2e / month`,
      minVal: numbers.emissions.potentialMonthlyKgCO2Reduction,
      maxVal: numbers.emissions.potentialMonthlyKgCO2Reduction * 1.3,
      unit: 'kg CO2e prevented',
      confidence: 'High',
      sourceKey: 'ARAI_CEA_EMISSIONS',
      isEstimate: false,
    },
    communityMultiplier: {
      value: `x${numbers.community.householdsCount}`,
      minVal: numbers.community.kgPm25Prevented,
      maxVal: numbers.community.kgPm25Prevented * 2,
      unit: 'kg PM2.5 prevented',
      confidence: 'Medium',
      sourceKey: 'NEIGHBOURHOOD_SCALING_MODEL',
      isEstimate: true,
      qualitativeNote: `If 50 societies in your sector follow this, ${numbers.community.kgPm25Prevented} kg of toxic winter soot is prevented.`,
    },
  };
}

/**
 * Combines the deterministic Numbers Layer with the Narrative Layer into complete Action Cards.
 */
export function combinePlanLayers(
  numbers: PlanNumbersLayer,
  narrative: PlanNarrativeLayer,
  section: 'routine' | 'indoor' | 'sustainable',
  card: CardNarrative
): ActionCardData {
  const impact = buildCardImpact(card.impactFactorKey, numbers);
  return {
    id: card.id,
    section,
    timeOfDay: card.timeOfDay,
    titleEn: card.titleEn,
    titleHi: card.titleHi,
    whyEn: card.whyEn,
    whyHi: card.whyHi,
    effort: card.effort,
    costBand: card.costBand,
    impact,
  };
}

/**
 * Assembles a complete GeneratedPlanResult from numbers and narrative layers.
 */
export function assembleCompletePlan(
  numbers: PlanNumbersLayer,
  narrative: PlanNarrativeLayer,
  isDegraded: boolean
): GeneratedPlanResult {
  return {
    routineActions: narrative.routineActions.map((c) => combinePlanLayers(numbers, narrative, 'routine', c)),
    indoorActions: narrative.indoorActions.map((c) => combinePlanLayers(numbers, narrative, 'indoor', c)),
    sustainableActions: narrative.sustainableActions.map((c) =>
      combinePlanLayers(numbers, narrative, 'sustainable', c)
    ),
    isDegraded,
    summaryEn: narrative.summaryEn,
    summaryHi: narrative.summaryHi,
    generatedAt: new Date().toISOString(),
  };
}
