// Progress and the weekly check-in, from the stored records (SCREENS.md sections 9 and 10, SCIENCE.md section 10):
// each day's numbers as Today shows them, weeks of them, the weight trend, and the check-in's input. Pure: callers
// pass the records in, so the same code runs on the store, the seeder and the tests.
import {
  aerobicBand, aerobicMinutes, checkin, checkinDue, isComplete, planFromBaseline, smooth, STRENGTH, V, U,
  type AerobicBand, type CheckinInput, type CheckinResult,
} from '$lib/model/engine';
import { dayView, planFor } from './day';
import { addDays, daysBetween, lastWeek, weekdayOf } from './dates';
import type { Collection, DataOf, Meal, Plan, Profile, Session, SessionLog, Weight } from '../../../shared/records';

type PlanRec = { updatedAt: number; data: Plan };

/**
 * When the plan in effect on `date` last had its baseline set: the newest onboarding or check-in plan by then, or an
 * `edit` plan that changed the goal, the pace or the baseline (Settings, M9a). A program change keeps all three and moves
 * only exercise energy, so it does not restart the count.
 */
export function baselineFrom(plans: PlanRec[], date: string): string | undefined {
  const order = [...plans].sort((a, b) => a.data.effectiveFrom.localeCompare(b.data.effectiveFrom) || a.updatedAt - b.updatedAt)
    .map((p) => p.data).filter((p) => p.effectiveFrom <= date);
  let from: string | undefined;
  order.forEach((p, i) => {
    const prev = order[i - 1];
    if (!prev || p.source !== 'edit' || p.goal !== prev.goal || p.ratePctPerWeek !== prev.ratePctPerWeek || p.baseline !== prev.baseline) from = p.effectiveFrom;
  });
  return from;
}
/** Due on the chosen weekday once that plan has been in effect 14 days, the day itself included. */
export function checkinDueOn(plans: PlanRec[], checkinWeekday: number, date: string) {
  const from = baselineFrom(plans, date);
  return !!from && checkinDue(daysBetween(from, date) + 1, weekdayOf(date), checkinWeekday);
}

export type Records = { profile: Profile; plans: PlanRec[]; sessions: Session[]; logs: SessionLog[]; meals: Meal[]; weights: Weight[]; closed: string[] };
type Planned = { session: Omit<Session, 'exercises'>; status?: SessionLog['status'] };
export type DayStats = {
  date: string; target: number; intake: number; protein: number; items: number; closed: boolean; onTrack: boolean; complete: boolean;
  /** The day's sessions as Today shows them, each with its done or skipped mark */
  sessions: Planned[];
};
/**
 * Progress's training card (PRD F20) for a week, from the done and skipped marks: sessions planned, done and skipped;
 * strength sessions done (against `V.strengthSessions`); moderate-equivalent cardio minutes done, against the WHO range.
 */
export type TrainingStats = { planned: number; done: number; skipped: number; strength: number; cardioMinutes: number; cardioBand: AerobicBand };
export type WeekStats = {
  start: string; days: DayStats[]; meanIntake: number | null; meanTarget: number; meanProtein: number | null; onTrack: number;
  training: TrainingStats;
};

/** A week's training from its days: a session counts as done only when marked done. */
export function trainingOf(days: DayStats[]): TrainingStats {
  const all = days.flatMap((d) => d.sessions);
  const done = all.filter((s) => s.status === 'done').map((s) => s.session);
  const cardioMinutes = aerobicMinutes(done);
  return {
    planned: all.length,
    done: done.length,
    skipped: all.filter((s) => s.status === 'skipped').length,
    strength: done.filter((s) => STRENGTH.has(s.type)).length,
    cardioMinutes,
    cardioBand: aerobicBand(cardioMinutes),
  };
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** An account's days, weeks, trend and check-in, read from its records. */
export function account(r: Records) {
  const byDate = new Map<string, Meal[]>();
  for (const m of r.meals) {
    const list = byDate.get(m.date);
    if (list) list.push(m);
    else byDate.set(m.date, [m]);
  }
  const weights = [...r.weights].sort((a, b) => a.date.localeCompare(b.date));
  const trend = smooth(weights.map((w) => w.kg));
  const closed = new Set(r.closed);
  /** The account's first day: its first plan or its first weigh-in. */
  const first = [...r.plans.map((p) => p.data.effectiveFrom), weights[0]?.date].filter(Boolean).sort()[0] as string | undefined;

  function day(date: string): DayStats | null {
    const plan = planFor(r.plans, date);
    if (!plan) return null;
    const meals = byDate.get(date) ?? [];
    const v = dayView({ plan, sex: r.profile.sex, mode: r.profile.calorieMode, date, sessions: r.sessions, logs: r.logs, meals });
    // a supplement taken with no calories (creatine) is not a logged food: it does not make a day complete
    const items = meals.reduce((a, m) => a + m.items.filter((i) => i.kcal > 0 || !i.supplementId).length, 0);
    const d = { target: v.target, intake: v.eaten.kcal, items, closed: closed.has(date) };
    return {
      date, ...d, protein: v.eaten.protein, onTrack: meals.length > 0 && v.status === 'on', complete: isComplete({ day: 0, ...d }), sessions: v.sessions,
    };
  }

  /** `n` weeks of seven days, the last ending on `end`, oldest first. Averages are over complete days. */
  function weeks(end: string, n: number): WeekStats[] {
    return Array.from({ length: n }, (_, i) => {
      const days = lastWeek(addDays(end, -U.daysPerWeek * (n - 1 - i))).map(day).filter((d): d is DayStats => !!d);
      const complete = days.filter((d) => d.complete);
      return {
        start: days[0]?.date ?? end,
        days,
        meanIntake: mean(complete.map((d) => d.intake)),
        meanTarget: mean(days.map((d) => d.target)) ?? 0,
        meanProtein: mean(complete.map((d) => d.protein)),
        onTrack: days.filter((d) => d.onTrack).length,
        // before the account began nothing was planned
        training: trainingOf(days.filter((d) => !first || d.date >= first)),
      };
    });
  }

  /** Weigh-ins with the smoothed trend at each, oldest first. */
  const points = weights.map((w, i) => ({ date: w.date, kg: w.kg, trend: trend[i] }));
  /** The trend weight on `date`: the last weigh-in's trend on or before it. */
  const trendOn = (date: string) => points.filter((p) => p.date <= date).at(-1)?.trend;

  /**
   * The check-in's input on `date`: the 21 days ending that day (none before the account's first), every weigh-in up
   * to it as day numbers counted from it, and that day's plan, whose maintenance the window measured.
   */
  function checkinInput(date: string): CheckinInput | null {
    const plan = planFor(r.plans, date);
    if (!plan) return null;
    const days = Array.from({ length: V.rateWindowDays }, (_, i) => day(addDays(date, i + 1 - V.rateWindowDays))!)
      .filter((d) => !first || d.date >= first)
      .map((d) => ({ day: daysBetween(date, d.date), target: d.target, intake: d.intake, items: d.items, closed: d.closed }));
    const weighIns = weights.filter((w) => w.date <= date).map((w) => ({ day: daysBetween(date, w.date), kg: w.kg }));
    const { sex, heightCm, experience } = r.profile;
    return { today: 0, plan, profile: { sex, heightCm, experience }, weighIns, days, trendKg: trendOn(date) ?? plan.weightKg };
  }

  /**
   * The check-in on `date`. A program change or a Settings edit made that day waits in tomorrow's plan; a raise or a
   * lower keeps its exercise energy, goal and pace (M9a), so accepting never undoes either.
   */
  function checkinOn(date: string): CheckinResult | null {
    const input = checkinInput(date);
    if (!input) return null;
    const result = checkin(input);
    const next = planFor(r.plans, addDays(date, 1));
    const p = result.plan;
    if (!p || !next || next === input.plan) return result;
    const { sex, heightCm, experience } = r.profile;
    const basis = { sex, heightCm, experience, weightKg: p.weightKg, goal: next.goal, ratePctPerWeek: next.ratePctPerWeek, maintainOnly: next.flags.includes('maintainOnly') };
    return { ...result, plan: planFromBaseline({ ...basis, bmr: p.bmr, baseline: p.baseline, eeeByWeekday: next.eeeByWeekday }) };
  }

  return { first, day, weeks, points, trendOn, checkinOn };
}
export type Account = ReturnType<typeof account>;

type Store = { live<C extends Collection>(c: C): { updatedAt: number; data: DataOf[C] }[]; get<C extends Collection>(c: C, id: string): DataOf[C] | undefined };
/** The signed in account from the store, or null before onboarding. Inside a `$derived`, it follows every change. */
export function accountOf(db: Store) {
  const profile = db.get('profile', 'profile');
  if (!profile) return null;
  const data = <C extends Collection>(c: C) => db.live(c).map((x) => x.data);
  return account({
    profile,
    plans: db.live('plan'),
    sessions: db.get('program', 'program')?.sessions ?? [],
    logs: data('slog'),
    meals: data('meal'),
    weights: data('weight'),
    closed: data('day').filter((d) => d.closed).map((d) => d.date),
  });
}
