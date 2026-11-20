/**
 * @file env.test.ts
 * @description Unit tests for environment variable parsing and defaults.
 */

import { describe, expect, it } from 'vitest';
import { env, parseEnv } from '../../lib/env';

describe('Environment Configuration', () => {
  it('provides safe defaults when variables are unset', () => {
    expect(env.GEMINI_MODEL).toBe('gemini-2.0-flash');
    expect(typeof env.RATE_LIMIT_PER_MINUTE).toBe('number');
    expect(env.RATE_LIMIT_PER_MINUTE).toBeGreaterThanOrEqual(1);
  });

  it('falls back to default configuration when environment variables fail schema validation', () => {
    const invalidConfig = parseEnv({
      RATE_LIMIT_PER_MINUTE: -999, // Fails min(1) constraint
    });
    expect(invalidConfig.RATE_LIMIT_PER_MINUTE).toBe(60);
    expect(invalidConfig.GEMINI_MODEL).toBe('gemini-2.0-flash');
  });
});
