// The food table and its build (TECH-SPEC section 9).
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildFoods, complete, csvLine, readInmuPage, readOwner, readRecipes, readSg, recipeProblem, recipeValues, sha256, type InmuPages, type Recipe, type SgExtract, type Table } from '../../scripts/build-foods';
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
  test('reads real Thai FCD pages: a full one, and one with total energy beside available carbohydrate', () => {
    const page = (code: string) => readFileSync(new URL(`inmu/${code}.html`, THAI), 'utf8');
    expect(readInmuPage(page('T10'))).toEqual({ code: 'T10', values: { kcal: 70, protein: 3.05, fat: 2.67, carbs: 8.23, fiber: 0.4 } });
    const t8 = readInmuPage(page('T8'));
    expect(t8.values).toMatchObject({ kcal: 216, protein: 19.5, fat: 9.8, carbs: 12.5 });
    expect(complete(t8.values)).toEqual({ values: t8.values }); // nothing derived: both are on the page
  });
  test('reads quoted CSV fields', () => {
    expect(csvLine('"1","a, b","say ""hi"""')).toEqual(['1', 'a, b', 'say "hi"']);
  });
});

describe('recipes', () => {
  const per100 = new Map([
    ['rice', { kcal: 136, protein: 2.28, carbs: 31.1, fat: 0.24, fiber: 0.4 }],
    ['oil', { kcal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 }],
    ['fish-sauce', { kcal: 35, protein: 5.1, carbs: 3.6, fat: 0 }], // no fibre
  ]);
  const recipe = (over: Partial<Recipe> = {}): Recipe => ({
    name: 'Rice with oil', sources: ['https://example.com/a', 'https://example.com/b'], notes: 'n',
    ingredients: [{ food: 'rice', grams: 200 }, { food: 'oil', grams: 15 }], yield_g: 200, ...over,
  });
  test('per 100 g is the ingredients summed, then scaled to the weight of the dish as served', () => {
    // 200 g rice = 272 kcal, 4.56 g protein, 62.2 g carbs, 0.48 g fat, 0.8 g fibre; 15 g oil = 132.6 kcal, 15 g fat; over 200 g
    expect(recipeValues(recipe(), per100)).toEqual({ kcal: 202, protein: 2.28, carbs: 31.1, fat: 7.74, fiber: 0.4 });
    // the same dish weighing 100 g after cooking holds twice the density
    expect(recipeValues(recipe({ yield_g: 100 }), per100)).toMatchObject({ kcal: 405, fat: 15.48 });
  });
  test('fibre is left out when an ingredient has none, and a missing ingredient throws', () => {
    const r = recipeValues(recipe({ ingredients: [{ food: 'rice', grams: 100 }, { food: 'fish-sauce', grams: 10 }], yield_g: 110 }), per100);
    expect(r).toEqual({ kcal: 127, protein: 2.54, carbs: 28.6, fat: 0.22 });
    expect('fiber' in r).toBe(false);
    expect(() => recipeValues(recipe({ ingredients: [{ food: 'gold', grams: 5 }] }), per100)).toThrow(/gold is not in the table/);
  });
  test('a recipe needs 2 different sources, ingredients with grams, a yield, and a believable weight', () => {
    expect(recipeProblem(recipe())).toBeUndefined();
    expect(recipeProblem(recipe({ sources: ['https://example.com/a'] }))).toMatch(/2 different source URLs/);
    expect(recipeProblem(recipe({ sources: ['https://example.com/a', 'https://example.com/a'] }))).toMatch(/2 different source URLs/);
    expect(recipeProblem(recipe({ sources: ['https://example.com/a', 'a book'] }))).toMatch(/2 different source URLs/);
    expect(recipeProblem(recipe({ ingredients: [{ food: 'rice', grams: 0 }] }))).toMatch(/grams > 0/);
    expect(recipeProblem(recipe({ yield_g: 0 }))).toMatch(/yield_g/);
    expect(recipeProblem(recipe({ yield_g: 600 }))).toMatch(/yields 600 g from 215 g/);
    expect(recipeProblem(recipe({ yield_g: 50 }))).toMatch(/yields 50 g/);
    expect(recipeProblem(recipe({ notes: ' ' }))).toMatch(/no notes/);
  });
  test('the list builds a recipe row from its ingredients, in any order, a dish inside a dish included', () => {
    const csv = [HEADER,
      'plate,Rice plate,,recipe:plate,1 plate:300,thai',
      'dish,Rice and oil,,recipe:dish,1 dish:100,',
      'rice,Rice,,1,100 g:100,staple',
      'oil,Oil,,2,1 tbsp:14,oil'].join('\n');
    const tables = usda({ 1: { kcal: 136, protein: 2.28, carbs: 31.1, fat: 0.24, fiber: 0.4 }, 2: { kcal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0 } });
    const recipes = new Map<string, Recipe>([
      ['dish', recipe({ ingredients: [{ food: 'rice', grams: 200 }, { food: 'oil', grams: 15 }], yield_g: 200 })],
      ['plate', recipe({ name: 'Rice plate', ingredients: [{ food: 'dish', grams: 100 }, { food: 'rice', grams: 100 }], yield_g: 200 })],
    ]);
    const foods = buildFoods(csv, tables, recipes);
    expect(foods.map((f) => f.id)).toEqual(['plate', 'dish', 'rice', 'oil']); // the list's order, not the build's
    expect(foods[1]).toMatchObject({ per100: { kcal: 202, fat: 7.74 }, source: { set: 'recipe', id: 'recipe:dish', url: 'https://example.com/a' } });
    expect(foods[0].per100.kcal).toBe(Math.round((202 + 136) / 2)); // half the dish, half rice
  });
  test('the list fails on a recipe with no file, an ingredient that is not listed, a bad recipe, and a loop', () => {
    const rows = (ids: string) => [HEADER, ...ids.split(' ').map((id) => `${id},${id.toUpperCase()},,recipe:${id},1 plate:100,`), 'rice,Rice,,1,100 g:100,staple'].join('\n');
    const t = usda({ 1: FULL });
    expect(() => buildFoods(rows('a'), t, new Map())).toThrow(/a \(recipe:a\) has no file data\/thai\/recipes\/a.json/);
    expect(() => buildFoods(rows('a'), t, new Map([['a', recipe({ ingredients: [{ food: 'nope', grams: 5 }], yield_g: 5 })]]))).toThrow(/ingredients that are not in the list: nope/);
    expect(() => buildFoods(rows('a'), t, new Map([['a', recipe({ sources: [] })]]))).toThrow(/needs at least 2 different source URLs/);
    const loop = new Map([['a', recipe({ ingredients: [{ food: 'b', grams: 5 }], yield_g: 5 })], ['b', recipe({ ingredients: [{ food: 'a', grams: 5 }], yield_g: 5 })]]);
    expect(() => buildFoods(rows('a b'), t, loop)).toThrow(/wait on each other/);
  });
  test('every recipe file is valid, and every recipe food carries what its ingredients give', () => {
    const recipes = readRecipes(fileURLToPath(new URL('recipes', THAI)));
    expect(recipes.size).toBeGreaterThanOrEqual(90);
    const foods = FOODS as Food[];
    const byId = new Map(foods.map((f) => [f.id, f.per100]));
    const made = foods.filter((f) => f.source.set === 'recipe');
    expect(made.length).toBe(recipes.size); // no file without a row, no row without a file
    for (const f of made) {
      const r = recipes.get(f.source.id.slice('recipe:'.length))!;
      expect(r, f.id).toBeDefined();
      expect(recipeProblem(r), f.id).toBeUndefined();
      expect(f.source.url, f.id).toBe(r.sources[0]);
      expect(f.per100, f.id).toEqual(recipeValues(r, byId));
      expect(f.tags.includes('thai'), f.id).toBe(true);
    }
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
    // a whole match beats the prefix of a shorter name
    expect(searchFoods([food('Khao tom mat', ['ข้าวต้มมัด']), food('Plain rice soup', ['ข้าวต้ม'])], 'ข้าวต้ม').map((f) => f.name)).toEqual(['Plain rice soup', 'Khao tom mat']);
    expect(searchFoods(list, '  ')).toEqual([]);
  });
  test('a phone that reads Thai (O1) puts Thai dishes first among equal matches, never above a better match', () => {
    const thai = (name: string, aliases: string[] = []): Food => ({ ...food(name, aliases), tags: ['thai'] });
    const mixed = [food('Fried rice'), thai('Khao pad sapparot', ['pineapple fried rice']), food('Rice'), thai('Rice soup')];
    expect(searchFoods(mixed, 'rice').map((f) => f.name)).toEqual(['Rice', 'Rice soup', 'Fried rice', 'Khao pad sapparot']);
    expect(searchFoods(mixed, 'rice', 30, true).map((f) => f.name)).toEqual(['Rice', 'Rice soup', 'Khao pad sapparot', 'Fried rice']);
  });
  test('romanisation variants, missing spaces, word order and plurals find the same Thai dish', () => {
    const top = (q: string) => searchFoods(FOODS as Food[], q, 30, true)[0]?.name ?? '';
    for (const q of ['phat thai', 'pad tai', 'padthai']) expect(top(q)).toBe('Pad thai');
    for (const q of ['krapao', 'gaprao', 'phad kaprow', 'kra pao']) expect(top(q)).toBe('Pad kra pao pork');
    for (const q of ['kao man gai', 'khao man kai', 'khaomankai']) expect(top(q)).toBe('Khao man kai');
    expect(top('tom yam kung')).toBe('Tom yum kung');
    expect(top('som tum')).toBe('Som tam');
    expect(searchFoods(FOODS as Food[], 'chicken pad kra pao').map((f) => f.name)).toContain('Pad kra pao chicken');
    expect(top('กระเพรา')).toBe('Basil'); // the other spelling of กะเพรา
    // a variant never beats an exact match of the same kind
    expect(searchFoods([food('Kao tom'), food('Khao tom')], 'khao tom').map((f) => f.name)).toEqual(['Khao tom', 'Kao tom']);
    expect(searchFoods([food('Eggs'), food('Egg roll')], 'egg').map((f) => f.name)).toEqual(['Eggs', 'Egg roll']);
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
    expect(top('ก๋วยเตี๋ยว')).toBe('Rice noodles');
    expect(top('green curry')).toBe('Green curry with chicken');
    expect(top('massaman')).toBe('Massaman curry with beef');
  });
});

test('a portion becomes a database item with whole kcal and macros to one decimal', () => {
  const rice = (FOODS as Food[]).find((f) => f.id === 'rice-white')!;
  // INMU's cooked rice (N3): 136 kcal, 2.28 g protein, 31.1 g carbohydrate, 0.24 g fat in 100 g
  expect(itemFor(rice, 158)).toEqual({ name: 'White rice', grams: 158, kcal: 215, protein: 3.6, carbs: 49.1, fat: 0.4, source: 'db', foodId: 'rice-white' });
});
