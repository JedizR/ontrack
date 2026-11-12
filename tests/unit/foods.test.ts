// The food table and its build (TECH-SPEC section 9).
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildFoods, complete, csvLine, readInmuPage, readOwner, readSg, sha256, type InmuPages, type SgExtract, type Table } from '../../scripts/build-foods';
import { V } from '../../src/lib/model/engine/constants';
import { itemFor, searchFoods, type Food } from '../../src/lib/data/foods';
import FOODS from '../../src/lib/data/foods.json';

const HEADER = 'id,name,aliases,source_id,portions,tags';
const usda = (values: Record<string, Table['values'] extends Map<string, infer V> ? V : never>): Table[] => [
  { set: 'usda-sr-legacy', name: 'SR Legacy', ids: new Set(['1', '2', '3']), values: new Map(Object.entries(values)) },
];
const FULL = { kcal: 130, protein: 2.7, fat: 0.3, carbs: 28.2, fiber: 0.4 };
const SG_FILE = new URL('../../data/sgfoodid/foods.json', import.meta.url);
const THAI = new URL('../../data/thai/', import.meta.url);
const OWNER = readFileSync(new URL('owner/nutrition_dataset.csv', THAI), 'utf8');

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
  test('completes a Thai row by Atwater, marks what it derived, and leaves out a row whose numbers disagree', () => {
    // energy only: carbohydrate is (energy - 4p - 9f) / 4
    expect(complete({ kcal: 232, protein: 4.54, fat: 0.21 })).toEqual({ values: { kcal: 232, protein: 4.54, fat: 0.21, carbs: 52.99 }, derived: 'carbs' });
    // carbohydrate only: energy is 4p + 4c + 9f
    expect(complete({ carbs: 31.1, protein: 2.28, fat: 0.24 })).toEqual({ values: { carbs: 31.1, protein: 2.28, fat: 0.24, kcal: 136 }, derived: 'kcal' });
    // a lean fish whose energy sits a little under its protein: rounding, so carbohydrate is 0
    expect(complete({ kcal: 89, protein: 18.67, fat: 2.35 })).toMatchObject({ values: { carbs: 0 }, derived: 'carbs' });
    expect(complete({ kcal: 8, protein: 7.46, fat: 0.31 })).toMatch(/below the 33 its protein and fat carry/);
    expect(complete({ kcal: 356, carbs: 65.89, protein: 26.1, fat: 64.55 })).toMatch(/against 949/);
    expect(complete({ protein: 3, fat: 1 })).toEqual({ values: { protein: 3, fat: 1 } });
  });
  test("reads the owner's extract and leaves out the rows that fail, with the reason in the build's error", () => {
    const owner = readOwner(OWNER);
    expect(owner.ids.size).toBe(1005);
    expect(owner.values.get('owner:A11')).toEqual({ protein: 2.28, fat: 0.24, carbs: 31.1, kcal: 136 });
    expect(owner.cite?.get('owner:A11')).toEqual({ derived: 'kcal' });
    // the conductor's checks: roasted sesame, salted crab, striped catfish, canned oyster, the whey powder
    for (const code of ['C2', 'G162', 'G126', 'G128', 'G175', 'J36', 'T290', 'T275']) expect(owner.excluded?.has(`owner:${code}`), code).toBe(true);
    expect(() => buildFoods(`${HEADER}\nwhey,Whey,,owner:J36,1 scoop:30,\n`, [owner])).toThrow(/whey \(Thai FCD \(the owner's extract\) owner:J36\) is left out: a whey protein powder/);
    expect(() => readOwner('Code,Name\n')).toThrow(/must start with/);
  });
  test('reads a Thai FCD page, taking energy with the carbohydrate it was worked from', () => {
    const row = (label: string, v: string) => `<td class="">${label}</td><td class="">g</td><td class="text-center">${v}</td>`;
    const page = (cells: string[]) => `<div class="col-5">Food Code: </div>\n<div class="tx_value fw-bold">T101</div>${cells.join('')}`;
    expect(readInmuPage(page([row('Energy, by calculation', '-'), row('Total energy - by calculation', '122'), row('Protein, total', '12.40'), row('Fat, total', '4.30'), row('Carbohydrate, available', '-'), row('Carbohydrate, total', '7.80'), row('Dietary fibre', '-')])))
      .toEqual({ code: 'T101', values: { kcal: 122, carbs: 7.8, protein: 12.4, fat: 4.3, fiber: undefined } });
    expect(readInmuPage(page([row('Energy, by calculation', '101'), row('Total energy - by calculation', '-'), row('Protein, total', '7.90'), row('Fat, total', '6.05'), row('Carbohydrate, available', '3.03'), row('Carbohydrate, total', '-'), row('Dietary fibre', '1.4')])).values)
      .toEqual({ kcal: 101, carbs: 3.03, protein: 7.9, fat: 6.05, fiber: 1.4 });
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
  test("every Thai FCD food carries its source's values exactly, its page is unedited, and it cites it", () => {
    expect(sha256(OWNER)).toBe(readFileSync(new URL('owner/nutrition_dataset.csv.sha256', THAI), 'utf8').trim());
    const owner = readOwner(OWNER);
    const pages = JSON.parse(readFileSync(new URL('pages.json', THAI), 'utf8')) as InmuPages;
    const thai = foods.filter((f) => f.source.set === 'thai-fcd' || f.source.set === 'thai-fcd-owner');
    expect(thai.length).toBeGreaterThanOrEqual(60);
    for (const f of thai) {
      const code = f.source.id.slice(f.source.id.indexOf(':') + 1);
      let values;
      if (f.source.set === 'thai-fcd') {
        const page = pages.pages[code];
        const text = readFileSync(new URL(page.file, THAI), 'utf8');
        expect(sha256(text), f.id).toBe(page.sha256);
        expect(f.source.url, f.id).toBe(page.url);
        const read = complete(readInmuPage(text).values);
        values = typeof read === 'string' ? read : read.values;
      } else values = owner.values.get(f.source.id);
      expect(values, f.id).toMatchObject({ kcal: f.per100.kcal, protein: f.per100.protein, carbs: f.per100.carbs, fat: f.per100.fat });
    }
  });
  test('every food has a name, a default portion and plausible energy', () => {
    for (const f of foods) {
      expect(f.name, f.id).toMatch(/^[A-Z0-9][^,–—]*$/);
      expect(f.portions.length, f.id).toBeGreaterThan(0);
      // Atwater: energy cannot be far from what the macros carry, except alcohol's, which they do not
      const a = V.atwater;
      const atwater = a.protein * f.per100.protein + a.carbs * f.per100.carbs + a.fat * f.per100.fat;
      if (f.tags.includes('drink') && atwater < f.per100.kcal) continue;
      expect(Math.abs(atwater - f.per100.kcal), f.id).toBeLessThanOrEqual(Math.max(V.tableKcalTolerance.kcal, f.per100.kcal * V.tableKcalTolerance.share));
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
    // N3: dishes from the Thai FCD
    expect(top('ข้าวซอย')).toBe('Khao soi with chicken');
    expect(top('ส้มตำ')).toBe('Som tam');
    expect(top('khao kha moo')).toBe('Khao kha moo');
    expect(top('ไก่ย่าง')).toBe('Kai yang');
  });
});

test('a portion becomes a database item with whole kcal and macros to one decimal', () => {
  const rice = (FOODS as Food[]).find((f) => f.id === 'rice-white')!;
  // INMU's cooked rice (N3): 136 kcal, 2.28 g protein, 31.1 g carbohydrate, 0.24 g fat in 100 g
  expect(itemFor(rice, 158)).toEqual({ name: 'White rice', grams: 158, kcal: 215, protein: 3.6, carbs: 49.1, fat: 0.4, source: 'db', foodId: 'rice-white' });
});
