import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import fixtureData from '../fixtures/open-meteo-fixture.json';

const OpenMeteoContractSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  generationtime_ms: z.number().nonnegative(),
  utc_offset_seconds: z.number(),
  timezone: z.string(),
  current: z.object({
    time: z.string(),
    interval: z.number().optional(),
    pm2_5: z.number().nonnegative(),
    pm10: z.number().nonnegative(),
    nitrogen_dioxide: z.number().nonnegative().optional(),
    ozone: z.number().nonnegative().optional(),
    sulphur_dioxide: z.number().nonnegative().optional(),
    carbon_monoxide: z.number().nonnegative().optional(),
  }),
  hourly: z.object({
    time: z.array(z.string()).min(1),
    pm2_5: z.array(z.number().nonnegative()).min(1),
    pm10: z.array(z.number().nonnegative()).min(1),
    nitrogen_dioxide: z.array(z.number().nonnegative()).optional(),
    ozone: z.array(z.number().nonnegative()).optional(),
  }),
});

describe('Open-Meteo Contract Test (Schema Drift Prevention)', () => {
  it('validates recorded fixture against OpenMeteoContractSchema', () => {
    const parseResult = OpenMeteoContractSchema.safeParse(fixtureData);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) {
      throw new Error(`Schema drift detected in Open-Meteo fixture: ${JSON.stringify(parseResult.error.format())}`);
    }
  });

  it('fails loudly if required particulate fields (pm2_5 or pm10) are missing', () => {
    const driftedPayload = {
      ...fixtureData,
      current: {
        time: '2026-11-20T06:00',
        // Missing pm2_5 and pm10
      },
    };
    const parseResult = OpenMeteoContractSchema.safeParse(driftedPayload);
    expect(parseResult.success).toBe(false);
  });
});
