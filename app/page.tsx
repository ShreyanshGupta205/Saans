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

export default function HomePage() {
  const [profile, setProfile] = useState<HouseholdProfile>(DEFAULT_PROFILE);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [language, setLanguage] = useState<SupportedLanguage>('en');
  const [activeTab, setActiveTab] = useState<'today' | 'plan' | 'chat' | 'community'>('today');

  // AQI and plan data state
  const [aqiData, setAqiData] = useState<ComputedAQIResult>(() =>
    computeIndianAQI({ pm25: 220, pm10: 310, no2: 55 })
  );
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecastItem[]>([]);
  const [outdoorWindow, setOutdoorWindow] = useState<OutdoorWindowRecommendation>(() =>
    computeBestOutdoorWindow([])
  );
  const [plan, setPlan] = useState<GeneratedPlanResult>(() =>
    generateDeterministicPlan({
      profile: DEFAULT_PROFILE,
      aqi: 220,
      dominantPollutant: 'pm25',
      isDegraded: false,
    })
  );

  const [isDegraded, setIsDegraded] = useState(false);
  const [degradedReason, setDegradedReason] = useState<string>('');
  const [isRefreshingPlan, setIsRefreshingPlan] = useState(false);
  const [isReadingAloud, setIsReadingAloud] = useState(false);

  // Sync html lang attribute
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Load saved profile on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<HouseholdProfile>;
        if (parsed.lat && parsed.lon) {
          setProfile((prev) => ({ ...prev, ...parsed } as HouseholdProfile));
          setLanguage(parsed.language || 'en');
        }
      }
    } catch {
      // Ignore localStorage error
    }
  }, []);

  // Fetch AQI from internal /api/aqi
  const loadAQIData = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(`/api/aqi?lat=${lat}&lon=${lon}`);
      if (!res.ok) throw new Error(`AQI API error: ${res.status}`);

      const data = (await res.json()) as {
        aqiResult: ComputedAQIResult;
        hourlyForecast?: HourlyForecastItem[];
        outdoorWindow: OutdoorWindowRecommendation;
        isDegraded: boolean;
        degradedReason?: string;
      };
      setAqiData(data.aqiResult);
      setHourlyForecast(data.hourlyForecast || []);
      setOutdoorWindow(data.outdoorWindow);

      if (data.isDegraded) {
        setIsDegraded(true);
        setDegradedReason(data.degradedReason || 'Live AQI sensor unavailable; rule engine active');
      } else {
        setIsDegraded(false);
      }
      return data.aqiResult;
    } catch {
      setIsDegraded(true);
      setDegradedReason('Network / API error; running offline rule engine.');
      const fallbackAqi = computeIndianAQI({ pm25: 195, pm10: 290, no2: 50 });
      setAqiData(fallbackAqi);
      return fallbackAqi;
    }
  }, []);

  // Fetch or generate plan from internal /api/plan
  const loadPlanData = useCallback(
    async (prof: HouseholdProfile, aqiRes: ComputedAQIResult, lang: SupportedLanguage) => {
      // 1. Instantly render the rule-based plan (<100ms)
      const instantPlan = generateDeterministicPlan({
        profile: prof,
        aqi: aqiRes.aqi,
        dominantPollutant: aqiRes.dominantPollutant,
        isDegraded: false,
      });
      setPlan((prev) => (prev ? prev : instantPlan));

      setIsRefreshingPlan(true);
      try {
        const res = await fetch('/api/plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: prof,
            aqiData: aqiRes,
            language: lang,
          }),
        });

        if (!res.ok) throw new Error(`Plan API error: ${res.status}`);
        const data = (await res.json()) as { plan: GeneratedPlanResult };
        setPlan(data.plan);
        if (data.plan.isDegraded) {
          setIsDegraded(true);
          setDegradedReason('AI generation offline; using deterministic rule-based plan.');
        }
      } catch {
        const fallback = generateDeterministicPlan({
          profile: prof,
          aqi: aqiRes.aqi,
          dominantPollutant: aqiRes.dominantPollutant,
          isDegraded: true,
        });
        setPlan(fallback);
        setIsDegraded(true);
        setDegradedReason('Using offline calibrated plan engine.');
      } finally {
        setIsRefreshingPlan(false);
      }
    },
    []
  );

  // Load data when profile coordinates change
  useEffect(() => {
    let isMounted = true;
    loadAQIData(profile.lat, profile.lon).then((aqiRes) => {
      if (isMounted && aqiRes) {
        loadPlanData(profile, aqiRes, language);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [profile, language, loadAQIData, loadPlanData]);

  const handleSaveProfile = (newProfile: HouseholdProfile) => {
    setProfile(newProfile);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newProfile));
    } catch {
      // Ignore
    }
  };

  const handleToggleLanguage = () => {
    const nextLang: SupportedLanguage = language === 'en' ? 'hi' : 'en';
    setLanguage(nextLang);
    setProfile((prev) => ({ ...prev, language: nextLang }));
  };

  // Web Speech API Read Aloud
  const handleToggleReadAloud = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isReadingAloud) {
      window.speechSynthesis.cancel();
      setIsReadingAloud(false);
      return;
    }

    const isHi = language === 'hi';
    const textToRead = isHi
      ? `आज की वायु गुणवत्ता। स्थान ${profile.locationName}। वायु गुणवत्ता सूचकांक ${aqiData.aqi}, श्रेणी ${aqiData.categoryHi}। ${aqiData.healthAdvisoryHi}। बाहर निकलने या खिड़कियां खोलने का सबसे उपयुक्त समय ${outdoorWindow.startTimeLabel} से ${outdoorWindow.endTimeLabel} के बीच है।`
      : `Today's air quality update for ${profile.locationName}. Current AQI is ${aqiData.aqi}, category ${aqiData.category}. ${aqiData.healthAdvisoryEn}. The best window to venture out or ventilate your home is ${outdoorWindow.startTimeLabel} to ${outdoorWindow.endTimeLabel}.`;

    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = isHi ? 'hi-IN' : 'en-US';
    utterance.rate = 0.95;

    utterance.onend = () => setIsReadingAloud(false);
    utterance.onerror = () => setIsReadingAloud(false);

    setIsReadingAloud(true);
    window.speechSynthesis.speak(utterance);
  };

  const isHindi = language === 'hi';

  return (
    <>
      <SkipLink label={isHindi ? 'मुख्य सामग्री पर जाएं' : 'Skip to main content'} />

      <Header
        language={language}
        onToggleLanguage={handleToggleLanguage}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        isReadingAloud={isReadingAloud}
        onToggleReadAloud={handleToggleReadAloud}
        isDegraded={isDegraded}
      />

      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 focus:outline-none"
      >
        {/* Degraded mode banner (Never blank screen or raw 500) */}
        {isDegraded && (
          <DegradedBanner
            message={
              degradedReason ||
              (isHindi
                ? 'लाइव कनेक्शन धीमा होने के कारण प्रमाणित वैज्ञानिक नियम सक्रिय हैं।'
                : 'Live connection unavailable; calibrated deterministic models are active.')
            }
            onRetry={() => loadAQIData(profile.lat, profile.lon)}
            isRetrying={isRefreshingPlan}
          />
        )}

        {/* Mobile-Friendly Navigation Tabs */}
        <nav
          aria-label="Application Sections"
          className="flex border-b border-zinc-800 mb-6 overflow-x-auto no-scrollbar gap-1"
        >
          <button
            onClick={() => setActiveTab('today')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
              activeTab === 'today'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{isHindi ? 'आज की हवा' : 'Today Dashboard'}</span>
          </button>

          <button
            onClick={() => setActiveTab('plan')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
              activeTab === 'plan'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            <span>{isHindi ? 'कार्य योजना' : 'Personalised Plan'}</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
              activeTab === 'chat'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>{isHindi ? 'साँस से पूछें' : 'Ask Saans Chat'}</span>
          </button>

          <button
            onClick={() => setActiveTab('community')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 transition-colors whitespace-nowrap min-h-[44px] ${
              activeTab === 'community'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-950/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isHindi ? 'सोसाइटी मोड' : 'Community Mode'}</span>
          </button>
        </nav>

        {/* Tab Views */}
        {activeTab === 'today' && (
          <TodayDashboard
            aqiData={aqiData}
            hourlyForecast={hourlyForecast}
            outdoorWindow={outdoorWindow}
            locationName={profile.locationName}
            isHindi={isHindi}
          />
        )}

        {activeTab === 'plan' && (
          <PersonalisedPlan
            plan={plan}
            onRefreshPlan={() => loadPlanData(profile, aqiData, language)}
            isRefreshing={isRefreshingPlan}
            isHindi={isHindi}
            profile={profile}
            ambientPm25={aqiData.pollutantBreakdown.pm25?.concentration ?? 150}
          />
        )}

        {activeTab === 'chat' && (
          <AskSaansChat profile={profile} aqiData={aqiData} isHindi={isHindi} />
        )}

        {activeTab === 'community' && <CommunityMode isHindi={isHindi} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950 py-6 mt-12 text-center text-xs text-zinc-300">
        <div className="max-w-6xl mx-auto px-4 space-y-1">
          <p className="text-zinc-300">
            {isHindi
              ? 'साँस (Saans) — सर्दियों के स्मॉग से बचाव के लिए स्वच्छ वायु सहायक।'
              : 'Saans — AI & science-grounded clean air assistant for severe winter smog episodes.'}
          </p>
          <p className="text-[11px] text-zinc-400">
            {isHindi
              ? 'प्रमाणित स्रोत: CPCB, WHO, ARAI, CEEW, CEA | कोई चिकित्सीय परामर्श नहीं'
              : 'Sources: CPCB, WHO 2021, ARAI, CEEW, CEA | Non-medical advisory'}
          </p>
        </div>
      </footer>

      {/* Onboarding / Profile Edit Modal */}
      <OnboardingModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveProfile}
        initialProfile={profile}
        isHindi={isHindi}
      />
    </>
  );
}
