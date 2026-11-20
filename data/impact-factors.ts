/**
 * @file impact-factors.ts
 * @description Peer-reviewed and governmental emission and exposure factors for the Saans deterministic impact engine.
 * Sources cited: CPCB (Central Pollution Control Board India), WHO (World Health Organization),
 * ARAI (Automotive Research Association of India), CEEW (Council on Energy, Environment and Water),
 * CEA (Central Electricity Authority India), IPCC/GHG Protocol, and peer-reviewed journals.
 */

export interface ImpactFactor {
  readonly id: string;
  readonly name: string;
  readonly category: 'exposure' | 'transport' | 'cooking' | 'indoor' | 'lifestyle';
  readonly unit: string;
  readonly baselineValue: number;
  readonly interventionValue: number;
  readonly minReductionPct: number;
  readonly maxReductionPct: number;
  readonly confidence: 'High' | 'Medium' | 'Low';
  readonly isEstimate: boolean;
  readonly sourceName: string;
  readonly sourceUrl: string;
  readonly qualitativeNote?: string;
}

export const IMPACT_FACTORS: Record<string, ImpactFactor> = {
  hepa_filtration: {
    id: 'hepa_filtration',
    name: 'True HEPA Air Purifier (Closed Room)',
    category: 'indoor',
    unit: '% PM2.5 indoor concentration reduction',
    baselineValue: 1.0, // relative indoor-to-outdoor ratio without purification (~0.70)
    interventionValue: 0.2, // ~0.15 - 0.25 with True HEPA
    minReductionPct: 65,
    maxReductionPct: 85,
    confidence: 'High',
    isEstimate: false,
    sourceName: 'CEEW / US EPA Residential Air Cleaners Study (2021)',
    sourceUrl: 'https://www.ceew.in/publications/indoor-air-quality-in-indian-homes',
    qualitativeNote: 'Must be True HEPA (H13 or higher) operated in a room with closed doors and windows. Ionizers or uncertified filters do not match this efficiency.',
  },

  n95_respirator: {
    id: 'n95_respirator',
    name: 'N95 / FFP2 Well-Fitted Respirator',
    category: 'exposure',
    unit: '% PM2.5 inhaled particulate reduction',
    baselineValue: 100,
    interventionValue: 5,
    minReductionPct: 90,
    maxReductionPct: 95,
    confidence: 'High',
    isEstimate: false,
    sourceName: 'NIOSH / WHO Personal Protection Guidelines',
    sourceUrl: 'https://www.who.int/publications/i/item/9789240034228',
    qualitativeNote: 'Requires tight facial seal around nose and chin. Cloth masks or surgical masks achieve only 15-30% sub-micron filtration.',
  },

  metro_vs_car_petrol: {
    id: 'metro_vs_car_petrol',
    name: 'Metro Commute vs Petrol Car Commute',
    category: 'transport',
    unit: 'g CO2e / passenger-km saved',
    baselineValue: 142.0, // ARAI petrol car average
    interventionValue: 11.5, // DMRC metro grid-average
    minReductionPct: 88,
    maxReductionPct: 92,
    confidence: 'High',
    isEstimate: false,
    sourceName: 'ARAI Vehicle Emission Factors & DMRC Sustainability Report (2022)',
    sourceUrl: 'https://www.araiindia.com',
  },

  metro_vs_two_wheeler: {
    id: 'metro_vs_two_wheeler',
    name: 'Metro Commute vs Two-Wheeler Commute',
    category: 'transport',
    unit: 'g CO2e / passenger-km saved',
    baselineValue: 42.0, // ARAI 4-stroke 100-150cc
    interventionValue: 11.5,
    minReductionPct: 70,
    maxReductionPct: 75,
    confidence: 'High',
    isEstimate: false,
    sourceName: 'ARAI Emission Factors for Indian Two-Wheelers',
    sourceUrl: 'https://www.araiindia.com',
  },

  wfh_commute_avoidance: {
    id: 'wfh_commute_avoidance',
    name: 'Work-From-Home Commute Avoidance',
    category: 'transport',
    unit: '% daily commute exposure & tailpipe emissions avoided',
    baselineValue: 100,
    interventionValue: 0,
    minReductionPct: 100,
    maxReductionPct: 100,
    confidence: 'High',
    isEstimate: false,
    sourceName: 'CEEW Urban Mobility and Commute Exposure Studies',
    sourceUrl: 'https://www.ceew.in',
  },

  wet_mopping_vs_sweeping: {
    id: 'wet_mopping_vs_sweeping',
    name: 'Wet Mopping with Microfiber vs Dry Sweeping (Jhadu)',
    category: 'indoor',
    unit: '% indoor resuspended coarse & fine particulate reduction',
    baselineValue: 100,
    interventionValue: 60,
    minReductionPct: 35,
    maxReductionPct: 50,
    confidence: 'High',
    isEstimate: false,
    sourceName: 'CPCB Guidelines on Control of Indoor Resuspended Dust (2019)',
    sourceUrl: 'https://cpcb.nic.in',
    qualitativeNote: 'Dry sweeping resuspends deposited settled dust particles directly into the breathing zone for 45-90 minutes.',
  },

  induction_vs_lpg: {
    id: 'induction_vs_lpg',
    name: 'Electric Induction Cooking vs LPG Gas Burner',
    category: 'cooking',
    unit: '% indoor NO2 and ultrafine particle reduction during cooking',
    baselineValue: 100,
    interventionValue: 15,
    minReductionPct: 80,
    maxReductionPct: 90,
    confidence: 'High',
    isEstimate: false,
    sourceName: 'WHO Indoor Air Quality Guidelines: Household Fuel Combustion',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241548885',
    qualitativeNote: 'Unvented LPG combustion emits significant NO2 and carbon monoxide directly inside urban kitchens.',
  },

  lpg_vs_solid_biomass: {
    id: 'lpg_vs_solid_biomass',
    name: 'LPG / Clean Fuel vs Biomass / Wood / Chulha',
    category: 'cooking',
    unit: 'g PM2.5 / meal saved',
    baselineValue: 18.5,
    interventionValue: 0.08,
    minReductionPct: 98,
    maxReductionPct: 99,
    confidence: 'High',
    isEstimate: false,
    sourceName: 'ICMR National Air Quality Health Study & MoPNG PPAC (2022)',
    sourceUrl: 'https://ppac.gov.in',
  },

  window_weatherstripping: {
    id: 'window_weatherstripping',
    name: 'Sealing Gaps / Weatherstripping Windows & Doors',
    category: 'indoor',
    unit: '% reduction in outdoor particulate infiltration during peak smog',
    baselineValue: 0.70, // unsealed natural infiltration
    interventionValue: 0.45, // weatherstripped
    minReductionPct: 25,
    maxReductionPct: 40,
    confidence: 'Medium',
    isEstimate: false,
    sourceName: 'TERI Building Energy Efficiency and IAQ Report',
    sourceUrl: 'https://www.teriin.org',
  },

  indoor_plants_pm25: {
    id: 'indoor_plants_pm25',
    name: 'Indoor Potted Plants (Snake Plant, Areca Palm, Money Plant)',
    category: 'indoor',
    unit: 'Clean Air Delivery Rate (CADR m3/h)',
    baselineValue: 0.0,
    interventionValue: 0.2, // Virtually negligible in typical room air volume
    minReductionPct: 0,
    maxReductionPct: 2,
    confidence: 'High',
    isEstimate: false,
    sourceName: 'Cummings & Waring, Journal of Exposure Science & Environmental Epidemiology (2020)',
    sourceUrl: 'https://doi.org/10.1038/s41370-019-0175-9',
    qualitativeNote: 'SCIENTIFIC FACT: Peer-reviewed research confirms potted plants provide virtually negligible particulate removal (<0.5 m3/h CADR). 60 to 100 plants would be required to equal one small HEPA filter, which drastically increases indoor humidity and mold risk. Potted plants cannot replace mechanical HEPA filtration.',
  },
} as const;

/**
 * Grid emission factor for Indian electricity grid (National Average)
 * Source: Central Electricity Authority (CEA) CO2 Baseline Database for the Indian Power Sector, Version 19 (2023).
 * Value: 0.716 kg CO2e / kWh
 */
export const CEA_INDIA_GRID_EMISSION_FACTOR_KG_PER_KWH = 0.716;

/**
 * WHO 2021 Global Air Quality Guidelines (24-hour mean):
 * PM2.5: 15 µg/m³
 * PM10: 45 µg/m³
 * NO2: 25 µg/m³
 * O3: 100 µg/m³ (8-hour daily maximum)
 * Source: WHO Air Quality Guidelines (2021 update)
 */
export const WHO_2021_GUIDELINES = {
  pm25_24h: 15,
  pm10_24h: 45,
  no2_24h: 25,
  o3_8h: 100,
} as const;
