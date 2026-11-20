/**
 * @file ActionCard.test.tsx
 * @description React Testing Library tests for ActionCard accessibility, impact display, and disclosures.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ActionCard } from '../../components/ActionCard';
import { ActionCardData } from '../../lib/impact/types';

const sampleCard: ActionCardData = {
  id: 'test-card-1',
  section: 'routine',
  timeOfDay: 'morning',
  titleEn: 'Shift Exercise Indoors',
  titleHi: 'सुबह का व्यायाम घर के अंदर करें',
  whyEn: 'Ground-level thermal inversion traps toxic fine particulates near the surface.',
  whyHi: 'सर्दियों की सुबह प्रदूषण जमीन पर जमा रहता है।',
  effort: 'Low',
  costBand: '₹0',
  impact: {
    exposureChange: {
      value: '65% reduction',
      minVal: 50,
      maxVal: 75,
      unit: '% inhaled PM2.5 avoided',
      confidence: 'High',
      sourceKey: 'CEEW_EXPOSURE_2021',
      isEstimate: false,
      qualitativeNote: 'Directly spares airways from high exertion ventilation spikes.',
    },
    emissionsChange: {
      value: '0 g tailpipe',
      minVal: 0,
      maxVal: 0,
      unit: 'g CO2e',
      confidence: 'High',
      sourceKey: 'ARAI_2018',
      isEstimate: false,
    },
    communityMultiplier: {
      value: '2,500 person-hours protected',
      minVal: 1000,
      maxVal: 5000,
      unit: 'hours',
      confidence: 'High',
      sourceKey: 'CPCB_NAQI_2014',
      isEstimate: true,
    },
  },
};

describe('ActionCard Component', () => {
  it('renders card title, why explanation, effort, and cost band', () => {
    render(<ActionCard card={sampleCard} isHindi={false} />);

    expect(screen.getByRole('heading', { name: 'Shift Exercise Indoors' })).toBeInTheDocument();
    expect(screen.getByText(/Ground-level thermal inversion/i)).toBeInTheDocument();
    expect(screen.getByText(/Low Effort/i)).toBeInTheDocument();
    expect(screen.getByText('₹0')).toBeInTheDocument();
    expect(screen.getByText('morning')).toBeInTheDocument();
  });

  it('renders deterministic impact blocks with confidence badges', () => {
    render(<ActionCard card={sampleCard} isHindi={false} />);

    expect(screen.getByText('65% reduction')).toBeInTheDocument();
    expect(screen.getByText('(High Confidence)')).toBeInTheDocument();
    expect(screen.getByText('0 g tailpipe')).toBeInTheDocument();
    expect(screen.getByText('2,500 person-hours protected')).toBeInTheDocument();
  });

  it('toggles scientific citation disclosure on click', () => {
    render(<ActionCard card={sampleCard} isHindi={false} />);

    const citationButton = screen.getByRole('button', { name: /Scientific Source/i });
    expect(citationButton).toBeInTheDocument();
    expect(screen.queryByText(/Directly spares airways/i)).not.toBeInTheDocument();

    fireEvent.click(citationButton);
    expect(screen.getByText(/Directly spares airways/i)).toBeInTheDocument();

    fireEvent.click(citationButton);
    expect(screen.queryByText(/Directly spares airways/i)).not.toBeInTheDocument();
  });

  it('renders in Hindi when isHindi is true', () => {
    render(<ActionCard card={sampleCard} isHindi={true} />);

    expect(screen.getByRole('heading', { name: 'सुबह का व्यायाम घर के अंदर करें' })).toBeInTheDocument();
    expect(screen.getByText(/सर्दियों की सुबह प्रदूषण/i)).toBeInTheDocument();
    expect(screen.getByText(/Low प्रयास/i)).toBeInTheDocument();
  });
});
