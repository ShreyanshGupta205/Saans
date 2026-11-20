'use client';

import React, { useState } from 'react';
import { Users, Copy, Check, Printer, ShieldCheck, HeartHandshake } from 'lucide-react';
import { calculateCommunityImpact } from '@/lib/impact/community';

interface CommunityModeProps {
  readonly isHindi?: boolean;
}

export function CommunityMode({ isHindi = false }: CommunityModeProps) {
  const [householdsCount, setHouseholdsCount] = useState<number>(50);
  const [copied, setCopied] = useState<boolean>(false);

  const impact = calculateCommunityImpact(householdsCount);

  const checklistItems = isHindi
    ? [
        'सिक्योरिटी गार्ड्स के लिए लकड़ी/कोयला जलाने की जगह इलेक्ट्रिक हीटर (₹1,000 प्रति गेट) लगवाएं',
        'सोसाइटी परिसर में सूखे पत्तों और कचरे को खुले में जलाने पर पूर्ण प्रतिबंध लगाएं',
        'दफ्तर और स्कूल जाने के लिए सोसाइटी स्तर पर कारपूल और मेट्रो समूहों को बढ़ावा दें',
        'सफाई कर्मचारियों को सूखे झाड़ू की जगह माइक्रोफाइबर गीला पोछा इस्तेमाल करने को कहें',
        'शाम 5:00 बजे के बाद मुख्य लॉबी और सीढ़ियों की खिड़कियां बंद रखें ताकि बाहर का धुआं अंदर न चढ़े',
      ]
    : [
        'Replace security guard wood/coal warming tins with electric radiant quartz heaters (₹1,000/gate)',
        'Strict ban on open burning of autumn fallen dry leaves and garden waste in society premises',
        'Coordinate weekly society carpool / metro transit groups for office and school commutes',
        'Equip society maintenance staff with microfiber wet-mops instead of dry brooms for corridors',
        'Seal entry lobbies and stairwell windows after 5:00 PM to prevent chimney-effect infiltration',
      ];

  const pledgeText = isHindi
    ? `स्वच्छ वायु समुदाय संकल्प (आरडब्ल्यूए / सोसाइटी):\nहम अपनी सोसाइटी के निवासी इस सर्दियों के स्मॉग सीजन में कम उत्सर्जन वाली आदतें अपनाने का संकल्प लेते हैं: खुले में आग नहीं जलाएंगे, सार्वजनिक परिवहन और कारपूल अपनाएंगे, अपने सुरक्षा गार्ड्स को स्वच्छ हीटर देंगे, और प्रदूषण बढ़ने पर बच्चों और बुजुर्गों को घर के अंदर सुरक्षित रखेंगे।\n\nसामूहिक प्रभाव (${householdsCount} परिवार):\n- ${impact.kgPm25Prevented} किग्रा PM2.5 रोका गया\n- ${impact.tonsCO2eReduced} टन CO2e में कमी\n- ${impact.carTripsAvoided} कार यात्राएं बचाई गईं\n- ${impact.highExposureHoursAverted} घंटे खतरनाक जोखिम से बचाए गए`
    : `Clean Air Community Action Pack & Pledge (RWA / Society):\nWe, the residents of our community, pledge to adopt low-emission routines this winter smog season: avoiding open combustion, shifting to public transit and carpooling, protecting our sanitation staff and security guards with clean warmth, and keeping vulnerable children and seniors safe indoors during inversion spikes.\n\nCollective Season Impact (${householdsCount} Households):\n- ${impact.kgPm25Prevented} kg PM2.5 Prevented\n- ${impact.tonsCO2eReduced} Tons CO2e Reduced\n- ${impact.carTripsAvoided} Car Trips Avoided\n- ${impact.highExposureHoursAverted} High-Exposure Hours Averted`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pledgeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <section aria-labelledby="community-heading" className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" aria-hidden="true" />
            <h2 id="community-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-100">
              {isHindi ? 'सोसाइटी मोड: पड़ोस कार्य योजना' : 'Community Mode: Neighbourhood Action Pack'}
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
            {isHindi
              ? 'अपनी आरडब्ल्यूए (RWA) या सोसाइटी के साथ मिलकर प्रदूषण के विरुद्ध सामूहिक कदम उठाएं'
              : 'Scale clean-air action across your RWA, apartment society, or mohalla'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[44px]"
            aria-label="Copy action pack and pledge to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            )}
            <span>{copied ? (isHindi ? 'कॉपी हो गया!' : 'Copied!') : (isHindi ? 'पैक कॉपी करें' : 'Copy Pack')}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors focus-visible:ring-2 focus-visible:ring-emerald-400 min-h-[44px]"
            aria-label="Print clean air community pack"
          >
            <Printer className="w-4 h-4" aria-hidden="true" />
            <span>{isHindi ? 'प्रिंट पैक' : 'Print Pack'}</span>
          </button>
        </div>
      </div>

      {/* Household Slider Controller */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
        <label
          htmlFor="households-slider"
          className="text-sm font-semibold text-zinc-200 flex items-center justify-between mb-2"
        >
          <span>{isHindi ? 'सोसाइटी में भाग लेने वाले परिवारों की संख्या:' : 'Number of Participating Households:'}</span>
          <span className="text-emerald-400 font-mono text-lg font-bold">
            {householdsCount} {isHindi ? 'परिवार' : 'Homes'}
          </span>
        </label>
        <input
          id="households-slider"
          type="range"
          min="10"
          max="500"
          step="5"
          value={householdsCount}
          onChange={(e) => setHouseholdsCount(parseInt(e.target.value) || 50)}
          className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 min-h-[36px]"
          aria-valuemin={10}
          aria-valuemax={500}
          aria-valuenow={householdsCount}
        />
        <div className="flex justify-between text-[11px] text-zinc-400 mt-1">
          <span>10 {isHindi ? 'घर' : 'Homes'}</span>
          <span>100 {isHindi ? 'घर' : 'Homes'}</span>
          <span>250 {isHindi ? 'घर' : 'Homes'}</span>
          <span>500 {isHindi ? 'घर' : 'Homes'}</span>
        </div>
      </div>

      {/* Aggregate Impact Numbers Grid */}
      <div>
        <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-3">
          {isHindi
            ? `90 दिनों के स्मॉग सीजन में सामूहिक प्रभाव (${householdsCount} परिवार)`
            : `90-Day Winter Smog Season Aggregate Impact (${householdsCount} Households)`}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* kg PM2.5 Prevented */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono block">
              {impact.kgPm25Prevented}
            </span>
            <span className="text-xs text-zinc-300 font-medium mt-1 block">
              {isHindi ? 'किग्रा PM2.5 रोका गया' : 'kg PM2.5 Prevented'}
            </span>
          </div>

          {/* Tons CO2e Reduced */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <span className="text-2xl sm:text-3xl font-black text-teal-400 font-mono block">
              {impact.tonsCO2eReduced}
            </span>
            <span className="text-xs text-zinc-300 font-medium mt-1 block">
              {isHindi ? 'टन CO2e में कमी' : 'Tons CO2e Reduced'}
            </span>
          </div>

          {/* Car Trips Avoided */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <span className="text-2xl sm:text-3xl font-black text-sky-400 font-mono block">
              {impact.carTripsAvoided}
            </span>
            <span className="text-xs text-zinc-300 font-medium mt-1 block">
              {isHindi ? 'कार यात्राएं बचाई गईं' : 'Car Trips Avoided'}
            </span>
          </div>

          {/* High Exposure Hours Averted */}
          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
            <span className="text-2xl sm:text-3xl font-black text-purple-400 font-mono block">
              {impact.highExposureHoursAverted.toLocaleString()}
            </span>
            <span className="text-xs text-zinc-300 font-medium mt-1 block">
              {isHindi ? 'घंटे खतरनाक जोखिम से बचाए गए' : 'Clean Hours Protected'}
            </span>
          </div>
        </div>
      </div>

      {/* RWA Action Checklist */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <h3 className="text-base font-bold text-zinc-100">
            {isHindi ? 'आरडब्ल्यूए (RWA) स्वच्छ वायु कार्य सूची' : 'RWA Clean Air Action Checklist'}
          </h3>
        </div>

        <ul className="space-y-3">
          {checklistItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-zinc-300">
              <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-700/60 text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Community Pledge */}
      <div className="bg-gradient-to-br from-emerald-950/40 to-zinc-900 border border-emerald-900/50 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <HeartHandshake className="w-5 h-5 text-emerald-400" aria-hidden="true" />
          <h3 className="text-base font-bold text-zinc-100">
            {isHindi ? 'स्वच्छ वायु समुदाय संकल्प' : 'Clean Air Community Pledge'}
          </h3>
        </div>
        <blockquote className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic border-l-2 border-emerald-500 pl-4 py-1">
          &ldquo;
          {isHindi
            ? 'हम अपनी सोसाइटी के निवासी इस सर्दियों के स्मॉग सीजन में कम उत्सर्जन वाली आदतें अपनाने का संकल्प लेते हैं: खुले में आग नहीं जलाएंगे, सार्वजनिक परिवहन और कारपूल अपनाएंगे, अपने सुरक्षा गार्ड्स को स्वच्छ हीटर देंगे, और प्रदूषण बढ़ने पर बच्चों और बुजुर्गों को घर के अंदर सुरक्षित रखेंगे।'
            : 'We, the residents of our community, pledge to adopt low-emission routines this winter smog season: avoiding open combustion, shifting to public transit and carpooling, protecting our sanitation staff and security guards with clean warmth, and keeping vulnerable children and seniors safe indoors during inversion spikes.'}
          &rdquo;
        </blockquote>
      </div>
    </section>
  );
}
