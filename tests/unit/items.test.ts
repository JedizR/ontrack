import { expect, test } from 'vitest';
import { lineOf, scaled } from '../../src/flows/log/items';

test('a line scales from the original item, so changes never compound', () => {
  const rice = { name: 'White rice', grams: 158, kcal: 205, protein: 4.3, carbs: 44.5, fat: 0.4, source: 'db' as const, foodId: 'rice-white' };
  const line = lineOf(rice);
  expect(scaled(line)).toBe(rice);
  line.factor = 1.5;
  expect(scaled(line)).toEqual({ ...rice, grams: 237, kcal: 308, protein: 6.5, carbs: 66.8, fat: 0.6 });
  line.factor = 1;
  expect(scaled(line)).toEqual(rice);
  expect(scaled({ base: { name: 'Snack', kcal: 300, protein: 0, carbs: 0, fat: 0, source: 'manual' }, factor: 0.5 })).toEqual({ name: 'Snack', kcal: 150, protein: 0, carbs: 0, fat: 0, source: 'manual' });
});
