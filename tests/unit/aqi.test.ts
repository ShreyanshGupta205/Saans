/**
 * @file aqi.test.ts
 * @description Comprehensive unit tests for CPCB NAQI breakpoints, WHO multiples, and forecast windows.
 */

import { describe, expect, it } from 'vitest';
import { calculateSubIndex, computeIndianAQI, getAQICategory } from '../../lib/aqi/cpcb';
import { computeBestOutdoorWindow } from '../../lib/aqi/forecast';
import { calculateWhoMultiple, formatWhoGuidelineStatement } from '../../lib/aqi/who';
import { HourlyForecastItem } from '../../lib/aqi/types';

describe('CPCB Sub-Index Calculation', () => {
  it('handles negative or invalid concentrations gracefully', () => {
    expect(calculateSubIndex('pm25', -10)).toBe(0);
    expect(calculateSubIndex('pm25', NaN)).toBe(0);
  });

  describe('PM2.5 Breakpoint Boundaries (CPCB 2014)', () => {
    it('Good boundary (0 to 30 µg/m³ -> 0 to 50 AQI)', () => {
      expect(calculateSubIndex('pm25', 0)).toBe(0);
      expect(calculateSubIndex('pm25', 15)).toBe(25);
      expect(calculateSubIndex('pm25', 30)).toBe(50);
    });

    it('Satisfactory boundary (31 to 60 µg/m³ -> 51 to 100 AQI)', () => {
      expect(calculateSubIndex('pm25', 31)).toBe(51);
      expect(calculateSubIndex('pm25', 45)).toBe(75);
      expect(calculateSubIndex('pm25', 60)).toBe(100);
    });

    it('Moderate boundary (61 to 90 µg/m³ -> 101 to 200 AQI)', () => {
      expect(calculateSubIndex('pm25', 61)).toBe(101);
      expect(calculateSubIndex('pm25', 75)).toBe(149);
      expect(calculateSubIndex('pm25', 90)).toBe(200);
    });

    it('Poor boundary (91 to 120 µg/m³ -> 201 to 300 AQI)', () => {
      expect(calculateSubIndex('pm25', 91)).toBe(201);
      expect(calculateSubIndex('pm25', 105)).toBe(249);
      expect(calculateSubIndex('pm25', 120)).toBe(300);
    });

    it('Very Poor boundary (121 to 250 µg/m³ -> 301 to 400 AQI)', () => {
      expect(calculateSubIndex('pm25', 121)).toBe(301);
      expect(calculateSubIndex('pm25', 185)).toBe(350);
      expect(calculateSubIndex('pm25', 250)).toBe(400);
    });

    it('Severe boundary (251 to 350 µg/m³ -> 401 to 500 AQI)', () => {
      expect(calculateSubIndex('pm25', 251)).toBe(401);
      expect(calculateSubIndex('pm25', 300)).toBe(450);
      expect(calculateSubIndex('pm25', 350)).toBe(500);
    });

    it('Extrapolates severe winter smog peaks (>350 µg/m³ in Delhi)', () => {
      const aqiAt450 = calculateSubIndex('pm25', 450);
      expect(aqiAt450).toBeGreaterThan(500);
    });
  });

  describe('PM10 Breakpoint Boundaries', () => {
    it('calculates PM10 correctly across all categories', () => {
      expect(calculateSubIndex('pm10', 50)).toBe(50); // Good
      expect(calculateSubIndex('pm10', 100)).toBe(100); // Satisfactory
      expect(calculateSubIndex('pm10', 250)).toBe(200); // Moderate
      expect(calculateSubIndex('pm10', 350)).toBe(300); // Poor
      expect(calculateSubIndex('pm10', 430)).toBe(400); // Very Poor
      expect(calculateSubIndex('pm10', 500)).toBe(500); // Severe
    });
  });

  describe('Other Pollutants Breakpoints (NO2, O3, CO, SO2, NH3)', () => {
    it('calculates NO2 correctly', () => {
      expect(calculateSubIndex('no2', 40)).toBe(50);
      expect(calculateSubIndex('no2', 80)).toBe(100);
      expect(calculateSubIndex('no2', 180)).toBe(200);
    });

    it('calculates O3 correctly', () => {
      expect(calculateSubIndex('o3', 50)).toBe(50);
      expect(calculateSubIndex('o3', 100)).toBe(100);
      expect(calculateSubIndex('o3', 168)).toBe(200);
    });

    it('calculates CO correctly', () => {
      expect(calculateSubIndex('co', 1.0)).toBe(50);
      expect(calculateSubIndex('co', 2.0)).toBe(100);
    });
  });
});

describe('AQI Category Mapping', () => {
  it('maps numbers to official CPCB category labels', () => {
    expect(getAQICategory(30)).toBe('Good');
    expect(getAQICategory(50)).toBe('Good');
    expect(getAQICategory(51)).toBe('Satisfactory');
    expect(getAQICategory(100)).toBe('Satisfactory');
    expect(getAQICategory(101)).toBe('Moderate');
    expect(getAQICategory(200)).toBe('Moderate');
    expect(getAQICategory(201)).toBe('Poor');
    expect(getAQICategory(300)).toBe('Poor');
    expect(getAQICategory(301)).toBe('Very Poor');
    expect(getAQICategory(400)).toBe('Very Poor');
    expect(getAQICategory(401)).toBe('Severe');
    expect(getAQICategory(600)).toBe('Severe');
  });
});

describe('computeIndianAQI (Overall AQI Rule)', () => {
  it('selects the maximum sub-index as the dominant pollutant', () => {
    const result = computeIndianAQI({
      pm25: 150, // sub-index 323 (Very Poor)
      pm10: 80,  // sub-index 80 (Satisfactory)
      no2: 45,   // sub-index 57 (Satisfactory)
    });

    expect(result.dominantPollutant).toBe('pm25');
    expect(result.aqi).toBe(323);
    expect(result.category).toBe('Very Poor');
    expect(result.isEmergency).toBe(false);
  });

  it('detects emergency status when AQI > 400', () => {
    const result = computeIndianAQI({
      pm25: 320, // Severe (>400)
    });

    expect(result.aqi).toBeGreaterThan(400);
    expect(result.category).toBe('Severe');
    expect(result.isEmergency).toBe(true);
  });
});

describe('WHO 2021 Guideline Multiples', () => {
  it('calculates multiples correctly (PM2.5 baseline = 15 µg/m³)', () => {
    expect(calculateWhoMultiple('pm25', 15)).toBe(1.0);
    expect(calculateWhoMultiple('pm25', 150)).toBe(10.0);
    expect(calculateWhoMultiple('pm25', 300)).toBe(20.0);
  });

  it('formats human-readable WHO statements in English and Hindi', () => {
    const statementEn = formatWhoGuidelineStatement(12.4, 'PM2.5', 'en');
    expect(statementEn).toBe('12.4x WHO 24h guideline limit');

    const statementHi = formatWhoGuidelineStatement(12.4, 'PM2.5', 'hi');
    expect(statementHi).toContain('12.4x गुना अधिक');

    const safeStatement = formatWhoGuidelineStatement(0.8, 'PM2.5', 'en');
    expect(safeStatement).toContain('within WHO 24h safe guideline');
  });
});

describe('computeBestOutdoorWindow', () => {
  const mockForecast: HourlyForecastItem[] = Array.from({ length: 24 }, (_, i) => ({
    time: `2026-11-20T${i.toString().padStart(2, '0')}:00:00Z`,
    hour: i,
    // Simulate Delhi winter: morning 400 µg/m³, drops to 80 µg/m³ at 13:00 - 14:00, then rises to 350 at night
    pm25: i >= 13 && i <= 14 ? 80 : 350,
    pm10: 200,
    aqi: i >= 13 && i <= 14 ? 150 : 420,
    category: i >= 13 && i <= 14 ? 'Moderate' : 'Severe',
  }));

  it('identifies the lowest PM2.5 2-hour window correctly', () => {
    const window = computeBestOutdoorWindow(mockForecast);
    expect(window.startHour).toBe(13);
    expect(window.startTimeLabel).toBe('1:00 PM');
    expect(window.isSafeWindow).toBe(true);
    expect(window.avgPm25).toBe(80);
  });

  it('warns when all windows are in the Severe range', () => {
    const severeForecast: HourlyForecastItem[] = Array.from({ length: 24 }, (_, i) => ({
      time: `2026-11-20T${i.toString().padStart(2, '0')}:00:00Z`,
      hour: i,
      pm25: 350, // All severe
      pm10: 500,
      aqi: 500,
      category: 'Severe',
    }));

    const window = computeBestOutdoorWindow(severeForecast);
    expect(window.isSafeWindow).toBe(false);
    expect(window.recommendationEn).toContain('CRITICAL SMOG');
    expect(window.ventilationDurationMinutes).toBe(5);
  });
});
