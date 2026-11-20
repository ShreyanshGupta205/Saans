import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { calculateSubIndex, getAQICategory, CPCB_BREAKPOINTS } from '../../lib/aqi/cpcb';
import { PollutantKey } from '../../lib/aqi/types';

describe('Property-Based Testing (fast-check) for CPCB NAQI Math', () => {
  const pollutants: PollutantKey[] = ['pm25', 'pm10', 'no2', 'o3', 'so2', 'co', 'nh3'];

  it('Property: Sub-index is strictly non-negative for any non-negative concentration', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...pollutants),
        fc.float({ min: 0, max: 2000, noNaN: true }),
        (pollutant, conc) => {
          const index = calculateSubIndex(pollutant, conc);
          expect(index).toBeGreaterThanOrEqual(0);
        }
      )
    );
  });

  it('Property: Sub-index is monotonic in concentration (c1 <= c2 => index(c1) <= index(c2))', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...pollutants),
        fc.float({ min: 0, max: 800, noNaN: true }),
        fc.float({ min: 0, max: 800, noNaN: true }),
        (pollutant, valA, valB) => {
          const c1 = Math.min(valA, valB);
          const c2 = Math.max(valA, valB);
          const i1 = calculateSubIndex(pollutant, c1);
          const i2 = calculateSubIndex(pollutant, c2);
          // Allow at most rounding discrepancy of 1
          expect(i2 + 1).toBeGreaterThanOrEqual(i1);
        }
      ),
      { numRuns: 500 }
    );
  });

  it('Property: Sub-index respects exact CPCB breakpoint boundaries', () => {
    for (const pollutant of pollutants) {
      const ranges = CPCB_BREAKPOINTS[pollutant];
      for (const range of ranges) {
        // Lower bound evaluation
        const subLo = calculateSubIndex(pollutant, range.bLo);
        expect(subLo).toBe(range.iLo);

        // Upper bound evaluation
        const subHi = calculateSubIndex(pollutant, range.bHi);
        expect(subHi).toBe(range.iHi);
      }
    }
  });

  it('Property: Category mapping is deterministic and partitions 0-500 seamlessly', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (aqi) => {
        const cat = getAQICategory(aqi);
        if (aqi <= 50) expect(cat).toBe('Good');
        else if (aqi <= 100) expect(cat).toBe('Satisfactory');
        else if (aqi <= 200) expect(cat).toBe('Moderate');
        else if (aqi <= 300) expect(cat).toBe('Poor');
        else if (aqi <= 400) expect(cat).toBe('Very Poor');
        else expect(cat).toBe('Severe');
      })
    );
  });
});
