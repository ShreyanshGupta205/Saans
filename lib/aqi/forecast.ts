/**
 * @file forecast.ts
 * @description Analyzes next-24h hourly forecast to compute the safest window for venturing out or airing the house.
 *
 * Meteorological Context:
 * In North Indian winter (Delhi-NCR), night and early morning inversion layers trap emissions at ground level.
 * Solar radiation between 12:00 PM and 3:30 PM warms the earth's surface, breaking the boundary inversion
 * and causing vertical mixing, which temporarily lowers ground-level PM2.5.
 */

import { HourlyForecastItem, OutdoorWindowRecommendation } from './types';

function formatHour(h: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:00 ${period}`;
}

interface WindowAdvisory {
  recommendationEn: string;
  recommendationHi: string;
  ventilationDurationMinutes: number;
}

function buildWindowAdvisory(
  avgPm25: number,
  startTimeLabel: string,
  endTimeLabel: string
): WindowAdvisory {
  if (avgPm25 >= 250) {
    return {
      ventilationDurationMinutes: 5,
      recommendationEn: `CRITICAL SMOG: Even the lowest window (${startTimeLabel} - ${endTimeLabel}) has dangerous PM2.5 (${avgPm25} µg/m³). Avoid outdoor exposure entirely. Keep doors and windows tightly shut. Only ventilate for 5 minutes if carbon dioxide is high.`,
      recommendationHi: `गंभीर स्मॉग: सबसे कम प्रदूषण वाला समय (${startTimeLabel} - ${endTimeLabel}) भी खतरनाक स्तर (${avgPm25} µg/m³) पर है। बाहर जाने से बचें। खिड़कियां बंद रखें; जरूरत हो तो केवल 5 मिनट ही खोलें।`,
    };
  }
  if (avgPm25 > 120) {
    return {
      ventilationDurationMinutes: 15,
      recommendationEn: `Best available window is ${startTimeLabel} - ${endTimeLabel} (${avgPm25} µg/m³). Shift any necessary errands to this window. Limit airing the house to 10-15 minutes and run purifiers afterwards.`,
      recommendationHi: `सबसे उपयुक्त समय ${startTimeLabel} - ${endTimeLabel} (${avgPm25} µg/m³) है। जरूरी काम इसी समय निपटाएं। घर की हवा बदलने के लिए खिड़कियां केवल 10-15 मिनट ही खोलें।`,
    };
  }
  return {
    ventilationDurationMinutes: 30,
    recommendationEn: `Safe window: ${startTimeLabel} - ${endTimeLabel} (${avgPm25} µg/m³). Good for outdoor walks and brief home ventilation.`,
    recommendationHi: `सुरक्षित समय: ${startTimeLabel} - ${endTimeLabel} (${avgPm25} µg/m³)। टहलने और घर की खिड़कियां खोलने के लिए उपयुक्त।`,
  };
}

/**
 * Scans 24-hour forecast data to locate the optimal continuous 2-hour window.
 */
export function computeBestOutdoorWindow(
  forecast: readonly HourlyForecastItem[]
): OutdoorWindowRecommendation {
  if (forecast.length === 0) {
    return {
      startHour: 13,
      endHour: 15,
      startTimeLabel: '1:00 PM',
      endTimeLabel: '3:00 PM',
      avgPm25: 150,
      minPm25: 120,
      isSafeWindow: false,
      recommendationEn: 'Data unavailable. Keep windows closed during morning/night inversion.',
      recommendationHi: 'डेटा उपलब्ध नहीं है। सुबह और रात के समय खिड़कियां बंद रखें।',
      ventilationDurationMinutes: 10,
    };
  }

  let minAvg = Infinity;
  let bestIdx = 0;
  for (let i = 0; i < forecast.length - 1; i++) {
    const it1 = forecast[i];
    const it2 = forecast[i + 1];
    if (it1 && it2) {
      const avg = (it1.pm25 + it2.pm25) / 2;
      if (avg < minAvg) {
        minAvg = avg;
        bestIdx = i;
      }
    }
  }

  const sItem = forecast[bestIdx] ?? forecast[0];
  const eItem = forecast[bestIdx + 1] ?? forecast[forecast.length - 1];
  const startHour = sItem ? sItem.hour : 13;
  const endHour = eItem ? (eItem.hour + 1) % 24 : 15;
  const minPm25 = Math.min(sItem?.pm25 ?? 150, eItem?.pm25 ?? 150);
  const avgPm25 = Math.round(minAvg === Infinity ? 150 : minAvg);

  const startTimeLabel = formatHour(startHour);
  const endTimeLabel = formatHour(endHour);
  const advisory = buildWindowAdvisory(avgPm25, startTimeLabel, endTimeLabel);

  return {
    startHour,
    endHour,
    startTimeLabel,
    endTimeLabel,
    avgPm25,
    minPm25,
    isSafeWindow: avgPm25 <= 120,
    ...advisory,
  };
}
