'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Clock, Home, Leaf, Shield, AlertTriangle } from 'lucide-react';
import { ActionCard } from './ActionCard';
import { ChoiceImpactSection } from './ChoiceImpactSection';
import { GeneratedPlanResult } from '@/lib/rules/fallback-plan';
import { HouseholdProfile } from '@/lib/impact/types';

interface PersonalisedPlanProps {
  readonly plan: GeneratedPlanResult;
  readonly onRefreshPlan: () => void;
  readonly isRefreshing?: boolean;
  readonly isHindi?: boolean;
  readonly profile?: HouseholdProfile;
  readonly ambientPm25?: number;
}

export function PersonalisedPlan({
  plan,
  onRefreshPlan,
  isRefreshing = false,
  isHindi = false,
  profile,
  ambientPm25 = 150,
}: PersonalisedPlanProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'routine' | 'indoor' | 'sustainable'>('all');

  return (
    <section aria-labelledby="plan-heading" className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 id="plan-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              {isHindi ? 'आपकी व्यक्तिगत स्वच्छ वायु योजना' : 'Personalised Clean Air Plan'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            {isHindi ? plan.summaryHi : plan.summaryEn}
          </p>
        </div>

        <button
          onClick={onRefreshPlan}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 min-h-[44px]"
          aria-label="Refresh tailored action plan"
        >
          <RefreshCw
            className={`w-4 h-4 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>{isRefreshing ? (isHindi ? 'ताज़ा कर रहे हैं...' : 'Refreshing...') : (isHindi ? 'योजना ताज़ा करें' : 'Refresh Plan')}</span>
        </button>
      </div>

      {/* Basic Mode Notice (if degraded or 8s LLM timeout) */}
      {plan.isDegraded && (
        <div
          role="status"
          aria-live="polite"
          className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-200"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
            <span>
              {isHindi
                ? 'मूल नियम मोड: उच्च गति और 100% विश्वसनीयता के लिए योजना स्थानीय वैज्ञानिक गणनाओं द्वारा संचालित है।'
                : 'Basic Rule Mode: Operating with deterministic science rules for instant response and 100% uptime.'}
            </span>
          </div>
          <span className="font-semibold text-amber-300 ml-2 shrink-0">Basic Mode</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
            activeTab === 'all'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          {isHindi ? 'सभी उपाय' : 'All Actions'}
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'routine'}
          onClick={() => setActiveTab('routine')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
            activeTab === 'routine'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isHindi ? 'दैनिक दिनचर्या' : 'Daily Routine'}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'indoor'}
          onClick={() => setActiveTab('indoor')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
            activeTab === 'indoor'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Home className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isHindi ? 'इनडोर उपाय' : 'Indoor Hacks'}</span>
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'sustainable'}
          onClick={() => setActiveTab('sustainable')}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
            activeTab === 'sustainable'
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          <Leaf className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isHindi ? 'टिकाऊ विकल्प' : 'Sustainable Alternatives'}</span>
        </button>
      </div>

      {/* Section 1: Low-emission daily routine */}
      {(activeTab === 'all' || activeTab === 'routine') && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <h3 className="text-base font-bold text-zinc-200">
              {isHindi ? '1. कम उत्सर्जन वाली दैनिक दिनचर्या' : '1. Low-Emission Daily Routine'}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.routineActions.map((card) => (
              <ActionCard key={card.id} card={card} isHindi={isHindi} />
            ))}
          </div>
        </div>
      )}

      {/* Section 2: Indoor air-quality hacks */}
      {(activeTab === 'all' || activeTab === 'indoor') && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <h3 className="text-base font-bold text-zinc-200">
              {isHindi ? '2. घर के अंदर हवा सुधारने के उपाय' : '2. Indoor Air-Quality Hacks'}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.indoorActions.map((card) => (
              <ActionCard key={card.id} card={card} isHindi={isHindi} />
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Sustainable alternatives */}
      {(activeTab === 'all' || activeTab === 'sustainable') && (
        <div className="space-y-3 pt-4">
          <div className="flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            <h3 className="text-base font-bold text-zinc-200">
              {isHindi ? '3. टिकाऊ जीवनशैली विकल्प' : '3. Sustainable Alternatives'}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plan.sustainableActions.map((card) => (
              <ActionCard key={card.id} card={card} isHindi={isHindi} />
            ))}
          </div>
        </div>
      )}

      {/* Your Choice, Your Impact Section (Before / After Comparison) */}
      {profile && (
        <ChoiceImpactSection
          profile={profile}
          ambientPm25={ambientPm25}
          isHindi={isHindi}
        />
      )}

      {/* Deterministic Data Assurance Footnote */}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          {isHindi
            ? 'वैज्ञानिक सत्यता: सभी प्रभाव संख्याएं, प्रतिशत और उत्सर्जन आंकड़े सांख्यिकीय गणना इंजन (CPCB, WHO, ARAI, CEEW) से जुड़े हैं, भाषा मॉडल (LLM) द्वारा गढ़े नहीं गए हैं।'
            : 'Deterministic Scientific Engine: All numerical impact ranges, percentages, and emission factors are computed by calibrated mathematical models (CPCB, WHO, ARAI, CEEW), never generated or hallucinated by AI.'}
        </p>
      </div>
    </section>
  );
}
