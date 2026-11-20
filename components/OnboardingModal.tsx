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

export function OnboardingModal({
  isOpen,
  onClose,
  onSave,
  initialProfile,
  isHindi = false,
}: OnboardingModalProps) {
  const [profile, setProfile] = useState<HouseholdProfile>(initialProfile);
  const [citySearch, setCitySearch] = useState('');
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter popular cities based on search
  const filteredCities = POPULAR_INDIAN_LOCATIONS.filter(
    (c) =>
      c.nameEn.toLowerCase().includes(citySearch.toLowerCase()) ||
      c.nameHi.includes(citySearch) ||
      c.stateEn.toLowerCase().includes(citySearch.toLowerCase())
  );

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setGpsError(isHindi ? 'ब्राउज़र में जीपीएस उपलब्ध नहीं है' : 'Geolocation is not supported by your browser');
      return;
    }

    setIsDetectingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsDetectingGps(false);
        const lat = Math.round(pos.coords.latitude * 100) / 100;
        const lon = Math.round(pos.coords.longitude * 100) / 100;

        setProfile((prev) => ({
          ...prev,
          locationName: `${lat}°N, ${lon}°E (GPS)`,
          lat,
          lon,
        }));
      },
      (err) => {
        setIsDetectingGps(false);
        setGpsError(
          err.code === 1
            ? isHindi ? 'स्थान की अनुमति अस्वीकृत की गई' : 'Location permission denied'
            : isHindi ? 'स्थान प्राप्त नहीं हो सका' : 'Unable to determine GPS location'
        );
      },
      { timeout: 8000, enableHighAccuracy: false }
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
          <div>
            <h2 id="modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">
              {isHindi ? 'अपनी पारिवारिक प्रोफाइल सेट करें' : 'Household Clean-Air Profile'}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isHindi
                ? 'स्थान और जीवनशैली के अनुसार सटीक वायु मॉडल (<60 सेकंड)'
                : 'Calibrates exposure models and clean air routines (<60s)'}
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

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: LOCATION */}
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
                  placeholder={
                    isHindi
                      ? 'शहर खोजें (दिल्ली, नोएडा, गुरुग्राम, मुंबई)...'
                      : 'Search Indian city (Delhi, Noida, Gurgaon, Mumbai)...'
                  }
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              <button
                type="button"
                onClick={handleUseGps}
                disabled={isDetectingGps}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-xs sm:text-sm font-medium rounded-lg text-zinc-200 border border-zinc-700 flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
              >
                <Navigation className={`w-4 h-4 text-emerald-400 ${isDetectingGps ? 'animate-spin' : ''}`} />
                <span>{isDetectingGps ? (isHindi ? 'खोज रहे हैं...' : 'Detecting...') : (isHindi ? 'जीपीएस स्थान' : 'GPS Detect')}</span>
              </button>
            </div>

            {gpsError && (
              <p className="text-xs text-rose-400 mt-1">{gpsError}</p>
            )}

            {/* Quick City Selection Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {filteredCities.slice(0, 6).map((city) => {
                const isSelected = profile.lat === city.lat && profile.lon === city.lon;
                return (
                  <button
                    key={city.id}
                    type="button"
                    onClick={() =>
                      setProfile((prev) => ({
                        ...prev,
                        locationName: isHindi ? city.nameHi : city.nameEn,
                        lat: city.lat,
                        lon: city.lon,
                      }))
                    }
                    className={`px-3 py-1 text-xs rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[36px] ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-500 font-semibold'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                    }`}
                  >
                    {isHindi ? city.nameHi : city.nameEn}
                  </button>
                );
              })}
            </div>

            <div className="text-xs text-zinc-400">
              {isHindi ? 'चयनित स्थान: ' : 'Selected: '}
              <span className="font-semibold text-emerald-300">{profile.locationName}</span>
              <span className="text-zinc-500 text-[11px] ml-1">
                ({profile.lat.toFixed(2)}, {profile.lon.toFixed(2)})
              </span>
            </div>
          </div>

          {/* SECTION 2: HOUSEHOLD */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <span className="text-sm font-semibold text-emerald-400 block">
              {isHindi ? '2. परिवार के सदस्य' : '2. Household Demographics'}
            </span>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-zinc-300 block mb-1">
                  {isHindi ? 'वयस्क (18-64)' : 'Adults (18-64)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={profile.adultsCount}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, adultsCount: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">
                  {isHindi ? 'बच्चे (<18)' : 'Children (<18)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={profile.childrenCount}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, childrenCount: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-300 block mb-1">
                  {isHindi ? 'बुजुर्ग (65+)' : 'Elderly (65+)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={profile.elderlyCount}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, elderlyCount: parseInt(e.target.value) || 0 }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>
            </div>

            {/* Sensitive member toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-rose-400" />
                <span className="text-xs sm:text-sm text-zinc-200">
                  {isHindi
                    ? 'क्या किसी को अस्थमा, फेफड़े की बीमारी या गर्भावस्था है?'
                    : 'Any member with Asthma, COPD, heart condition, or pregnancy?'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={profile.hasSensitiveMembers}
                onClick={() =>
                  setProfile((prev) => ({ ...prev, hasSensitiveMembers: !prev.hasSensitiveMembers }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  profile.hasSensitiveMembers ? 'bg-emerald-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile.hasSensitiveMembers ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* SECTION 3: LIFESTYLE & COMMUTE */}
          <div className="space-y-4 pt-4 border-t border-zinc-800">
            <span className="text-sm font-semibold text-emerald-400 block">
              {isHindi ? '3. जीवनशैली और यात्रा' : '3. Lifestyle & Commute'}
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Commute Mode */}
              <div>
                <label className="text-xs text-zinc-300 block mb-1">
                  {isHindi ? 'आने-जाने का मुख्य साधन' : 'Commute Mode'}
                </label>
                <select
                  value={profile.commuteMode}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, commuteMode: e.target.value as CommuteMode }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  <option value="metro">{isHindi ? 'मेट्रो रेल' : 'Metro Transit'}</option>
                  <option value="bus">{isHindi ? 'बस' : 'Bus Transit'}</option>
                  <option value="car_petrol">{isHindi ? 'पेट्रोल कार' : 'Petrol Car'}</option>
                  <option value="car_diesel">{isHindi ? 'डीजल कार' : 'Diesel Car'}</option>
                  <option value="car_ev">{isHindi ? 'इलेक्ट्रिक कार (EV)' : 'Electric Car (EV)'}</option>
                  <option value="two_wheeler">{isHindi ? 'दोपहिया / बाइक' : 'Two-Wheeler / Bike'}</option>
                  <option value="auto">{isHindi ? 'ऑटो रिक्शा' : 'Auto Rickshaw'}</option>
                  <option value="walk_cycle">{isHindi ? 'पैदल / साइकिल' : 'Walk / Cycle'}</option>
                  <option value="none">{isHindi ? 'कोई नहीं (रिमोट)' : 'None (Remote)'}</option>
                </select>
              </div>

              {/* Commute Distance */}
              <div>
                <label className="text-xs text-zinc-300 block mb-1">
                  {isHindi ? 'दूरी (एक तरफ, किमी)' : 'One-Way Distance (km)'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={profile.commuteDistanceKm}
                  onChange={(e) =>
                    setProfile((prev) => ({
                      ...prev,
                      commuteDistanceKm: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                />
              </div>

              {/* Home Type */}
              <div>
                <label className="text-xs text-zinc-300 block mb-1">
                  {isHindi ? 'घर का प्रकार' : 'Home Construction Type'}
                </label>
                <select
                  value={profile.homeType}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, homeType: e.target.value as HomeType }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  <option value="apartment_highrise">
                    {isHindi ? 'मल्टी-स्टोरी फ्लैट (5+ मंजिल)' : 'High-Rise Flat (5+ floors)'}
                  </option>
                  <option value="apartment_lowrise">
                    {isHindi ? 'कम मंजिल फ्लैट (1-4 मंजिल)' : 'Low-Rise Flat (1-4 floors)'}
                  </option>
                  <option value="independent_house">
                    {isHindi ? 'स्वतंत्र मकान / कोठी' : 'Independent House / Villa'}
                  </option>
                  <option value="semi_pucca">
                    {isHindi ? 'अर्ध-पक्का मकान' : 'Semi-Pucca / Ventilated'}
                  </option>
                </select>
              </div>

              {/* Cooking Fuel */}
              <div>
                <label className="text-xs text-zinc-300 block mb-1">
                  {isHindi ? 'रसोई का ईंधन' : 'Kitchen Cooking Fuel'}
                </label>
                <select
                  value={profile.cookingFuel}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, cookingFuel: e.target.value as CookingFuel }))
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[44px]"
                >
                  <option value="lpg">{isHindi ? 'एलपीजी सिलेंडर' : 'LPG Gas Cylinder'}</option>
                  <option value="png">{isHindi ? 'पीएनजी (पाइप गैस)' : 'Piped Natural Gas (PNG)'}</option>
                  <option value="electric_induction">{isHindi ? 'इंडक्शन चूल्हा' : 'Electric Induction'}</option>
                  <option value="biomass">{isHindi ? 'लकड़ी / चूल्हा' : 'Biomass / Firewood'}</option>
                </select>
              </div>
            </div>

            {/* True HEPA Purifier Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-950 border border-zinc-800">
              <span className="text-xs sm:text-sm text-zinc-200">
                {isHindi
                  ? 'क्या आपके घर में ट्रू HEPA एयर प्यूरीफायर है?'
                  : 'Do you have a True HEPA Air Purifier at home?'}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={profile.hasAirPurifier}
                onClick={() =>
                  setProfile((prev) => ({ ...prev, hasAirPurifier: !prev.hasAirPurifier }))
                }
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  profile.hasAirPurifier ? 'bg-emerald-600' : 'bg-zinc-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    profile.hasAirPurifier ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Submit Button */}
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
