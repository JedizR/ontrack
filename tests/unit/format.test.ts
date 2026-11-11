import { describe, expect, it } from 'vitest';
import { num } from '../../src/lib/model/format';
import { evalSum, exprFrom, pressKey } from '../../src/lib/model/expr';

describe('num', () => {
  it('groups thousands and shows decimals only when needed', () => {
    expect(num(1840)).toBe('1,840');
    expect(num(72.5)).toBe('72.5');
    expect(num(72.456)).toBe('72.46');
    expect(num(2459.6, 0)).toBe('2,460');
  });
});

// ported from watermelon's keypad tests
describe('keypad expressions', () => {
  const press = (keys: string[], opts = { decimal: true, plus: true }) => keys.reduce((e, k) => pressKey(e, k, opts), '');
  it('sums amounts with +', () => {
    expect(press(['6', '0', '+', '4', '5'])).toBe('60+45');
    expect(evalSum('60+45')).toBe(105);
  });
  it('guards decimals, leading zeros and double operators', () => {
    expect(press(['.', '5'])).toBe('0.5');
    expect(press(['1', '.', '2', '5', '9'])).toBe('1.25');
    expect(press(['0', '0', '7'])).toBe('7');
    expect(press(['+', '5', '+', '+'])).toBe('5+');
    expect(press(['1', '.', '5'], { decimal: false, plus: true })).toBe('15');
    expect(press(['1', '2', 'back'])).toBe('1');
  });
  it('starts empty for no value so the first key replaces it', () => {
    expect(exprFrom(0)).toBe('');
    expect(exprFrom(72.456)).toBe('72.46');
  });
});
