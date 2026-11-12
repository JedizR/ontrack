// The check-in as the app reads it from records: the seeder's accounts reach each outcome, and vectors F and G of
// docs/SCIENCE.md come out of the screens' own path. Also when a check-in is due.
import { describe, expect, test } from 'vitest';
import { OUTCOMES, seedRecords } from '../../dev/seed';
import { account, checkinDueOn, type Records } from '../../src/lib/model/progress';
import { checkin, dayTarget } from '../../src/lib/model/engine';
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
const run = (o: (typeof OUTCOMES)[number]) => checkin(account(records(seedRecords(o, TODAY))).checkinInput(TODAY)!);

test.each(OUTCOMES)('the %s account reaches its outcome', (o) => {
  expect(run(o).proposal.reason).toBe(o);
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
