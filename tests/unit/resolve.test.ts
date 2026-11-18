import { describe, expect, test } from 'vitest';
import { estimate, resolveItems } from '../../server/vision/resolve';
import { parsePlate, plateOf } from '../../server/vision/thai';
import foods from '../../src/lib/data/foods.json';
import cases from '../fixtures/vision/thai-eval.json';

const item = (o: Partial<Parameters<typeof resolveItems>[0][number]> = {}) => ({
  name: 'Stir fried pork', grams: 150, portion_note: 'A cup', food_id: null, confidence: 'medium' as const, hidden_fat: true,
  est_per_100g: { kcal: 210, protein_g: 17, carbs_g: 5, fat_g: 13 }, dish: null, protein: 'none' as const, extras: [], ...o,
});
const nameOf = (id: string | null) => foods.find((f) => f.id === id)?.name ?? '';
const plate = (o: Partial<Parameters<typeof resolveItems>[0][number]>) => resolveItems([item(o)])[0];

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

  test('a Thai name in another romanisation, or without spaces, still reaches its table entry', () => {
    const id = (name: string) => plate({ name, food_id: null }).foodId;
    expect(id('Phad kaprao gai')).toBe('kra-pao-kai');
    expect(id('Kao man gai')).toBe('khao-man-kai');
    expect(id('Som tum')).toBe('som-tam-thai');
    expect(id('Tomyamkung')).toBe('tom-yum-kung');
    expect(id('Pad see ew with unicorn')).toBeNull();
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

describe('Thai plates (docs/AI-THAI.md)', () => {
  test('table names read as plates', () => {
    expect(plateOf('Pad kra pao chicken with rice and fried egg')).toEqual({ base: 'pad kra pao', protein: 'chicken', rice: true, egg: true });
    expect(plateOf('Pad kra pao minced pork')).toEqual({ base: 'pad kra pao', protein: 'minced pork', rice: false, egg: false });
    expect(plateOf('Green curry with chicken on rice')).toEqual({ base: 'green curry', protein: 'chicken', rice: true, egg: false });
    expect(plateOf('Rad na with mixed seafood')).toMatchObject({ base: 'rad na', protein: 'seafood' });
    // no one protein, or a cooking method rather than a dish
    expect(plateOf('Pad thai with pork or beef').protein).toBeNull();
    expect(plateOf('Clear soup with tofu and minced pork').protein).toBeNull();
    expect(plateOf('Fried egg').protein).toBeNull();
  });

  test('the dish, protein and extras the model reports pick the variant, over a wrong food_id', () => {
    const r = plate({ name: 'Basil beef on rice with a fried egg', dish: 'Pad kra pao', protein: 'beef', extras: ['rice', 'fried egg'], food_id: 'kra-pao-pork-rice' });
    expect(r.foodId).toBe('kra-pao-beef-rice-egg');
    expect(r.source).toBe('db');
    expect(plate({ name: 'Kra pao', dish: 'kaprao', protein: 'chicken', extras: ['rice'] }).foodId).toBe('kra-pao-kai-rice');
  });

  test('without the exact plate, the nearest of the same dish and protein, then the dish that names no protein', () => {
    const r = plate({ name: 'Basil chicken, rice, egg', dish: 'Pad kra pao', protein: 'chicken', extras: ['rice', 'fried egg'] });
    expect(plateOf(nameOf(r.foodId))).toMatchObject({ base: 'pad kra pao', protein: 'chicken', rice: true });
    const duck = plate({ name: 'Pad thai with duck', dish: 'Pad thai', protein: 'duck' });
    expect([null, 'duck']).toContain(plateOf(nameOf(duck.foodId)).protein);
    expect(duck.foodId).not.toBeNull();
  });

  test('the user\'s correction wins: the model says duck, its stale id says pork', () => {
    const r = plate({ name: 'Pad kra pao duck with rice', dish: 'Pad kra pao', protein: 'duck', extras: ['rice'], food_id: 'kra-pao-pork-rice' });
    expect(r.foodId === null || plateOf(nameOf(r.foodId)).protein === 'duck').toBe(true);
  });

  test('a Thai script or romanised name reaches the right id when food_id is null', () => {
    expect(plate({ name: 'กะเพราไก่' }).foodId).toBe('kra-pao-kai');
    expect(plate({ name: 'kaprao gai' }).foodId).toBe('kra-pao-kai');
    expect(plate({ name: 'ข้าวกะเพราเนื้อไข่ดาว' }).foodId).toBe('kra-pao-beef-rice-egg');
    expect(plate({ name: 'ข้าวมันไก่' }).foodId).toBe('khao-man-kai');
    // a fried egg means the plate comes on rice
    expect(parsePlate('กะเพราหมูกรอบไข่ดาว')).toEqual({ base: 'pad kra pao', protein: 'crispy pork', rice: true, egg: true });
  });

  test('a name with more in it than a dish, protein and extras is left to the model', () => {
    expect(plate({ name: 'Stir fried pork with holy basil' }).source).toBe('estimate');
    expect(parsePlate('pad kra pao with a side of fries')).toBeNull();
    expect(plate({ name: 'Rice cooked in chicken stock' }).source).toBe('estimate');
    // a bare dish name is the dish's default row, not the basil herb that shares the alias
    expect(plate({ name: 'Krapow' }).foodId).toBe('kra-pao-pork');
    expect(plate({ name: 'Kaprao', dish: 'Pad kra pao' }).foodId).toBe('kra-pao-pork');
    expect(plate({ name: 'Basil' }).foodId).toBe('basil');
  });

  test('every eval case written as a dish name resolves without the model', () => {
    const named = cases.filter((c) => c.name);
    expect(named.length).toBeGreaterThan(10);
    for (const c of named) expect(plate({ name: c.text }).foodId, c.text).toBe(c.expect);
  });

  test('hidden fat: never for a table entry, kept for an estimate', () => {
    expect(plate({ dish: 'Pad kra pao', protein: 'beef', extras: ['rice'], hidden_fat: true }).hiddenFat).toBe(false);
    expect(plate({ food_id: 'egg-fried', hidden_fat: true }).hiddenFat).toBe(false);
    expect(plate({ name: 'Stir fried morning glory', hidden_fat: true }).hiddenFat).toBe(true);
    expect(plate({ name: 'Steamed fish', hidden_fat: false }).hiddenFat).toBe(false);
  });
});
