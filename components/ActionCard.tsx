'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  TrendingDown,
  Users,
  Info,
  Clock,
} from 'lucide-react';
import { ActionCardData } from '@/lib/impact/types';

interface ActionCardProps {
  readonly card: ActionCardData;
  readonly isHindi?: boolean;
}

export function ActionCard({ card, isHindi = false }: ActionCardProps) {
  const [showCitation, setShowCitation] = useState(false);

  const title = isHindi ? card.titleHi : card.titleEn;
  const why = isHindi ? card.whyHi : card.whyEn;

  // Effort badge styling
  const effortStyles = {
    Low: 'bg-emerald-950 text-emerald-300 border-emerald-800/70',
    Medium: 'bg-amber-950 text-amber-300 border-amber-800/70',
    High: 'bg-rose-950 text-rose-300 border-rose-800/70',
  }[card.effort];

  return (
    <article
      className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm hover:border-zinc-700 transition-colors flex flex-col justify-between"
      aria-labelledby={`card-title-${card.id}`}
    >
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {card.timeOfDay && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                <Clock className="w-3 h-3 text-zinc-400" aria-hidden="true" />
                {card.timeOfDay}
              </span>
            )}
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${effortStyles}`}
            >
              {card.effort} {isHindi ? 'प्रयास' : 'Effort'}
            </span>
          </div>

          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-zinc-800/90 text-emerald-400 border border-zinc-700 font-mono">
            {card.costBand}
          </span>
        </div>

        {/* Title */}
        <h3
          id={`card-title-${card.id}`}
          className="text-base font-bold text-zinc-100 mb-2 leading-snug"
        >
          {title}
        </h3>

        {/* Why Explanation */}
        <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4">
          {why}
        </p>
      </div>

      {/* Deterministic Impact Block */}
      <div className="pt-3 border-t border-zinc-800/80 mt-auto">
        <div className="space-y-2 text-xs">
          {/* Exposure Change */}
          <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 p-2 rounded-lg border border-emerald-900/40">
            <ShieldCheck className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold text-emerald-200">
                {isHindi ? 'व्यक्तिगत जोखिम:' : 'Personal Exposure:'}{' '}
              </span>
              <span className="font-bold">{card.impact.exposureChange.value}</span>
              <span className="text-emerald-400/80 ml-1 text-[11px]">
                ({card.impact.exposureChange.confidence} {isHindi ? 'विश्वास' : 'Confidence'})
              </span>
            </div>
          </div>

          {/* Emissions Change */}
          <div className="flex items-start gap-2 text-teal-300 bg-teal-950/40 p-2 rounded-lg border border-teal-900/40">
            <TrendingDown className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold text-teal-200">
                {isHindi ? 'उत्सर्जन प्रभाव:' : 'Emissions Change:'}{' '}
              </span>
              <span>{card.impact.emissionsChange.value}</span>
            </div>
          </div>

          {/* Community Multiplier */}
          <div className="flex items-start gap-2 text-sky-300 bg-sky-950/40 p-2 rounded-lg border border-sky-900/40">
            <Users className="w-4 h-4 text-sky-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold text-sky-200">
                {isHindi ? 'सामूहिक गुणक:' : 'Community Multiplier:'}{' '}
              </span>
              <span>{card.impact.communityMultiplier.value}</span>
            </div>
          </div>
        </div>

        {/* Source Citation Disclosure */}
        <div className="mt-3 flex items-center justify-between text-[11px] text-zinc-400">
          <button
            onClick={() => setShowCitation((prev) => !prev)}
            className="inline-flex items-center gap-1 hover:text-zinc-200 focus-visible:ring-1 focus-visible:ring-emerald-400 rounded px-1 min-h-[36px]"
            aria-expanded={showCitation}
          >
            <Info className="w-3.5 h-3.5 text-zinc-500" aria-hidden="true" />
            <span>{isHindi ? 'वैज्ञानिक स्रोत देखें' : 'Scientific Source'}</span>
          </button>

          <span className="text-[10px] text-zinc-500 font-mono">
            {card.impact.exposureChange.sourceKey}
          </span>
        </div>

        {showCitation && (
          <div className="mt-2 p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300">
            <p className="font-medium text-zinc-200 mb-1">
              {isHindi ? 'प्रमाणित वैज्ञानिक संदर्भ:' : 'Peer-Reviewed Scientific Source:'}
            </p>
            <p className="text-zinc-400">
              {card.impact.exposureChange.qualitativeNote ||
                'Calculated via CEEW & CPCB atmospheric infiltration and ARAI vehicular emission inventories.'}
            </p>
          </div>
        )}
      </div>
    </article>
  );
}
