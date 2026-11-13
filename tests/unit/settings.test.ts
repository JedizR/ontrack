// M9a: Settings' plan edits, the exports and gain mode's easy adds, pure.
import { describe, expect, test } from 'vitest';
import { moves, nextPlan, pacesFor, targetsOf } from '../../src/lib/model/replan';
import { allJson, mealsCsv } from '../../src/lib/model/export';
import { easyAdds, easyDue } from '../../src/lib/model/easy';
import type { Food } from '../../src/lib/data/foods';
import FOODS from '../../src/lib/data/foods.json';
import type { Meal, Plan, Profile } from '../../shared/records';

// vector A, the hardgainer, as the e2e seed: 2,460 kcal on training days, 2,220 on rest days
const profile: Profile = { sex: 'male', birthYear: 2001, heightCm: 175, neat: 'seated', experience: 'beginner', units: 'metric', calorieMode: 'matched', checkinWeekday: 2, screening: { pregnant: false, medical: false, eatingDisorder: false, at: 'x' }, onboardedAt: 'x' };
const base: Plan = { effectiveFrom: '2026-11-11', goal: 'gain', ratePctPerWeek: 0.5, weightKg: 60, bmr: 1573.75, baseline: 1888.5, eeeByWeekday: [240, 0, 240, 0, 240, 240, 0], delta: 330, proteinG: 108, fatG: 66, flags: [], tdeeSource: 'measured', engineVersion: 1, source: 'onboarding' };
const o = { weightKg: 62, sessions: [], year: 2026, from: '2026-11-12' };

describe('a Settings plan edit (M9a)', () => {
  test('a pace change keeps the baseline, measured too, and starts tomorrow', () => {
    const n = nextPlan(base, profile, { profile, goal: 'gain', rate: 0.25 }, o);
    expect(n).toMatchObject({ effectiveFrom: '2026-11-12', source: 'edit', tdeeSource: 'measured', baseline: 1888.5, weightKg: 60, ratePctPerWeek: 0.25 });
    expect(n.delta).toBeLessThan(base.delta);
    expect(moves(base, n)).toBe(true);
    expect(targetsOf(base, 'male', 'matched')).toEqual({ training: 2460, rest: 2220 });
    expect(targetsOf(base, 'male', 'even').every).toBeGreaterThan(2220);
  });
  test('nothing changed moves nothing; experience alone moves nothing for a cut', () => {
    const fresh: Plan = { ...nextPlan(base, profile, { profile, goal: 'gain', rate: 0.5 }, o), source: 'onboarding' }; // as the engine makes it
    expect(moves(fresh, nextPlan(fresh, profile, { profile, goal: 'gain', rate: 0.5 }, o))).toBe(false);
    const cut: Plan = { ...nextPlan(base, profile, { profile, goal: 'lose', rate: 0.5 }, o), source: 'onboarding' };
    expect(moves(cut, nextPlan(cut, profile, { profile: { ...profile, experience: 'advanced' }, goal: 'lose', rate: 0.5 }, o))).toBe(false);
  });
  test('a change the equation reads reruns it from the latest weight, as a formula baseline', () => {
    const n = nextPlan(base, profile, { profile: { ...profile, heightCm: 180 }, goal: 'gain', rate: 0.5 }, o);
    expect(n).toMatchObject({ tdeeSource: 'formula', weightKg: 62 });
    expect(n.bmr).toBeCloseTo(10 * 62 + 6.25 * 180 - 5 * 25 + 5, 6);
  });
  test('a faster gain pace chosen under BMI 20 stays offered past it, so stepping down is one tap (F19)', () => {
    const p = { heightCm: 175, experience: 'beginner' as const };
    expect(pacesFor('gain', p, 64, { goal: 'gain', rate: 0.5 }).map((x) => x.name)).toEqual(['lean', 'standard']); // BMI 20.9
    expect(pacesFor('gain', p, 64, { goal: 'gain', rate: 0.75 }).map((x) => x.name)).toEqual(['lean', 'standard', 'faster']);
    expect(pacesFor('gain', p, 58, undefined).map((x) => x.name)).toEqual(['lean', 'standard', 'faster']); // BMI 18.9
  });
});

describe('exports (F12)', () => {
  const meal: Meal = { date: '2026-11-11', at: '2026-11-11T05:40:00.000Z', title: 'Rice, "large"', method: 'search', items: [{ name: '=cmd', grams: 300, kcal: 390.04, protein: 8.1, carbs: 84.5, fat: 0.8, source: 'db' }] };
  test('meals as CSV: one line per food, quoted where needed, never a formula', () => {
    const lines = mealsCsv([meal]).split('\r\n');
    expect(lines[0]).toBe('date,time,meal,food,grams,kcal,protein_g,carbs_g,fat_g,source,method');
    expect(lines[1]).toMatch(/^2026-11-11,\d\d:40,"Rice, ""large""",'=cmd,300,390,8\.1,84\.5,0\.8,db,search$/);
  });
  test('everything as JSON, by collection', () => {
    const j = JSON.parse(allJson({ meal: [{ id: 'm1', updatedAt: 1, data: meal }] }, { version: '0.9.0', exportedAt: 'now' }));
    expect(j).toEqual({ app: 'Ontrack', version: '0.9.0', exportedAt: 'now', records: { meal: [{ id: 'm1', updatedAt: 1, data: meal }] } });
  });
});

describe('easy adds (F10)', () => {
  const foods = FOODS as Food[];
  test('due with a gain goal from 18:00 while more than a quarter is left, on a day not finished', () => {
    const at = { goal: 'gain', time: '18:00', eaten: 1800, target: 2460, closed: false };
    expect(easyDue(at)).toBe(true);
    expect(easyDue({ ...at, time: '17:59' })).toBe(false);
    expect(easyDue({ ...at, eaten: 1900 })).toBe(false); // 560 left, under 615
    expect(easyDue({ ...at, closed: true })).toBe(false);
    expect(easyDue({ ...at, goal: 'lose' })).toBe(false);
  });
  test('three foods together about the gap: the user\'s dense foods first, oils never', () => {
    const items = easyAdds(foods, ['oil-olive', 'rice-white', 'cheddar', 'oats'], 900, () => undefined);
    expect(items.map((i) => i.foodId)).toEqual(['rice-white', 'cheddar', 'oats']);
    for (const i of items) expect(i.grams! % 5).toBe(0);
    expect(items.reduce((a, i) => a + i.kcal, 0)).toBeGreaterThan(870);
    expect(items.reduce((a, i) => a + i.kcal, 0)).toBeLessThan(930);
    expect(easyAdds(foods, [], 600, () => undefined).map((i) => i.foodId)).toEqual(['peanut-butter', 'trail-mix', 'granola-bar']);
  });
});
