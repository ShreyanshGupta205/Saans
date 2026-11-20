/**
 * @file exposure.ts
 * @description Mathematical inhalation exposure model based on ambient PM2.5, infiltration factors,
 * activity breathing rates, and personal protective interventions.
 *
 * Exposure Inhalation Math:
 *   E_daily = sum_i ( C_ambient * F_infil_i * (1 - MaskEfficiency) * t_i * M_activity_i )
 *
 * Infiltration Factors (F_infil):
 * - Apartment without purifier: 0.70 (standard Indian brick construction, unsealed windows)
 * - Apartment with True HEPA purifier: 0.18 (82% average reduction in enclosed bedroom/living)
 * - Weatherstripped windows bonus: reduces baseline infiltration by 35% (from 0.70 -> 0.45)
 * - Semi-pucca / informal home: 0.85
 *
 * Minute Volume / Breathing Multipliers (M_activity):
 * - Sleep / Rest (8h): 0.45 m³/h
 * - Light indoor / Desk (12h): 0.70 m³/h
 * - Outdoor transit / Walking (2h): 1.60 m³/h
 * - Brisk exercise / Outdoor running: 3.20 m³/h (dangerously elevated during smog)
 *
 * Reference: ICMR Environmental Health Guidelines & US EPA Exposure Factors Handbook.
 */

import { HomeType, HouseholdExposureAssessment, HouseholdProfile } from './types';

export interface InfiltrationParameters {
  readonly baselineInfiltration: number;
  readonly withPurifierInfiltration: number;
}

export function getInfiltrationParams(homeType: HomeType): InfiltrationParameters {
  switch (homeType) {
    case 'apartment_highrise':
      // High-rise apartments experience stack effect and high wind infiltration
      return { baselineInfiltration: 0.65, withPurifierInfiltration: 0.18 };
    case 'apartment_lowrise':
      return { baselineInfiltration: 0.70, withPurifierInfiltration: 0.20 };
    case 'independent_house':
      // Ground floor / independent houses frequently have door draft infiltration
      return { baselineInfiltration: 0.75, withPurifierInfiltration: 0.22 };
    case 'semi_pucca':
      return { baselineInfiltration: 0.85, withPurifierInfiltration: 0.35 };
  }
}

function calcBaselineDailyUg(
  cAmbient: number,
  currentInfil: number,
  transitHours: number,
  indoorAwakeHours: number
): number {
  const sleepIntake = cAmbient * currentInfil * 8 * 0.45;
  const indoorIntake = cAmbient * currentInfil * indoorAwakeHours * 0.70;
  const transitIntake = cAmbient * (1 - 0.20) * transitHours * 1.60;
  return sleepIntake + indoorIntake + transitIntake;
}

function calcOptimizedDailyUg(
  cAmbient: number,
  optimizedInfil: number,
  transitHours: number,
  indoorAwakeHours: number
): number {
  const optSleepIntake = cAmbient * optimizedInfil * 8 * 0.45;
  const optIndoorIntake = cAmbient * optimizedInfil * indoorAwakeHours * 0.70;
  const optTransitIntake = cAmbient * (1 - 0.95) * transitHours * 1.60;
  return optSleepIntake + optIndoorIntake + optTransitIntake;
}

/**
 * Calculates daily inhaled particulate matter (micrograms of PM2.5 per person per day)
 * comparing baseline habits against Saans recommended habits (N95 mask, air purification, shifted hours).
 *
 * @param profile Household profile
 * @param ambientPm25 Current ambient PM2.5 in µg/m³
 * @returns HouseholdExposureAssessment
 */
export function calculateHouseholdExposure(
  profile: HouseholdProfile,
  ambientPm25: number
): HouseholdExposureAssessment {
  const cAmbient = Math.max(0, ambientPm25);
  const infil = getInfiltrationParams(profile.homeType);

  const commuteDaysPerWeek = Math.max(0, 7 - profile.workFromHomeDays);
  const avgDailyCommuteKm = (profile.commuteDistanceKm * 2 * commuteDaysPerWeek) / 7;
  const transitHours = Math.min(3, Math.max(0.2, avgDailyCommuteKm / 20));
  const indoorAwakeHours = Math.max(0, 24 - 8 - transitHours);

  const currentInfil = profile.hasAirPurifier ? infil.withPurifierInfiltration : infil.baselineInfiltration;
  const baselineDailyInhaledUg = calcBaselineDailyUg(cAmbient, currentInfil, transitHours, indoorAwakeHours);
  const optimizedDailyInhaledUg = calcOptimizedDailyUg(cAmbient, infil.withPurifierInfiltration, transitHours, indoorAwakeHours);

  const reductionPct =
    baselineDailyInhaledUg > 0
      ? Math.round(((baselineDailyInhaledUg - optimizedDailyInhaledUg) / baselineDailyInhaledUg) * 100)
      : 0;

  const highExposureHours = profile.hasAirPurifier ? transitHours : 24;

  return {
    baselineInhaledMicrogramsPerDay: Math.round(baselineDailyInhaledUg),
    optimizedInhaledMicrogramsPerDay: Math.round(optimizedDailyInhaledUg),
    exposureReductionPct: Math.min(95, Math.max(0, reductionPct)),
    highExposureHoursPerDay: Math.round(highExposureHours * 10) / 10,
  };
}
