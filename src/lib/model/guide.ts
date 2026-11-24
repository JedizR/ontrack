// R6, the first-week guide: three steps a new account takes in its plan's first 7 days (log a meal, weigh in, mark a
// workout done), each read from the account's own records, so the guide is the same on every device and nothing about
// it is stored but the choice to hide it. Day one already holds the onboarding weigh-in, so its weigh-in is tomorrow's.
import { addDays, daysBetween, weekdayOf } from './dates';
import type { Session, SessionLog } from '../../../shared/records';

/** the guide's span: the plan's first week, the day it was saved included (a product choice, not a science one) */
export const GUIDE_DAYS = 7;

export type TrainStep =
  /** a session planned today, not yet marked */
  | { kind: 'today'; session: Session }
  /** the next planned session, on a later day */
  | { kind: 'next'; session: Session; date: string }
  /** no program yet */
  | { kind: 'none' };
export type Guide = {
  meal: boolean;
  /** weighed in after the plan's first day; `tomorrow` on that first day, which has the onboarding weigh-in */
  weigh: { done: boolean; tomorrow: boolean };
  train: { done: boolean; step: TrainStep };
  done: number;
  /** all three done */
  complete: boolean;
  /** all three done, the last of them dated today: the guide's one finished day (Today also keeps it for a last step
   *  saved to a past day while it is open) */
  finished: boolean;
  /** the first weekly check-in */
  checkin: string;
};

export type GuideInput = {
  /** the first plan's day */
  start: string;
  today: string;
  /** whether the weekly check-in is due on a day: `checkinDueOn` itself, so a plan saved to start tomorrow counts */
  dueOn: (date: string) => boolean;
  meals: string[];
  weights: string[];
  logs: SessionLog[];
  sessions: Session[];
};

const first = (dates: string[]) => dates.sort()[0];

/** The guide for today, or null outside the plan's first week. */
export function firstWeek(g: GuideInput): Guide | null {
  const age = daysBetween(g.start, g.today);
  if (age < 0 || age >= GUIDE_DAYS) return null;
  const within = (d: string) => d >= g.start && d <= g.today;
  const mealOn = first(g.meals.filter(within));
  const weighOn = first(g.weights.filter((d) => within(d) && d > g.start));
  const doneOn = first(g.logs.filter((l) => l.status === 'done' && within(l.date)).map((l) => l.date));
  const marked = (date: string, key: string) => g.logs.some((l) => l.date === date && l.sessionKey === key);
  const todays = g.sessions.find((s) => s.weekday === weekdayOf(g.today) && !marked(g.today, s.key));
  let step: TrainStep = { kind: 'none' };
  if (todays) step = { kind: 'today', session: todays };
  else
    for (let i = 1; i <= 7 && step.kind === 'none'; i++) {
      const date = addDays(g.today, i);
      const s = g.sessions.find((x) => x.weekday === weekdayOf(date));
      if (s) step = { kind: 'next', session: s, date };
    }
  const ons = [mealOn, weighOn, doneOn];
  const done = ons.filter(Boolean).length;
  const complete = done === 3;
  const finished = complete && (ons as string[]).sort().at(-1) === g.today;
  // the first day the check-in is due; a plan stands 14 days and the weekday follows, so it lands within weeks
  let checkin = g.today;
  for (let i = 0; i < 60 && !g.dueOn(checkin); i++) checkin = addDays(checkin, 1);
  return { meal: !!mealOn, weigh: { done: !!weighOn, tomorrow: age === 0 }, train: { done: !!doneOn, step }, done, complete, finished, checkin };
}
