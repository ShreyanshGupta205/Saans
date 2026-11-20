'use client';

import React from 'react';
import {
  AlertTriangle,
  Smile,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  Flame,
  Sun,
  Wind,
} from 'lucide-react';
import { ComputedAQIResult, HourlyForecastItem, OutdoorWindowRecommendation } from '@/lib/aqi/types';
import { AQI_CATEGORY_METADATA } from '@/lib/aqi/cpcb';
import { ForecastChart } from './ForecastChart';

interface TodayDashboardProps {
  readonly aqiData: ComputedAQIResult;
  readonly hourlyForecast: readonly HourlyForecastItem[];
  readonly outdoorWindow: OutdoorWindowRecommendation;
  readonly locationName: string;
  readonly isHindi?: boolean;
}

export function TodayDashboard({
  aqiData,
  hourlyForecast,
  outdoorWindow,
  locationName,
  isHindi = false,
}: TodayDashboardProps) {
  const meta = AQI_CATEGORY_METADATA[aqiData.category];

  // Render appropriate category icon
  const renderCategoryIcon = () => {
    switch (aqiData.category) {
      case 'Good':
        return <Smile className="w-8 h-8 text-emerald-400" aria-hidden="true" />;
      case 'Satisfactory':
        return <CheckCircle className="w-8 h-8 text-lime-400" aria-hidden="true" />;
      case 'Moderate':
        return <AlertCircle className="w-8 h-8 text-yellow-400" aria-hidden="true" />;
      case 'Poor':
        return <AlertTriangle className="w-8 h-8 text-orange-400" aria-hidden="true" />;
      case 'Very Poor':
        return <ShieldAlert className="w-8 h-8 text-red-400" aria-hidden="true" />;
      case 'Severe':
      default:
        return <Flame className="w-8 h-8 text-rose-500 animate-pulse" aria-hidden="true" />;
    }
  };

  return (
    <section aria-labelledby="today-heading" className="space-y-6">
      <h1 id="today-heading" className="sr-only">
        {isHindi ? 'आज की वायु गुणवत्ता' : "Today's Air Quality"}
      </h1>

      {/* Emergency Alert Banner if AQI > 400 */}
      {aqiData.isEmergency && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-rose-950 border-2 border-rose-600 rounded-xl p-4 text-rose-100 flex items-start gap-3 shadow-lg"
        >
          <Flame className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="font-bold text-sm sm:text-base text-rose-200 uppercase tracking-wide">
              {isHindi ? 'सार्वजनिक स्वास्थ्य आपातकाल' : 'Public Health Emergency (Severe Smog)'}
            </p>
            <p className="text-xs sm:text-sm text-rose-100/90 mt-1">
              {isHindi ? aqiData.healthAdvisoryHi : aqiData.healthAdvisoryEn}
            </p>
          </div>
        </div>
      )}

      {/* Main AQI Hero Card */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          {/* Location & Category text */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {locationName}
              </span>
              <span className="text-xs text-zinc-400" suppressHydrationWarning>
                {new Date(aqiData.timestamp).toLocaleTimeString(isHindi ? 'hi-IN' : 'en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div
                className="p-3 rounded-2xl bg-zinc-800/80 border border-zinc-700/80 flex items-center justify-center shadow-inner"
                aria-hidden="true"
              >
                {renderCategoryIcon()}
              </div>
              <div>
                <span className="text-xs uppercase tracking-wider text-zinc-400 font-semibold block">
                  {isHindi ? 'भारतीय वायु गुणवत्ता (CPCB)' : 'Indian National AQI'}
                </span>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-zinc-100 font-mono tracking-tight">
                    {aqiData.aqi}
                  </span>
                  {/* Category Badge with Color + Text (Never color alone) */}
                  <span
                    className="text-sm sm:text-base font-bold px-3 py-1 rounded-lg uppercase tracking-wide shadow-sm"
                    style={{
                      backgroundColor: `${meta.color}25`,
                      color: meta.color,
                      border: `1px solid ${meta.color}60`,
                    }}
                  >
                    {isHindi ? aqiData.categoryHi : aqiData.category}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed pt-1">
              {isHindi ? aqiData.healthAdvisoryHi : aqiData.healthAdvisoryEn}
            </p>
          </div>

          {/* Dominant Pollutant & WHO Multiples */}
          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-xl w-full md:w-auto md:min-w-[240px]">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              {isHindi ? 'मुख्य प्रदूषक' : 'Dominant Pollutant'}
            </span>
            <p className="text-lg font-bold text-zinc-100 uppercase tracking-tight flex items-center gap-2">
              <Wind className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>{aqiData.dominantPollutant.toUpperCase()}</span>
            </p>

            {aqiData.whoMultiples.pm25 !== undefined && (
              <div className="mt-3 pt-3 border-t border-zinc-800 text-xs">
                <span className="text-zinc-400 block text-[11px]">
                  {isHindi ? 'WHO 24 घंटे की सुरक्षित सीमा:' : 'WHO 24h Safe Limit Comparison:'}
                </span>
                <span className="font-bold text-rose-400 text-sm">
                  {aqiData.whoMultiples.pm25}x {isHindi ? 'गुना अधिक' : 'times WHO guideline'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 4-Pollutant Breakdown Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-zinc-800/80">
          {/* PM2.5 */}
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <span className="text-[11px] text-zinc-300 block font-medium">PM2.5 (Fine)</span>
            <span className="text-lg font-bold text-zinc-100 font-mono">
              {aqiData.pollutantBreakdown.pm25?.concentration ?? '--'}{' '}
              <span className="text-[11px] font-normal text-zinc-400">µg/m³</span>
            </span>
          </div>

          {/* PM10 */}
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <span className="text-[11px] text-zinc-300 block font-medium">PM10 (Dust)</span>
            <span className="text-lg font-bold text-zinc-100 font-mono">
              {aqiData.pollutantBreakdown.pm10?.concentration ?? '--'}{' '}
              <span className="text-[11px] font-normal text-zinc-400">µg/m³</span>
            </span>
          </div>

          {/* NO2 */}
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <span className="text-[11px] text-zinc-300 block font-medium">NO2 (Vehicular)</span>
            <span className="text-lg font-bold text-zinc-100 font-mono">
              {aqiData.pollutantBreakdown.no2?.concentration ?? '--'}{' '}
              <span className="text-[11px] font-normal text-zinc-400">µg/m³</span>
            </span>
          </div>

          {/* O3 */}
          <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
            <span className="text-[11px] text-zinc-300 block font-medium">O3 (Ozone)</span>
            <span className="text-lg font-bold text-zinc-100 font-mono">
              {aqiData.pollutantBreakdown.o3?.concentration ?? '--'}{' '}
              <span className="text-[11px] font-normal text-zinc-400">µg/m³</span>
            </span>
          </div>
        </div>

        {/* Plain Language Jargon Guide (WCAG 2.2 Plain Language Requirement) */}
        <div className="mt-4 pt-4 border-t border-zinc-800/80 text-xs text-zinc-400 grid sm:grid-cols-2 gap-3 leading-relaxed">
          <p>
            <strong className="text-zinc-200">AQI (Air Quality Index):</strong>{' '}
            {isHindi
              ? 'हवा की गुणवत्ता का 0 से 500 का पैमाना। संख्या जितनी अधिक होगी, स्वास्थ्य जोखिम उतना ही गंभीर होगा।'
              : 'A 0–500 score showing air cleanliness. Higher numbers indicate greater health danger.'}
          </p>
          <p>
            <strong className="text-zinc-200">PM2.5 (Fine Soot):</strong>{' '}
            {isHindi
              ? 'बाल से 30 गुना बारीक जहरीले धूल कण जो सांस के जरिए सीधे फेफड़ों और खून में पहुंच जाते हैं।'
              : 'Microscopic toxic particles 30x thinner than hair that penetrate deep into lungs and blood.'}
          </p>
        </div>
      </div>

      {/* Best Outdoor Window Recommendation Card */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/90 border border-zinc-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400 shrink-0">
              <Sun className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 block">
                {isHindi ? 'बाहर निकलने / खिड़की खोलने का सबसे सुरक्षित समय' : 'Best Window to Step Out / Air the House'}
              </span>
              <p className="text-base sm:text-lg font-bold text-zinc-100 mt-0.5">
                {outdoorWindow.startTimeLabel} – {outdoorWindow.endTimeLabel}
              </p>
              <p className="text-xs sm:text-sm text-zinc-300 mt-1 max-w-2xl leading-relaxed">
                {isHindi ? outdoorWindow.recommendationHi : outdoorWindow.recommendationEn}
              </p>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-center shrink-0 w-full sm:w-auto">
            <span className="text-[11px] text-zinc-400 block font-medium">
              {isHindi ? 'अनुशंसित सीमा' : 'Ventilation Limit'}
            </span>
            <span className="text-base font-bold text-emerald-400 font-mono">
              {outdoorWindow.ventilationDurationMinutes} {isHindi ? 'मिनट' : 'mins'}
            </span>
          </div>
        </div>
      </div>

      {/* 24-Hour Forecast Chart */}
      <ForecastChart forecast={hourlyForecast} isHindi={isHindi} />
    </section>
  );
}
