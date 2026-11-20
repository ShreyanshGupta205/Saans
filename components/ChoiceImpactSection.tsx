'use client';

import React, { useState } from 'react';
import { CheckCircle2, SlidersHorizontal, XCircle } from 'lucide-react';
import { HouseholdProfile } from '@/lib/impact/types';
import { calculateChoiceImpact, ActionChoiceImpact } from '@/lib/impact/choice-impact';

interface ChoiceImpactSectionProps {
  readonly profile: HouseholdProfile;
  readonly ambientPm25: number;
  readonly isHindi?: boolean;
}

const AVAILABLE_ACTIONS = [
  { key: 'n95_commute', labelEn: 'N95 Respirator Mask', labelHi: 'N95 मास्क' },
  { key: 'hepa_purifier', labelEn: 'True HEPA Air Purifier', labelHi: 'हेपा प्यूरीफायर' },
  { key: 'metro_shift', labelEn: 'Metro / Transit Switch', labelHi: 'मेट्रो सफर' },
] as const;

export function ChoiceImpactSection({
  profile,
  ambientPm25,
  isHindi = false,
}: ChoiceImpactSectionProps) {
  const [selectedActionKey, setSelectedActionKey] = useState<string>('n95_commute');

  const impactData: ActionChoiceImpact = calculateChoiceImpact(selectedActionKey, profile, ambientPm25);

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-md space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h3 className="text-lg font-bold text-zinc-100 tracking-tight">
              {isHindi ? 'आपकी पसंद, आपका प्रभाव (सीधी तुलना)' : 'Your Choice, Your Impact (Before & After)'}
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {isHindi
              ? 'आसान शब्दों में समझें कि एक सही कदम आपकी सांस और पर्यावरण को कितना बदलता है।'
              : 'Plain-language comparison showing how one small change directly protects your lungs.'}
          </p>
        </div>

        {/* Action Selector Pills */}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Select clean air action to compare">
          {AVAILABLE_ACTIONS.map((action) => {
            const isSelected = selectedActionKey === action.key;
            return (
              <button
                key={action.key}
                type="button"
                onClick={() => setSelectedActionKey(action.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-sm ring-1 ring-emerald-500'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700/80 border border-zinc-700/60'
                }`}
                aria-pressed={isSelected}
              >
                {isHindi ? action.labelHi : action.labelEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Action Title Banner */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
        <span className="text-sm font-bold text-emerald-300">
          {isHindi ? impactData.titleHi : impactData.titleEn}
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold">
          {impactData.exposureCutPercent}% {isHindi ? 'कम प्रदूषण' : 'Less Exposure'}
        </span>
      </div>

      {/* Before vs After Side-by-Side Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Before / Without Action */}
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
              <XCircle className="w-4 h-4 text-rose-400" aria-hidden="true" />
              <span>{isHindi ? 'पहले: बिना इस उपाय के' : 'Before: Without This Action'}</span>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              {isHindi ? impactData.beforeExposureHi : impactData.beforeExposureEn}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-rose-900/30 text-xs text-rose-300/80">
            {isHindi ? 'जोखिम: जहरीले कण सीधे फेफड़ों में पहुंचते हैं' : 'Risk: Toxic soot penetrates airways'}
          </div>
        </div>

        {/* After / With Action */}
        <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              <span>{isHindi ? 'बाद में: इस उपाय के साथ' : 'After: With This Action'}</span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed font-medium">
              {isHindi ? impactData.afterExposureHi : impactData.afterExposureEn}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-emerald-900/30 text-xs text-emerald-400">
            {isHindi ? impactData.emissionsSavedHi : impactData.emissionsSavedEn}
          </div>
        </div>
      </div>
    </div>
  );
}
