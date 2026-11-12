import { describe, expect, it } from 'vitest';
import { num } from '../../src/lib/model/format';

describe('num', () => {
  it('groups thousands and shows decimals only when needed', () => {
    expect(num(1840)).toBe('1,840');
    expect(num(72.5)).toBe('72.5');
    expect(num(72.456)).toBe('72.46');
    expect(num(2459.6, 0)).toBe('2,460');
  });
});
