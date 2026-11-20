/**
 * @file locations.ts
 * @description Curated major Indian cities, focusing on Delhi-NCR and metropolitan smog hotspots.
 * Coordinates are rounded to 2 decimal places for privacy and fast local caching.
 */

export interface IndianLocation {
  readonly id: string;
  readonly nameEn: string;
  readonly nameHi: string;
  readonly stateEn: string;
  readonly stateHi: string;
  readonly lat: number;
  readonly lon: number;
  readonly isNCR: boolean;
}

export const POPULAR_INDIAN_LOCATIONS: readonly IndianLocation[] = [
  {
    id: 'delhi',
    nameEn: 'Delhi (Central / Connaught Place)',
    nameHi: 'दिल्ली (कनॉट प्लेस)',
    stateEn: 'Delhi',
    stateHi: 'दिल्ली',
    lat: 28.61,
    lon: 77.21,
    isNCR: true,
  },
  {
    id: 'noida',
    nameEn: 'Noida',
    nameHi: 'नोएडा',
    stateEn: 'Uttar Pradesh',
    stateHi: 'उत्तर प्रदेश',
    lat: 28.53,
    lon: 77.39,
    isNCR: true,
  },
  {
    id: 'gurugram',
    nameEn: 'Gurugram (Gurgaon)',
    nameHi: 'गुरुग्राम (गुड़गांव)',
    stateEn: 'Haryana',
    stateHi: 'हरियाणा',
    lat: 28.46,
    lon: 77.03,
    isNCR: true,
  },
  {
    id: 'ghaziabad',
    nameEn: 'Ghaziabad',
    nameHi: 'गाजियाबाद',
    stateEn: 'Uttar Pradesh',
    stateHi: 'उत्तर प्रदेश',
    lat: 28.67,
    lon: 77.45,
    isNCR: true,
  },
  {
    id: 'faridabad',
    nameEn: 'Faridabad',
    nameHi: 'फरीदाबाद',
    stateEn: 'Haryana',
    stateHi: 'हरियाणा',
    lat: 28.41,
    lon: 77.32,
    isNCR: true,
  },
  {
    id: 'mumbai',
    nameEn: 'Mumbai',
    nameHi: 'मुंबई',
    stateEn: 'Maharashtra',
    stateHi: 'महाराष्ट्र',
    lat: 19.08,
    lon: 72.88,
    isNCR: false,
  },
  {
    id: 'kolkata',
    nameEn: 'Kolkata',
    nameHi: 'कोलकाता',
    stateEn: 'West Bengal',
    stateHi: 'पश्चिम बंगाल',
    lat: 22.57,
    lon: 88.36,
    isNCR: false,
  },
  {
    id: 'lucknow',
    nameEn: 'Lucknow',
    nameHi: 'लखनऊ',
    stateEn: 'Uttar Pradesh',
    stateHi: 'उत्तर प्रदेश',
    lat: 26.85,
    lon: 80.95,
    isNCR: false,
  },
  {
    id: 'patna',
    nameEn: 'Patna',
    nameHi: 'पटना',
    stateEn: 'Bihar',
    stateHi: 'बिहार',
    lat: 25.59,
    lon: 85.14,
    isNCR: false,
  },
  {
    id: 'jaipur',
    nameEn: 'Jaipur',
    nameHi: 'जयपुर',
    stateEn: 'Rajasthan',
    stateHi: 'राजस्थान',
    lat: 26.91,
    lon: 75.79,
    isNCR: false,
  },
  {
    id: 'bengaluru',
    nameEn: 'Bengaluru',
    nameHi: 'बेंगलुरु',
    stateEn: 'Karnataka',
    stateHi: 'कर्नाटक',
    lat: 12.97,
    lon: 77.59,
    isNCR: false,
  },
  {
    id: 'hyderabad',
    nameEn: 'Hyderabad',
    nameHi: 'हैदराबाद',
    stateEn: 'Telangana',
    stateHi: 'तेलंगाना',
    lat: 17.38,
    lon: 78.48,
    isNCR: false,
  },
  {
    id: 'chandigarh',
    nameEn: 'Chandigarh',
    nameHi: 'चंडीगढ़',
    stateEn: 'Chandigarh',
    stateHi: 'चंडीगढ़',
    lat: 30.73,
    lon: 76.78,
    isNCR: false,
  },
] as const;
