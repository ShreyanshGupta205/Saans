/**
 * @file TodayDashboard.test.tsx
 * @description React Testing Library tests for TodayDashboard component, accessibility features, and data-table toggle.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TodayDashboard } from '../../components/TodayDashboard';
import { ComputedAQIResult, HourlyForecastItem, OutdoorWindowRecommendation } from '../../lib/aqi/types';

const mockAqi: ComputedAQIResult = {
  aqi: 320,
  dominantPollutant: 'pm25',
  category: 'Very Poor',
  categoryHi: 'बहुत खराब',
  healthAdvisoryEn: 'Respiratory illness on prolonged exposure.',
  healthAdvisoryHi: 'गंभीर सांस की बीमारियां हो सकती हैं।',
  pollutantBreakdown: {
    pm25: { concentration: 165, subIndex: 320, category: 'Very Poor', whoMultiple: 11.0 },
    pm10: { concentration: 280, subIndex: 230, category: 'Poor', whoMultiple: 6.2 },
    no2: { concentration: 65, subIndex: 81, category: 'Moderate', whoMultiple: 2.6 },
    o3: { concentration: 42, subIndex: 42, category: 'Good', whoMultiple: 0.4 },
  },
  whoMultiples: {
    pm25: 11.0,
    pm10: 6.2,
    no2: 2.6,
  },
  timestamp: new Date().toISOString(),
  isEmergency: false,
};

const mockForecast: HourlyForecastItem[] = [
  { time: '2026-11-20T12:00:00Z', hour: 12, pm25: 140, pm10: 220, aqi: 280, category: 'Poor' },
  { time: '2026-11-20T13:00:00Z', hour: 13, pm25: 85, pm10: 140, aqi: 180, category: 'Moderate' },
  { time: '2026-11-20T14:00:00Z', hour: 14, pm25: 90, pm10: 150, aqi: 200, category: 'Moderate' },
];

const mockOutdoorWindow: OutdoorWindowRecommendation = {
  startHour: 13,
  endHour: 15,
  startTimeLabel: '1:00 PM',
  endTimeLabel: '3:00 PM',
  avgPm25: 88,
  minPm25: 85,
  isSafeWindow: true,
  recommendationEn: 'Best window is 1:00 PM - 3:00 PM (88 µg/m³). Good for brief outdoor walks.',
  recommendationHi: 'सबसे उपयुक्त समय दोपहर 1 से 3 बजे के बीच है।',
  ventilationDurationMinutes: 15,
};

describe('TodayDashboard Component', () => {
  it('renders AQI index, category badge, and WHO guideline multiples', () => {
    render(
      <TodayDashboard
        aqiData={mockAqi}
        hourlyForecast={mockForecast}
        outdoorWindow={mockOutdoorWindow}
        locationName="Delhi (Connaught Place)"
        isHindi={false}
      />
    );

    expect(screen.getByText('320')).toBeInTheDocument();
    expect(screen.getByText('Very Poor')).toBeInTheDocument();
    expect(screen.getByText(/11x times WHO guideline/i)).toBeInTheDocument();
    expect(screen.getByText('Delhi (Connaught Place)')).toBeInTheDocument();
  });

  it('renders 4-pollutant grid values', () => {
    render(
      <TodayDashboard
        aqiData={mockAqi}
        hourlyForecast={mockForecast}
        outdoorWindow={mockOutdoorWindow}
        locationName="Delhi"
        isHindi={false}
      />
    );

    expect(screen.getByText('165')).toBeInTheDocument(); // PM2.5
    expect(screen.getByText('280')).toBeInTheDocument(); // PM10
    expect(screen.getByText('65')).toBeInTheDocument();  // NO2
    expect(screen.getByText('42')).toBeInTheDocument();  // O3
  });

  it('renders outdoor window recommendation and ventilation limit', () => {
    render(
      <TodayDashboard
        aqiData={mockAqi}
        hourlyForecast={mockForecast}
        outdoorWindow={mockOutdoorWindow}
        locationName="Delhi"
        isHindi={false}
      />
    );

    expect(screen.getByText('1:00 PM – 3:00 PM')).toBeInTheDocument();
    expect(screen.getByText(/15 mins/i)).toBeInTheDocument();
    expect(screen.getByText(/Best window is 1:00 PM - 3:00 PM/i)).toBeInTheDocument();
  });

  it('toggles accessible data-table view in forecast chart', () => {
    render(
      <TodayDashboard
        aqiData={mockAqi}
        hourlyForecast={mockForecast}
        outdoorWindow={mockOutdoorWindow}
        locationName="Delhi"
        isHindi={false}
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /View Table/i });
    expect(toggleBtn).toBeInTheDocument();

    // Table not visible initially
    expect(screen.queryByRole('table')).not.toBeInTheDocument();

    // Click to show table
    fireEvent.click(toggleBtn);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('Hourly air quality forecast for the next 24 hours')).toBeInTheDocument();
  });

  it('displays emergency alert banner when isEmergency is true', () => {
    const emergencyAqi: ComputedAQIResult = {
      ...mockAqi,
      aqi: 460,
      category: 'Severe',
      isEmergency: true,
    };

    render(
      <TodayDashboard
        aqiData={emergencyAqi}
        hourlyForecast={mockForecast}
        outdoorWindow={mockOutdoorWindow}
        locationName="Delhi"
        isHindi={false}
      />
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/Public Health Emergency/i)).toBeInTheDocument();
  });
});
