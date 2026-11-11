// docs/SCIENCE.md section 10 and vectors F and G.
import { describe, expect, test } from 'vitest';
import {
  checkin,
  checkinDue,
  dayTarget,
  isComplete,
  plan,
  rawTarget,
  type CheckinDay,
  type CheckinInput,
  type PlanInput,
  type PlanNumbers,
  type WeighIn,
} from '../../src/lib/model/engine';

const A: PlanInput = {
  sex: 'male', age: 25, heightCm: 175, weightKg: 60, neat: 'seated',
  sessions: [0, 2, 4, 5].map((weekday) => ({ weekday, type: 'strength', minutes: 60, intensity: 'moderate' })),
  goal: 'gain', ratePctPerWeek: 0.5, experience: 'beginner',
};
const planA = plan(A);
const profile = { sex: 'male' as const, heightCm: 175, experience: 'beginner' as const };

/** Days 0 to 20, day 0 a Monday, with `complete` of them logged at `intake` and the rest empty. */
function window(o: { complete: number; intake: number; kgPerDay: number; weighIns?: number[] }): CheckinInput {
  const days: CheckinDay[] = Array.from({ length: 21 }, (_, day) => {
    const target = dayTarget(planA, { sex: 'male', mode: 'matched', weekday: day % 7 });
    return day < o.complete ? { day, target, intake: o.intake, items: 3 } : { day, target, intake: 0, items: 0 };
  });
  const weighIns: WeighIn[] = (o.weighIns ?? [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]).map((day) => ({
    day,
    kg: 60 + o.kgPerDay * (day - 10),
  }));
  return { today: 20, plan: planA, profile, weighIns, days, trendKg: 60 };
}

describe('vector F, check-in on plan A', () => {
  const r = checkin(window({ complete: 12, intake: 2300, kgPerDay: 0.01 }));
  test('stats', () => {
    expect(r.stats.completeDays).toBe(12);
    expect(r.stats.meanIntake).toBe(2300);
    expect(r.stats.meanTarget).toBeCloseTo(2357.14, 2);
    expect(r.stats.meanIntake! / r.stats.meanTarget).toBeCloseTo(0.976, 3);
    expect(r.stats.tdeeObserved).toBeCloseTo(2223, 9);
  });
  test('proposal: raise by 100', () => {
    expect(r.proposal).toEqual({ kcalChange: 100, reason: 'raise' });
    expect(r.plan!.baseline).toBeCloseTo(1987.18, 2); // tdeeNew 2124.32 less 960 / 7
    expect(dayTarget(r.plan!, { sex: 'male', mode: 'matched', weekday: 0 })).toBe(2560);
    expect(dayTarget(r.plan!, { sex: 'male', mode: 'matched', weekday: 1 })).toBe(2320);
  });
});

test('vector G, adherence', () => {
  const r = checkin(window({ complete: 12, intake: 2050, kgPerDay: 0.01 }));
  expect(r.stats.meanIntake! / r.stats.meanTarget).toBeCloseTo(0.87, 2);
  expect(r.proposal).toEqual({ kcalChange: 0, reason: 'adherence' });
  expect(r.plan).toBeUndefined();
});

describe('rules', () => {
  test('need data: fewer than 8 weigh-ins, or a span under 14 days', () => {
    expect(checkin(window({ complete: 12, intake: 2300, kgPerDay: 0.01, weighIns: [0, 3, 6, 9, 12, 15, 18] })).proposal.reason).toBe('need_data');
    expect(checkin(window({ complete: 12, intake: 2300, kgPerDay: 0.01, weighIns: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] })).proposal.reason).toBe('need_data');
    expect(checkin(window({ complete: 12, intake: 2300, kgPerDay: 0.01, weighIns: [7, 8, 9, 10, 11, 12, 13, 20] })).proposal.reason).not.toBe('need_data');
  });
  test('weigh-ins outside the 21 day window are ignored', () => {
    const w = window({ complete: 12, intake: 2300, kgPerDay: 0.01 });
    w.weighIns = [...w.weighIns, { day: -5, kg: 80 }];
    expect(checkin(w).stats.weighIns).toBe(11);
  });
  test('few complete days: steer by rate, at most 100', () => {
    const flat = checkin(window({ complete: 5, intake: 2300, kgPerDay: 0 }));
    expect(flat.stats.tdeeObserved).toBeNull();
    expect(flat.proposal).toEqual({ kcalChange: 100, reason: 'raise' });
    const onPace = checkin(window({ complete: 5, intake: 2300, kgPerDay: (0.005 * 60) / 7 }));
    expect(onPace.proposal).toEqual({ kcalChange: 0, reason: 'on_track' });
  });
  test('the even target moves at most 200, also under a deficit or surplus cap', () => {
    const even = (p: PlanNumbers) => rawTarget(p, { sex: 'male', mode: 'even', weekday: 0 });
    const capped = (goal: 'lose' | 'gain', ratePctPerWeek: number, intake: number, kgPerDay: number, more: Partial<PlanInput> = {}) => {
      const p = plan({ ...A, age: 30, heightCm: 185, weightKg: 120, neat: 'moving', goal, ratePctPerWeek, ...more });
      const days = Array.from({ length: 21 }, (_, day) => ({ day, target: dayTarget(p, { sex: 'male', mode: 'matched', weekday: day % 7 }), intake, items: 3 }));
      const weighIns = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20].map((day) => ({ day, kg: 120 + kgPerDay * (day - 10) }));
      const r = checkin({ today: 20, plan: p, profile: { ...profile, heightCm: 185 }, weighIns, days, trendKg: 120 });
      return { p, r };
    };
    const lose = capped('lose', 0.75, 2600, 0); // 2,600 a day and no loss: maintenance is far lower than planned
    expect(lose.p.flags).toEqual(['deficitCap']);
    expect(lose.r.proposal).toEqual({ kcalChange: -200, reason: 'lower' });
    expect(even(lose.r.plan!) - even(lose.p)).toBeCloseTo(-200, 6);
    const gain = capped('gain', 0.5, 4200, -0.02, { neat: 'seated', sessions: [] }); // well over target and still losing
    expect(gain.p.flags).toEqual(['surplusCap']);
    expect(gain.r.proposal).toEqual({ kcalChange: 200, reason: 'raise' });
    expect(even(gain.r.plan!) - even(gain.p)).toBeCloseTo(200, 6);
  });
  test('lower, and on track under 50', () => {
    expect(checkin(window({ complete: 12, intake: 2200, kgPerDay: 0.06 })).proposal).toEqual({ kcalChange: -140, reason: 'lower' });
    expect(checkin(window({ complete: 12, intake: 2200, kgPerDay: 0.03 })).proposal).toEqual({ kcalChange: 0, reason: 'on_track' });
  });
  test('a complete day is closed, or two items and half the target', () => {
    expect(isComplete({ day: 0, target: 2000, intake: 0, items: 0, closed: true })).toBe(true);
    expect(isComplete({ day: 0, target: 2000, intake: 1000, items: 2 })).toBe(true);
    expect(isComplete({ day: 0, target: 2000, intake: 999, items: 2 })).toBe(false);
    expect(isComplete({ day: 0, target: 2000, intake: 1500, items: 1 })).toBe(false);
  });
  test('due on the chosen weekday after 14 days', () => {
    expect(checkinDue(14, 3, 3)).toBe(true);
    expect(checkinDue(13, 3, 3)).toBe(false);
    expect(checkinDue(20, 2, 3)).toBe(false);
  });
});
