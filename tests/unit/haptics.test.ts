import { describe, expect, it } from 'vitest';
import { toMs } from '../../src/lib/haptics';

// the production CSS is minified to seconds (".64s"); dev keeps "640ms". Both must read as 640 (the wait skipped in production, 26 Nov)
describe('toMs', () => {
  it('reads ms, seconds and nothing', () => {
    expect(toMs(' 640ms')).toBe(640);
    expect(toMs('.64s')).toBe(640);
    expect(toMs('1.4s')).toBe(1400);
    expect(toMs('')).toBe(0);
  });
});
