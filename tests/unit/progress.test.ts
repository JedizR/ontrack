// The check-in as the app reads it from records: the seeder's accounts reach each outcome, and vectors F and G of
// docs/SCIENCE.md come out of the screens' own path. Also when a check-in is due.
import { describe, expect, test } from 'vitest';
import { OUTCOMES, seedRecords } from '../../dev/seed';
import { account, checkinDueOn, trainingOf, type DayStats, type Records } from '../../src/lib/model/progress';
import { dayTarget, eeeByWeekday } from '../../src/lib/model/engine';
import type { Plan, Rec } from '../../shared/records';

const TODAY = '2026-11-11';
function records(recs: Rec[]): Records {
  const of = <T>(c: string) => recs.filter((r) => r.collection === c).map((r) => r.data as T);
  return {
    profile: of<Records['profile']>('profile')[0],
    plans: recs.filter((r) => r.collection === 'plan').map((r) => ({ updatedAt: r.updatedAt, data: r.data as Plan })),
    sessions: of<{ sessions: Records['sessions'] }>('program')[0].sessions,
    logs: of('slog'),
    meals: of('meal'),
    weights: of('weight'),
    closed: [],
  };
}
const run = (o: (typeof OUTCOMES)[number]) => account(records(seedRecords(o, TODAY))).checkinOn(TODAY)!;

test.each(OUTCOMES)('the %s account reaches its outcome', (o) => {
  expect(run(o).proposal.reason).toBe(o);
});

test('a supplement taken with no calories does not make a day complete; one with calories counts as an item', () => {
  const recs = seedRecords('raise', TODAY);
  const d = '2026-11-12';
  const supp = (kcal: number) => ({ name: 'S', kcal, protein: 0, carbs: 0, fat: 0, source: 'yours' as const, supplementId: 'x', scoops: 1 });
  const meal = (id: string, items: object[]) => ({ collection: 'meal' as const, id, updatedAt: 1, data: { date: d, at: `${d}T01:00:00.000Z`, title: 'M', method: 'quick', items } });
  const big = { name: 'Big', kcal: 2000, protein: 50, carbs: 250, fat: 70, source: 'manual' };
  expect(account(records([...recs, meal('a', [big]), meal('b', [supp(0)])])).day(d)?.complete).toBe(false);
  expect(account(records([...recs, meal('a', [big]), meal('b', [supp(120)])])).day(d)?.complete).toBe(true);
});

test('raise is vector F: raise by 100, to 2,560 on training days and 2,320 on rest days', () => {
  const r = run('raise');
  expect(r.stats.completeDays).toBe(12);
  expect(r.stats.meanIntake).toBe(2300);
  expect(r.stats.meanTarget).toBeCloseTo(2357.14, 2);
  expect(r.stats.tdeeObserved).toBeCloseTo(2223, 6);
  expect(r.proposal.kcalChange).toBe(100);
  expect(dayTarget(r.plan!, { sex: 'male', mode: 'matched', weekday: 0 })).toBe(2560);
  expect(dayTarget(r.plan!, { sex: 'male', mode: 'matched', weekday: 1 })).toBe(2320);
});

test('adherence is vector G: 87 percent of the target, no change', () => {
  const r = run('adherence');
  expect(r.stats.meanIntake! / r.stats.meanTarget).toBeCloseTo(0.87, 2);
  expect(r.proposal).toEqual({ kcalChange: 0, reason: 'adherence' });
});

test('a program change waiting for tomorrow keeps its exercise energy in the raised plan', () => {
  const recs = records(seedRecords('raise', TODAY));
  const today = recs.plans[0].data;
  const sessions = recs.sessions.filter((s) => s.weekday !== 5); // Saturday's session dropped today
  recs.plans.push({ updatedAt: 2, data: { ...today, effectiveFrom: '2026-11-12', source: 'edit', eeeByWeekday: eeeByWeekday(sessions, 60), sessions } });
  const r = account(recs).checkinOn(TODAY)!;
  expect(r.proposal).toEqual({ kcalChange: 100, reason: 'raise' }); // measured on today's plan, as vector F
  expect(r.plan!.eeeByWeekday).toEqual(eeeByWeekday(sessions, 60));
  expect(r.plan!.baseline).toBeCloseTo(1987.18, 2);
});

test('the window holds no day before the account began', () => {
  const recs = records(seedRecords('raise', TODAY).filter((r) => r.collection !== 'weight' || (r.data as { date: string }).date >= '2026-10-25'));
  recs.plans[0].data = { ...recs.plans[0].data, effectiveFrom: '2026-10-25' };
  expect(account(recs).checkinOn(TODAY)!.stats.days).toBe(18);
});

describe('due', () => {
  const plan = (effectiveFrom: string, source: Plan['source']) => ({ updatedAt: 1, data: { effectiveFrom, source } as Plan });
  test('on the check-in weekday once the plan has been in effect 14 days', () => {
    expect(checkinDueOn([plan('2026-10-28', 'onboarding')], 2, '2026-11-11')).toBe(true); // 15 days
    expect(checkinDueOn([plan('2026-11-04', 'onboarding')], 2, '2026-11-11')).toBe(false); // 8 days
    expect(checkinDueOn([plan('2026-10-28', 'onboarding')], 3, '2026-11-11')).toBe(false); // another weekday
  });
  test('a plan accepted at a check-in is checked again two weeks later on the same weekday', () => {
    const plans = [plan('2026-10-14', 'onboarding'), plan('2026-10-29', 'checkin')]; // accepted on Wednesday 28 October
    expect(checkinDueOn(plans, 2, '2026-11-04')).toBe(false);
    expect(checkinDueOn(plans, 2, '2026-11-11')).toBe(true);
  });
  test('a program change does not restart the count', () => {
    expect(checkinDueOn([plan('2026-10-28', 'onboarding'), plan('2026-11-06', 'edit')], 2, '2026-11-11')).toBe(true);
  });
});

describe('the training card (F20)', () => {
  test('from the seeded marks: four sessions planned a week, all done but today\'s', () => {
    const weeks = account(records(seedRecords('on_track', TODAY))).weeks(TODAY, 4);
    expect(weeks.slice(0, 3).map((w) => w.training)).toEqual(Array(3).fill({ planned: 4, done: 4, skipped: 0, strength: 4, cardioMinutes: 0, cardioBand: 'below' }));
    expect(weeks[3].training).toMatchObject({ planned: 4, done: 3, strength: 3 }); // today's session is not marked yet
  });
  test('a week before the account began plans nothing', () => {
    expect(account(records(seedRecords('on_track', TODAY))).weeks(TODAY, 5)[0].training).toMatchObject({ planned: 0, done: 0 });
  });
  test('done and skipped marks, strength sessions, and cardio minutes against the WHO range', () => {
    const s = (key: string, type: 'strength' | 'cardio' | 'walk', minutes: number, intensity: 'light' | 'moderate' | 'hard' = 'moderate') =>
      ({ key, weekday: 0, name: key, type, minutes, intensity });
    const day = (sessions: DayStats['sessions']) => ({ sessions }) as DayStats;
    const t = trainingOf([
      day([{ session: s('lift', 'strength', 60), status: 'done' }, { session: s('bike', 'cardio', 40), status: 'done' }]), // 6.8 METs: double
      day([{ session: s('lift2', 'strength', 60), status: 'skipped' }, { session: s('walk', 'walk', 45), status: 'done' }]), // 3.8 METs: once
      day([{ session: s('run', 'cardio', 30) }]), // not marked: not done
    ]);
    expect(t).toEqual({ planned: 5, done: 3, skipped: 1, strength: 1, cardioMinutes: 125, cardioBand: 'below' });
    expect(trainingOf([day([{ session: s('bike', 'cardio', 80), status: 'done' }])]).cardioBand).toBe('inRange');
    expect(trainingOf([day([{ session: s('bike', 'cardio', 160), status: 'done' }])]).cardioBand).toBe('above');
  });
});
