/**
 * @file community.ts
 * @description Scales individual household actions to community / neighbourhood (RWA) level.
 * Calculates aggregate impact when N households adopt clean air practices.
 */

export interface CommunityActionAggregate {
  readonly householdsCount: number;
  readonly winterSeasonDays: number; // typically 90 days of peak smog (Nov - Jan)
  readonly kgPm25Prevented: number;
  readonly tonsCO2eReduced: number;
  readonly carTripsAvoided: number;
  readonly highExposureHoursAverted: number;
}

/**
 * Calculates aggregate community impact across N households over a 90-day winter smog season.
 *
 * Interventions modeled:
 * 1. Community carpooling / shifting 2 days a week to Metro: avoids tailpipe PM2.5 and CO2.
 * 2. Ban on open leaf/waste burning + replacing guard open coal/wood heaters with electric infrared.
 * 3. Coordinated indoor purification and window sealing during nighttime inversion.
 *
 * @param householdsCount Number of participating households (e.g., 50 to 1000)
 * @returns CommunityActionAggregate
 */
export function calculateCommunityImpact(householdsCount: number): CommunityActionAggregate {
  const n = Math.max(1, Math.min(10000, Math.round(householdsCount)));
  const smogDays = 90;

  // 1. Transit Shift: Assume 40% of households have a private car/2-wheeler.
  // Shifting 2 days/week to metro or carpooling over 90 days = ~25 round trips of ~25 km per participating house.
  const privateVehicles = n * 0.4;
  const carTripsAvoided = Math.round(privateVehicles * 25);
  // Average tailpipe PM2.5 per 25 km trip ~ 0.8g; CO2 ~ 3.5 kg
  const transitPm25Kg = (carTripsAvoided * 0.8) / 1000;
  const transitCO2eTons = (carTripsAvoided * 3.5) / 1000;

  // 2. Society waste / biomass / security heater intervention:
  // An average society employs guards who burn wood/coal for warmth in winter (~2 kg wood per night = 36 g PM2.5/night).
  // Switching to electric radiant heaters avoids ~3.2 kg of localized toxic PM2.5 per 50 households over winter.
  const biomassPm25Kg = (n / 50) * 3.2;
  const biomassCO2eTons = (n / 50) * 0.45;

  // 3. Exposure averted:
  // Each household with vulnerable members (avg 3.5 members/house) averts ~4 hours/day of hazardous exposure.
  const highExposureHours = Math.round(n * 3.5 * 4 * smogDays);

  const totalKgPm25 = Math.round((transitPm25Kg + biomassPm25Kg) * 10) / 10;
  const totalTonsCO2e = Math.round((transitCO2eTons + biomassCO2eTons) * 100) / 100;

  return {
    householdsCount: n,
    winterSeasonDays: smogDays,
    kgPm25Prevented: Math.max(0.1, totalKgPm25),
    tonsCO2eReduced: Math.max(0.1, totalTonsCO2e),
    carTripsAvoided,
    highExposureHoursAverted: highExposureHours,
  };
}
