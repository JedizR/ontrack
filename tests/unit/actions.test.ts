// Actions validate before they write, stamp through the store, and hand back an undo for deletes.
import 'fake-indexeddb/auto';
import { beforeAll, expect, test, vi } from 'vitest';
import { db } from '../../src/lib/db/store.svelte';
import { changeProgram, deleteMeal, forgetFood, logAgain, logSaved, logWeight, rememberFoods, saveMeal, savePlan, saveProfile, saveProgram, saveSaved } from '../../src/lib/actions';
import { foodKey, withMine } from '../../src/lib/data/foods';
import { dayView, mealSource, planFor } from '../../src/lib/model/day';
import type { MealItem, Plan, Session } from '../../shared/records';

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
