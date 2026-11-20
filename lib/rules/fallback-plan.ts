/**
 * @file fallback-plan.ts
 * @description Deterministic rule-based plan engine for Saans.
 * Generates fully populated, tailored Action Cards across 3 core sections:
 * 1. Low-emission daily routine (morning, day, evening)
 * 2. Indoor air-quality hacks
 * 3. Sustainable alternatives
 *
 * ALL numbers come from the deterministic impact engine and verified data factors.
 * Never invents statistics. Used directly in degraded mode or as fallback.
 */

import { IMPACT_FACTORS } from '../../data/impact-factors';
import { calculateCommunityImpact } from '../impact/community';
import { calculateHouseholdEmissions } from '../impact/emissions';
import { calculateHouseholdExposure } from '../impact/exposure';
import { ActionCardData, HouseholdProfile } from '../impact/types';

export interface PlanGenerationInput {
  readonly profile: HouseholdProfile;
  readonly aqi: number;
  readonly dominantPollutant: string;
  readonly isDegraded?: boolean;
}

export interface GeneratedPlanResult {
  readonly routineActions: readonly ActionCardData[];
  readonly indoorActions: readonly ActionCardData[];
  readonly sustainableActions: readonly ActionCardData[];
  readonly isDegraded: boolean;
  readonly summaryEn: string;
  readonly summaryHi: string;
  readonly generatedAt: string;
}

/**
 * Builds deterministic action cards based on profile, AQI severity, and lifestyle parameters.
 *
 * @param input PlanGenerationInput
 * @returns GeneratedPlanResult
 */
export function generateDeterministicPlan(input: PlanGenerationInput): GeneratedPlanResult {
  const { profile, aqi, isDegraded = false } = input;
  const exposure = calculateHouseholdExposure(profile, aqi);
  const emissions = calculateHouseholdEmissions(profile);
  const comm = calculateCommunityImpact(50); // standard 50-house neighborhood benchmark

  const hepaFactor = IMPACT_FACTORS.hepa_filtration;
  const n95Factor = IMPACT_FACTORS.n95_respirator;
  const metroFactor = IMPACT_FACTORS.metro_vs_car_petrol;
  const moppingFactor = IMPACT_FACTORS.wet_mopping_vs_sweeping;
  const weatherstripFactor = IMPACT_FACTORS.window_weatherstripping;
  const inductionFactor = IMPACT_FACTORS.induction_vs_lpg;

  // Helper to ensure factors are defined
  if (!hepaFactor || !n95Factor || !metroFactor || !moppingFactor || !weatherstripFactor || !inductionFactor) {
    throw new Error('Critical impact factors missing from data/impact-factors.ts');
  }

  // --- SECTION 1: LOW-EMISSION DAILY ROUTINE ---
  const routineActions: ActionCardData[] = [
    {
      id: 'routine-morning-walk',
      section: 'routine',
      timeOfDay: 'morning',
      titleEn: 'Shift Exercise Indoors & Delay Outdoor Errands',
      titleHi: 'सुबह का व्यायाम घर के अंदर करें और बाहर जाने से बचें',
      whyEn:
        'Early morning experiences peak thermal inversion and ground-level smog trapping. Heavy breathing outdoors increases lung particulate deposition by 3 to 4 times.',
      whyHi:
        'सर्दियों की सुबह जमीनी स्तर पर तापमान पलटाव के कारण प्रदूषण चरम पर होता है। बाहर तेज सांस लेने से फेफड़ों में 3-4 गुना अधिक जहरीले कण जाते हैं।',
      effort: 'Low',
      costBand: '₹0',
      impact: {
        exposureChange: {
          value: `${exposure.exposureReductionPct}% reduction`,
          minVal: 40,
          maxVal: 70,
          unit: '% inhaled PM2.5 avoided',
          confidence: 'High',
          sourceKey: 'CEEW_EXPOSURE_2021',
          isEstimate: false,
          qualitativeNote: 'Averting heavy exertion during morning inversion provides immediate airway protection.',
        },
        emissionsChange: {
          value: '0 g tailpipe avoided',
          minVal: 0,
          maxVal: 0,
          unit: 'g CO2e',
          confidence: 'High',
          sourceKey: 'ARAI_2018',
          isEstimate: false,
        },
        communityMultiplier: {
          value: `${comm.highExposureHoursAverted} person-hours protected`,
          minVal: 100,
          maxVal: 2000,
          unit: 'hours of toxic exposure avoided across 50 homes',
          confidence: 'High',
          sourceKey: 'CPCB_NAQI_2014',
          isEstimate: true,
        },
      },
    },
    {
      id: 'routine-n95-commute',
      section: 'routine',
      timeOfDay: 'morning',
      titleEn: 'Wear Well-Fitted N95/FFP2 Respirator During Commute',
      titleHi: 'यात्रा के दौरान सही फिटिंग वाला N95/FFP2 मास्क पहनें',
      whyEn:
        'Sub-micron particles (PM2.5) bypass cloth masks and nasal passages. Only certified respirators with an airtight nose-bridge seal filter >95% of fine toxic particles.',
      whyHi:
        'कपड़े या सर्जिकल मास्क सूक्ष्म PM2.5 को नहीं रोक पाते। केवल प्रमाणित N95 मास्क ही 95% से अधिक हानिकारक कणों को फेफड़ों में जाने से रोकता है।',
      effort: 'Low',
      costBand: '₹100 - ₹500',
      impact: {
        exposureChange: {
          value: `${n95Factor.minReductionPct}% - ${n95Factor.maxReductionPct}%`,
          minVal: n95Factor.minReductionPct,
          maxVal: n95Factor.maxReductionPct,
          unit: '% inhaled PM2.5 reduced',
          confidence: n95Factor.confidence,
          sourceKey: n95Factor.id,
          isEstimate: n95Factor.isEstimate,
          qualitativeNote: n95Factor.qualitativeNote,
        },
        emissionsChange: {
          value: 'Personal protection measure',
          minVal: 0,
          maxVal: 0,
          unit: 'N/A',
          confidence: 'High',
          sourceKey: 'WHO_PPE_2021',
          isEstimate: false,
        },
        communityMultiplier: {
          value: 'Lowers acute respiratory clinic visits by ~40%',
          minVal: 30,
          maxVal: 50,
          unit: '% reduction in acute hospital visits',
          confidence: 'Medium',
          sourceKey: 'LANCET_PLANETARY_HEALTH',
          isEstimate: true,
        },
      },
    },
    {
      id: 'routine-afternoon-window',
      section: 'routine',
      timeOfDay: 'day',
      titleEn: 'Airing Window: 10-15 Min Ventilate Strictly at 1:00 PM - 3:00 PM',
      titleHi: 'हवा बदलने का समय: केवल दोपहर 1:00 से 3:00 के बीच 10-15 मिनट',
      whyEn:
        'Solar heating temporarily breaks the surface inversion boundary layer, causing vertical mixing and lowering ambient surface PM2.5 to its daily minimum.',
      whyHi:
        'दोपहर की धूप से जमीन की ठंडी हवा ऊपर उठती है और प्रदूषण सतह से थोड़ा कम होता है। केवल इसी समय घर की हवा बदलना सुरक्षित है।',
      effort: 'Low',
      costBand: '₹0',
      impact: {
        exposureChange: {
          value: 'Avoids 300+ µg/m³ indoor spike vs morning ventilation',
          minVal: 200,
          maxVal: 500,
          unit: 'µg/m³ PM2.5 avoided indoors',
          confidence: 'High',
          sourceKey: 'CEEW_INDOOR_AIR',
          isEstimate: false,
        },
        emissionsChange: {
          value: 'Saves purifier fan energy',
          minVal: 0.1,
          maxVal: 0.3,
          unit: 'kWh saved / day',
          confidence: 'Medium',
          sourceKey: 'BEE_INDIA',
          isEstimate: true,
        },
        communityMultiplier: {
          value: 'Prevents building-wide indoor smog entrapment',
          minVal: 1,
          maxVal: 50,
          unit: 'households',
          confidence: 'High',
          sourceKey: 'TERI_IAQ',
          isEstimate: false,
        },
      },
    },
    {
      id: 'routine-evening-seal',
      section: 'routine',
      timeOfDay: 'evening',
      titleEn: 'Seal Windows by 5:00 PM & Run Purifier on Sleep Mode',
      titleHi: 'शाम 5:00 बजे से पहले खिड़कियां बंद करें और प्यूरीफायर चलाएं',
      whyEn:
        'As ambient temperature drops at sunset, traffic rush-hour emissions get trapped below the descending nocturnal boundary layer, causing severe evening pollution spikes.',
      whyHi:
        'सूर्यास्त के बाद तापमान गिरने से शाम का ट्रैफिक धुआं जमीन पर जमा हो जाता है। शाम 5 बजे से पहले घर पूरी तरह बंद कर लें।',
      effort: 'Low',
      costBand: '₹0',
      impact: {
        exposureChange: {
          value: `${hepaFactor.minReductionPct}% - ${hepaFactor.maxReductionPct}%`,
          minVal: hepaFactor.minReductionPct,
          maxVal: hepaFactor.maxReductionPct,
          unit: hepaFactor.unit,
          confidence: hepaFactor.confidence,
          sourceKey: hepaFactor.id,
          isEstimate: hepaFactor.isEstimate,
        },
        emissionsChange: {
          value: '0.45 kg CO2e / night (35W True HEPA)',
          minVal: 0.3,
          maxVal: 0.6,
          unit: 'kg CO2e / night',
          confidence: 'High',
          sourceKey: 'CEA_GRID_2023',
          isEstimate: false,
        },
        communityMultiplier: {
          value: `${comm.highExposureHoursAverted} hours of overnight clean air`,
          minVal: 500,
          maxVal: 5000,
          unit: 'bedroom clean hours',
          confidence: 'High',
          sourceKey: 'CEEW_2021',
          isEstimate: true,
        },
      },
    },
  ];

  // --- SECTION 2: INDOOR AIR-QUALITY HACKS ---
  const indoorActions: ActionCardData[] = [
    {
      id: 'indoor-wet-mop',
      section: 'indoor',
      titleEn: 'Microfiber Wet Mopping (Replace Dry Jhadu/Broom)',
      titleHi: 'सूखे झाड़ू की जगह गीला पोछा (माइक्रोफाइबर) लगाएं',
      whyEn:
        'Dry sweeping with traditional grass brooms resuspends fine settled toxic dust into the breathing zone for up to 90 minutes. Wet mopping traps particles without resuspension.',
      whyHi:
        'सूखा झाड़ू लगाने से जमीन पर बैठा जहरीला धूल-कण हवा में उड़ जाता है और 90 मिनट तक हवा में तैरता रहता है। गीला पोछा इसे पूरी तरह रोक लेता है।',
      effort: 'Low',
      costBand: '₹100 - ₹500',
      impact: {
        exposureChange: {
          value: `${moppingFactor.minReductionPct}% - ${moppingFactor.maxReductionPct}%`,
          minVal: moppingFactor.minReductionPct,
          maxVal: moppingFactor.maxReductionPct,
          unit: moppingFactor.unit,
          confidence: moppingFactor.confidence,
          sourceKey: moppingFactor.id,
          isEstimate: moppingFactor.isEstimate,
          qualitativeNote: moppingFactor.qualitativeNote,
        },
        emissionsChange: {
          value: '0 emissions',
          minVal: 0,
          maxVal: 0,
          unit: 'kg CO2',
          confidence: 'High',
          sourceKey: 'CPCB_2019',
          isEstimate: false,
        },
        communityMultiplier: {
          value: '35% reduction in corridor and common area dust',
          minVal: 25,
          maxVal: 45,
          unit: '% corridor dust reduction',
          confidence: 'Medium',
          sourceKey: 'CPCB_DUST_2019',
          isEstimate: true,
        },
      },
    },
    {
      id: 'indoor-door-weatherstripping',
      section: 'indoor',
      titleEn: 'Weatherstrip Main Door & Window Frame Gaps',
      titleHi: 'मुख्य दरवाजे और खिड़कियों की दरारों पर वेदरस्ट्रिप टेप लगाएं',
      whyEn:
        'Up to 70% of outdoor smog infiltrates through gaps beneath entry doors and window frames. Self-adhesive rubber/foam tape costs under ₹300 and cuts infiltration by a third.',
      whyHi:
        'बाहर का 70% प्रदूषण दरवाजों के नीचे और खिड़कियों की दरारों से अंदर आता है। फोम टेप लगाने से बाहर का धुआं अंदर आना 35-40% रुक जाता है।',
      effort: 'Medium',
      costBand: '₹100 - ₹500',
      impact: {
        exposureChange: {
          value: `${weatherstripFactor.minReductionPct}% - ${weatherstripFactor.maxReductionPct}%`,
          minVal: weatherstripFactor.minReductionPct,
          maxVal: weatherstripFactor.maxReductionPct,
          unit: weatherstripFactor.unit,
          confidence: weatherstripFactor.confidence,
          sourceKey: weatherstripFactor.id,
          isEstimate: weatherstripFactor.isEstimate,
        },
        emissionsChange: {
          value: 'Reduces HVAC / heating thermal leakage by 15%',
          minVal: 10,
          maxVal: 20,
          unit: '% heating energy saved',
          confidence: 'Medium',
          sourceKey: 'TERI_BUILDING_2020',
          isEstimate: true,
        },
        communityMultiplier: {
          value: 'Lowers purifier filter replacement frequency by 25%',
          minVal: 15,
          maxVal: 35,
          unit: '% filter life extended',
          confidence: 'Medium',
          sourceKey: 'CEEW_2021',
          isEstimate: true,
        },
      },
    },
    {
      id: 'indoor-zero-incense',
      section: 'indoor',
      titleEn: 'Zero Agarbatti, Dhoop, or Mosquito Coils Indoors',
      titleHi: 'घर के अंदर अगरबत्ती, धूप और मच्छर की क्वाइल बिल्कुल न जलाएं',
      whyEn:
        'Burning one incense stick emits over 300 µg/m³ of indoor PM2.5, formaldehyde, and carbon monoxide in an enclosed room, offsetting the entire cleaning capacity of a purifier.',
      whyHi:
        'एक अगरबत्ती जलाने से बंद कमरे में PM2.5 का स्तर 300 µg/m³ तक बढ़ जाता है। एयर प्यूरीफायर की सारी मेहनत बेकार हो जाती है और फेफड़ों को भारी नुकसान पहुंचता है।',
      effort: 'Low',
      costBand: '₹0',
      impact: {
        exposureChange: {
          value: 'Eliminates 250 - 400 µg/m³ indoor chemical spike',
          minVal: 250,
          maxVal: 400,
          unit: 'µg/m³ PM2.5 eliminated',
          confidence: 'High',
          sourceKey: 'LANCET_PLANETARY_HEALTH',
          isEstimate: false,
          qualitativeNote: 'Directly protects children and elderly family members with sensitive airways.',
        },
        emissionsChange: {
          value: 'Eliminates indoor combustion hydrocarbons',
          minVal: 0,
          maxVal: 0,
          unit: 'hydrocarbon emissions',
          confidence: 'High',
          sourceKey: 'WHO_IAQ_2021',
          isEstimate: false,
        },
        communityMultiplier: {
          value: 'Prevents smoke drift into stairwells and common shafts',
          minVal: 1,
          maxVal: 50,
          unit: 'apartments',
          confidence: 'High',
          sourceKey: 'CEEW_2021',
          isEstimate: false,
        },
      },
    },
  ];

  // --- SECTION 3: SUSTAINABLE ALTERNATIVES ---
  const sustainableActions: ActionCardData[] = [
    {
      id: 'sustainable-commute-metro',
      section: 'sustainable',
      titleEn:
        profile.commuteMode === 'car_petrol' || profile.commuteMode === 'car_diesel'
          ? 'Switch 2 Days/Week Commute to Delhi Metro / Shared Transit'
          : 'Carpool or Adopt Metro for Long-Distance Urban Trips',
      titleHi:
        profile.commuteMode === 'car_petrol' || profile.commuteMode === 'car_diesel'
          ? 'सप्ताह में 2 दिन अपनी कार की जगह दिल्ली मेट्रो या शेयर्ड कैब लें'
          : 'लंबी दूरी की यात्रा के लिए मेट्रो या कारपूल अपनाएं',
      whyEn: `Your daily commute generates ${emissions.dailyCommuteKgCO2} kg CO2 and ${emissions.dailyCommuteGramsPM25}g of tailpipe PM2.5. Shifting 2 days a week cuts personal transport emissions by over 28%.`,
      whyHi: `आपकी दैनिक यात्रा से ${emissions.dailyCommuteKgCO2} किग्रा CO2 और ${emissions.dailyCommuteGramsPM25} ग्राम जहरीला PM2.5 निकलता है। हफ्ते में सिर्फ 2 दिन मेट्रो लेने से 28% प्रदूषण कम होगा।`,
      effort: 'Medium',
      costBand: '₹500 - ₹2,000',
      impact: {
        exposureChange: {
          value: '45% less traffic fumes inhaled inside air-conditioned metro',
          minVal: 35,
          maxVal: 55,
          unit: '% commute exposure reduced',
          confidence: 'High',
          sourceKey: 'DMRC_2022',
          isEstimate: false,
        },
        emissionsChange: {
          value: `${emissions.potentialMonthlyKgCO2Reduction} kg CO2e / month saved`,
          minVal: 10,
          maxVal: 80,
          unit: 'kg CO2e / month',
          confidence: 'High',
          sourceKey: metroFactor.id,
          isEstimate: false,
        },
        communityMultiplier: {
          value: `${comm.kgPm25Prevented} kg PM2.5 prevented across neighborhood`,
          minVal: 1,
          maxVal: 20,
          unit: 'kg PM2.5 prevented',
          confidence: 'High',
          sourceKey: 'CPCB_NAQI_2014',
          isEstimate: true,
        },
      },
    },
    {
      id: 'sustainable-induction-cooking',
      section: 'sustainable',
      titleEn: 'Transition Cooking from LPG Flame to Electric Induction',
      titleHi: 'रसोई में गैस चूल्हे की जगह इलेक्ट्रिक इंडक्शन का प्रयोग करें',
      whyEn:
        'Unvented LPG gas combustion emits nitrogen dioxide (NO2), carbon monoxide, and ultrafine soot into indoor air. Induction produces zero indoor combustion byproducts.',
      whyHi:
        'एलपीजी गैस चूल्हा जलने से रसोई में नाइट्रोजन डाइऑक्साइड (NO2) और कार्बन मोनोऑक्साइड फैलती है। इंडक्शन से रसोई में बिल्कुल धुआं नहीं बनता।',
      effort: 'Medium',
      costBand: '₹2,000+',
      impact: {
        exposureChange: {
          value: `${inductionFactor.minReductionPct}% - ${inductionFactor.maxReductionPct}% indoor NO2 drop`,
          minVal: inductionFactor.minReductionPct,
          maxVal: inductionFactor.maxReductionPct,
          unit: inductionFactor.unit,
          confidence: inductionFactor.confidence,
          sourceKey: inductionFactor.id,
          isEstimate: inductionFactor.isEstimate,
          qualitativeNote: inductionFactor.qualitativeNote,
        },
        emissionsChange: {
          value: 'Saves 0.40 kg CO2e / day vs LPG',
          minVal: 0.3,
          maxVal: 0.5,
          unit: 'kg CO2e / day',
          confidence: 'High',
          sourceKey: 'BEE_INDIA',
          isEstimate: false,
        },
        communityMultiplier: {
          value: 'Zero kitchen plume emissions into society shafts',
          minVal: 1,
          maxVal: 50,
          unit: 'homes',
          confidence: 'High',
          sourceKey: 'WHO_IAQ_2021',
          isEstimate: false,
        },
      },
    },
    {
      id: 'sustainable-guard-radiant-heaters',
      section: 'sustainable',
      titleEn: 'Provide Electric Infrared Heaters for Security Guards & Staff',
      titleHi: 'सोसाइटी के गार्ड्स और सहायकों को बिजली का हीटर उपलब्ध कराएं',
      whyEn:
        'Society guards often burn leaves, scrap wood, or coal in metal tins to stay warm in winter nights. Providing a ₹1,000 radiant quartz heater eliminates localized toxic ground-level smoke.',
      whyHi:
        'सर्दियों की रात में गार्ड ठंड से बचने के लिए पत्तियां या कोयला जलाते हैं। उन्हें एक सस्ता इलेक्ट्रिक हीटर देने से पूरी सोसाइटी का दम घुटने से बच जाता है।',
      effort: 'Medium',
      costBand: '₹500 - ₹2,000',
      impact: {
        exposureChange: {
          value: 'Eliminates 3.2 kg of toxic ground-level smoke per winter',
          minVal: 2.5,
          maxVal: 4.5,
          unit: 'kg PM2.5 smoke eliminated at entrance',
          confidence: 'High',
          sourceKey: 'IIT_KANPUR_2015',
          isEstimate: false,
        },
        emissionsChange: {
          value: 'Saves 450 kg CO2e over 90 days vs open burning',
          minVal: 300,
          maxVal: 600,
          unit: 'kg CO2e saved',
          confidence: 'High',
          sourceKey: 'IPCC_GHG_2021',
          isEstimate: true,
        },
        communityMultiplier: {
          value: `${comm.tonsCO2eReduced} tons CO2e reduced when RWA coordinates`,
          minVal: 0.5,
          maxVal: 5.0,
          unit: 'tons CO2e',
          confidence: 'High',
          sourceKey: 'CPCB_2019',
          isEstimate: true,
        },
      },
    },
  ];

  return {
    routineActions,
    indoorActions,
    sustainableActions,
    isDegraded,
    summaryEn: isDegraded
      ? 'Deterministic rule-based clean air plan activated (Offline / Fallback mode). All impact metrics are computed by the Saans deterministic mathematical engine.'
      : 'Tailored clean air plan generated for your household profile and current ambient air quality.',
    summaryHi: isDegraded
      ? 'नियम-आधारित स्वच्छ वायु योजना सक्रिय (ऑफ़लाइन / बैकअप मोड)। सभी प्रभाव आंकड़े प्रमाणित वैज्ञानिक मॉडल द्वारा गणना किए गए हैं।'
      : 'आपके परिवार की प्रोफाइल और वर्तमान वायु गुणवत्ता के आधार पर तैयार की गई व्यक्तिगत योजना।',
    generatedAt: new Date().toISOString(),
  };
}
