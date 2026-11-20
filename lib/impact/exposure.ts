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
  // Ensure non-negative ambient concentration
  const cAmbient = Math.max(0, ambientPm25);
  const infil = getInfiltrationParams(profile.homeType);

  // Commute outdoor time (hours/day): distance / avg speed (20 km/h) * 2 ways
  // On WFH days, commute outdoor time is 0
  const commuteDaysPerWeek = Math.max(0, 7 - profile.workFromHomeDays);
  const avgDailyCommuteKm = (profile.commuteDistanceKm * 2 * commuteDaysPerWeek) / 7;
  const transitHours = Math.min(3, Math.max(0.2, avgDailyCommuteKm / 20));

  const sleepHours = 8;
  const indoorAwakeHours = Math.max(0, 24 - sleepHours - transitHours);

  // Breathing rates (m³/h)
  const rateSleep = 0.45;
  const rateIndoor = 0.70;
  const rateTransit = 1.60;

  // --- BASELINE EXPOSURE CALCULATION ---
  // Infiltration factor without optimization
  const currentInfil = profile.hasAirPurifier ? infil.withPurifierInfiltration : infil.baselineInfiltration;
  // Baseline assumption: No N95 mask used during transit (regular or cloth mask = 20% filtration)
  const baselineTransitMaskEff = 0.20;

  const baselineSleepIntake = cAmbient * currentInfil * sleepHours * rateSleep;
  const baselineIndoorIntake = cAmbient * currentInfil * indoorAwakeHours * rateIndoor;
  const baselineTransitIntake = cAmbient * (1 - baselineTransitMaskEff) * transitHours * rateTransit;

  const baselineDailyInhaledUg = baselineSleepIntake + baselineIndoorIntake + baselineTransitIntake;

  // --- OPTIMIZED EXPOSURE CALCULATION (Following Saans Plan) ---
  // 1. Bedroom & living room purified with True HEPA (infil = withPurifierInfiltration)
  // 2. Sealed doors/windows during inversion
  // 3. Certified N95 mask worn during all outdoor commute (95% efficiency)
  // 4. Shifted errands to afternoon clean window
  const optimizedInfil = infil.withPurifierInfiltration;
  const optimizedMaskEff = 0.95;

  const optSleepIntake = cAmbient * optimizedInfil * sleepHours * rateSleep;
  const optIndoorIntake = cAmbient * optimizedInfil * indoorAwakeHours * rateIndoor;
  const optTransitIntake = cAmbient * (1 - optimizedMaskEff) * transitHours * rateTransit;

  const optimizedDailyInhaledUg = optSleepIntake + optIndoorIntake + optTransitIntake;

  // Exposure reduction percentage
  const reductionPct =
    baselineDailyInhaledUg > 0
      ? Math.round(((baselineDailyInhaledUg - optimizedDailyInhaledUg) / baselineDailyInhaledUg) * 100)
      : 0;

  // Number of hours exposed to elevated (>100 µg/m³) indoor or outdoor air
  const highExposureHours = profile.hasAirPurifier ? transitHours : 24;

  return {
    baselineInhaledMicrogramsPerDay: Math.round(baselineDailyInhaledUg),
    optimizedInhaledMicrogramsPerDay: Math.round(optimizedDailyInhaledUg),
    exposureReductionPct: Math.min(95, Math.max(0, reductionPct)),
    highExposureHoursPerDay: Math.round(highExposureHours * 10) / 10,
  };
}
