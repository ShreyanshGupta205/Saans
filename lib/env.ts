/**
 * @file env.ts
 * @description Zod runtime environment variable validation.
 */

import { z } from 'zod';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.0-flash'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  RATE_LIMIT_PER_MINUTE: z.coerce.number().min(1).max(1000).default(60),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function parseEnv(customEnv?: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(customEnv ?? {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    NODE_ENV: process.env.NODE_ENV,
    RATE_LIMIT_PER_MINUTE: process.env.RATE_LIMIT_PER_MINUTE,
  });

  if (!result.success) {
    // Return safe defaults rather than crashing during build/preview
    return {
      GEMINI_API_KEY: undefined,
      GEMINI_MODEL: 'gemini-2.0-flash',
      NODE_ENV: 'development',
      RATE_LIMIT_PER_MINUTE: 60,
    };
  }

  return result.data;
}

export const env = parseEnv();
