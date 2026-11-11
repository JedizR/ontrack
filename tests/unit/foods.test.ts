// The food table and its build (TECH-SPEC section 9).
import { describe, expect, test } from 'vitest';
import { buildFoods, csvLine, type Usda } from '../../scripts/build-foods';
import { itemFor, searchFoods, type Food } from '../../src/lib/data/foods';
import FOODS from '../../src/lib/data/foods.json';

const HEADER = 'id,name,aliases,fdc_id,portions,tags';
const usda = (nutrients: Record<number, Record<number, number>>): Usda => ({
  foods: new Set([1, 2, 3]),
  nutrients: new Map(Object.entries(nutrients).map(([id, n]) => [Number(id), new Map(Object.entries(n).map(([k, v]) => [Number(k), v]))])),
});
const FULL = { 1008: 130, 1003: 2.7, 1004: 0.3, 1005: 28.2, 1079: 0.4 };

describe('foods:build', () => {
  test('joins the list with USDA nutrients', () => {
    const [f] = buildFoods(`${HEADER}\nrice-white,White rice,Rice|khao,1,1 cup:158|100 g:100,staple|dense\n`, usda({ 1: FULL }));
    expect(f).toEqual({
      id: 'rice-white', name: 'White rice', aliases: ['rice', 'khao'],
      per100: { kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
      portions: [{ label: '1 cup', grams: 158 }, { label: '100 g', grams: 100 }],
      tags: ['staple', 'dense'], source: { set: 'usda-sr-legacy', fdcId: 1 },
    });
  });
  test('fails when a nutrient is missing', () => {
    const { 1004: _fat, ...noFat } = FULL;
    expect(() => buildFoods(`${HEADER}\nrice-white,White rice,,1,100 g:100,\n`, usda({ 1: noFat }))).toThrow(/rice-white \(fdc_id 1\) has no fat/);
  });
  test('fails on an id that is not in SR Legacy, and on a bad row', () => {
    expect(() => buildFoods(`${HEADER}\nx,X,,99,100 g:100,\n`, usda({}))).toThrow(/fdc_id 99 is not in SR Legacy/);
    expect(() => buildFoods(`${HEADER}\nx,X,,1,100 g:100,salty\n`, usda({ 1: FULL }))).toThrow(/unknown tags salty/);
    expect(() => buildFoods(`${HEADER}\nx,X,,1,cup,\n`, usda({ 1: FULL }))).toThrow(/bad portions/);
  });
  test('reads quoted CSV fields', () => {
    expect(csvLine('"1","a, b","say ""hi"""')).toEqual(['1', 'a, b', 'say "hi"']);
  });
});

describe('foods.json', () => {
  const foods = FOODS as Food[];
  test('covers at least 350 foods, 25 of them dense, with the oil control ids', () => {
    expect(foods.length).toBeGreaterThanOrEqual(350);
    expect(foods.filter((f) => f.tags.includes('dense')).length).toBeGreaterThanOrEqual(25);
    expect(foods.map((f) => f.id)).toEqual(expect.arrayContaining(['oil-vegetable', 'butter']));
    expect(new Set(foods.map((f) => f.id)).size).toBe(foods.length);
  });
  test('every food has a name, a default portion and plausible energy', () => {
    for (const f of foods) {
      expect(f.name, f.id).toMatch(/^[A-Z0-9][^,–—]*$/);
      expect(f.portions.length, f.id).toBeGreaterThan(0);
      // Atwater: energy cannot be far from what the macros carry, except alcohol's, which they do not
      const atwater = 4 * f.per100.protein + 4 * f.per100.carbs + 9 * f.per100.fat;
      if (f.tags.includes('drink') && atwater < f.per100.kcal) continue;
      expect(Math.abs(atwater - f.per100.kcal), f.id).toBeLessThan(Math.max(40, f.per100.kcal * 0.25));
    }
  });
});

describe('search', () => {
  const food = (name: string, aliases: string[] = []): Food => ({ id: name, name, aliases, per100: { kcal: 100, protein: 1, carbs: 1, fat: 1 }, portions: [{ label: '100 g', grams: 100 }], tags: [], source: { set: 'usda-sr-legacy', fdcId: 1 } });
  const list = [food('Fried rice'), food('Rice crackers'), food('Brown rice'), food('Licorice'), food('White rice', ['khao']), food('Rice')];
  test('prefix beats word start beats substring, shorter names win ties', () => {
    expect(searchFoods(list, 'rice').map((f) => f.name)).toEqual(['Rice', 'Rice crackers', 'Brown rice', 'Fried rice', 'White rice', 'Licorice']);
  });
  test('matches aliases, ignores case and accents, and an empty query finds nothing', () => {
    expect(searchFoods(list, 'KHAO').map((f) => f.name)).toEqual(['White rice']);
    expect(searchFoods([food('Café latte')], 'cafe').length).toBe(1);
    expect(searchFoods(list, '  ')).toEqual([]);
  });
  test('the real table finds everyday foods', () => {
    const top = (q: string) => searchFoods(FOODS as Food[], q)[0]?.name ?? '';
    expect(top('banana')).toMatch(/banana/i);
    expect(top('egg')).toMatch(/egg/i);
    expect(top('chicken breast')).toMatch(/chicken breast/i);
  });
});

test('a portion becomes a database item with whole kcal and macros to one decimal', () => {
  const rice = (FOODS as Food[]).find((f) => f.id === 'rice-white')!;
  expect(itemFor(rice, 158)).toEqual({ name: 'White rice', grams: 158, kcal: 205, protein: 4.3, carbs: 44.5, fat: 0.4, source: 'db', foodId: 'rice-white' });
});
