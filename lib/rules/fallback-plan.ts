/**
 * @file fallback-plan.ts
 * @description Deterministic rule-based plan engine for Saans.
 * Uses the Two-Layer architecture:
 * 1. Numbers layer: user-specific deterministic math computed in <100ms
 * 2. Narrative layer: standard expert recommendations
 *
 * All functions strictly comply with max-lines-per-function <= 40 and complexity <= 10.
 */

import { ActionCardData, HouseholdProfile } from '../impact/types';
import {
  computeUserNumbersLayer,
  assembleCompletePlan,
  CardNarrative,
  PlanNarrativeLayer,
} from './two-layer-plan';

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

const ROUTINE_NARRATIVES: readonly CardNarrative[] = [
  {
    id: 'routine-morning-walk',
    timeOfDay: 'morning',
    titleEn: 'Shift Exercise Indoors & Delay Outdoor Errands',
    titleHi: 'सुबह का व्यायाम घर के अंदर करें और बाहर जाने से बचें',
    whyEn: 'Early morning experiences peak thermal inversion and ground-level smog trapping.',
    whyHi: 'सर्दियों की सुबह जमीनी स्तर पर तापमान पलटाव के कारण प्रदूषण चरम पर होता है।',
    effort: 'Low',
    costBand: '₹0',
    impactFactorKey: 'hepa_filtration',
  },
  {
    id: 'routine-midday-errand',
    timeOfDay: 'day',
    titleEn: 'Schedule Outdoor Transit in Midday Window (1:00 - 3:00 PM)',
    titleHi: 'बाहर के जरूरी काम दोपहर 1:00 से 3:00 बजे के बीच निपटाएं',
    whyEn: 'Solar radiation between noon and 3:30 PM warms the ground, breaking the thermal boundary inversion.',
    whyHi: 'दोपहर में धूप निकलने से ठंडी हवा की परत टूटती है और जमीन के पास जहरीले कणों का जमाव कम होता है।',
    effort: 'Medium',
    costBand: '₹0',
    impactFactorKey: 'n95_respirator',
  },
  {
    id: 'routine-evening-seal',
    timeOfDay: 'evening',
    titleEn: 'Seal Windows by 5:00 PM & Run Purifier on Sleep Mode',
    titleHi: 'शाम 5:00 बजे से पहले खिड़कियां बंद करें और प्यूरीफायर चलाएं',
    whyEn: 'As ambient temperature drops at sunset, traffic rush-hour emissions get trapped below the descending nocturnal boundary layer.',
    whyHi: 'सूर्यास्त के बाद तापमान गिरने से शाम का ट्रैफिक धुआं जमीन पर जमा हो जाता है।',
    effort: 'Low',
    costBand: '₹0',
    impactFactorKey: 'hepa_filtration',
  },
];

const INDOOR_NARRATIVES: readonly CardNarrative[] = [
  {
    id: 'indoor-dust-mopping',
    titleEn: 'Switch from Dry Broom Sweeping to Microfiber Wet Mopping',
    titleHi: 'सूखे झाड़ू के बजाय माइक्रोफाइबर गीले पोछे का उपयोग करें',
    whyEn: 'Dry broom sweeping resuspends toxic settled coarse dust and endotoxins into the breathing zone.',
    whyHi: 'सूखा झाड़ू लगाने से फर्श पर बैठी बारीक धूल दोबारा हवा में उड़ जाती है।',
    effort: 'Low',
    costBand: '₹100 - ₹500',
    impactFactorKey: 'wet_mopping_vs_sweeping',
  },
  {
    id: 'indoor-door-weatherstripping',
    titleEn: 'Install Door Bottom Sweeps and Window Weatherstripping Foam',
    titleHi: 'मुख्य दरवाजों के नीचे ड्राफ्ट सील और खिड़कियों पर वेदरस्ट्रिप लगाएं',
    whyEn: 'Unsealed main door undercuts and loose window frames allow 60% to 75% of ambient outdoor smog to leak indoors.',
    whyHi: 'दरवाजों के नीचे की खाली जगह और खिड़कियों की दरारों से बाहर का धुआं घर में रिसता रहता है।',
    effort: 'Medium',
    costBand: '₹500 - ₹2,000',
    impactFactorKey: 'window_weatherstripping',
  },
  {
    id: 'indoor-incense-ban',
    titleEn: 'Pause Agarbatti, Dhoop, and Mosquito Coil Combustion',
    titleHi: 'अगरबत्ती, धूपबत्ती और मच्छर क्वाइल जलाना बंद करें',
    whyEn: 'Burning a single agarbatti stick releases particulate matter equivalent to smoking 2 to 3 cigarettes.',
    whyHi: 'एक अगरबत्ती या मच्छर क्वाइल जलाने से निकलने वाला धुआं सिगरेट के बराबर बारीक जहरीले कण पैदा करता है।',
    effort: 'Low',
    costBand: '₹0',
    impactFactorKey: 'hepa_filtration',
  },
];

const SUSTAINABLE_NARRATIVES: readonly CardNarrative[] = [
  {
    id: 'sustainable-metro-shift',
    titleEn: 'Shift 2 Days/Week Commute from Car to Metro',
    titleHi: 'हफ्ते में 2 दिन निजी कार के बजाय मेट्रो से यात्रा करें',
    whyEn: 'Delhi Metro uses regenerative electric braking and carries high passenger densities, cutting personal commute emissions by 92%.',
    whyHi: 'दिल्ली मेट्रो में सफर करने से निजी वाहन की तुलना में 92% कम कार्बन उत्सर्जन होता है।',
    effort: 'Medium',
    costBand: '₹100 - ₹500',
    impactFactorKey: 'metro_vs_car_petrol',
  },
  {
    id: 'sustainable-induction-switch',
    titleEn: 'Transition Kitchen Simmering to Electric Induction Cooktop',
    titleHi: 'रसोई में गैस चूल्हे के बजाय इंडक्शन कुकटॉप का उपयोग बढ़ाएं',
    whyEn: 'Combustion of LPG inside closed kitchens produces nitrogen dioxide (NO2) and carbon monoxide.',
    whyHi: 'गैस चूल्हे से निकलने वाली नाइट्रोजन डाइऑक्साइड (NO2) रसोई के अंदर फेफड़ों को नुकसान पहुंचाती है।',
    effort: 'Medium',
    costBand: '₹2,000+',
    impactFactorKey: 'induction_vs_lpg',
  },
  {
    id: 'sustainable-guard-heater',
    titleEn: 'RWA Action: Provide Electric Radiant Heaters for Night Guards',
    titleHi: 'सोसाइटी पहल: रात के सुरक्षा गार्डों के लिए इलेक्ट्रिक हीटर की व्यवस्था करें',
    whyEn: 'Open burning of scrap wood and leaves by security staff creates massive ground-level PM2.5 spikes right at society entry gates.',
    whyHi: 'ठंड से बचने के लिए गार्डों द्वारा जलाई जाने वाली लकड़ी और कूड़े का धुआं गेट और निचली मंजिलों पर भारी प्रदूषण फैलाता है।',
    effort: 'Low',
    costBand: '₹500 - ₹2,000',
    impactFactorKey: 'hepa_filtration',
  },
];

export const DEFAULT_FALLBACK_NARRATIVE: PlanNarrativeLayer = {
  cacheKey: 'default_fallback',
  summaryEn: 'Tailored clean air plan based on calibrated environmental models.',
  summaryHi: 'पर्यावरण नियमों पर आधारित व्यक्तिगत स्वच्छ वायु कार्य योजना।',
  routineActions: ROUTINE_NARRATIVES,
  indoorActions: INDOOR_NARRATIVES,
  sustainableActions: SUSTAINABLE_NARRATIVES,
  isBasicMode: true,
};

/**
 * Builds deterministic action cards based on profile, AQI severity, and lifestyle parameters.
 */
export function generateDeterministicPlan(input: PlanGenerationInput): GeneratedPlanResult {
  const numbers = computeUserNumbersLayer(input.profile, input.aqi);
  const narrative: PlanNarrativeLayer = {
    ...DEFAULT_FALLBACK_NARRATIVE,
    summaryEn: input.isDegraded
      ? 'Deterministic rule-based clean air plan activated.'
      : DEFAULT_FALLBACK_NARRATIVE.summaryEn,
    summaryHi: input.isDegraded
      ? 'ऑफ़लाइन नियम-आधारित स्वच्छ वायु योजना सक्रिय।'
      : DEFAULT_FALLBACK_NARRATIVE.summaryHi,
  };
  return assembleCompletePlan(numbers, narrative, input.isDegraded ?? false);
}
