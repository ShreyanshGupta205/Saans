/**
 * @file cpcb.ts
 * @description Central Pollution Control Board (CPCB) NAQI mathematical implementation.
 *
 * Source:
 * Central Pollution Control Board, Ministry of Environment, Forests & Climate Change,
 * Government of India: "National Air Quality Index" Report (October 2014).
 * Formula:
 *   Ip = [ (I_hi - I_lo) / (B_hi - B_lo) ] * (Cp - B_lo) + I_lo
 *
 * Where:
 *   Ip   = Sub-index for pollutant p
 *   Cp   = Monitored concentration of pollutant p
 *   B_hi = Breakpoint concentration greater than or equal to Cp
 *   B_lo = Breakpoint concentration less than or equal to Cp
 *   I_hi = AQI value corresponding to B_hi
 *   I_lo = AQI value corresponding to B_lo
 */

import { AQICategory, AQICategoryInfo, BreakpointRange, ComputedAQIResult, PollutantKey, PollutantReading } from './types';
import { calculateWhoMultiple } from './who';

export const AQI_CATEGORY_METADATA: Record<AQICategory, AQICategoryInfo> = {
  Good: {
    category: 'Good',
    categoryHi: 'अच्छा',
    minAQI: 0,
    maxAQI: 50,
    color: '#4ade80', // green-400 (Contrast > 8:1)
    healthAdvisoryEn: 'Minimal health impact. Clean air for outdoor activities.',
    healthAdvisoryHi: 'हवा साफ है। स्वास्थ्य पर कोई बुरा प्रभाव नहीं।',
    iconName: 'Smile',
    severityLevel: 1,
  },
  Satisfactory: {
    category: 'Satisfactory',
    categoryHi: 'संतोषजनक',
    minAQI: 51,
    maxAQI: 100,
    color: '#a3e635', // lime-400 (Contrast > 10:1)
    healthAdvisoryEn: 'Minor breathing discomfort to sensitive people.',
    healthAdvisoryHi: 'संवेदनशील लोगों को हल्की सांस की तकलीफ हो सकती है।',
    iconName: 'CheckCircle',
    severityLevel: 2,
  },
  Moderate: {
    category: 'Moderate',
    categoryHi: 'मध्यम',
    minAQI: 101,
    maxAQI: 200,
    color: '#facc15', // yellow-400 (Contrast > 11:1)
    healthAdvisoryEn: 'Breathing discomfort to people with lungs, asthma and heart diseases.',
    healthAdvisoryHi: 'अस्थमा और फेफड़ों के मरीजों को सांस लेने में परेशानी हो सकती है।',
    iconName: 'AlertCircle',
    severityLevel: 3,
  },
  Poor: {
    category: 'Poor',
    categoryHi: 'खराब',
    minAQI: 201,
    maxAQI: 300,
    color: '#fb923c', // orange-400 (Contrast > 7:1)
    healthAdvisoryEn: 'Breathing discomfort to most people on prolonged exposure.',
    healthAdvisoryHi: 'लंबे समय तक बाहर रहने पर अधिकांश लोगों को परेशानी हो सकती है।',
    iconName: 'AlertTriangle',
    severityLevel: 4,
  },
  'Very Poor': {
    category: 'Very Poor',
    categoryHi: 'बहुत खराब',
    minAQI: 301,
    maxAQI: 400,
    color: '#f87171', // red-400 (Contrast > 6.5:1)
    healthAdvisoryEn: 'Respiratory illness on prolonged exposure. Pronounced effect on asthma/heart patients.',
    healthAdvisoryHi: 'गंभीर सांस की बीमारियां हो सकती हैं। बच्चे और बुजुर्ग बाहर न निकलें।',
    iconName: 'ShieldAlert',
    severityLevel: 5,
  },
  Severe: {
    category: 'Severe',
    categoryHi: 'गंभीर',
    minAQI: 401,
    maxAQI: 500,
    color: '#fb7185', // rose-400 (Contrast > 7:1)
    healthAdvisoryEn: 'Affects healthy people and seriously impacts those with existing diseases. Public health emergency.',
    healthAdvisoryHi: 'स्वस्थ लोगों को भी नुकसान। स्वास्थ्य आपातकाल जैसी स्थिति, घर के अंदर रहें।',
    iconName: 'Flame',
    severityLevel: 6,
  },
};

/**
 * CPCB Official Breakpoint Tables (2014 Report, Table 1: Breakpoints for AQI Scale 0-500)
 */
export const CPCB_BREAKPOINTS: Record<PollutantKey, readonly BreakpointRange[]> = {
  // PM2.5 in µg/m³ (24-hr average)
  pm25: [
    { bLo: 0, bHi: 30, iLo: 0, iHi: 50 },
    { bLo: 31, bHi: 60, iLo: 51, iHi: 100 },
    { bLo: 61, bHi: 90, iLo: 101, iHi: 200 },
    { bLo: 91, bHi: 120, iLo: 201, iHi: 300 },
    { bLo: 121, bHi: 250, iLo: 301, iHi: 400 },
    { bLo: 251, bHi: 350, iLo: 401, iHi: 500 },
  ],
  // PM10 in µg/m³ (24-hr average)
  pm10: [
    { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { bLo: 51, bHi: 100, iLo: 51, iHi: 100 },
    { bLo: 101, bHi: 250, iLo: 101, iHi: 200 },
    { bLo: 251, bHi: 350, iLo: 201, iHi: 300 },
    { bLo: 351, bHi: 430, iLo: 301, iHi: 400 },
    { bLo: 431, bHi: 500, iLo: 401, iHi: 500 },
  ],
  // NO2 in µg/m³ (24-hr average)
  no2: [
    { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { bLo: 41, bHi: 80, iLo: 51, iHi: 100 },
    { bLo: 81, bHi: 180, iLo: 101, iHi: 200 },
    { bLo: 181, bHi: 280, iLo: 201, iHi: 300 },
    { bLo: 281, bHi: 400, iLo: 301, iHi: 400 },
    { bLo: 401, bHi: 500, iLo: 401, iHi: 500 },
  ],
  // O3 in µg/m³ (8-hr average)
  o3: [
    { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { bLo: 51, bHi: 100, iLo: 51, iHi: 100 },
    { bLo: 101, bHi: 168, iLo: 101, iHi: 200 },
    { bLo: 169, bHi: 208, iLo: 201, iHi: 300 },
    { bLo: 209, bHi: 748, iLo: 301, iHi: 400 },
    { bLo: 749, bHi: 1000, iLo: 401, iHi: 500 },
  ],
  // SO2 in µg/m³ (24-hr average)
  so2: [
    { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { bLo: 41, bHi: 80, iLo: 51, iHi: 100 },
    { bLo: 81, bHi: 380, iLo: 101, iHi: 200 },
    { bLo: 381, bHi: 800, iLo: 201, iHi: 300 },
    { bLo: 801, bHi: 1600, iLo: 301, iHi: 400 },
    { bLo: 1601, bHi: 2000, iLo: 401, iHi: 500 },
  ],
  // CO in mg/m³ (8-hr average)
  co: [
    { bLo: 0, bHi: 1.0, iLo: 0, iHi: 50 },
    { bLo: 1.1, bHi: 2.0, iLo: 51, iHi: 100 },
    { bLo: 2.1, bHi: 10.0, iLo: 101, iHi: 200 },
    { bLo: 10.1, bHi: 17.0, iLo: 201, iHi: 300 },
    { bLo: 17.1, bHi: 34.0, iLo: 301, iHi: 400 },
    { bLo: 34.1, bHi: 50.0, iLo: 401, iHi: 500 },
  ],
  // NH3 in µg/m³ (24-hr average)
  nh3: [
    { bLo: 0, bHi: 200, iLo: 0, iHi: 50 },
    { bLo: 201, bHi: 400, iLo: 51, iHi: 100 },
    { bLo: 401, bHi: 800, iLo: 101, iHi: 200 },
    { bLo: 801, bHi: 1200, iLo: 201, iHi: 300 },
    { bLo: 1201, bHi: 1800, iLo: 301, iHi: 400 },
    { bLo: 1801, bHi: 2400, iLo: 401, iHi: 500 },
  ],
};

/**
 * Calculates the CPCB sub-index for a single pollutant given its concentration.
 * Handles edge cases, boundary transitions, and severe smog values.
 *
 * @param pollutant Pollutant key (e.g., 'pm25')
 * @param concentration Pollutant concentration
 * @returns Sub-index integer
 */
export function calculateSubIndex(pollutant: PollutantKey, concentration: number): number {
  if (concentration < 0 || isNaN(concentration)) {
    return 0;
  }

  const ranges = CPCB_BREAKPOINTS[pollutant];
  if (!ranges || ranges.length === 0) {
    return 0;
  }

  // Check each breakpoint interval
  for (const range of ranges) {
    if (concentration >= range.bLo && concentration <= range.bHi) {
      const numerator = range.iHi - range.iLo;
      const denominator = range.bHi - range.bLo;
      const deltaC = concentration - range.bLo;
      const subIndex = (numerator / denominator) * deltaC + range.iLo;
      return Math.round(subIndex);
    }
  }

  // Handle concentration beyond the highest breakpoint (e.g. PM2.5 > 350 during Delhi smog peak)
  const lastRange = ranges[ranges.length - 1];
  if (lastRange && concentration > lastRange.bHi) {
    // Extrapolate linearly using the slope of the highest bracket, minimum 500
    const numerator = lastRange.iHi - lastRange.iLo;
    const denominator = lastRange.bHi - lastRange.bLo;
    const deltaC = concentration - lastRange.bLo;
    const extrapolated = (numerator / denominator) * deltaC + lastRange.iLo;
    return Math.round(extrapolated);
  }

  return 0;
}

/**
 * Maps an AQI numeric index to the CPCB category.
 *
 * @param aqi AQI index value
 * @returns AQICategory ('Good' | 'Satisfactory' | 'Moderate' | 'Poor' | 'Very Poor' | 'Severe')
 */
export function getAQICategory(aqi: number): AQICategory {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Satisfactory';
  if (aqi <= 200) return 'Moderate';
  if (aqi <= 300) return 'Poor';
  if (aqi <= 400) return 'Very Poor';
  return 'Severe';
}

/**
 * Builds an empty/fallback AQI result when no pollutant readings are provided.
 */
function buildEmptyAQIResult(): ComputedAQIResult {
  const cat = getAQICategory(0);
  const meta = AQI_CATEGORY_METADATA[cat];
  return {
    aqi: 0,
    dominantPollutant: 'pm25',
    category: cat,
    categoryHi: meta.categoryHi,
    healthAdvisoryEn: meta.healthAdvisoryEn,
    healthAdvisoryHi: meta.healthAdvisoryHi,
    pollutantBreakdown: {},
    whoMultiples: {},
    timestamp: new Date().toISOString(),
    isEmergency: false,
  };
}

function computeBreakdown(concentrations: Partial<Record<PollutantKey, number>>) {
  const breakdown: Partial<Record<PollutantKey, PollutantReading>> = {};
  let maxSubIndex = 0;
  let dominant: PollutantKey = 'pm25';

  const keys = Object.keys(concentrations) as PollutantKey[];
  for (const key of keys) {
    const conc = concentrations[key];
    if (conc !== undefined && conc >= 0) {
      const subIndex = calculateSubIndex(key, conc);
      const whoMult = calculateWhoMultiple(key, conc);
      breakdown[key] = {
        concentration: conc,
        subIndex,
        category: getAQICategory(subIndex),
        ...(whoMult !== undefined ? { whoMultiple: whoMult } : {}),
      };
      if (subIndex > maxSubIndex) {
        maxSubIndex = subIndex;
        dominant = key;
      }
    }
  }
  return { breakdown, maxSubIndex, dominant };
}

/**
 * Computes the overall Indian NAQI from a dictionary of pollutant concentrations.
 * Per CPCB methodology:
 *   Overall AQI = Max(Sub-index_i)
 *   Requires at least 3 pollutants, including PM10 or PM2.5.
 *
 * @param concentrations Record of pollutant concentrations
 * @returns ComputedAQIResult
 */
export function computeIndianAQI(
  concentrations: Partial<Record<PollutantKey, number>>
): ComputedAQIResult {
  const { breakdown, maxSubIndex, dominant } = computeBreakdown(concentrations);

  if (maxSubIndex === 0 && !breakdown.pm25) {
    return buildEmptyAQIResult();
  }

  const category = getAQICategory(maxSubIndex);
  const metadata = AQI_CATEGORY_METADATA[category];
  return {
    aqi: maxSubIndex,
    dominantPollutant: dominant,
    category,
    categoryHi: metadata.categoryHi,
    healthAdvisoryEn: metadata.healthAdvisoryEn,
    healthAdvisoryHi: metadata.healthAdvisoryHi,
    pollutantBreakdown: breakdown,
    whoMultiples: {
      pm25: breakdown.pm25?.whoMultiple,
      pm10: breakdown.pm10?.whoMultiple,
      no2: breakdown.no2?.whoMultiple,
      o3: breakdown.o3?.whoMultiple,
    },
    timestamp: new Date().toISOString(),
    isEmergency: maxSubIndex > 400,
  };
}
