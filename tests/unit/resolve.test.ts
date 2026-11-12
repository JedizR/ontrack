import { describe, expect, test } from 'vitest';
import { estimate, resolveItems } from '../../server/vision/resolve';
import foods from '../../src/lib/data/foods.json';

const item = (o: Partial<Parameters<typeof resolveItems>[0][number]> = {}) => ({
  name: 'Stir fried pork', grams: 150, portion_note: 'A cup', food_id: null, confidence: 'medium' as const, hidden_fat: true,
  est_per_100g: { kcal: 210, protein_g: 17, carbs_g: 5, fat_g: 13 }, ...o,
});

describe('vision resolution', () => {
  test('a catalog id takes nutrition from the food table, labelled Database', () => {
    const rice = foods.find((f) => f.id === 'rice-white')!;
    const [r] = resolveItems([item({ name: 'Rice', grams: 200, food_id: 'rice-white', est_per_100g: { kcal: 999, protein_g: 0, carbs_g: 0, fat_g: 0 } })]);
    expect(r.source).toBe('db');
    expect(r.foodId).toBe('rice-white');
    expect(r.per100.kcal).toBe(rice.per100.kcal);
    expect(r.kcal).toBe(Math.round(rice.per100.kcal * 2));
    expect(r.protein).toBe(Math.round(rice.per100.protein * 20) / 10);
  });

  test('an unknown or missing id uses the estimate, labelled Estimate', () => {
    const [a, b] = resolveItems([item({ food_id: 'no-such-food' }), item()]);
    for (const r of [a, b]) {
      expect(r.source).toBe('estimate');
      expect(r.foodId).toBeNull();
      expect(r.kcal).toBe(315); // 210 kcal per 100 g, 150 g
      expect(r.fat).toBe(19.5);
    }
  });

  test('estimates are clamped, and kcal far from the macros is recomputed from them', () => {
    expect(estimate({ kcal: 5000, protein_g: -3, carbs_g: 0, fat_g: 150 })).toEqual({ kcal: 900, protein: 0, carbs: 0, fat: 100 });
    // 4 x 10 + 4 x 20 + 9 x 10 = 210; 400 is more than 25 percent off
    expect(estimate({ kcal: 400, protein_g: 10, carbs_g: 20, fat_g: 10 }).kcal).toBe(210);
    // within 25 percent stays as the model said
    expect(estimate({ kcal: 250, protein_g: 10, carbs_g: 20, fat_g: 10 }).kcal).toBe(250);
    expect(estimate({ kcal: Number.NaN, protein_g: 0, carbs_g: 0, fat_g: 0 }).kcal).toBe(0);
  });

  test('names start with a capital letter', () => {
    expect(resolveItems([item({ name: 'som tam' })])[0].name).toBe('Som tam');
  });

  test('at most 12 items, grams clamped to 1 through 2000 and rounded', () => {
    const out = resolveItems([item({ grams: 0 }), item({ grams: 5000 }), item({ grams: 12.4 }), ...Array.from({ length: 20 }, () => item())]);
    expect(out).toHaveLength(12);
    expect(out.slice(0, 3).map((r) => r.grams)).toEqual([1, 2000, 12]);
  });
});
