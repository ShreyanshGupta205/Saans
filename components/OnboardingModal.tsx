'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, X, Check, Search, Shield } from 'lucide-react';
import { POPULAR_INDIAN_LOCATIONS } from '@/data/locations';
import { CommuteMode, CookingFuel, HomeType, HouseholdProfile } from '@/lib/impact/types';

interface OnboardingModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: (profile: HouseholdProfile) => void;
  readonly initialProfile: HouseholdProfile;
  readonly isHindi?: boolean;
}

interface StepProps {
  readonly profile: HouseholdProfile;
  readonly setProfile: React.Dispatch<React.SetStateAction<HouseholdProfile>>;
  readonly isHindi: boolean;
}

const COMMUTE_OPTIONS: Array<{ value: CommuteMode; en: string; hi: string }> = [
  { value: 'metro', en: 'Metro Transit', hi: 'मेट्रो रेल' },
  { value: 'bus', en: 'Bus Transit', hi: 'बस' },
  { value: 'car_petrol', en: 'Petrol Car', hi: 'पेट्रोल कार' },
  { value: 'car_diesel', en: 'Diesel Car', hi: 'डीजल कार' },
  { value: 'car_ev', en: 'Electric Car (EV)', hi: 'इलेक्ट्रिक कार (EV)' },
  { value: 'two_wheeler', en: 'Two-Wheeler / Bike', hi: 'दोपहिया / बाइक' },
  { value: 'auto', en: 'Auto Rickshaw', hi: 'ऑटो रिक्शा' },
  { value: 'walk_cycle', en: 'Walk / Cycle', hi: 'पैदल / साइकिल' },
  { value: 'none', en: 'None (Remote)', hi: 'कोई नहीं (रिमोट)' },
];

const HOME_OPTIONS: Array<{ value: HomeType; en: string; hi: string }> = [
  { value: 'apartment_highrise', en: 'High-Rise Flat (5+ floors)', hi: 'मल्टी-स्टोरी फ्लैट (5+ मंजिल)' },
  { value: 'apartment_lowrise', en: 'Low-Rise Flat (1-4 floors)', hi: 'कम मंजिल फ्लैट (1-4 मंजिल)' },
  { value: 'independent_house', en: 'Independent House / Villa', hi: 'स्वतंत्र मकान / कोठी' },
  { value: 'semi_pucca', en: 'Semi-Pucca / Ventilated', hi: 'अर्ध-पक्का मकान' },
];

const FUEL_OPTIONS: Array<{ value: CookingFuel; en: string; hi: string }> = [
  { value: 'lpg', en: 'LPG Gas Cylinder', hi: 'एलपीजी सिलेंडर' },
  { value: 'png', en: 'Piped Natural Gas (PNG)', hi: 'पीएनजी (पाइप गैस)' },
  { value: 'electric_induction', en: 'Electric Induction', hi: 'इंडक्शन चूल्हा' },
  { value: 'biomass', en: 'Biomass / Firewood', hi: 'लकड़ी / चूल्हा' },
];

function ModalHeader({ onClose, isHindi }: { readonly onClose: () => void; readonly isHindi: boolean }) {
  return (
    <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
      <div>
        <h2 id="modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">
          {isHindi ? 'अपनी पारिवारिक प्रोफाइल सेट करें' : 'Household Clean-Air Profile'}
        </h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          {isHindi ? 'स्थान और जीवनशैली के अनुसार सटीक मॉडल (<60s)' : 'Calibrates exposure models and clean air routines (<60s)'}
        </p>
      </div>
      <button
        onClick={onClose}
        className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Close modal"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

function CityPills({
  profile,
  setProfile,
  search,
  isHindi,
}: {
  readonly profile: HouseholdProfile;
  readonly setProfile: React.Dispatch<React.SetStateAction<HouseholdProfile>>;
  readonly search: string;
  readonly isHindi: boolean;
}) {
  const filtered = POPULAR_INDIAN_LOCATIONS.filter(
    (c) =>
      c.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      c.nameHi.includes(search) ||
      c.stateEn.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {filtered.slice(0, 6).map((city) => {
        const isSelected = profile.lat === city.lat && profile.lon === city.lon;
        return (
          <button
            key={city.id}
            type="button"
            onClick={() => setProfile((p) => ({ ...p, locationName: isHindi ? city.nameHi : city.nameEn, lat: city.lat, lon: city.lon }))}
            className={`px-3 py-1 text-xs rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[36px] ${
              isSelected ? 'bg-emerald-600 text-white border-emerald-500 font-semibold' : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
            }`}
          >
            {isHindi ? city.nameHi : city.nameEn}
          </button>
        );
      })}
    </div>
  );
}

function useGpsDetector(setProfile: React.Dispatch<React.SetStateAction<HouseholdProfile>>, isHindi: boolean) {
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGps = () => {
    if (!navigator.geolocation) {
      setError(isHindi ? 'जीपीएस उपलब्ध नहीं है' : 'Geolocation is not supported');
      return;
    }
    setDetecting(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDetecting(false);
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lon = Math.round(pos.coords.longitude * 100) / 100;
        setProfile((prev) => ({ ...prev, locationName: `${lat}°N, ${lon}°E (GPS)`, lat, lon }));
      },
      () => { setDetecting(false); setError(isHindi ? 'स्थान प्राप्त नहीं हुआ' : 'GPS location error'); },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  return { detecting, error, handleGps };
}

function LocationStep({ profile, setProfile, isHindi }: StepProps) {
  const [search, setSearch] = useState('');
  const { detecting, error, handleGps } = useGpsDetector(setProfile, isHindi);

  return (
    <div className="space-y-3">
      <label className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
        <MapPin className="w-4 h-4" />
        <span>{isHindi ? '1. आपका स्थान (लोकेशन)' : '1. Location (Only Required Field)'}</span>
      </label>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
          <input
            type="text"
            placeholder={isHindi ? 'शहर खोजें...' : 'Search Indian city...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
          />
        </div>
        <button
          type="button"
          onClick={handleGps}
          disabled={detecting}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs sm:text-sm font-medium rounded-lg text-zinc-200 border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
        >
          <Navigation className={`w-4 h-4 text-emerald-400 ${detecting ? 'animate-spin' : ''}`} />
          <span>{detecting ? (isHindi ? 'खोज रहे हैं...' : 'Detecting...') : (isHindi ? 'जीपीएस स्थान' : 'GPS Detect')}</span>
        </button>
      </div>
      {error && <p className="text-xs text-rose-400 mt-1">{error}</p>}
      <CityPills profile={profile} setProfile={setProfile} search={search} isHindi={isHindi} />
      <div className="text-xs text-zinc-400">
        {isHindi ? 'चयनित: ' : 'Selected: '}
        <span className="font-semibold text-emerald-300">{profile.locationName}</span>
      </div>
    </div>
  );
}

function MemberInput({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: number;
  readonly onChange: (val: number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-zinc-300 block mb-1">{label}</label>
      <input
        type="number"
        min="0"
        max="20"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
      />
    </div>
  );
}

function HouseholdStep({ profile, setProfile, isHindi }: StepProps) {
  return (
    <div className="space-y-4 pt-4 border-t border-zinc-800">
      <span className="text-sm font-semibold text-emerald-400 block">{isHindi ? '2. परिवार के सदस्य' : '2. Household Demographics'}</span>
      <div className="grid grid-cols-3 gap-3">
        <MemberInput label={isHindi ? 'वयस्क (18-64)' : 'Adults (18-64)'} value={profile.adultsCount} onChange={(v) => setProfile((p) => ({ ...p, adultsCount: v }))} />
        <MemberInput label={isHindi ? 'बच्चे (<18)' : 'Children (<18)'} value={profile.childrenCount} onChange={(v) => setProfile((p) => ({ ...p, childrenCount: v }))} />
        <MemberInput label={isHindi ? 'बुजुर्ग (65+)' : 'Elderly (65+)'} value={profile.elderlyCount} onChange={(v) => setProfile((p) => ({ ...p, elderlyCount: v }))} />
      </div>
      <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" />
          <span className="text-xs sm:text-sm text-zinc-200">
            {isHindi ? 'अस्थमा या फेफड़े की बीमारी है?' : 'Any member with Asthma or COPD?'}
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={profile.hasSensitiveMembers}
          onClick={() => setProfile((p) => ({ ...p, hasSensitiveMembers: !p.hasSensitiveMembers }))}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
            profile.hasSensitiveMembers ? 'bg-emerald-600' : 'bg-zinc-700'
          }`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ${profile.hasSensitiveMembers ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  );
}

function CommuteSelect({ profile, setProfile, isHindi }: StepProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="text-xs text-zinc-300 block mb-1">{isHindi ? 'यात्रा साधन' : 'Commute Mode'}</label>
        <select
          value={profile.commuteMode}
          onChange={(e) => setProfile((p) => ({ ...p, commuteMode: e.target.value as CommuteMode }))}
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
        >
          {COMMUTE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{isHindi ? opt.hi : opt.en}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-zinc-300 block mb-1">{isHindi ? 'दूरी (एक तरफ, किमी)' : 'One-Way Distance (km)'}</label>
        <input
          type="number"
          min="0"
          max="100"
          value={profile.commuteDistanceKm}
          onChange={(e) => setProfile((p) => ({ ...p, commuteDistanceKm: Math.max(0, parseInt(e.target.value) || 0) }))}
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
        />
      </div>
    </div>
  );
}

function HousingSelect({ profile, setProfile, isHindi }: StepProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="text-xs text-zinc-300 block mb-1">{isHindi ? 'घर का प्रकार' : 'Home Construction'}</label>
        <select
          value={profile.homeType}
          onChange={(e) => setProfile((p) => ({ ...p, homeType: e.target.value as HomeType }))}
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
        >
          {HOME_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{isHindi ? opt.hi : opt.en}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs text-zinc-300 block mb-1">{isHindi ? 'रसोई का ईंधन' : 'Cooking Fuel'}</label>
        <select
          value={profile.cookingFuel}
          onChange={(e) => setProfile((p) => ({ ...p, cookingFuel: e.target.value as CookingFuel }))}
          className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
        >
          {FUEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{isHindi ? opt.hi : opt.en}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function LifestyleStep(props: StepProps) {
  const { profile, setProfile, isHindi } = props;
  return (
    <div className="space-y-4 pt-4 border-t border-zinc-800">
      <span className="text-sm font-semibold text-emerald-400 block">{isHindi ? '3. जीवनशैली और यात्रा' : '3. Lifestyle & Commute'}</span>
      <CommuteSelect {...props} />
      <HousingSelect {...props} />
      <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
        <span className="text-xs sm:text-sm text-zinc-200">{isHindi ? 'ट्रू HEPA एयर प्यूरीफायर है?' : 'True HEPA Air Purifier at home?'}</span>
        <button
          type="button"
          role="switch"
          aria-checked={profile.hasAirPurifier}
          onClick={() => setProfile((p) => ({ ...p, hasAirPurifier: !p.hasAirPurifier }))}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
            profile.hasAirPurifier ? 'bg-emerald-600' : 'bg-zinc-700'
          }`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ${profile.hasAirPurifier ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
    </div>
  );
}

export function OnboardingModal({
  isOpen,
  onClose,
  onSave,
  initialProfile,
  isHindi = false,
}: OnboardingModalProps) {
  const [profile, setProfile] = useState<HouseholdProfile>(initialProfile);
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl text-zinc-100">
        <ModalHeader onClose={onClose} isHindi={isHindi} />
        <form onSubmit={(e) => { e.preventDefault(); onSave(profile); onClose(); }} className="space-y-6">
          <LocationStep profile={profile} setProfile={setProfile} isHindi={isHindi} />
          <HouseholdStep profile={profile} setProfile={setProfile} isHindi={isHindi} />
          <LifestyleStep profile={profile} setProfile={setProfile} isHindi={isHindi} />
          <div className="pt-4 border-t border-zinc-800">
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Check className="w-5 h-5" />
              <span>{isHindi ? 'सुरक्षित करें और डैशबोर्ड देखें' : 'Save & View Dashboard'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
