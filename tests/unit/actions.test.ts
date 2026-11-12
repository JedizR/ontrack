// Actions validate before they write, stamp through the store, and hand back an undo for deletes.
import 'fake-indexeddb/auto';
import { beforeAll, expect, test, vi } from 'vitest';
import { db } from '../../src/lib/db/store.svelte';
import { changeProgram, deleteMeal, forgetFood, logAgain, logSaved, logSupplement, logWeight, rememberFoods, removeSupplement, saveMeal, savePlan, saveProfile, saveProgram, saveSaved, saveSupplement } from '../../src/lib/actions';
import { foodKey, withMine, type Food } from '../../src/lib/data/foods';
import foods from '../../src/lib/data/foods.json';
import { KINDS, MILKS, PRESET_FOOD, perScoopOf, scoopOf, supplementItems } from '../../src/lib/model/supplements';
import { dayView, mealSource, planFor } from '../../src/lib/model/day';
import type { MealItem, Plan, Session, Supplement } from '../../shared/records';

beforeAll(() => db.open('actions-test'));

test('a write that fails its schema never reaches the store', () => {
  expect(() => logWeight('11/12/2026', 80)).toThrow();
  expect(() => logWeight('2026-11-12', 4000)).toThrow();
  expect(db.pending).toBe(0);
  logWeight('2026-11-12', 80.2);
  expect(db.get('weight', 'weight:2026-11-12')).toEqual({ date: '2026-11-12', kg: 80.2 });
  expect(db.pending).toBe(1);
});

test('a delete is a tombstone with an undo that brings the record back, newer', () => {
  const id = saveMeal({ date: '2026-11-12', at: '2026-11-12T12:00:00+07:00', title: 'Rice', method: 'quick', items: [{ name: 'Rice', kcal: 200, protein: 4, carbs: 44, fat: 0.4, source: 'manual' }] });
  const before = db.data.meal[id].updatedAt;
  const undo = deleteMeal(id);
  expect(db.get('meal', id)).toBeUndefined();
  expect(db.data.meal[id].deleted).toBe(true);
  undo();
  expect(db.get('meal', id)?.title).toBe('Rice');
  expect(db.data.meal[id].updatedAt).toBeGreaterThan(before);
});

test('a meal logs again with a fresh day and time; a saved meal counts a use, and its undo takes both back', () => {
  const items = [{ name: 'Oats', grams: 80, kcal: 303, protein: 10.5, carbs: 54, fat: 5.5, source: 'db' as const }];
  const again = logAgain({ date: '2026-11-10', at: '2026-11-10T01:00:00.000Z', title: 'Oats', method: 'photo', items, thumb: true }, '2026-11-12', '2026-11-12T02:00:00.000Z');
  expect(db.get('meal', again)).toEqual({ date: '2026-11-12', at: '2026-11-12T02:00:00.000Z', title: 'Oats', method: 'saved', items });

  const sid = saveSaved({ title: 'Breakfast', items, uses: 2, lastUsedAt: '2026-11-01T01:00:00.000Z' });
  const undo = logSaved(sid, '2026-11-12', '2026-11-12T03:00:00.000Z')!;
  const meal = Object.values(db.data.meal).find((r) => r.data.at === '2026-11-12T03:00:00.000Z')!;
  expect(meal.data.method).toBe('saved');
  expect(db.get('saved', sid)?.uses).toBe(3);
  undo();
  expect(db.get('meal', meal.id)).toBeUndefined();
  expect(db.get('saved', sid)).toEqual({ title: 'Breakfast', items, uses: 2, lastUsedAt: '2026-11-01T01:00:00.000Z' });
});

test('a program change starts a plan tomorrow; today and the days before keep their targets and sessions, and undo takes it back', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 10, 11, 10)); // Wednesday 11 November, local
  const sessions: Session[] = [0, 2, 4, 5].map((weekday, i) => ({ key: `s${i}`, weekday, name: 'Strength', type: 'strength', minutes: 60, intensity: 'moderate' }));
  const plan: Plan = { effectiveFrom: '2026-11-01', goal: 'gain', ratePctPerWeek: 0.5, weightKg: 60, bmr: 1573.75, baseline: 1888.5, eeeByWeekday: [240, 0, 240, 0, 240, 240, 0], delta: 330, proteinG: 108, fatG: 66, flags: [], tdeeSource: 'formula', engineVersion: 1, source: 'onboarding' };
  saveProfile({ sex: 'male', birthYear: 2001, heightCm: 175, neat: 'seated', experience: 'beginner', units: 'metric', calorieMode: 'matched', checkinWeekday: 2, screening: { pregnant: false, medical: false, eatingDisorder: false, at: '' }, onboardedAt: '' });
  saveProgram({ name: '', sessions });
  savePlan(plan);
  const view = (date: string) => dayView({ plan: planFor(db.live('plan'), date)!, sex: 'male', mode: 'matched', date, sessions: db.get('program', 'program')!.sessions, logs: [], meals: [] });
  const before = ['2026-11-09', '2026-11-10', '2026-11-11'].map(view);

  // strength moves from Monday to Tuesday, from tomorrow
  const undo = changeProgram({ name: 'Mine', sessions: sessions.map((s) => (s.weekday === 0 ? { ...s, weekday: 1 } : s)) });
  expect(['2026-11-09', '2026-11-10', '2026-11-11'].map(view)).toEqual(before);
  const next = planFor(db.live('plan'), '2026-11-12')!;
  expect(next).toMatchObject({ effectiveFrom: '2026-11-12', source: 'edit', eeeByWeekday: [0, 240, 240, 0, 240, 240, 0] });
  expect(view('2026-11-16').training).toBe(false); // the next Monday rests
  expect(view('2026-11-17').target).toBe(before[0].target); // and Tuesday trains

  undo();
  expect(db.get('program', 'program')).toEqual({ name: '', sessions });
  expect(planFor(db.live('plan'), '2026-11-12')?.source).toBe('onboarding');
  vi.useRealTimers();
});

test('remembered nutrition: per 100 g under the table id or the normalised name, never a value no food has', () => {
  const padThai: MealItem = { name: 'Pad thai with shrimp', grams: 350, kcal: 600, protein: 24, carbs: 52.7, fat: 23.9, source: 'yours', foodId: 'pad-thai-shrimp' };
  const soup: MealItem = { name: 'Khao Soi, with chicken!', grams: 400, kcal: 600, protein: 30, carbs: 50, fat: 30, source: 'yours' };
  const typo: MealItem = { name: 'Butter', grams: 10, kcal: 1000, protein: 0, carbs: 0, fat: 10, source: 'yours', foodId: 'butter' };
  const lard: MealItem = { name: 'Lard', grams: 4.3, kcal: 39, protein: 0, carbs: 0, fat: 4.3, source: 'yours', foodId: 'lard' };
  const noGrams: MealItem = { name: 'Snack', kcal: 200, protein: 1, carbs: 30, fat: 8, source: 'yours' };
  rememberFoods([padThai, soup, typo, noGrams, lard]);
  expect(foodKey(soup)).toBe('name:khao soi with chicken');
  expect(foodKey({ name: '叉烧饭' })).toBe('name:叉烧饭');
  expect(db.get('food', 'pad-thai-shrimp')).toEqual({ name: 'Pad thai with shrimp', per100: { kcal: 171.43, protein: 6.86, carbs: 15.06, fat: 6.83 } });
  expect(withMine({ ...padThai, kcal: 1 }, db.get('food', 'pad-thai-shrimp')!.per100)).toMatchObject({ kcal: 600, protein: 24, carbs: 52.7, fat: 23.9 });
  expect(db.get('food', 'name:khao soi with chicken')?.per100.kcal).toBe(150);
  expect(db.get('food', 'butter')).toBeUndefined();
  expect(db.get('food', 'lard')?.per100.kcal).toBe(906.98); // a teaspoon of lard, past the 900 of pure fat
  expect(db.live('food')).toHaveLength(3);
  // applied at another weight, and back to the same numbers at the same weight
  const again = withMine({ ...padThai, kcal: 515, source: 'db' }, db.get('food', 'pad-thai-shrimp')!.per100);
  expect(again).toMatchObject({ kcal: 600, source: 'yours' });
  expect(withMine({ ...padThai, grams: 175 }, db.get('food', 'pad-thai-shrimp')!.per100).kcal).toBe(300);
  const undo = forgetFood('pad-thai-shrimp');
  expect(db.get('food', 'pad-thai-shrimp')).toBeUndefined();
  undo();
  expect(db.get('food', 'pad-thai-shrimp')).toBeDefined();
  // a meal's label: any estimate first, then Yours
  expect(mealSource([padThai, { ...padThai, source: 'db' }])).toBe('yours');
  expect(mealSource([padThai, { ...padThai, source: 'estimate' }])).toBe('estimate');
});

test('supplements: presets from the food table where USDA has them, the rest from the label', () => {
  const table = new Map((foods as Food[]).map((f) => [f.id, f]));
  const whey = table.get(PRESET_FOOD.whey!)!;
  const plant = table.get(PRESET_FOOD.plant!)!;
  expect([whey.source, plant.source]).toEqual([{ set: 'usda-sr-legacy', id: '173180' }, { set: 'usda-sr-legacy', id: '173181' }]);
  expect([scoopOf(whey), scoopOf(plant), scoopOf(undefined)]).toEqual([30, 45, 0]);
  expect(perScoopOf(whey, 30)).toEqual({ kcal: 106, protein: 23.4, carbs: 1.9, fat: 0.5 });
  expect(perScoopOf(undefined, 5)).toEqual({ kcal: 0, protein: 0, carbs: 0, fat: 0 });
  expect(KINDS.filter((k) => !PRESET_FOOD[k])).toEqual(['casein', 'gainer', 'creatine', 'other']);
  for (const m of MILKS) expect(table.get(m)?.tags).toContain('drink');
});

test('supplements: two scoops with milk become the day\'s items; the last amount and mix are kept, and undo puts them back', () => {
  const milk = (foods as Food[]).find((f) => f.id === 'milk-whole')!;
  const whey: Supplement = { name: 'Whey', kind: 'whey', scoopG: 32, perScoop: { kcal: 120, protein: 24, carbs: 3, fat: 1.5 }, lastScoops: 1 };
  expect(supplementItems('w', whey, 1.5, { food: milk, grams: 250 })).toEqual([
    { name: 'Whey', grams: 48, kcal: 180, protein: 36, carbs: 4.5, fat: 2.3, source: 'yours', supplementId: 'w', scoops: 1.5 },
    { name: 'Whole milk', grams: 250, kcal: 153, protein: 7.9, carbs: 12, fat: 8.1, source: 'db', foodId: 'milk-whole' },
  ]);
  // a scoop of unknown weight has no grams
  expect(supplementItems('c', { ...whey, scoopG: 0 }, 1)[0]).not.toHaveProperty('grams');

  const id = saveSupplement(whey);
  const undo = logSupplement(id, 2, { food: milk, grams: 300 }, '2026-11-12', '2026-11-12T00:30:00.000Z')!;
  const entry = db.live('meal').find((r) => r.data.method === 'supplement')!;
  expect(entry.data).toMatchObject({ date: '2026-11-12', title: 'Whey', items: [{ kcal: 240, protein: 48, scoops: 2, supplementId: id }, { foodId: 'milk-whole', grams: 300, kcal: 183 }] });
  expect(db.get('supplement', id)).toMatchObject({ lastScoops: 2, lastMix: { foodId: 'milk-whole', grams: 300 } });

  // changed later: the same day and time, water now, from the current label
  saveSupplement({ ...db.get('supplement', id)!, perScoop: { ...whey.perScoop, kcal: 130 } }, id);
  logSupplement(id, 1, null, '2026-11-20', 'ignored', entry.id);
  expect(db.get('meal', entry.id)).toMatchObject({ date: '2026-11-12', at: '2026-11-12T00:30:00.000Z', items: [{ kcal: 130, scoops: 1 }] });
  expect(db.get('meal', entry.id)!.items).toHaveLength(1);
  expect(db.get('supplement', id)).not.toHaveProperty('lastMix');

  undo();
  expect(db.get('meal', entry.id)).toBeUndefined();
  expect(db.get('supplement', id)).toEqual(whey);
  // removing it keeps what was logged; its undo brings it back
  const back = removeSupplement(id);
  expect(db.get('supplement', id)).toBeUndefined();
  back();
  expect(db.get('supplement', id)?.name).toBe('Whey');
  expect(logSupplement('gone', 1, null, '2026-11-12', '2026-11-12T00:30:00.000Z')).toBeNull();
  expect(() => saveSupplement({ ...whey, lastScoops: 0 })).toThrow();
});
