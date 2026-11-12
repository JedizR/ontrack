// B1, F22: Open Food Facts answers parsed, the label reader's schema and handler path, the product sheet's numbers, and
// a tub's label turned into a supplement's scoop.
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { parseOff } from '../../src/lib/data/off';
import { labelProblem, per100From, portionsOf, productItem, scaleTo, startOf } from '../../src/lib/model/products';
import { fromServing, scoopsIn, supplementItems } from '../../src/lib/model/supplements';
import { analyze } from '../../server/handlers/analyze';
import { fixture, mockProvider } from '../../server/vision/mock';
import { LABEL_JSON_SCHEMA, labelOutput, toLabel } from '../../server/vision/label';
import { productSchema, type Product } from '../../shared/records';

const off = (code: string) => JSON.parse(readFileSync(`tests/fixtures/off/${code}.json`, 'utf8'));

describe('Open Food Facts', () => {
  test('a Thai product with nutrition per 100 g, its serving and pack', () => {
    const p = parseOff(off('8850987101021'))!;
    expect(p).toMatchObject({ name: 'Mama Instant Noodles - Shrimp Tom Yum 1X60G', brand: 'yamyum', unit: 'g', servingG: 55, packG: 55, serving: '55 g' });
    expect(p.per100).toEqual({ kcal: 472.73, protein: 9.09, carbs: 61.82, fat: 20 });
    expect(productSchema.safeParse({ ...p, source: 'off' }).success).toBe(true);
  });
  test('a drink is measured in ml', () => {
    expect(parseOff(off('8851717040016'))).toMatchObject({ brand: 'Dutch Mill', unit: 'ml', servingG: 180, packG: 180 });
  });
  test('a product without nutrition has no values, and an unknown barcode is null', () => {
    expect(parseOff(off('8851234567898'))).toMatchObject({ name: 'Green tea, honey lemon', per100: null, unit: 'ml' });
    expect(parseOff({ code: '8850999220017', status: 0, status_verbose: 'product not found' })).toBeNull();
    expect(parseOff(null)).toBeNull();
  });
  test('kilojoules only become kcal; strings become numbers; nonsense is dropped', () => {
    const p = parseOff({ status: 1, product: { product_name: ' Crackers ', nutriments: { 'energy-kj_100g': '2092', proteins_100g: '10', fat_100g: 'x' }, serving_quantity: '-3', product_quantity: 99999 } })!;
    expect(p.per100).toEqual({ kcal: 500, protein: 10, carbs: 0, fat: 0 });
    expect(p.name).toBe('Crackers');
    expect(p.servingG).toBeUndefined();
    expect(p.packG).toBeUndefined();
    expect(parseOff({ status: 1, product: { nutriments: { 'energy-kcal_100g': 4000 } } })!.per100).toBeNull();
    // a serving under 0.1 g (a mint) or a pack past a meal item's 10 kg is left out rather than refused on Add
    expect(parseOff({ status: 1, product: { nutriments: {}, serving_quantity: 0.04, product_quantity: 25000 } })).not.toHaveProperty('servingG');
    expect(parseOff({ status: 1, product: { nutriments: {}, serving_quantity: 0.5 } })!.servingG).toBe(0.5);
  });
});

describe('the label reader', () => {
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64');
  const label = { kind: 'label', image: JPEG, localDate: new Date().toISOString().slice(0, 10), locale: 'en' };
  const run = (provider = mockProvider) =>
    analyze(new Request('http://x/api/analyze', { method: 'POST', headers: { authorization: 'Bearer good' }, body: JSON.stringify(label) }), {
      caller: async () => ({ id: 'u1' }),
      bump: async () => ({ allowed: true, used: 1, total: 1 }),
      provider: async () => provider,
      limit: 40,
      cap: 400,
    });

  test('the schema the model is held to has every field and no $schema key', () => {
    expect(Object.keys((LABEL_JSON_SCHEMA as { properties: object }).properties).sort()).toEqual(['is_label', 'name', 'per_100', 'per_serving', 'scoops_per_serving', 'serving_size', 'servings_per_pack', 'unit']);
    expect('$schema' in LABEL_JSON_SCHEMA).toBe(false);
    for (const f of ['label-snack', 'label-whey', 'not-label']) expect(labelOutput.safeParse(fixture(f)).success).toBe(true);
  });
  test('printed columns pass through; kJ alone becomes kcal; a missing macro is 0', () => {
    expect(toLabel(labelOutput.parse(fixture('label-snack')))).toEqual({ name: 'Rice crackers, seaweed', unit: 'g', servingG: 25, scoops: null, servingsPerPack: 2, perServing: { kcal: 120, protein: 2, carbs: 18, fat: 4.5 }, per100: null });
    const kj = toLabel({ is_label: true, name: '', unit: 'g', serving_size: null, scoops_per_serving: null, servings_per_pack: null, per_serving: null, per_100: { kcal: null, kj: 1674, protein_g: 8, carbs_g: null, fat_g: 20 } });
    expect(kj?.per100).toEqual({ kcal: 400, protein: 8, carbs: 0, fat: 20 });
  });
  test('no label, or no energy in any column, is not a label', () => {
    expect(toLabel(labelOutput.parse(fixture('not-label')))).toBeNull();
    expect(toLabel({ is_label: true, name: '', unit: 'g', serving_size: 30, scoops_per_serving: null, servings_per_pack: null, per_serving: { kcal: null, kj: null, protein_g: 3, carbs_g: 4, fat_g: 1 }, per_100: null })).toBeNull();
  });
  test('POST /api/analyze reads a label on the mock provider, and answers not_food for a photo that is not one', async () => {
    const ok = await run();
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ ok: true, model: 'mock', label: { servingG: 25, perServing: { kcal: 120 } }, usage: { usedToday: 1, limit: 40 } });
    const no = await run({ model: 'mock', analyze: async () => fixture('not-label') });
    expect(no.status).toBe(422);
    expect(await no.json()).toMatchObject({ ok: false, error: 'not_food' });
    // a meal's answer where a label's was asked for is a provider error, not a label
    expect((await run({ model: 'mock', analyze: async () => fixture('chicken-rice') })).status).toBe(502);
  });
});

describe('the product sheet', () => {
  const mama: Product = { name: 'Mama tom yum', source: 'off', unit: 'g', per100: { kcal: 472.73, protein: 9.09, carbs: 61.82, fat: 20 }, servingG: 55, packG: 55 };
  test('an amount, and the item it logs with its barcode', () => {
    expect(scaleTo(mama.per100, 55)).toEqual({ kcal: 260, protein: 5, carbs: 34, fat: 11 });
    expect(productItem('8850987101021', mama, 55)).toEqual({ name: 'Mama tom yum', grams: 55, kcal: 260, protein: 5, carbs: 34, fat: 11, source: 'off', barcode: '8850987101021' });
  });
  test('chips: a serving, the pack when it differs, and 100; the start is the last amount', () => {
    expect(portionsOf(mama)).toEqual([{ key: 'serving', grams: 55 }, { key: 'hundred', grams: 100 }]);
    expect(portionsOf({ servingG: 30, packG: 180 })).toEqual([{ key: 'serving', grams: 30 }, { key: 'pack', grams: 180 }, { key: 'hundred', grams: 100 }]);
    expect(portionsOf({ servingG: 100 })).toEqual([{ key: 'serving', grams: 100 }]);
    expect(startOf(mama)).toBe(55);
    expect(startOf({ ...mama, lastG: 110 })).toBe(110);
    expect(startOf({})).toBe(100);
    expect(portionsOf({ servingG: 500, packG: 12000 })).toEqual([{ key: 'serving', grams: 500 }, { key: 'hundred', grams: 100 }]);
    expect(startOf({ packG: 12000 })).toBe(10000);
    expect(productSchema.safeParse({ ...mama, lastG: 0.5 }).success).toBe(true);
  });
  test('a label is saved only with a serving, macros it can hold, and possible calories', () => {
    const v = { kcal: 120, protein: 2, carbs: 18, fat: 4.5 };
    expect(labelProblem(25, v)).toBeNull();
    expect(labelProblem(0, v)).toBe('serving');
    expect(labelProblem(20, v)).toBe('heavy');
    expect(labelProblem(25, { ...v, kcal: 1200 })).toBe('kcal');
    expect(per100From(v, 25)).toEqual({ kcal: 480, protein: 8, carbs: 72, fat: 18 });
  });
});

describe('a supplement from its tub (B1)', () => {
  const whey = { kcal: 120, protein: 24, carbs: 3, fat: 1.5 };
  test('the scoops in a printed serving', () => {
    expect(scoopsIn('2 scoops (60 g)')).toBe(2);
    expect(scoopsIn('1 Scoop (30.4g)')).toBe(1);
    expect(scoopsIn('1 portion (30.4 g)')).toBe(1);
    expect(scoopsIn(undefined)).toBe(1);
  });
  test('a one scoop serving: the scoop is the serving and its values follow it', () => {
    const r = fromServing({ perServing: whey, servingG: 31, scoops: 1 });
    expect(r.scoopG).toBe(31);
    expect(scaleTo(r.base!, 31)).toEqual(whey);
  });
  test("a mass gainer's 4 scoops (165 g) give 41.3 g a scoop and a quarter of the values", () => {
    const r = fromServing({ perServing: { kcal: 650, protein: 50, carbs: 100, fat: 6 }, servingG: 165, scoops: 4 });
    expect(r.scoopG).toBe(41.3);
    expect(scaleTo(r.base!, 41.25)).toEqual({ kcal: 163, protein: 12.5, carbs: 25, fat: 1.5 });
  });
  test('Open Food Facts values per 100 g with its serving', () => {
    expect(fromServing({ per100: { kcal: 395, protein: 79, carbs: 9.9, fat: 4.9 }, servingG: 30.4, scoops: 1 })).toMatchObject({ scoopG: 30.4, own: null });
  });
  test('a serving with no weight: the values per scoop, the scoop unknown', () => {
    expect(fromServing({ perServing: { kcal: 240, protein: 48, carbs: 6, fat: 3 }, servingG: null, scoops: 2 })).toEqual({ scoopG: 0, base: undefined, own: { kcal: 120, protein: 24, carbs: 3, fat: 1.5 } });
  });
  test('a supplement on typical values logs as Typical, its own label as Yours', () => {
    const s = { name: 'Whey protein', kind: 'whey' as const, scoopG: 30, perScoop: { kcal: 106, protein: 24, carbs: 2, fat: 0.6 }, lastScoops: 1 };
    expect(supplementItems('w', { ...s, typical: true }, 1)[0].source).toBe('typical');
    expect(supplementItems('w', s, 1)[0].source).toBe('yours');
  });
});
