/**
 * @file emissions.ts
 * @description Tailpipe and indoor emissions model for personal transport, cooking, and appliance usage.
 *
 * Grounded emission factors:
 * - ARAI Indian Vehicle Emission Database:
 *   - Petrol Car: 142.0 g CO2 / km, 0.035 g PM2.5 / km
 *   - Diesel Car: 168.0 g CO2 / km, 0.082 g PM2.5 / km
 *   - Two-Wheeler (4-stroke): 42.0 g CO2 / km, 0.024 g PM2.5 / km
 *   - Auto (CNG): 68.0 g CO2 / km, 0.008 g PM2.5 / km
 *   - Electric Car: 57.0 g CO2 / km (based on CEA grid intensity), 0.001 g PM2.5 / km (brake/tire dust)
 *   - Metro: 11.5 g CO2 / passenger-km, 0.001 g PM2.5 / passenger-km
 *   - Walking / Cycling: 0 g CO2, 0 g PM2.5
 *
 * Cooking fuel factors (per household daily average):
 * - LPG: 0.82 kg CO2 / day, 0.16 g PM2.5 / day
 * - PNG: 0.74 kg CO2 / day, 0.12 g PM2.5 / day
 * - Induction: 0.42 kg CO2 / day (grid-average), 0.00 g indoor PM2.5 / day
 * - Solid biomass: 4.80 kg CO2 / day, 37.0 g PM2.5 / day
 *
 * Source: ARAI 2018, CPCB 2019, CEA CO2 Baseline Database 2023, PPAC 2022.
 */

import { CommuteMode, CookingFuel, HouseholdEmissionsAssessment, HouseholdProfile } from './types';

export interface VehicleFactor {
  readonly gCO2PerKm: number;
  readonly gPM25PerKm: number;
}

export const COMMUTE_EMISSION_FACTORS: Record<CommuteMode, VehicleFactor> = {
  car_petrol: { gCO2PerKm: 142.0, gPM25PerKm: 0.035 },
  car_diesel: { gCO2PerKm: 168.0, gPM25PerKm: 0.082 },
  two_wheeler: { gCO2PerKm: 42.0, gPM25PerKm: 0.024 },
  auto: { gCO2PerKm: 68.0, gPM25PerKm: 0.008 },
  car_ev: { gCO2PerKm: 57.0, gPM25PerKm: 0.001 },
  bus: { gCO2PerKm: 32.0, gPM25PerKm: 0.005 },
  metro: { gCO2PerKm: 11.5, gPM25PerKm: 0.001 },
  walk_cycle: { gCO2PerKm: 0.0, gPM25PerKm: 0.0 },
  none: { gCO2PerKm: 0.0, gPM25PerKm: 0.0 },
};

export const COOKING_EMISSION_FACTORS: Record<CookingFuel, { dailyKgCO2: number; dailyGramsPM25: number }> = {
  lpg: { dailyKgCO2: 0.82, dailyGramsPM25: 0.16 },
  png: { dailyKgCO2: 0.74, dailyGramsPM25: 0.12 },
  electric_induction: { dailyKgCO2: 0.42, dailyGramsPM25: 0.0 },
  biomass: { dailyKgCO2: 4.80, dailyGramsPM25: 37.0 },
};

/**
 * Computes household direct emissions and potential reductions from sustainable alternatives.
 *
 * @param profile Household profile
 * @returns HouseholdEmissionsAssessment
 */
export function calculateHouseholdEmissions(profile: HouseholdProfile): HouseholdEmissionsAssessment {
  const roundTripKm = profile.commuteDistanceKm * 2;
  const inOfficeDaysPerWeek = Math.max(0, 7 - profile.workFromHomeDays);
  const factor = COMMUTE_EMISSION_FACTORS[profile.commuteMode];

  // Daily average commute emissions across the 7-day week
  const dailyKmAverage = (roundTripKm * inOfficeDaysPerWeek) / 7;
  const dailyCommuteKgCO2 = (dailyKmAverage * factor.gCO2PerKm) / 1000;
  const dailyCommuteGramsPM25 = dailyKmAverage * factor.gPM25PerKm;

  // Cooking emissions
  const cooking = COOKING_EMISSION_FACTORS[profile.cookingFuel];

  // Sustainable alternative potentials:
  // 1. Shifting 2 days of motorized car/2-wheeler commute to Metro or WFH
  // 2. Switching to Induction or clean cooking
  let monthlyCO2ReductionKg = 0;
  let monthlyPM25ReductionGrams = 0;

  // If currently using private ICE car or two wheeler
  if (['car_petrol', 'car_diesel', 'two_wheeler'].includes(profile.commuteMode)) {
    const metroFactor = COMMUTE_EMISSION_FACTORS.metro;
    const co2SavedPerKm = (factor.gCO2PerKm - metroFactor.gCO2PerKm) / 1000;
    const pmSavedPerKm = factor.gPM25PerKm - metroFactor.gPM25PerKm;

    // Shift 2 days per week to Metro (or additional WFH) = 8 days per month
    const monthlyShiftKm = roundTripKm * 8;
    monthlyCO2ReductionKg += monthlyShiftKm * co2SavedPerKm;
    monthlyPM25ReductionGrams += monthlyShiftKm * pmSavedPerKm;
  }

  // Cooking fuel switch
  if (profile.cookingFuel === 'biomass') {
    // Huge reduction shifting biomass to induction/LPG
    monthlyCO2ReductionKg += (cooking.dailyKgCO2 - 0.42) * 30;
    monthlyPM25ReductionGrams += (cooking.dailyGramsPM25 - 0.0) * 30;
  } else if (profile.cookingFuel === 'lpg') {
    // LPG to induction saves ~0.40 kg CO2/day and zero indoor NO2/combustion particles
    monthlyCO2ReductionKg += (0.82 - 0.42) * 30;
    monthlyPM25ReductionGrams += (0.16 - 0.0) * 30;
  }

  return {
    dailyCommuteKgCO2: Math.round(dailyCommuteKgCO2 * 100) / 100,
    dailyCommuteGramsPM25: Math.round(dailyCommuteGramsPM25 * 1000) / 1000,
    dailyCookingKgCO2: cooking.dailyKgCO2,
    potentialMonthlyKgCO2Reduction: Math.max(0, Math.round(monthlyCO2ReductionKg * 10) / 10),
    potentialMonthlyGramsPM25Reduction: Math.max(0, Math.round(monthlyPM25ReductionGrams * 10) / 10),
  };
}
