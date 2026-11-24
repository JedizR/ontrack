// R6: the first-week guide is read from the account's records: its span, each step, the finished day and the check-in date.
import { expect, test } from 'vitest';
import { firstWeek, type GuideInput } from '../../src/lib/model/guide';
import type { Session, SessionLog } from '../../shared/records';

const s = (key: string, weekday: number, name = 'Upper'): Session => ({ key, weekday, name, type: 'strength', minutes: 60, intensity: 'moderate' });
// 23 Nov 2026 is a Monday; sessions on Tuesday and Thursday; the check-in on Mondays
const base: GuideInput = { start: '2026-11-23', today: '2026-11-23', checkinFrom: '2026-11-23', checkinWeekday: 0, meals: [], weights: ['2026-11-23'], logs: [], sessions: [s('a', 1), s('b', 3, 'Lower')] };
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

test('finished on the day the last step lands, then gone', () => {
  const all = { ...base, today: '2026-11-25', meals: ['2026-11-23'], weights: ['2026-11-23', '2026-11-24'], logs: [log('2026-11-25', 'b')] };
  expect(firstWeek(all)).toMatchObject({ done: 3, finished: true });
  expect(firstWeek({ ...all, today: '2026-11-26' })).toBeNull();
  // two of three keeps the guide up all week
  expect(firstWeek({ ...all, logs: [], today: '2026-11-28' })).toMatchObject({ done: 2, finished: false });
});

test('a check-in restarted by a changed goal counts from the change', () => {
  expect(firstWeek({ ...base, today: '2026-11-26', checkinFrom: '2026-11-26' })!.checkin).toBe('2026-12-14');
});
