/**
 * @file schema.ts
 * @description Zod validation schemas for API inputs, household profiles, and Gemini structured responses.
 */

import { z } from 'zod';

export const CommuteModeSchema = z.enum([
  'metro',
  'bus',
  'car_petrol',
  'car_diesel',
  'car_ev',
  'two_wheeler',
  'auto',
  'walk_cycle',
  'none',
]);

export const HomeTypeSchema = z.enum([
  'apartment_highrise',
  'apartment_lowrise',
  'independent_house',
  'semi_pucca',
]);

export const CookingFuelSchema = z.enum([
  'lpg',
  'png',
  'electric_induction',
  'biomass',
]);

export const HouseholdProfileSchema = z
  .object({
    locationName: z.string().min(1).max(100),
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    adultsCount: z.number().int().min(0).max(50).default(2),
    childrenCount: z.number().int().min(0).max(50).default(0),
    elderlyCount: z.number().int().min(0).max(50).default(0),
    hasSensitiveMembers: z.boolean().default(false),
    commuteMode: CommuteModeSchema.default('metro'),
    commuteDistanceKm: z.number().min(0).max(500).default(10),
    workFromHomeDays: z.number().int().min(0).max(7).default(0),
    homeType: HomeTypeSchema.default('apartment_highrise'),
    cookingFuel: CookingFuelSchema.default('lpg'),
    hasAirPurifier: z.boolean().default(false),
    language: z.enum(['en', 'hi']).default('en'),
  })
  .strict();

export type HouseholdProfileInput = z.infer<typeof HouseholdProfileSchema>;

/**
 * Schema for Gemini structured JSON plan generation
 */
export const LLMActionRecommendationSchema = z.object({
  id: z.string(),
  section: z.enum(['routine', 'indoor', 'sustainable']),
  timeOfDay: z.enum(['morning', 'day', 'evening']).optional(),
  title: z.string().min(3).max(150),
  why: z.string().min(10).max(400),
  effort: z.enum(['Low', 'Medium', 'High']),
  costBand: z.enum(['₹0', '₹100 - ₹500', '₹500 - ₹2,000', '₹2,000+']),
});

export const LLMPlanResponseSchema = z.object({
  summary: z.string().min(10).max(500),
  routineActions: z.array(LLMActionRecommendationSchema).min(2).max(6),
  indoorActions: z.array(LLMActionRecommendationSchema).min(2).max(6),
  sustainableActions: z.array(LLMActionRecommendationSchema).min(2).max(6),
});

export type LLMPlanResponse = z.infer<typeof LLMPlanResponseSchema>;

/**
 * Chat request validation schema
 */
export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1).max(2000),
});

export const ChatRequestSchema = z
  .object({
    messages: z.array(ChatMessageSchema).min(1).max(20),
    profile: HouseholdProfileSchema,
    currentAqi: z.number().min(0).max(2000),
    dominantPollutant: z.string().max(20).default('pm25'),
    language: z.enum(['en', 'hi']).default('en'),
  })
  .strict();

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * AQI API query params schema
 */
export const AQIQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
  })
  .strict();

/**
 * Geocode query schema
 */
export const GeocodeQuerySchema = z
  .object({
    q: z.string().min(2).max(50),
  })
  .strict();

/**
 * Community calculation query schema
 */
export const CommunityQuerySchema = z
  .object({
    households: z.coerce.number().int().min(1).max(10000).default(50),
  })
  .strict();
