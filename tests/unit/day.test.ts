// Today's numbers (SCREENS.md section 6, F3, F6, F8) and the date helpers behind them.
import { describe, expect, test } from 'vitest';
import { dayView, mealSource, planFor, recentFoods, recentMeals, weighInDue } from '../../src/lib/model/day';
import { addDays, atTime, dayTitle, daysBetween, lastWeek, timeOf, weekdayOf } from '../../src/lib/model/dates';
import type { Meal, MealItem, Plan, Session } from '../../shared/records';

// vector A of docs/SCIENCE.md: training Monday, Wednesday, Friday, Saturday
const PLAN: Plan = { effectiveFrom: '2026-11-11', goal: 'gain', ratePctPerWeek: 0.5, weightKg: 60, bmr: 1573.75, baseline: 1888.5, eeeByWeekday: [240, 0, 240, 0, 240, 240, 0], delta: 330, proteinG: 108, fatG: 66, flags: [], tdeeSource: 'formula', engineVersion: 1, source: 'onboarding' };
const SESSIONS: Session[] = [0, 2, 4, 5].map((weekday, i) => ({ key: `s${i}`, weekday, name: 'Strength', type: 'strength', minutes: 60, intensity: 'moderate' }));
const item = (kcal: number, source: MealItem['source'] = 'db', foodId?: string, grams?: number): MealItem => ({ name: 'x', kcal, protein: 10, carbs: 20, fat: 5, source, foodId, grams });
const meal = (at: string, title: string, items: MealItem[]): Meal => ({ date: at.slice(0, 10), at, title, method: 'search', items });
const WED = '2026-11-11';
const base = { plan: PLAN, sex: 'male' as const, mode: 'matched' as const, date: WED, sessions: SESSIONS, logs: [], meals: [] };

describe('dayView', () => {
  test('a training day carries its exercise energy, and the band and macros follow the target', () => {
    const v = dayView({ ...base, meals: [meal(`${WED}T05:00:00.000Z`, 'a', [item(1840)])] });
    expect(v.target).toBe(2460);
    expect(v.zone).toEqual([0.95 * 2460, 1.15 * 2460]);
    expect(v.macros.proteinG).toBe(108);
    expect(v.eaten.kcal).toBe(1840);
    expect(v.status).toBe('below');
    expect(v.training).toBe(true);
    expect(v.sessions.map((s) => s.status)).toEqual([undefined]);
  });
  test('a rest day, and a skipped session, use the rest target; done keeps the training target', () => {
    expect(dayView({ ...base, date: '2026-11-12' }).target).toBe(2220);
    const skipped = dayView({ ...base, logs: [{ date: WED, sessionKey: 's1', status: 'skipped' }] });
    expect([skipped.target, skipped.training]).toEqual([2220, false]);
    expect(dayView({ ...base, logs: [{ date: WED, sessionKey: 's1', status: 'done' }] }).target).toBe(2460);
  });
  test('even mode spreads the week over every day', () => {
    expect(dayView({ ...base, mode: 'even' }).target).toBe(dayView({ ...base, mode: 'even', date: '2026-11-12' }).target);
  });
});

test('the plan for a date is the newest that has started; before the first, the first', () => {
  const later = { ...PLAN, effectiveFrom: '2026-11-20', delta: 400 };
  const plans = [{ updatedAt: 2, data: later }, { updatedAt: 1, data: PLAN }];
  expect(planFor(plans, '2026-11-19')).toBe(PLAN);
  expect(planFor(plans, '2026-11-20')).toBe(later);
  expect(planFor(plans, '2026-11-01')).toBe(PLAN);
  expect(planFor([], WED)).toBeNull();
});

test('recent meals are distinct by title and calories, newest first', () => {
  const ms = [
    meal('2026-11-10T01:00:00.000Z', 'Oats', [item(400)]),
    meal('2026-11-11T01:00:00.000Z', 'Oats', [item(400)]),
    meal('2026-11-11T05:00:00.000Z', 'Rice', [item(600)]),
    meal('2026-11-09T05:00:00.000Z', 'Oats', [item(500)]),
  ].map((data, i) => ({ id: String(i), data }));
  expect(recentMeals(ms).map((m) => m.id)).toEqual(['2', '1', '3']);
  expect(recentMeals(ms, 1).length).toBe(1);
});

test('recent foods keep the grams used last', () => {
  const ms = [meal('2026-11-10T01:00:00.000Z', 'a', [item(1, 'db', 'egg', 50)]), meal('2026-11-11T01:00:00.000Z', 'b', [item(1, 'db', 'egg', 100), item(1, 'manual')])];
  expect(recentFoods(ms)).toEqual([{ foodId: 'egg', grams: 100 }]);
});

test('a meal is an estimate if any item is, a quick add if all are typed', () => {
  expect(mealSource([item(1), item(1, 'estimate')])).toBe('estimate');
  expect(mealSource([item(1, 'manual')])).toBe('manual');
  expect(mealSource([item(1), item(1, 'manual')])).toBe('database');
});

test('the weigh-in prompt waits three days', () => {
  expect(weighInDue([], WED)).toBe(true);
  expect(weighInDue(['2026-11-09'], WED)).toBe(false);
  expect(weighInDue(['2026-11-08'], WED)).toBe(true);
  expect(weighInDue(['2026-11-12'], WED)).toBe(true); // a later day does not count for an earlier one
});

describe('dates', () => {
  test('day arithmetic stays on calendar days across months and daylight saving', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(daysBetween('2026-10-31', '2026-11-11')).toBe(11);
    expect(lastWeek(WED)).toEqual(['2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08', '2026-11-09', '2026-11-10', WED]);
    expect(weekdayOf(WED)).toBe(2);
  });
  test('a clock time round trips through a local day', () => {
    expect(timeOf(atTime(WED, '08:10'))).toBe('08:10');
    expect(dayTitle('2026-11-09')).toBe('Monday, Nov 9');
  });
});
