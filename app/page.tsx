'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Header } from '@/components/Header';
import { SkipLink } from '@/components/SkipLink';
import { DegradedBanner } from '@/components/DegradedBanner';
import { TodayDashboard } from '@/components/TodayDashboard';
import { PersonalisedPlan } from '@/components/PersonalisedPlan';
import { AskSaansChat } from '@/components/AskSaansChat';
import { CommunityMode } from '@/components/CommunityMode';
import { OnboardingModal } from '@/components/OnboardingModal';
import { ComputedAQIResult, HourlyForecastItem, OutdoorWindowRecommendation } from '@/lib/aqi/types';
import { HouseholdProfile } from '@/lib/impact/types';
import { GeneratedPlanResult, generateDeterministicPlan } from '@/lib/rules/fallback-plan';
import { computeIndianAQI } from '@/lib/aqi/cpcb';
import { computeBestOutdoorWindow } from '@/lib/aqi/forecast';
import { SupportedLanguage } from '@/i18n';
import { LayoutDashboard, CalendarCheck, MessageSquare, Users } from 'lucide-react';

const STORAGE_KEY = 'saans_profile_v1';

const DEFAULT_PROFILE: HouseholdProfile = {
  locationName: 'Delhi (Connaught Place)',
  lat: 28.61,
  lon: 77.21,
  adultsCount: 2,
  childrenCount: 1,
  elderlyCount: 1,
  hasSensitiveMembers: true,
  commuteMode: 'metro',
  commuteDistanceKm: 14,
  workFromHomeDays: 2,
  homeType: 'apartment_highrise',
  cookingFuel: 'lpg',
  hasAirPurifier: true,
  language: 'en',
};

type AppTab = 'today' | 'plan' | 'chat' | 'community';

function NavTabs({
  activeTab,
  onSelectTab,
  isHindi,
}: {
  readonly activeTab: AppTab;
  readonly onSelectTab: (tab: AppTab) => void;
  readonly isHindi: boolean;
}) {
  const tabs = [
    { key: 'today' as const, labelEn: 'Today Dashboard', labelHi: 'आज की हवा', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'plan' as const, labelEn: 'Personalised Plan', labelHi: 'कार्य योजना', icon: <CalendarCheck className="w-4 h-4" /> },
    { key: 'chat' as const, labelEn: 'Ask Saans Chat', labelHi: 'साँस से पूछें', icon: <MessageSquare className="w-4 h-4" /> },
    { key: 'community' as const, labelEn: 'Community Mode', labelHi: 'सोसाइटी मोड', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <nav aria-label="Application Sections" className="flex border-b border-zinc-800 mb-6 overflow-x-auto no-scrollbar gap-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onSelectTab(tab.key)}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
            activeTab === tab.key ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20' : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {tab.icon}
          <span>{isHindi ? tab.labelHi : tab.labelEn}</span>
        </button>
      ))}
    </nav>
  );
}

function HomeFooter({ isHindi }: { readonly isHindi: boolean }) {
  return (
    <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 mt-12 text-center text-xs text-zinc-300">
      <div className="max-w-6xl mx-auto px-4 space-y-1">
        <p className="text-zinc-300">
          {isHindi ? 'साँस (Saans) — सर्दियों के स्मॉग से बचाव के लिए स्वच्छ वायु सहायक।' : 'Saans — AI & science-grounded clean air assistant for severe winter smog episodes.'}
        </p>
        <p className="text-[11px] text-zinc-400">
          {isHindi ? 'प्रमाणित स्रोत: CPCB, WHO, ARAI, CEEW, CEA | कोई चिकित्सीय परामर्श नहीं' : 'Sources: CPCB, WHO 2021, ARAI, CEEW, CEA | Non-medical advisory'}
        </p>
      </div>
    </footer>
  );
}

function speakSummary(
  isHi: boolean,
  profile: HouseholdProfile,
  aqiData: ComputedAQIResult,
  outdoorWindow: OutdoorWindowRecommendation,
  onEnd: () => void
) {
  const text = isHi
    ? `आज की वायु गुणवत्ता। स्थान ${profile.locationName}। वायु गुणवत्ता सूचकांक ${aqiData.aqi}, श्रेणी ${aqiData.categoryHi}। ${aqiData.healthAdvisoryHi}। उपयुक्त समय ${outdoorWindow.startTimeLabel} से ${outdoorWindow.endTimeLabel} है।`
    : `Today's air quality update for ${profile.locationName}. Current AQI is ${aqiData.aqi}, category ${aqiData.category}. ${aqiData.healthAdvisoryEn}. Best window is ${outdoorWindow.startTimeLabel} to ${outdoorWindow.endTimeLabel}.`;

  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = isHi ? 'hi-IN' : 'en-US';
  utt.rate = 0.95;
  utt.onend = onEnd;
  utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

async function requestAqi(lat: number, lon: number) {
  const res = await fetch(`/api/aqi?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error();
  return (await res.json()) as {
    aqiResult: ComputedAQIResult;
    hourlyForecast?: HourlyForecastItem[];
    outdoorWindow: OutdoorWindowRecommendation;
    isDegraded?: boolean;
    degradedReason?: string;
  };
}

async function requestPlan(profile: HouseholdProfile, aqiData: ComputedAQIResult, language: SupportedLanguage) {
  const res = await fetch('/api/plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ profile, aqiData, language }),
  });
  if (!res.ok) throw new Error();
  const data = (await res.json()) as { plan: GeneratedPlanResult };
  return data.plan;
}

function useSyncDashboard(
  profile: HouseholdProfile,
  language: SupportedLanguage,
  loadAQI: (lat: number, lon: number) => Promise<ComputedAQIResult>,
  loadPlan: (prof: HouseholdProfile, aqiRes: ComputedAQIResult, lang: SupportedLanguage) => Promise<void>
) {
  useEffect(() => {
    let mounted = true;
    loadAQI(profile.lat, profile.lon).then((res) => { if (mounted && res) loadPlan(profile, res, language); });
    return () => { mounted = false; };
  }, [profile, language, loadAQI, loadPlan]);
}

function useDashboardData(profile: HouseholdProfile, language: SupportedLanguage) {
  const [aqiData, setAqiData] = useState<ComputedAQIResult>(() => computeIndianAQI({ pm25: 220, pm10: 310, no2: 55 }));
  const [forecast, setForecast] = useState<HourlyForecastItem[]>([]);
  const [outdoorWindow, setOutdoorWindow] = useState<OutdoorWindowRecommendation>(() => computeBestOutdoorWindow([]));
  const [plan, setPlan] = useState<GeneratedPlanResult>(() => generateDeterministicPlan({ profile, aqi: 220, dominantPollutant: 'pm25', isDegraded: false }));
  const [isDegraded, setIsDegraded] = useState(false);
  const [degradedReason, setDegradedReason] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadAQI = useCallback(async (lat: number, lon: number) => {
    try {
      const data = await requestAqi(lat, lon);
      setAqiData(data.aqiResult);
      setForecast(data.hourlyForecast || []);
      setOutdoorWindow(data.outdoorWindow);
      setIsDegraded(Boolean(data.isDegraded));
      setDegradedReason(data.degradedReason || '');
      return data.aqiResult;
    } catch {
      setIsDegraded(true);
      setDegradedReason('Offline deterministic model active.');
      return computeIndianAQI({ pm25: 195, pm10: 290, no2: 50 });
    }
  }, []);

  const loadPlan = useCallback(async (prof: HouseholdProfile, aqiRes: ComputedAQIResult, lang: SupportedLanguage) => {
    setPlan(generateDeterministicPlan({ profile: prof, aqi: aqiRes.aqi, dominantPollutant: aqiRes.dominantPollutant, isDegraded: false }));
    setIsRefreshing(true);
    try {
      const p = await requestPlan(prof, aqiRes, lang);
      setPlan(p);
    } catch {
      setPlan(generateDeterministicPlan({ profile: prof, aqi: aqiRes.aqi, dominantPollutant: aqiRes.dominantPollutant, isDegraded: true }));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useSyncDashboard(profile, language, loadAQI, loadPlan);

  return { aqiData, forecast, outdoorWindow, plan, isDegraded, degradedReason, isRefreshing, loadAQI, loadPlan };
}

function HomeTabContent({
  activeTab,
  data,
  profile,
  language,
  isHindi,
}: {
  readonly activeTab: AppTab;
  readonly data: ReturnType<typeof useDashboardData>;
  readonly profile: HouseholdProfile;
  readonly language: SupportedLanguage;
  readonly isHindi: boolean;
}) {
  if (activeTab === 'today') {
    return <TodayDashboard aqiData={data.aqiData} hourlyForecast={data.forecast} outdoorWindow={data.outdoorWindow} locationName={profile.locationName} isHindi={isHindi} />;
  }
  if (activeTab === 'plan') {
    return <PersonalisedPlan plan={data.plan} onRefreshPlan={() => data.loadPlan(profile, data.aqiData, language)} isRefreshing={data.isRefreshing} isHindi={isHindi} profile={profile} ambientPm25={data.aqiData.pollutantBreakdown.pm25?.concentration ?? 150} />;
  }
  if (activeTab === 'chat') {
    return <AskSaansChat profile={profile} aqiData={data.aqiData} isHindi={isHindi} />;
  }
  return <CommunityMode isHindi={isHindi} />;
}

export default function HomePage() {
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [isReadingAloud, setIsReadingAloud] = useState(false);

  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const data = useDashboardData(profile, language);
  const isHindi = language === 'hi';

  const toggleReadAloud = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isReadingAloud) { window.speechSynthesis.cancel(); setIsReadingAloud(false); return; }
    setIsReadingAloud(true);
    speakSummary(isHindi, profile, data.aqiData, data.outdoorWindow, () => setIsReadingAloud(false));
  };

  return (
    <>
      <SkipLink label={isHindi ? 'मुख्य सामग्री पर जाएं' : 'Skip to main content'} />
      <Header language={language} onToggleLanguage={() => { const nl = language === 'en' ? 'hi' : 'en'; setLanguage(nl); setProfile((p) => ({ ...p, language: nl })); }} onOpenProfile={() => setIsModalOpen(true)} isReadingAloud={isReadingAloud} onToggleReadAloud={toggleReadAloud} isDegraded={data.isDegraded} />
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 focus:outline-none">
        {data.isDegraded && <DegradedBanner message={data.degradedReason || (isHindi ? 'लाइव कनेक्शन धीमा होने के कारण प्रमाणित वैज्ञानिक नियम सक्रिय हैं।' : 'Live connection unavailable; calibrated models active.')} onRetry={() => data.loadAQI(profile.lat, profile.lon)} isRetrying={data.isRefreshing} />}
        <NavTabs activeTab={activeTab} onSelectTab={setActiveTab} isHindi={isHindi} />
        <HomeTabContent activeTab={activeTab} data={data} profile={profile} language={language} isHindi={isHindi} />
      </main>
      <HomeFooter isHindi={isHindi} />
      <OnboardingModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={(p) => { setProfile(p); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch {} }} initialProfile={profile} isHindi={isHindi} />
    </>
  );
}
