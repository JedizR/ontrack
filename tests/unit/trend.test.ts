import { expect, test } from 'vitest';
import { slope, smooth } from '../../src/lib/model/engine';

test('trend starts at the first weigh-in and closes 10 percent of each gap', () => {
  const t = smooth([60, 61, 59]);
  expect(t[0]).toBe(60);
  expect(t[1]).toBeCloseTo(60.1, 9);
  expect(t[2]).toBeCloseTo(59.99, 9);
  expect(smooth([])).toEqual([]);
});

test('slope is the least squares fit in kg per day', () => {
  expect(slope([0, 3, 7, 14].map((day) => ({ day, kg: 70 - 0.05 * day })))).toBeCloseTo(-0.05, 12);
  expect(slope([{ day: 0, kg: 70 }, { day: 1, kg: 71 }, { day: 2, kg: 70 }])).toBeCloseTo(0, 12);
  expect(slope([{ day: 0, kg: 70 }])).toBeNull();
  expect(slope([{ day: 4, kg: 70 }, { day: 4, kg: 71 }])).toBeNull();
});
