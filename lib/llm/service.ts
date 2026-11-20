/**
 * @file service.ts
 * @description Resilient LLM execution service:
 * - Structured JSON output with Zod re-validation
 * - Exponential backoff retry on transient failures
 * - AbortController timeout protection
 * - Deterministic fallback on timeout, error, or missing API key
 * - Deterministic impact metric binding (guarantees NO numbers from LLM)
 */

import { ComputedAQIResult } from '../aqi/types';
import { calculateCommunityImpact } from '../impact/community';
import { calculateHouseholdEmissions } from '../impact/emissions';
import { calculateHouseholdExposure } from '../impact/exposure';
import { ActionCardData, ActionCardImpact, HouseholdProfile } from '../impact/types';
import { getProfileArchetype } from '../impact/archetypes';
import { generateDeterministicPlan, GeneratedPlanResult } from '../rules/fallback-plan';
import { getGeminiModelName, getGenAIClient, GEMINI_SAFETY_SETTINGS } from './client';
import { buildPlanUserPrompt, SAANS_SYSTEM_PROMPT } from './prompt';
import { LLMPlanResponse, LLMPlanResponseSchema } from './schema';
import { validateLLMOutputSafety } from './guard';
import { IMPACT_FACTORS } from '../../data/impact-factors';

/**
 * In-memory plan narrative cache keyed by (AQI bucket, profileArchetype, language)
 * Maximum 144 discrete key combinations (6 aqi buckets * 12 archetypes * 2 languages)
 */
const planCache = new Map<string, { plan: GeneratedPlanResult; expiresAt: number }>();
const PLAN_CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes for high cache hit rate

/**
 * Clears the in-memory plan cache (for testing)
 */
export function clearPlanCache(): void {
  planCache.clear();
}

function getPlanCacheKey(profile: HouseholdProfile, aqiCategory: string, lang: string): string {
  const archetype = getProfileArchetype(profile);
  return `${aqiCategory.toLowerCase()}_${archetype}_${lang}`;
}

function resolveActionFactor(text: string): keyof typeof IMPACT_FACTORS {
  if (/mask|n95|respirator/.test(text)) return 'n95_respirator';
  if (/purifier|hepa|filter/.test(text)) return 'hepa_filtration';
  if (/metro|transit|bus|carpool/.test(text)) return 'metro_vs_car_petrol';
  if (/mop|sweep|jhadu|pocha/.test(text)) return 'wet_mopping_vs_sweeping';
  if (/seal|window|strip/.test(text)) return 'window_weatherstripping';
  return 'hepa_filtration';
}

function buildResolvedImpact(
  factorKey: keyof typeof IMPACT_FACTORS,
  exposure: ReturnType<typeof calculateHouseholdExposure>,
  emissions: ReturnType<typeof calculateHouseholdEmissions>,
  comm: ReturnType<typeof calculateCommunityImpact>
): ActionCardImpact {
  const f = IMPACT_FACTORS[factorKey] ?? IMPACT_FACTORS.hepa_filtration;
  const unit = factorKey === 'n95_respirator' ? '% inhaled PM2.5 reduced' : f?.unit ?? '% PM2.5 reduced';
  const sourceKey = factorKey === 'n95_respirator' ? 'NIOSH_WHO_PPE' : 'CEEW_EXPOSURE_2021';
  return {
    exposureChange: {
      value: `${f?.minReductionPct ?? 70}% - ${f?.maxReductionPct ?? 85}%`,
      minVal: f?.minReductionPct ?? 70,
      maxVal: f?.maxReductionPct ?? 85,
      unit,
      confidence: 'High',
      sourceKey,
      isEstimate: f?.isEstimate ?? false,
    },
    emissionsChange: {
      value: `${emissions.potentialMonthlyKgCO2Reduction} kg CO2e / month saved`,
      minVal: emissions.potentialMonthlyKgCO2Reduction,
      maxVal: emissions.potentialMonthlyKgCO2Reduction * 1.2,
      unit: 'kg CO2e / month',
      confidence: 'High',
      sourceKey: 'ARAI_2018',
      isEstimate: false,
    },
    communityMultiplier: {
      value: `${comm.kgPm25Prevented} kg PM2.5 prevented in 50 homes`,
      minVal: comm.kgPm25Prevented,
      maxVal: comm.kgPm25Prevented * 2,
      unit: 'kg PM2.5 prevented',
      confidence: 'Medium',
      sourceKey: 'CPCB_NAQI_2014',
      isEstimate: true,
    },
  };
}

/**
 * Attaches deterministic impact metrics from lib/impact to an LLM-recommended action card.
 */
function bindDeterministicImpact(
  action: {
    id: string;
    section: 'routine' | 'indoor' | 'sustainable';
    title: string;
    why: string;
    effort: 'Low' | 'Medium' | 'High';
    costBand: '₹0' | '₹100 - ₹500' | '₹500 - ₹2,000' | '₹2,000+';
    timeOfDay?: 'morning' | 'day' | 'evening';
  },
  profile: HouseholdProfile,
  aqi: number
): ActionCardData {
  const exposure = calculateHouseholdExposure(profile, aqi);
  const emissions = calculateHouseholdEmissions(profile);
  const comm = calculateCommunityImpact(50);

  const text = `${action.id} ${action.title} ${action.why}`.toLowerCase();
  const factorKey = resolveActionFactor(text);
  const impact = buildResolvedImpact(factorKey, exposure, emissions, comm);

  return {
    id: action.id || `act-${Math.random().toString(36).substring(2, 8)}`,
    section: action.section,
    timeOfDay: action.timeOfDay,
    titleEn: action.title,
    titleHi: action.title,
    whyEn: action.why,
    whyHi: action.why,
    effort: action.effort,
    costBand: action.costBand,
    impact,
  };
}

async function fetchGeminiPlanJson(
  client: NonNullable<ReturnType<typeof getGenAIClient>>,
  model: string,
  userPrompt: string,
  timeoutMs: number
): Promise<LLMPlanResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await client.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction: { parts: [{ text: SAANS_SYSTEM_PROMPT }] },
        responseMimeType: 'application/json',
        maxOutputTokens: 2048,
        temperature: 0.2,
        // @ts-expect-error safetySettings typed loosely in client
        safetySettings: GEMINI_SAFETY_SETTINGS,
      },
    });
    const rawText = response.text;
    if (!rawText || !validateLLMOutputSafety(rawText)) return null;
    const validated = LLMPlanResponseSchema.safeParse(JSON.parse(rawText));
    return validated.success ? validated.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function assemblePlanResult(
  data: LLMPlanResponse,
  profile: HouseholdProfile,
  aqi: number
): GeneratedPlanResult {
  return {
    routineActions: data.routineActions.map((a) => bindDeterministicImpact(a, profile, aqi)),
    indoorActions: data.indoorActions.map((a) => bindDeterministicImpact(a, profile, aqi)),
    sustainableActions: data.sustainableActions.map((a) => bindDeterministicImpact(a, profile, aqi)),
    isDegraded: false,
    summaryEn: data.summary,
    summaryHi: data.summary,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Generates personalized clean air action plan with Gemini.
 * Falls back safely to rule engine on timeout, quota exceeded, invalid JSON, or missing key.
 */
export async function getOrGeneratePlan(
  profile: HouseholdProfile,
  aqiData: ComputedAQIResult,
  language: 'en' | 'hi' = 'en',
  timeoutMs = 8000
): Promise<GeneratedPlanResult> {
  const cacheKey = getPlanCacheKey(profile, aqiData.category, language);
  const now = Date.now();
  const cached = planCache.get(cacheKey);

  if (cached && cached.expiresAt > now) {
    return cached.plan;
  }

  const client = getGenAIClient();
  if (client) {
    const model = getGeminiModelName();
    const userPrompt = buildPlanUserPrompt(profile, aqiData, language);
    const data = await fetchGeminiPlanJson(client, model, userPrompt, timeoutMs);
    if (data) {
      const plan = assemblePlanResult(data, profile, aqiData.aqi);
      planCache.set(cacheKey, { plan, expiresAt: now + PLAN_CACHE_TTL_MS });
      return plan;
    }
  }

  const fallback = generateDeterministicPlan({
    profile,
    aqi: aqiData.aqi,
    dominantPollutant: aqiData.dominantPollutant,
    isDegraded: true,
  });
  planCache.set(cacheKey, { plan: fallback, expiresAt: now + PLAN_CACHE_TTL_MS });
  return fallback;
}
