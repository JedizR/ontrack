import { describe, expect, test } from 'vitest';
import { estimate, resolveItems } from '../../server/vision/resolve';
import { foodIdFor, parsePlate, plateOf, PLATES, FAMILIES } from '../../server/vision/thai';
import { portionPrior } from '../../server/vision/serving';
import { V } from '../../src/lib/model/engine/constants';
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
    // the model's own density is near the row's (a soup is 44 kcal per 100 g), so R5's cross-check leaves the row alone
    expect(plate({ name: 'Tomyamkung', est_per_100g: { kcal: 44, protein_g: 4.7, carbs_g: 2.9, fat_g: 1.4 } }).foodId).toBe('tom-yum-kung');
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

  test('hidden fat: kept for an estimate; for a table entry only when the model\'s fat is well above the row\'s (R5)', () => {
    // est fat 13 g per 100 g against a row with far less keeps the oil question; one close to the row's drops it
    expect(plate({ dish: 'Pad kra pao', protein: 'beef', extras: ['rice'], hidden_fat: true, est_per_100g: { kcal: 143, protein_g: 7, carbs_g: 20, fat_g: 4.5 } }).hiddenFat).toBe(false);
    expect(plate({ dish: 'Pad kra pao', protein: 'pork', extras: ['rice'], hidden_fat: true, est_per_100g: { kcal: 145, protein_g: 6.8, carbs_g: 19, fat_g: 11 } }).hiddenFat).toBe(true);
    // the flag itself is the model's: a high fat without it stays false
    expect(plate({ dish: 'Pad kra pao', protein: 'pork', extras: ['rice'], hidden_fat: false, est_per_100g: { kcal: 145, protein_g: 6.8, carbs_g: 19, fat_g: 11 } }).hiddenFat).toBe(false);
    expect(plate({ name: 'Stir fried morning glory', hidden_fat: true }).hiddenFat).toBe(true);
    expect(plate({ name: 'Steamed fish', hidden_fat: false }).hiddenFat).toBe(false);
  });
});

// R5 (docs/AI-THAI.md): the reply checked against the table's own numbers
const est = (kcal: number, protein_g: number, carbs_g: number, fat_g: number) => ({ kcal, protein_g, carbs_g, fat_g });
const krapao = (protein: 'pork' | 'minced pork' | 'crispy pork' | 'chicken', e: ReturnType<typeof est>, o: object = {}) =>
  plate({ name: `Kra pao ${protein}`, dish: 'Pad kra pao', protein, extras: ['rice'], est_per_100g: e, ...o });

describe('row against the model\'s own density', () => {
  test('a row near the estimate is kept as it is', () => {
    const r = krapao('pork', est(150, 7, 19, 4.5), { confidence: 'high' });
    expect(r).toMatchObject({ foodId: 'kra-pao-pork-rice', confidence: 'high' });
  });

  test('a row far from the estimate swaps to a closer sibling, same dish and extras, a near protein', () => {
    // pork on rice is 145 kcal per 100 g, minced pork on rice 198; the model says 262
    const r = krapao('pork', est(262, 9, 25, 14), { confidence: 'high' });
    expect(r.foodId).toBe('kra-pao-minced-pork-rice');
    expect(r.confidence).toBe('high'); // the swap closed the gap
  });

  test('with no closer sibling the row stays and confidence drops to low', () => {
    const r = krapao('pork', est(85, 4, 12, 2.5), { confidence: 'high' });
    expect(r).toMatchObject({ foodId: 'kra-pao-pork-rice', confidence: 'low', source: 'db' });
    expect(r.per100.kcal).toBe(145); // the table still wins; the estimate never replaces a row
    // chicken has no near protein: a far estimate keeps the row, never another protein
    expect(krapao('chicken', est(350, 10, 30, 20)).foodId).toBe('kra-pao-kai-rice');
  });

  test('a gap of a few kcal on a low density food is not a gap', () => {
    expect(plate({ name: 'Cucumber', food_id: 'cucumber', est_per_100g: est(30, 1, 5, 0.2), confidence: 'high' }).confidence).toBe('high');
  });
});

describe('grams against the table\'s usual serving (photos only)', () => {
  const photo = (o: object) => resolveItems([item({ dish: 'Pad kra pao', protein: 'pork', extras: ['rice'], est_per_100g: est(145, 6.8, 19, 4.5), portion_note: 'One plate', ...o })], { photo: true })[0];
  const SERVING = 330; // kra-pao-pork-rice, 1 plate

  test('inside the band, a low or medium confidence item is pulled a little toward the serving, a high one is not', () => {
    const pull = (g: number, w: number) => Math.round(g ** (1 - w) * SERVING ** w);
    expect(photo({ grams: 500, confidence: 'high' }).grams).toBe(500);
    expect(photo({ grams: 500, confidence: 'medium' }).grams).toBe(pull(500, V.portionShrink.medium));
    expect(photo({ grams: 500, confidence: 'low' }).grams).toBe(pull(500, V.portionShrink.low));
    expect(photo({ grams: 500, confidence: 'low' }).grams).toBeLessThan(500);
    expect(photo({ grams: 200, confidence: 'low' }).grams).toBeGreaterThan(200);
  });

  test('outside the band the grams are clamped to its edge and the item is marked low', () => {
    expect(photo({ grams: 1800, confidence: 'high' })).toMatchObject({ grams: V.portionBand.max * SERVING, confidence: 'low' });
    expect(photo({ grams: 40, confidence: 'high' })).toMatchObject({ grams: Math.round(V.portionBand.min * SERVING), confidence: 'low' });
  });

  test('a description keeps the user\'s own grams, and an estimate has no serving to compare with', () => {
    expect(resolveItems([item({ dish: 'Pad kra pao', protein: 'pork', extras: ['rice'], grams: 1800, est_per_100g: est(145, 6.8, 19, 4.5) })])[0].grams).toBe(1800);
    expect(resolveItems([item({ grams: 1800 })], { photo: true })[0].grams).toBe(1800);
  });

  test('a counted note reconciles grams per piece with the table piece: 2 eggs', () => {
    const egg = (grams: number, portion_note: string, confidence: 'high' | 'low' = 'high') =>
      resolveItems([item({ name: 'Fried egg', food_id: 'egg-fried', grams, portion_note, confidence, est_per_100g: est(196, 13.6, 0.8, 14.8) })], { photo: true })[0];
    expect(egg(300, '2 eggs').grams).toBe(92); // 150 g an egg is no egg: 2 x 46
    expect(egg(95, 'Two eggs').grams).toBe(95); // 47.5 g an egg is
    expect(egg(120, 'One egg').grams).toBe(46);
    expect(egg(300, 'About a cup').grams).toBe(300); // no count: a piece food has no serving to compare with
    expect(egg(300, '2 plates').grams).toBe(300); // a count of a vessel is not a count of pieces
  });

  test('the prior: a vessel food by its first serving, a piece food only with a count, a measure is no serving', () => {
    expect(portionPrior('kra-pao-pork-rice', 'One plate')).toEqual({ grams: 330 });
    expect(portionPrior('kra-pao-pork-rice', '2 plates')).toEqual({ grams: 660 });
    expect(portionPrior('kra-pao-pork-rice', '2 cups')).toEqual({ grams: 330 });
    expect(portionPrior('egg-fried', 'a piece')).toBeNull();
    expect(portionPrior('egg-fried', '3 eggs')).toEqual({ grams: 138, count: 3, each: 46 });
    // a weight in the note is not a count: 100 g of fried egg is not 100 eggs (R5 review)
    for (const note of ['About 100 g', '150 grams', '200 ml', '2 tbsp']) expect(portionPrior('egg-fried', note)).toBeNull();
    expect(portionPrior('kra-pao-pork-rice', '350 g')).toEqual({ grams: 330 });
    expect(portionPrior('oats', 'Dry weight')).toEqual({ grams: 80 }); // 1/2 cup is 40 g, so a cup is 80 (the table's own cup: 81)
  });
});

describe('the weight range', () => {
  test('grams outside its range becomes the range\'s geometric middle; inside it stays', () => {
    expect(plate({ name: 'Stir fried morning glory', grams: 300, grams_low: 100, grams_high: 144 }).grams).toBe(120);
    expect(plate({ name: 'Stir fried morning glory', grams: 120, grams_low: 100, grams_high: 144 }).grams).toBe(120);
    expect(plate({ name: 'Stir fried morning glory', grams: 130, grams_low: 100, grams_high: 144 }).grams).toBe(130);
    expect(plate({ name: 'Stir fried morning glory', grams: 130, grams_low: 0, grams_high: 5 }).grams).toBe(130); // not a range
  });
  test('a wide range caps confidence: medium, then low', () => {
    const c = (low: number, high: number) => plate({ name: 'Stir fried morning glory', grams: 100, grams_low: low, grams_high: high, confidence: 'high' }).confidence;
    expect(c(90, 110)).toBe('high');
    expect(c(80, 120)).toBe('medium');
    expect(c(50, 150)).toBe('low');
    expect(plate({ name: 'Stir fried morning glory', grams: 100, confidence: 'low' }).confidence).toBe('low');
  });
});

describe('alternatives', () => {
  test('other proteins of the same plate, nearest the model\'s density first, when one differs by over 15 percent', () => {
    const r = plate({ name: 'Crispy basil', dish: 'Pad kra pao', protein: 'crispy pork', extras: ['rice', 'fried egg'], est_per_100g: est(190, 9, 20, 8), grams: 380 });
    expect(r.foodId).toBe('kra-pao-crispy-pork-rice-egg');
    expect(r.alternatives).toHaveLength(V.altMax);
    for (const a of r.alternatives!) {
      expect(plateOf(nameOf(a.foodId))).toMatchObject({ base: 'pad kra pao', rice: true, egg: true });
      expect(a.foodId).not.toBe(r.foodId);
      expect(a.kcal).toBe(Math.round(foods.find((f) => f.id === a.foodId)!.per100.kcal * 3.8));
    }
    expect(r.alternatives!.some((a) => Math.abs(a.kcal - r.kcal) > 0.15 * r.kcal)).toBe(true);
  });
  test('the model\'s own second guess comes first, and counts for a food that is not a Thai plate', () => {
    const r = plate({ name: 'Grilled chicken', food_id: 'chicken-breast-poached', alt_food_id: 'kai-yang', grams: 100, est_per_100g: est(151, 29, 0, 3) });
    expect(r.alternatives?.[0]).toMatchObject({ foodId: 'kai-yang', kcal: 184 });
  });
  test('none when no alternative differs enough, or the guess is the choice itself or not in the table', () => {
    expect(plate({ name: 'Rice', food_id: 'rice-white', alt_food_id: 'rice-white', est_per_100g: est(136, 2.3, 31, 0.2) }).alternatives).toBeUndefined();
    expect(plate({ name: 'Rice', food_id: 'rice-white', alt_food_id: 'nope', est_per_100g: est(136, 2.3, 31, 0.2) }).alternatives).toBeUndefined();
    expect(plate({ name: 'Rice', food_id: 'rice-white', alt_food_id: 'rice-white-medium', est_per_100g: est(136, 2.3, 31, 0.2) }).alternatives).toBeUndefined(); // 130 against 136
    expect(plate({ name: 'Stir fried morning glory', hidden_fat: true }).alternatives).toBeUndefined();
  });
});

describe('a name no plate or whole name reached, matched by its words (R5)', () => {
  const id = (name: string) => foodIdFor({ ...item({ name }), food_id: null }, () => true);
  test('reordered, with fillers, or with a word the table leaves out', () => {
    expect(id('Tom yum shrimp soup')).toBe('tom-yum-kung');
    expect(id('Mango with sticky rice')).toBe('mango-sticky-rice');
    expect(id('Phat kaphrao moo sap')).toBe('kra-pao-minced-pork');
    expect(id('ต้มยำกุ้งน้ำใส')).toBe('tom-yum-clear');
  });
  test('never across a protein, and not a name with a word the row does not have', () => {
    expect(id('Pad kra pao cicken')).not.toBe('kra-pao-pork'); // a typo of a protein is not read past
    expect(id('Pad kra pao pork minced')).toBeNull(); // leftover word
    expect(id('unicorn stew')).toBeNull();
  });
  test('table names reordered, with fillers or with a trailing word: found, and not once with another protein', () => {
    const thai = foods.filter((f) => (f.tags as string[]).includes('thai'));
    const protein = (i: string | null) => (i ? plateOf(nameOf(i)).protein : null);
    let hit = 0, total = 0;
    for (const f of thai) {
      for (const n of [f.name.split(' ').reverse().join(' '), `the ${f.name} plate`, `${f.name} thai style`]) {
        const got = id(n);
        total++;
        hit += +(got === f.id);
        if (got && protein(got) && protein(f.id)) expect(protein(got), `${n} gave ${got}`).toBe(protein(f.id));
      }
    }
    // 48 of 484 reversed names, none with fillers, before R5
    expect(hit / total).toBeGreaterThan(0.45);
  });
});

describe('dish families in the prompt', () => {
  test('every variant row is reached from its own dish, protein and extras', () => {
    expect(FAMILIES.size).toBeGreaterThan(50);
    for (const ids of FAMILIES.values()) {
      for (const want of ids) {
        const p = PLATES.get(want)!;
        const extras = [...(p.rice ? ['rice' as const] : []), ...(p.egg ? ['fried egg' as const] : [])];
        const got = foodIdFor({ ...item({ name: 'x' }), dish: p.base, protein: p.protein ?? 'none', extras }, () => true);
        expect(got, want).toBe(want);
      }
    }
  });
});
