/**
 * @file types.ts
 * @description Types for the deterministic exposure and emissions impact engine.
 */

export type CommuteMode =
  | 'metro'
  | 'bus'
  | 'car_petrol'
  | 'car_diesel'
  | 'car_ev'
  | 'two_wheeler'
  | 'auto'
  | 'walk_cycle'
  | 'none';

export type HomeType =
  | 'apartment_highrise'
  | 'apartment_lowrise'
  | 'independent_house'
  | 'semi_pucca';

export type CookingFuel = 'lpg' | 'png' | 'electric_induction' | 'biomass';

export interface HouseholdProfile {
  readonly locationName: string;
  readonly lat: number;
  readonly lon: number;
  readonly adultsCount: number;
  readonly childrenCount: number;
  readonly elderlyCount: number;
  readonly hasSensitiveMembers: boolean; // Asthma, COPD, cardiac, pregnancy
  readonly commuteMode: CommuteMode;
  readonly commuteDistanceKm: number; // one-way
  readonly workFromHomeDays: number; // 0 - 7
  readonly homeType: HomeType;
  readonly cookingFuel: CookingFuel;
  readonly hasAirPurifier: boolean;
  readonly language: 'en' | 'hi';
}

interface ImpactMetric {
  readonly value: string; // e.g. "65% - 80%", "450 g CO2e / day"
  readonly minVal: number;
  readonly maxVal: number;
  readonly unit: string;
  readonly confidence: 'High' | 'Medium' | 'Low';
  readonly sourceKey: string;
  readonly isEstimate: boolean;
  readonly qualitativeNote?: string;
}

export interface ActionCardImpact {
  readonly exposureChange: ImpactMetric;
  readonly emissionsChange: ImpactMetric;
  readonly communityMultiplier: ImpactMetric;
}

type EffortLevel = 'Low' | 'Medium' | 'High';
type CostBandINR = '₹0' | '₹100 - ₹500' | '₹500 - ₹2,000' | '₹2,000+';
type ActionSection = 'routine' | 'indoor' | 'sustainable';

export interface ActionCardData {
  readonly id: string;
  readonly section: ActionSection;
  readonly timeOfDay?: 'morning' | 'day' | 'evening';
  readonly titleEn: string;
  readonly titleHi: string;
  readonly whyEn: string;
  readonly whyHi: string;
  readonly effort: EffortLevel;
  readonly costBand: CostBandINR;
  readonly impact: ActionCardImpact;
}

export interface HouseholdExposureAssessment {
  readonly baselineInhaledMicrogramsPerDay: number;
  readonly optimizedInhaledMicrogramsPerDay: number;
  readonly exposureReductionPct: number;
  readonly highExposureHoursPerDay: number;
}

export interface HouseholdEmissionsAssessment {
  readonly dailyCommuteKgCO2: number;
  readonly dailyCommuteGramsPM25: number;
  readonly dailyCookingKgCO2: number;
  readonly potentialMonthlyKgCO2Reduction: number;
  readonly potentialMonthlyGramsPM25Reduction: number;
}
