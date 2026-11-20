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

const COOKING_EMISSION_FACTORS: Record<CookingFuel, { dailyKgCO2: number; dailyGramsPM25: number }> = {
  lpg: { dailyKgCO2: 0.82, dailyGramsPM25: 0.16 },
  png: { dailyKgCO2: 0.74, dailyGramsPM25: 0.12 },
  electric_induction: { dailyKgCO2: 0.42, dailyGramsPM25: 0.0 },
  biomass: { dailyKgCO2: 4.80, dailyGramsPM25: 37.0 },
};

function calcCommuteShiftSavings(profile: HouseholdProfile, factor: VehicleFactor): { co2Kg: number; pm25Grams: number } {
  if (!['car_petrol', 'car_diesel', 'two_wheeler'].includes(profile.commuteMode)) {
    return { co2Kg: 0, pm25Grams: 0 };
  }
  const metro = COMMUTE_EMISSION_FACTORS.metro;
  const co2SavedPerKm = (factor.gCO2PerKm - metro.gCO2PerKm) / 1000;
  const pmSavedPerKm = factor.gPM25PerKm - metro.gPM25PerKm;
  const monthlyShiftKm = profile.commuteDistanceKm * 2 * 8;
  return {
    co2Kg: monthlyShiftKm * co2SavedPerKm,
    pm25Grams: monthlyShiftKm * pmSavedPerKm,
  };
}

function calcCookingFuelSavings(fuel: CookingFuel): { co2Kg: number; pm25Grams: number } {
  const cooking = COOKING_EMISSION_FACTORS[fuel];
  if (fuel === 'biomass') {
    return { co2Kg: (cooking.dailyKgCO2 - 0.42) * 30, pm25Grams: cooking.dailyGramsPM25 * 30 };
  }
  if (fuel === 'lpg') {
    return { co2Kg: (0.82 - 0.42) * 30, pm25Grams: 0.16 * 30 };
  }
  return { co2Kg: 0, pm25Grams: 0 };
}

/**
 * Computes household direct emissions and potential reductions from sustainable alternatives.
 */
export function calculateHouseholdEmissions(profile: HouseholdProfile): HouseholdEmissionsAssessment {
  const roundTripKm = profile.commuteDistanceKm * 2;
  const inOfficeDaysPerWeek = Math.max(0, 7 - profile.workFromHomeDays);
  const factor = COMMUTE_EMISSION_FACTORS[profile.commuteMode];

  const dailyKmAverage = (roundTripKm * inOfficeDaysPerWeek) / 7;
  const dailyCommuteKgCO2 = (dailyKmAverage * factor.gCO2PerKm) / 1000;
  const dailyCommuteGramsPM25 = dailyKmAverage * factor.gPM25PerKm;

  const commuteSavings = calcCommuteShiftSavings(profile, factor);
  const cookingSavings = calcCookingFuelSavings(profile.cookingFuel);
  const totalCO2Red = commuteSavings.co2Kg + cookingSavings.co2Kg;
  const totalPM25Red = commuteSavings.pm25Grams + cookingSavings.pm25Grams;

  return {
    dailyCommuteKgCO2: Math.round(dailyCommuteKgCO2 * 100) / 100,
    dailyCommuteGramsPM25: Math.round(dailyCommuteGramsPM25 * 1000) / 1000,
    dailyCookingKgCO2: COOKING_EMISSION_FACTORS[profile.cookingFuel].dailyKgCO2,
    potentialMonthlyKgCO2Reduction: Math.max(0, Math.round(totalCO2Red * 10) / 10),
    potentialMonthlyGramsPM25Reduction: Math.max(0, Math.round(totalPM25Red * 10) / 10),
  };
}
