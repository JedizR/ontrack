// The food table and its build (TECH-SPEC section 9).
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildFoods, csvLine, readSg, sha256, type SgExtract, type Table } from '../../scripts/build-foods';
import { itemFor, searchFoods, type Food } from '../../src/lib/data/foods';
import FOODS from '../../src/lib/data/foods.json';

const HEADER = 'id,name,aliases,source_id,portions,tags';
const usda = (values: Record<string, Table['values'] extends Map<string, infer V> ? V : never>): Table[] => [
  { set: 'usda-sr-legacy', name: 'SR Legacy', ids: new Set(['1', '2', '3']), values: new Map(Object.entries(values)) },
];
const FULL = { kcal: 130, protein: 2.7, fat: 0.3, carbs: 28.2, fiber: 0.4 };
const SG_FILE = new URL('../../data/sgfoodid/foods.json', import.meta.url);

describe('foods:build', () => {
  test('joins the list with USDA nutrients', () => {
    const [f] = buildFoods(`${HEADER}\nrice-white,White rice,Rice|khao,1,1 cup:158|100 g:100,staple|dense\n`, usda({ 1: FULL }));
    expect(f).toEqual({
      id: 'rice-white', name: 'White rice', aliases: ['rice', 'khao'],
      per100: { kcal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4 },
      portions: [{ label: '1 cup', grams: 158 }, { label: '100 g', grams: 100 }],
      tags: ['staple', 'dense'], source: { set: 'usda-sr-legacy', id: '1' },
    });
  });
  test('fails when a nutrient is missing', () => {
    const { fat: _fat, ...noFat } = FULL;
    expect(() => buildFoods(`${HEADER}\nrice-white,White rice,,1,100 g:100,\n`, usda({ 1: noFat }))).toThrow(/rice-white \(SR Legacy 1\) has no fat/);
  });
  test('fails on an id that is in no table, and on a bad row', () => {
    expect(() => buildFoods(`${HEADER}\nx,X,,99,100 g:100,\n`, usda({}))).toThrow(/source_id 99 is not in SR Legacy/);
    expect(() => buildFoods(`${HEADER}\nx,X,,1,100 g:100,salty\n`, usda({ 1: FULL }))).toThrow(/unknown tags salty/);
    expect(() => buildFoods(`${HEADER}\nx,X,,1,cup,\n`, usda({ 1: FULL }))).toThrow(/bad portions/);
  });
  test('reads SG FoodID per 100 g, and a null or negative value is missing', () => {
    const food = (n: Record<string, number | null>) => ({ url: '', accessed: '', data: { crId: 'F1', name: 'X', baseFoodNutrients: { energy: 204, protein: 7.35, carbohydrate: 24.88, fat: 8.35, dietaryFibre: -1, ...n } } });
    const extract = { source: '', terms: '', foods: { F00000001: food({}), F00000002: food({ fat: null }) } } as unknown as SgExtract;
    const [f] = buildFoods(`${HEADER}\npad-thai,Pad thai,,F00000001,1 plate:350,thai\n`, [readSg(extract)]);
    expect(f.per100).toEqual({ kcal: 204, protein: 7.35, carbs: 24.88, fat: 8.35 });
    expect(f.source).toEqual({ set: 'sg-foodid', id: 'F00000001' });
    expect(() => buildFoods(`${HEADER}\nx,X,,F00000002,1 plate:350,\n`, [readSg(extract)])).toThrow(/\(SG FoodID F00000002\) has no fat/);
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
  test('at least 80 Thai dishes and ingredients, each with a Thai script alias', () => {
    const thai = foods.filter((f) => f.tags.includes('thai'));
    expect(thai.length).toBeGreaterThanOrEqual(80);
    for (const f of thai) expect(f.aliases.some((a) => /[\u0e00-\u0e7f]/.test(a)), f.id).toBe(true);
  });
  test('the SG FoodID extract is unedited and every SG food carries its values exactly', () => {
    const text = readFileSync(SG_FILE, 'utf8');
    expect(sha256(text)).toBe(readFileSync(new URL('../../data/sgfoodid/foods.json.sha256', import.meta.url), 'utf8').trim());
    const extract = JSON.parse(text) as SgExtract;
    const sg = foods.filter((f) => f.source.set === 'sg-foodid');
    expect(sg.length).toBeGreaterThan(0);
    for (const f of sg) {
      const n = extract.foods[f.source.id].data.baseFoodNutrients;
      expect([f.per100.kcal, f.per100.protein, f.per100.carbs, f.per100.fat], f.id).toEqual([n.energy, n.protein, n.carbohydrate, n.fat]);
    }
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
  const food = (name: string, aliases: string[] = []): Food => ({ id: name, name, aliases, per100: { kcal: 100, protein: 1, carbs: 1, fat: 1 }, portions: [{ label: '100 g', grams: 100 }], tags: [], source: { set: 'usda-sr-legacy', id: '1' } });
  const list = [food('Fried rice'), food('Rice crackers'), food('Brown rice'), food('Licorice'), food('White rice', ['khao']), food('Rice')];
  test('prefix beats word start beats substring, shorter names win ties', () => {
    expect(searchFoods(list, 'rice').map((f) => f.name)).toEqual(['Rice', 'Rice crackers', 'Brown rice', 'Fried rice', 'White rice', 'Licorice']);
  });
  test('matches aliases, ignores case and accents, and an empty query finds nothing', () => {
    expect(searchFoods(list, 'KHAO').map((f) => f.name)).toEqual(['White rice']);
    expect(searchFoods([food('Café latte')], 'cafe').length).toBe(1);
    expect(searchFoods([food('Pad thai', ['ผัดไทย']), food('Thai milk tea', ['ชาเย็น'])], 'ผัดไทย').map((f) => f.name)).toEqual(['Pad thai']);
    expect(searchFoods(list, '  ')).toEqual([]);
  });
  test('the real table finds everyday foods', () => {
    const top = (q: string) => searchFoods(FOODS as Food[], q)[0]?.name ?? '';
    expect(top('banana')).toMatch(/banana/i);
    expect(top('egg')).toMatch(/egg/i);
    expect(top('chicken breast')).toMatch(/chicken breast/i);
    expect(top('ข้าวมันไก่')).toBe('Khao man kai');
    expect(top('ผัดกะเพรา')).toMatch(/kra pao/i);
    expect(top('กะเพรา')).toBe('Basil');
  });
});

test('a portion becomes a database item with whole kcal and macros to one decimal', () => {
  const rice = (FOODS as Food[]).find((f) => f.id === 'rice-white')!;
  expect(itemFor(rice, 158)).toEqual({ name: 'White rice', grams: 158, kcal: 205, protein: 4.3, carbs: 44.5, fat: 0.4, source: 'db', foodId: 'rice-white' });
});
