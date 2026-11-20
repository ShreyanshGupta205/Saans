/**
 * @file myths.ts
 * @description Common winter smog and air pollution myths, grounded in scientific consensus.
 */

export interface SmogMyth {
  readonly id: string;
  readonly mythEn: string;
  readonly mythHi: string;
  readonly factEn: string;
  readonly factHi: string;
  readonly citation: string;
  readonly citationUrl: string;
}

export const SMOG_MYTHS: readonly SmogMyth[] = [
  {
    id: 'cloth_mask',
    mythEn: 'Cloth masks, dupattas, or surgical masks protect against winter smog.',
    mythHi: 'कपड़े का मास्क, दुपट्टा या सर्जिकल मास्क सर्दियों के स्मॉग से पूरी सुरक्षा देता है।',
    factEn: 'Cloth masks filter only 15-30% of sub-micron PM2.5 particulates because fine toxic particles easily pass through fabric weaves and unsealed gaps. Only certified, well-fitted N95 / FFP2 respirators with tight facial seals filter >95% of fine particles.',
    factHi: 'कपड़े के मास्क केवल 15-30% बारीक कणों को रोक पाते हैं। सूक्ष्म PM2.5 कण आसानी से कपड़े के धागों और खाली जगहों से फेफड़ों में पहुंच जाते हैं। केवल सही तरीके से फिट किया गया N95 या FFP2 रेस्पिरेटर ही 95% से अधिक कणों को रोकता है।',
    citation: 'Journal of Exposure Science & Environmental Epidemiology (Shakya et al.)',
    citationUrl: 'https://doi.org/10.1038/jes.2016.42',
  },
  {
    id: 'indoor_plants',
    mythEn: 'Keeping indoor snake plants or areca palms will clean the air in your room like a purifier.',
    mythHi: 'कमरे में स्नेक प्लांट या मनी प्लांट लगाने से एयर प्यूरीफायर की तरह हवा साफ हो जाती है।',
    factEn: 'While plants absorb minuscule amounts of VOCs in sealed NASA test chambers, their Clean Air Delivery Rate (CADR) in real residential rooms is less than 0.5 m³/h. You would need 60-100 plants per room to equal one small HEPA filter, which causes excessive humidity and mold. True HEPA purifiers are indispensable.',
    factHi: 'कमरे के सामान्य आकार में पौधों की हवा साफ करने की गति (CADR) 0.5 m³/घंटे से भी कम होती है। एक छोटे एयर प्यूरीफायर की बराबरी करने के लिए कमरे में 60 से 100 पौधों की जरूरत होगी, जिससे कमरे में नमी और फफूंद बढ़ेगी। HEPA प्यूरीफायर ही असल में PM2.5 कम कर सकता है।',
    citation: 'Cummings & Waring (2020), Journal of Exposure Science & Environmental Epidemiology',
    citationUrl: 'https://doi.org/10.1038/s41370-019-0175-9',
  },
  {
    id: 'morning_walk',
    mythEn: 'Early morning walks in winter are healthy because the air feels cool and fresh.',
    mythHi: 'सर्दियों की सुबह टहलना सेहतमंद है क्योंकि सुबह हवा ठंडी और ताज़ा महसूस होती है।',
    factEn: 'Winter mornings experience ground-level thermal inversion (trapping toxic emissions near the surface) and high relative humidity. Breathing heavily during brisk morning walks multiplies your lung particulate deposition by 3 to 4 times. Exercise indoors or shift outdoor walks to afternoon hours (12 PM - 3 PM) when ambient temperatures rise and inversion disperses.',
    factHi: 'सर्दियों की सुबह थर्मल इन्वर्जन (तापमान पलटाव) के कारण जहरीला प्रदूषण जमीन के पास जमा रहता है। तेज चलने या दौड़ने से फेफड़ों में 3 से 4 गुना ज्यादा प्रदूषण जाता है। सुबह बाहर व्यायाम करने से बचें और घर के अंदर ही हल्के व्यायाम करें, या दोपहर (12 से 3 बजे) जब धूप हो तब निकलें।',
    citation: 'CPCB & ICMR Health Advisory on Winter Smog',
    citationUrl: 'https://cpcb.nic.in',
  },
  {
    id: 'airing_out_windows',
    mythEn: 'Opening windows early morning "airs out" the stale indoor air during smog season.',
    mythHi: 'स्मॉग के मौसम में सुबह-सुबह खिड़कियां खोलने से घर की बासी हवा बाहर निकल जाती है।',
    factEn: 'Opening windows early in the morning floods your living space with peak ambient PM2.5 concentrations (often 400-800 µg/m³ in Delhi-NCR). Keep windows and doors tightly shut overnight and through the morning. If ventilation is necessary, create a brief 10-15 minute cross-draft strictly during peak afternoon sunshine (1 PM to 3 PM) when the boundary layer is highest.',
    factHi: 'सुबह खिड़कियां खोलने से बाहर का भयंकर प्रदूषण (400-800 µg/m³) सीधे घर के अंदर आ जाता है। रात और सुबह खिड़कियां बंद रखें। अगर हवा बदलना जरूरी हो, तो केवल दोपहर में 1 से 3 बजे के बीच 10-15 मिनट के लिए ही खिड़की खोलें जब प्रदूषण न्यूनतम हो।',
    citation: 'CEEW Indoor Air Quality Guidelines for Indian Homes',
    citationUrl: 'https://www.ceew.in',
  },
  {
    id: 'agarbatti_dhoop',
    mythEn: 'Burning incense (agarbatti), dhoop, or camphor purifies indoor air and kills bacteria.',
    mythHi: 'अगरबत्ती, धूप या कपूर जलाने से घर की हवा शुद्ध होती है और कीटाणु मरते हैं।',
    factEn: 'Burning agarbatti and dhoop produces massive concentrations of indoor PM2.5, carbon monoxide, formaldehyde, and polycyclic aromatic hydrocarbons (PAHs). A single incense stick can elevate indoor PM2.5 to over 300 µg/m³ in an enclosed bedroom, severely irritating asthmatic airways.',
    factHi: 'अगरबत्ती और धूपबत्ती जलाने से भारी मात्रा में PM2.5, कार्बन मोनोऑक्साइड और जहरीले रसायन निकलते हैं। एक अगरबत्ती बंद कमरे में PM2.5 का स्तर 300 µg/m³ से ज्यादा बढ़ा सकती है, जो सांस और अस्थमा के मरीजों के लिए बेहद खतरनाक है।',
    citation: 'Lancet Planetary Health / ICMR Indoor Emissions Studies',
    citationUrl: 'https://www.thelancet.com/journals/lanplh',
  },
] as const;
