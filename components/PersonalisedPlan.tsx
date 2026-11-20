'use client';

import React, { useState } from 'react';
import { Sparkles, RefreshCw, Clock, Home, Leaf, Shield, AlertTriangle } from 'lucide-react';
import { ActionCard } from './ActionCard';
import { ChoiceImpactSection } from './ChoiceImpactSection';
import { GeneratedPlanResult } from '@/lib/rules/fallback-plan';
import { HouseholdProfile, ActionCardData } from '@/lib/impact/types';

interface PersonalisedPlanProps {
  readonly plan: GeneratedPlanResult;
  readonly onRefreshPlan: () => void;
  readonly isRefreshing?: boolean;
  readonly isHindi?: boolean;
  readonly profile?: HouseholdProfile;
  readonly ambientPm25?: number;
}

type TabType = 'all' | 'routine' | 'indoor' | 'sustainable';

function PlanHeader({
  plan,
  onRefresh,
  isRefreshing,
  isHindi,
}: {
  readonly plan: GeneratedPlanResult;
  readonly onRefresh: () => void;
  readonly isRefreshing: boolean;
  readonly isHindi: boolean;
}) {
  return (
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
        onClick={onRefresh}
        disabled={isRefreshing}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 min-h-[44px]"
        aria-label="Refresh tailored action plan"
      >
        <RefreshCw className={`w-4 h-4 text-emerald-400 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
        <span>{isRefreshing ? (isHindi ? 'ताज़ा कर रहे हैं...' : 'Refreshing...') : (isHindi ? 'योजना ताज़ा करें' : 'Refresh Plan')}</span>
      </button>
    </div>
  );
}

function PlanFilterTabs({
  activeTab,
  onSelectTab,
  isHindi,
}: {
  readonly activeTab: TabType;
  readonly onSelectTab: (tab: TabType) => void;
  readonly isHindi: boolean;
}) {
  const tabs: Array<{ key: TabType; labelEn: string; labelHi: string; icon?: React.ReactNode }> = [
    { key: 'all', labelEn: 'All Actions', labelHi: 'सभी उपाय' },
    { key: 'routine', labelEn: 'Daily Routine', labelHi: 'दैनिक दिनचर्या', icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'indoor', labelEn: 'Indoor Hacks', labelHi: 'इनडोर उपाय', icon: <Home className="w-3.5 h-3.5" /> },
    { key: 'sustainable', labelEn: 'Sustainable Alternatives', labelHi: 'टिकाऊ विकल्प', icon: <Leaf className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={activeTab === t.key}
          onClick={() => onSelectTab(t.key)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[44px] ${
            activeTab === t.key
              ? 'bg-emerald-600 text-white font-semibold'
              : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
          }`}
        >
          {t.icon}
          <span>{isHindi ? t.labelHi : t.labelEn}</span>
        </button>
      ))}
    </div>
  );
}

function PlanActionSection({
  title,
  icon,
  cards,
  isHindi,
}: {
  readonly title: string;
  readonly icon: React.ReactNode;
  readonly cards: readonly ActionCardData[];
  readonly isHindi: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-base font-bold text-zinc-200">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <ActionCard key={card.id} card={card} isHindi={isHindi} />
        ))}
      </div>
    </div>
  );
}

function PlanSections({
  plan,
  activeTab,
  isHindi,
}: {
  readonly plan: GeneratedPlanResult;
  readonly activeTab: TabType;
  readonly isHindi: boolean;
}) {
  return (
    <div className="space-y-6">
      {(activeTab === 'all' || activeTab === 'routine') && (
        <PlanActionSection
          title={isHindi ? '1. कम उत्सर्जन वाली दैनिक दिनचर्या' : '1. Low-Emission Daily Routine'}
          icon={<Clock className="w-4 h-4 text-emerald-400" />}
          cards={plan.routineActions}
          isHindi={isHindi}
        />
      )}
      {(activeTab === 'all' || activeTab === 'indoor') && (
        <PlanActionSection
          title={isHindi ? '2. घर के अंदर हवा सुधारने के उपाय' : '2. Indoor Air-Quality Hacks'}
          icon={<Home className="w-4 h-4 text-emerald-400" />}
          cards={plan.indoorActions}
          isHindi={isHindi}
        />
      )}
      {(activeTab === 'all' || activeTab === 'sustainable') && (
        <PlanActionSection
          title={isHindi ? '3. टिकाऊ जीवनशैली विकल्प' : '3. Sustainable Alternatives'}
          icon={<Leaf className="w-4 h-4 text-emerald-400" />}
          cards={plan.sustainableActions}
          isHindi={isHindi}
        />
      )}
    </div>
  );
}

export function PersonalisedPlan({
  plan,
  onRefreshPlan,
  isRefreshing = false,
  isHindi = false,
  profile,
  ambientPm25 = 150,
}: PersonalisedPlanProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  return (
    <section aria-labelledby="plan-heading" className="space-y-6">
      <PlanHeader plan={plan} onRefresh={onRefreshPlan} isRefreshing={isRefreshing} isHindi={isHindi} />
      {plan.isDegraded && (
        <div role="status" aria-live="polite" className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-3.5 flex items-center justify-between text-xs text-amber-200">
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
      <PlanFilterTabs activeTab={activeTab} onSelectTab={setActiveTab} isHindi={isHindi} />
      <PlanSections plan={plan} activeTab={activeTab} isHindi={isHindi} />
      {profile && <ChoiceImpactSection profile={profile} ambientPm25={ambientPm25} isHindi={isHindi} />}
      <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          {isHindi
            ? 'वैज्ञानिक सत्यता: सभी प्रभाव संख्याएं सांख्यिकीय गणना इंजन (CPCB, WHO, ARAI, CEEW) से जुड़े हैं, LLM द्वारा गढ़े नहीं गए हैं।'
            : 'Deterministic Scientific Engine: All numerical impact ranges are computed by calibrated mathematical models (CPCB, WHO, ARAI, CEEW), never generated or hallucinated by AI.'}
        </p>
      </div>
    </section>
  );
}
