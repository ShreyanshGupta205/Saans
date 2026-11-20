'use client';

import React, { useState } from 'react';
import { Table, BarChart2 } from 'lucide-react';
import { HourlyForecastItem } from '@/lib/aqi/types';
import { AQI_CATEGORY_METADATA } from '@/lib/aqi/cpcb';

interface ForecastChartProps {
  readonly forecast: readonly HourlyForecastItem[];
  readonly isHindi?: boolean;
}

interface ChartPoint {
  readonly x: number;
  readonly y: number;
  readonly item: HourlyForecastItem;
}

function ForecastChartSkeleton() {
  return (
    <section aria-labelledby="forecast-heading" className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-sm min-h-[260px] animate-pulse">
      <div className="h-6 w-48 bg-zinc-800 rounded mb-4" />
      <div className="h-44 bg-zinc-800/40 rounded-lg" />
    </section>
  );
}

function ForecastRow({ item, isHindi }: { readonly item: HourlyForecastItem; readonly isHindi: boolean }) {
  const meta = AQI_CATEGORY_METADATA[item.category];
  const timeLabel = new Date(item.time).toLocaleTimeString(isHindi ? 'hi-IN' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return (
    <tr className="hover:bg-zinc-800/40">
      <td className="p-2 font-medium">{timeLabel}</td>
      <td className="p-2">{item.pm25}</td>
      <td className="p-2 font-bold">{item.aqi}</td>
      <td className="p-2">
        <span
          className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold"
          style={{ backgroundColor: `${meta?.color}33`, color: meta?.color }}
        >
          {isHindi ? meta?.categoryHi : item.category}
        </span>
      </td>
    </tr>
  );
}

function ForecastDataTable({
  forecast,
  isHindi,
}: {
  readonly forecast: readonly HourlyForecastItem[];
  readonly isHindi: boolean;
}) {
  return (
    <div id="forecast-data-table" className="overflow-x-auto max-h-72">
      <table className="w-full text-left text-xs text-zinc-300 border-collapse">
        <caption className="sr-only">
          {isHindi ? 'अगले 24 घंटों का प्रति घंटे वायु गुणवत्ता पूर्वानुमान' : 'Hourly air quality forecast for the next 24 hours'}
        </caption>
        <thead className="bg-zinc-800/80 sticky top-0 text-zinc-200">
          <tr>
            <th scope="col" className="p-2 border-b border-zinc-700">{isHindi ? 'समय' : 'Time'}</th>
            <th scope="col" className="p-2 border-b border-zinc-700">PM2.5 (µg/m³)</th>
            <th scope="col" className="p-2 border-b border-zinc-700">AQI</th>
            <th scope="col" className="p-2 border-b border-zinc-700">{isHindi ? 'श्रेणी' : 'Category'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {forecast.map((item, idx) => (
            <ForecastRow key={idx} item={item} isHindi={isHindi} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartMarkerDots({ points, svgHeight }: { readonly points: ChartPoint[]; readonly svgHeight: number }) {
  return (
    <>
      {points.map((p, idx) => {
        if (idx % 4 !== 0 && idx !== points.length - 1) return null;
        const hourNum = new Date(p.item.time).getHours();
        const period = hourNum >= 12 ? 'PM' : 'AM';
        const dispHour = hourNum % 12 === 0 ? 12 : hourNum % 12;

        return (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r="3.5" fill="#10b981" stroke="#18181b" strokeWidth="1.5" />
            <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="9" fill="#a1a1aa" fontWeight="600">
              {p.item.pm25}
            </text>
            <text x={p.x} y={svgHeight - 6} textAnchor="middle" fontSize="9" fill="#71717a">
              {dispHour}{period}
            </text>
          </g>
        );
      })}
    </>
  );
}

function computeChartGeometry(forecast: readonly HourlyForecastItem[]) {
  const maxPm25 = Math.max(100, ...forecast.map((f) => f.pm25));
  const svgHeight = 160;
  const svgWidth = 600;
  const padX = 30;
  const padY = 25;
  const useW = svgWidth - padX * 2;
  const useH = svgHeight - padY * 2;

  const points: ChartPoint[] = forecast.map((item, index) => ({
    x: padX + (index / Math.max(1, forecast.length - 1)) * useW,
    y: svgHeight - padY - (item.pm25 / maxPm25) * useH,
    item,
  }));

  const pathD = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
  const lastX = points[points.length - 1]?.x ?? useW;
  const firstX = points[0]?.x ?? padX;
  const fillD = `${pathD} L ${lastX} ${svgHeight - padY} L ${firstX} ${svgHeight - padY} Z`;

  return { svgWidth, svgHeight, padX, padY, points, pathD, fillD };
}

function ForecastSvgChart({
  forecast,
  isHindi,
}: {
  readonly forecast: readonly HourlyForecastItem[];
  readonly isHindi: boolean;
}) {
  const geom = computeChartGeometry(forecast);

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${geom.svgWidth} ${geom.svgHeight}`}
        className="w-full h-44 overflow-visible"
        role="img"
        aria-label={isHindi ? 'अगले 24 घंटों का PM2.5 पूर्वानुमान ग्राफ' : 'Next-24h PM2.5 hourly forecast graph'}
      >
        <line x1={geom.padX} y1={geom.padY} x2={geom.svgWidth - geom.padX} y2={geom.padY} stroke="#27272a" strokeDasharray="3 3" />
        <line x1={geom.padX} y1={geom.svgHeight / 2} x2={geom.svgWidth - geom.padX} y2={geom.svgHeight / 2} stroke="#27272a" strokeDasharray="3 3" />
        <line x1={geom.padX} y1={geom.svgHeight - geom.padY} x2={geom.svgWidth - geom.padX} y2={geom.svgHeight - geom.padY} stroke="#3f3f46" />
        <defs>
          <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={geom.fillD} fill="url(#forecastGrad)" />
        <path d={geom.pathD} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <ChartMarkerDots points={geom.points} svgHeight={geom.svgHeight} />
      </svg>
      <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-2 px-1">
        <span>{isHindi ? 'मान: PM2.5 (µg/m³)' : 'Values: PM2.5 (µg/m³)'}</span>
        <span>{isHindi ? 'निचला अक्ष: समय' : 'Bottom axis: Hour of Day'}</span>
      </div>
    </div>
  );
}

export function ForecastChart({ forecast, isHindi = false }: ForecastChartProps) {
  const [showTable, setShowTable] = useState(false);

  if (forecast.length === 0) {
    return <ForecastChartSkeleton />;
  }

  return (
    <section aria-labelledby="forecast-heading" className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <h2 id="forecast-heading" className="text-base sm:text-lg font-bold text-zinc-100">
            {isHindi ? 'अगले 24 घंटों का पूर्वानुमान' : 'Next-24h Hourly Forecast'}
          </h2>
        </div>
        <button
          onClick={() => setShowTable((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
          aria-expanded={showTable}
          aria-controls="forecast-data-table"
        >
          <Table className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{showTable ? (isHindi ? 'ग्राफ देखें' : 'View Graph') : (isHindi ? 'तालिका देखें' : 'View Table')}</span>
        </button>
      </div>
      {showTable ? (
        <ForecastDataTable forecast={forecast} isHindi={isHindi} />
      ) : (
        <ForecastSvgChart forecast={forecast} isHindi={isHindi} />
      )}
    </section>
  );
}
