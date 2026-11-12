import { describe, expect, test } from 'vitest';
import { count, indexOf, join, parse, snap, split, valueAt } from '../../src/lib/wheel';

describe('rows', () => {
  test('a value and its row go round trip', () => {
    for (const [min, step, v] of [[1916, 1, 1996], [100, 1, 168], [5, 1, 20], [30, 0.1, 82.4], [0, 5, 45]] as const)
      expect(valueAt(indexOf(v, min, step), min, step)).toBe(v);
  });
  test('row counts include both ends', () => {
    expect(count(1916, 2026, 1)).toBe(111);
    expect(count(66, 661, 1)).toBe(596);
    expect(count(0, 9, 1)).toBe(10);
  });
  test('a value between rows goes to the nearest', () => expect(indexOf(172.6, 100, 1)).toBe(73));
});

describe('whole and tenths', () => {
  test('split', () => {
    expect(split(82.4)).toEqual({ whole: 82, tenth: 4 });
    expect(split(70)).toEqual({ whole: 70, tenth: 0 });
    expect(split(59.96)).toEqual({ whole: 60, tenth: 0 }); // rounds to the tenth first
  });
  test('join keeps inside min and max', () => {
    expect(join(82, 4, 30, 300)).toBe(82.4);
    expect(join(300, 7, 30, 300)).toBe(300); // at max the tenths read 0
    expect(join(66, 1, 66.2, 661.3)).toBe(66.2);
  });
});

describe('typing', () => {
  test('a comma reads as a point', () => expect(parse('82,4')).toBe(82.4));
  test('empty and words are not numbers', () => {
    expect(parse('')).toBeNaN();
    expect(parse('abc')).toBeNaN();
  });
  test('snap clamps and rounds to the step', () => {
    expect(snap(400, 30, 300, 0.1)).toBe(300);
    expect(snap(82.46, 30, 300, 0.1)).toBe(82.5);
    expect(snap(1850, 1916, 2026, 1)).toBe(1916);
    expect(snap(47, 10, 240, 5)).toBe(45);
  });
});
