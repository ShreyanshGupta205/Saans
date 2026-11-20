/**
 * @file choice-impact.ts
 * @description "Your Choice, Your Impact" engine.
 * Computes plain-language before vs. after comparison (grade 6-8 reading level)
 * for key clean-air actions.
 */

import { HouseholdProfile } from './types';
import { calculateHouseholdExposure } from './exposure';
import { COMMUTE_EMISSION_FACTORS } from './emissions';

export interface ActionChoiceImpact {
  readonly actionId: string;
  readonly titleEn: string;
  readonly titleHi: string;
  readonly beforeExposureEn: string;
  readonly beforeExposureHi: string;
  readonly afterExposureEn: string;
  readonly afterExposureHi: string;
  readonly emissionsSavedEn: string;
  readonly emissionsSavedHi: string;
  readonly exposureCutPercent: number;
  readonly readingLevel: 'Grade 6-8';
}

function getN95ChoiceImpact(ambientPm25: number): ActionChoiceImpact {
  const outdoorIntake = Math.round(ambientPm25 * 1.6 * 1.5);
  const withN95Intake = Math.round(outdoorIntake * 0.05);
  return {
    actionId: 'n95_commute',
    titleEn: 'Wear a Well-Fitted N95 Mask When Outdoors',
    titleHi: 'बाहर जाते समय सही फिटिंग वाला N95 मास्क पहनें',
    beforeExposureEn: `Without an N95 mask, your lungs breathe in about ${outdoorIntake} micrograms of toxic soot during your commute. A cloth mask lets almost all fine smog slip through.`,
    beforeExposureHi: `बिना N95 मास्क के, आने-जाने के दौरान आपके फेफड़ों में लगभग ${outdoorIntake} माइक्रोग्राम जहरीला धुआं जाता है। साधारण कपड़ा 80% से ज्यादा प्रदूषण नहीं रोक पाता।`,
    afterExposureEn: `With an N95 mask snug on your face, it traps 95% of fine dust. Your intake drops down to only ${withN95Intake} micrograms.`,
    afterExposureHi: `N95 मास्क को चेहरे पर सही से लगाने पर यह 95% बारीक कणों को रोक लेता है। आपके शरीर में सिर्फ ${withN95Intake} माइक्रोग्राम कण जाते हैं।`,
    emissionsSavedEn: 'Masks protect your body directly from smog already in the air.',
    emissionsSavedHi: 'मास्क हवा में पहले से मौजूद प्रदूषण से आपके फेफड़ों की सीधी रक्षा करता है।',
    exposureCutPercent: 95,
    readingLevel: 'Grade 6-8',
  };
}

function getMetroChoiceImpact(profile: HouseholdProfile): ActionChoiceImpact {
  const roundTripKm = profile.commuteDistanceKm * 2;
  const factor = COMMUTE_EMISSION_FACTORS[profile.commuteMode] ?? { gCO2PerKm: 140, gPM25PerKm: 0.035 };
  const carCO2Grams = roundTripKm * factor.gCO2PerKm;
  const metroCO2Grams = roundTripKm * 11.5;
  const savedCO2Kg = Math.max(0.1, Math.round(((carCO2Grams - metroCO2Grams) / 1000) * 10) / 10);
  const savedPM25Grams = Math.round(roundTripKm * factor.gPM25PerKm * 10) / 10;

  return {
    actionId: 'metro_shift',
    titleEn: 'Switch Today’s Commute to Delhi Metro',
    titleHi: 'आज का सफर निजी गाड़ी के बजाय मेट्रो से करें',
    beforeExposureEn: `Driving in heavy traffic exposes you to exhaust from trucks and older cars idling right next to your window.`,
    beforeExposureHi: `ट्रैफिक जाम में गाड़ी चलाने से पास के ट्रकों और वाहनों का धुआं सीधे आपकी गाड़ी में घुसता है।`,
    afterExposureEn: `Underground Metro stations and train coaches use high-grade ventilation, keeping inhaled road soot much lower.`,
    afterExposureHi: `मेट्रो स्टेशनों और एसी कोचों में हवा छनकर आती है, जिससे आप सड़क के भारी धुएं से बचते हैं।`,
    emissionsSavedEn: `By leaving your personal vehicle home today, you prevent ${savedCO2Kg} kg of greenhouse gas and stop ${savedPM25Grams}g of black soot from entering neighborhood air.`,
    emissionsSavedHi: `निजी गाड़ी घर पर रखने से आज ${savedCO2Kg} किग्रा कार्बन और ${savedPM25Grams} ग्राम काला धुआं शहर की हवा में मिलने से बचता है।`,
    exposureCutPercent: 40,
    readingLevel: 'Grade 6-8',
  };
}

function getPurifierChoiceImpact(profile: HouseholdProfile, ambientPm25: number): ActionChoiceImpact {
  const exposure = calculateHouseholdExposure(profile, ambientPm25);
  const beforeUg = exposure.baselineInhaledMicrogramsPerDay;
  const afterUg = exposure.optimizedInhaledMicrogramsPerDay;
  const cut = exposure.exposureReductionPct;

  return {
    actionId: 'hepa_purifier',
    titleEn: 'Run True HEPA Purifier in the Closed Bedroom',
    titleHi: 'कमरे को बंद करके ट्रू हेपा (HEPA) प्यूरीफायर चलाएं',
    beforeExposureEn: `In an unpurified room with open seams, outdoor smog leaks inside. Your family breathes roughly ${beforeUg} micrograms of particulate dust daily.`,
    beforeExposureHi: `बिना प्यूरीफायर वाले कमरे में बाहर का जहरीला धुआं अंदर रिसता रहता है। परिवार दिन भर में लगभग ${beforeUg} माइक्रोग्राम बारीक धूल सांस में लेता है।`,
    afterExposureEn: `Running a sealed HEPA purifier removes 80% to 90% of fine soot. Your family’s daily intake drops to ${afterUg} micrograms.`,
    afterExposureHi: `कमरा बंद करके हेपा प्यूरीफायर चलाने से 80% से 90% धूल छन जाती है। आपके परिवार की सांस में जाने वाला प्रदूषण घटकर सिर्फ ${afterUg} माइक्रोग्राम रह जाता है।`,
    emissionsSavedEn: 'Modern 30W purifiers consume less power than an old light bulb while creating a clean-air sanctuary for sleep.',
    emissionsSavedHi: 'आधुनिक 30W प्यूरीफायर एक पुराने बल्ब से भी कम बिजली की खपत करता है और रात को सोते समय फेफड़ों को सुरक्षित रखता है।',
    exposureCutPercent: cut > 0 ? cut : 75,
    readingLevel: 'Grade 6-8',
  };
}

/**
 * Generates plain-language choice impact comparison for a selected intervention.
 */
export function calculateChoiceImpact(
  actionKey: string,
  profile: HouseholdProfile,
  ambientPm25: number
): ActionChoiceImpact {
  switch (actionKey) {
    case 'metro_shift':
      return getMetroChoiceImpact(profile);
    case 'hepa_purifier':
      return getPurifierChoiceImpact(profile, ambientPm25);
    case 'n95_commute':
    default:
      return getN95ChoiceImpact(ambientPm25);
  }
}
