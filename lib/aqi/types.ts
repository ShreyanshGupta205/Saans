/**
 * @file types.ts
 * @description Type definitions for the CPCB Indian National Air Quality Index (NAQI) engine.
 */

export type AQICategory =
  | 'Good'
  | 'Satisfactory'
  | 'Moderate'
  | 'Poor'
  | 'Very Poor'
  | 'Severe';

export interface AQICategoryInfo {
  readonly category: AQICategory;
  readonly categoryHi: string;
  readonly minAQI: number;
  readonly maxAQI: number;
  readonly color: string; // Tailwind hex or class
  readonly healthAdvisoryEn: string;
  readonly healthAdvisoryHi: string;
  readonly iconName: string;
  readonly severityLevel: 1 | 2 | 3 | 4 | 5 | 6;
}

export type PollutantKey = 'pm25' | 'pm10' | 'no2' | 'o3' | 'so2' | 'co' | 'nh3';

export interface BreakpointRange {
  readonly bLo: number;
  readonly bHi: number;
  readonly iLo: number;
  readonly iHi: number;
}

export interface PollutantReading {
  readonly concentration: number; // in µg/m³ (or mg/m³ for CO)
  readonly subIndex: number;
  readonly category: AQICategory;
  readonly whoMultiple?: number;
}

export interface ComputedAQIResult {
  readonly aqi: number;
  readonly dominantPollutant: PollutantKey;
  readonly category: AQICategory;
  readonly categoryHi: string;
  readonly healthAdvisoryEn: string;
  readonly healthAdvisoryHi: string;
  readonly pollutantBreakdown: Partial<Record<PollutantKey, PollutantReading>>;
  readonly whoMultiples: {
    readonly pm25?: number;
    readonly pm10?: number;
    readonly no2?: number;
    readonly o3?: number;
  };
  readonly timestamp: string;
  readonly isEmergency: boolean; // AQI > 400
}

export interface HourlyForecastItem {
  readonly time: string; // ISO string
  readonly hour: number; // 0-23
  readonly pm25: number;
  readonly pm10: number;
  readonly no2?: number;
  readonly o3?: number;
  readonly aqi: number;
  readonly category: AQICategory;
}

export interface OutdoorWindowRecommendation {
  readonly startHour: number;
  readonly endHour: number;
  readonly startTimeLabel: string;
  readonly endTimeLabel: string;
  readonly avgPm25: number;
  readonly minPm25: number;
  readonly isSafeWindow: boolean; // false if even the best window is Poor / Severe
  readonly recommendationEn: string;
  readonly recommendationHi: string;
  readonly ventilationDurationMinutes: number;
}
