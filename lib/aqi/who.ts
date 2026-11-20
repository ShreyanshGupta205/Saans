/**
 * @file who.ts
 * @description Comparison against World Health Organization (WHO) 2021 Global Air Quality Guidelines.
 *
 * Source:
 * WHO Global Air Quality Guidelines: Particulate matter (PM2.5 and PM10), ozone,
 * nitrogen dioxide, sulfur dioxide and carbon monoxide (2021).
 *
 * 24-hour mean guideline values:
 * - PM2.5: 15 µg/m³
 * - PM10: 45 µg/m³
 * - NO2: 25 µg/m³
 * - O3: 100 µg/m³ (8-hour daily maximum)
 */

import { WHO_2021_GUIDELINES } from '../../data/impact-factors';
import { PollutantKey } from './types';

/**
 * Computes how many times a pollutant concentration exceeds the WHO 2021 24h guideline.
 *
 * @param pollutant Pollutant key (e.g. 'pm25')
 * @param concentration Monitored concentration
 * @returns Multiple rounded to 1 decimal place (e.g., 18.2x WHO limit), or undefined if not covered
 */
export function calculateWhoMultiple(
  pollutant: PollutantKey,
  concentration: number
): number | undefined {
  if (concentration <= 0 || isNaN(concentration)) {
    return 0;
  }

  switch (pollutant) {
    case 'pm25':
      return Math.round((concentration / WHO_2021_GUIDELINES.pm25_24h) * 10) / 10;
    case 'pm10':
      return Math.round((concentration / WHO_2021_GUIDELINES.pm10_24h) * 10) / 10;
    case 'no2':
      return Math.round((concentration / WHO_2021_GUIDELINES.no2_24h) * 10) / 10;
    case 'o3':
      return Math.round((concentration / WHO_2021_GUIDELINES.o3_8h) * 10) / 10;
    default:
      return undefined;
  }
}

/**
 * Formats the WHO multiple string for accessible display in English and Hindi.
 *
 * @param multiple Multiplier (e.g., 14.5)
 * @param pollutantName Pollutant name (e.g., "PM2.5")
 * @param lang 'en' | 'hi'
 * @returns Human-readable label
 */
export function formatWhoGuidelineStatement(
  multiple: number,
  pollutantName: string,
  lang: 'en' | 'hi' = 'en'
): string {
  if (multiple <= 1) {
    return lang === 'hi'
      ? `${pollutantName} विश्व स्वास्थ्य संगठन (WHO) की सीमा के भीतर है`
      : `${pollutantName} is within WHO 24h safe guideline`;
  }

  const times = `${multiple.toFixed(1)}x`;
  return lang === 'hi'
    ? `WHO 24h सुरक्षित सीमा से ${times} गुना अधिक`
    : `${times} WHO 24h guideline limit`;
}
