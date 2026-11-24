// R6: the first-week guide is read from the account's records: its span, each step, the finished day and the check-in date.
import { expect, test } from 'vitest';
import { firstWeek, type GuideInput } from '../../src/lib/model/guide';
import { checkinDueOn } from '../../src/lib/model/progress';
import type { Plan, Session, SessionLog } from '../../shared/records';

const s = (key: string, weekday: number, name = 'Upper'): Session => ({ key, weekday, name, type: 'strength', minutes: 60, intensity: 'moderate' });
// 23 Nov 2026 is a Monday; sessions on Tuesday and Thursday; the check-in on Mondays
const plan = (effectiveFrom: string, source: Plan['source'] = 'onboarding', goal: Plan['goal'] = 'gain') => ({ updatedAt: 1, data: { effectiveFrom, source, goal, ratePctPerWeek: 0.5, baseline: 1888 } as Plan });
const dueFrom = (plans: ReturnType<typeof plan>[]) => (d: string) => checkinDueOn(plans, 0, d);
const base: GuideInput = { start: '2026-11-23', today: '2026-11-23', dueOn: dueFrom([plan('2026-11-23')]), meals: [], weights: ['2026-11-23'], logs: [], sessions: [s('a', 1), s('b', 3, 'Lower')] };
const log = (date: string, sessionKey: string, status: SessionLog['status'] = 'done'): SessionLog => ({ date, sessionKey, status });

test('the plan’s first 7 days only', () => {
  expect(firstWeek({ ...base, today: '2026-11-22' })).toBeNull();
  expect(firstWeek({ ...base, today: '2026-11-29' })).not.toBeNull();
  expect(firstWeek({ ...base, today: '2026-11-30' })).toBeNull();
});

test('day one: the onboarding weigh-in does not count, the next weigh-in is tomorrow, the next session is named', () => {
  const g = firstWeek(base)!;
  expect(g).toMatchObject({ meal: false, weigh: { done: false, tomorrow: true }, train: { done: false, step: { kind: 'next', date: '2026-11-24' } }, done: 0, finished: false });
  // 14 days from Monday 23 Nov, the first counted, end on Sunday 6 Dec: the first Monday after is the 7th
  expect(g.checkin).toBe('2026-12-07');
  expect(firstWeek({ ...base, today: '2026-11-24', weights: ['2026-11-23', '2026-11-24'] })!.weigh).toEqual({ done: true, tomorrow: false });
});

test('a session today until it is marked; a skip moves on to the next one', () => {
  const tue = { ...base, today: '2026-11-24' };
  expect(firstWeek(tue)!.train.step).toMatchObject({ kind: 'today', session: { key: 'a' } });
  expect(firstWeek({ ...tue, logs: [log('2026-11-24', 'a', 'skipped')] })!.train).toMatchObject({ done: false, step: { kind: 'next', date: '2026-11-26' } });
  expect(firstWeek({ ...tue, sessions: [] })!.train.step).toEqual({ kind: 'none' });
});

test('a rest day’s activity marked done counts, as any done session does', () => {
  expect(firstWeek({ ...base, logs: [log('2026-11-23', 'x1')] })!.train.done).toBe(true);
});

test('finished on the day the last step lands; complete but not finished after it (Today hides it then)', () => {
  const all = { ...base, today: '2026-11-25', meals: ['2026-11-23'], weights: ['2026-11-23', '2026-11-24'], logs: [log('2026-11-25', 'b')] };
  expect(firstWeek(all)).toMatchObject({ done: 3, complete: true, finished: true });
  expect(firstWeek({ ...all, today: '2026-11-26' })).toMatchObject({ complete: true, finished: false });
  // two of three keeps the guide up all week
  expect(firstWeek({ ...all, logs: [], today: '2026-11-28' })).toMatchObject({ done: 2, finished: false });
});

test('a goal changed in Settings starts tomorrow, and the check-in counts from it already today', () => {
  const plans = [plan('2026-11-23'), plan('2026-11-26', 'edit', 'lose')];
  // 14 days from Thursday 26 Nov end on Wednesday 9 Dec: the first Monday after is the 14th
  expect(firstWeek({ ...base, today: '2026-11-25', dueOn: dueFrom(plans) })!.checkin).toBe('2026-12-14');
  // a program change keeps the goal, the pace and the baseline, so it does not restart the count
  expect(firstWeek({ ...base, today: '2026-11-25', dueOn: dueFrom([plan('2026-11-23'), plan('2026-11-26', 'edit')]) })!.checkin).toBe('2026-12-07');
});
