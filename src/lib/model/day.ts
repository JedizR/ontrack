// A plan turned into the numbers a screen shows: the day's target and the lines that sum to it.
import { calorieBand, calorieStatus, dayMacros, dayTarget, floorFor, rawTarget, tdeeAvg, weeklyEee, U, V, type CalorieMode, type PlanNumbers, type Sex } from '$lib/model/engine';
import { daysBetween, weekdayOf } from '$lib/model/dates';
import type { Meal, MealItem, Plan, Session, SessionLog } from '../../../shared/records';

type Week = Pick<PlanNumbers, 'baseline' | 'eeeByWeekday' | 'delta'>;

/** Exercise kcal on a typical training day: the mean over the days that have a session. 0 with no sessions. */
export function trainingDayEee(p: Pick<PlanNumbers, 'eeeByWeekday'>) {
  const days = p.eeeByWeekday.filter((e) => e > 0);
  return days.length ? days.reduce((a, b) => a + b, 0) / days.length : 0;
}
/** Exercise kcal on every day in even mode: the week's spread over seven days. */
export const evenEee = (p: Pick<PlanNumbers, 'eeeByWeekday'>) => weeklyEee(p) / U.daysPerWeek;

/** The target of a day with this much exercise energy, rounded and floored like any day target. */
export const targetWith = (p: Week, sex: Sex, eee: number) =>
  dayTarget({ baseline: p.baseline, eeeByWeekday: [eee], delta: p.delta }, { sex, mode: 'matched', weekday: 0 });

/**
 * "How this was calculated": resting energy, daily movement, training, the goal adjustment and any lift to the floor,
 * as whole numbers that add up exactly to the rounded target. Rounding lands on daily movement, itself an estimate.
 */
export function targetParts(p: Week & Pick<PlanNumbers, 'bmr'>, sex: Sex, eee: number) {
  const total = targetWith(p, sex, eee);
  const r = (x: number) => Math.round(x) || 0; // never -0
  const bmr = r(p.bmr);
  const training = r(eee);
  const goal = r(p.delta);
  const floorLift = r(Math.max(0, floorFor(sex) - (p.baseline + eee + p.delta)));
  return { bmr, movement: total - bmr - training - goal - floorLift, training, goal, floorLift, total };
}

/**
 * The change a plan delivers in a week, kg, after caps and floors; positive either way, the goal gives the direction.
 * Summed day by day, because in matched mode a floor can lift rest days and leave training days alone.
 */
export function kgPerWeek(p: PlanNumbers, sex: Sex, mode: CalorieMode) {
  let eaten = 0;
  for (let weekday = 0; weekday < U.daysPerWeek; weekday++) eaten += rawTarget(p, { sex, mode, weekday });
  const change = (eaten - U.daysPerWeek * tdeeAvg(p)) / V.kcalPerKg;
  return p.goal === 'lose' ? 0 - change : change;
}

// ----- a day as Today shows it -----
type PlanRec = { updatedAt: number; data: Plan };
/** The plan for a date: the newest with effectiveFrom on or before it; before the first plan, the first. */
export function planFor(plans: PlanRec[], date: string): Plan | null {
  const order = [...plans].sort((a, b) => a.data.effectiveFrom.localeCompare(b.data.effectiveFrom) || a.updatedAt - b.updatedAt);
  return order.filter((p) => p.data.effectiveFrom <= date).at(-1)?.data ?? order[0]?.data ?? null;
}

export type Totals = { kcal: number; protein: number; carbs: number; fat: number };
export function totals(items: MealItem[]): Totals {
  const t = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  for (const i of items) { t.kcal += i.kcal; t.protein += i.protein; t.carbs += i.carbs; t.fat += i.fat; }
  return t;
}

/** Where a meal's numbers came from: any estimate makes it an estimate; typed numbers only, a quick add. */
export function mealSource(items: MealItem[]): 'database' | 'estimate' | 'manual' {
  if (items.some((i) => i.source === 'estimate')) return 'estimate';
  return items.length && items.every((i) => i.source === 'manual') ? 'manual' : 'database';
}

export type DayInput = { plan: Plan; sex: Sex; mode: CalorieMode; date: string; sessions: Session[]; logs: SessionLog[]; meals: Meal[] };
/**
 * Everything Today shows for a day: the target (training or rest, skipped or not), its band, the macros, what was eaten
 * and the status. Matched mode uses the plan's frozen exercise energy for the weekday; skipping every session that
 * day returns it to the rest target (F8). The sessions are the plan's own when it keeps them, else the program's.
 */
export function dayView({ plan, sex, mode, date, sessions, logs, meals }: DayInput) {
  const weekday = weekdayOf(date);
  const today = (plan.sessions ?? sessions).filter((s) => s.weekday === weekday);
  const status = (key: string) => logs.find((l) => l.date === date && l.sessionKey === key)?.status;
  const skipped = today.length > 0 && today.every((s) => status(s.key) === 'skipped');
  const eee = mode === 'even' ? evenEee(plan) : skipped ? 0 : plan.eeeByWeekday[weekday];
  const target = targetWith(plan, sex, eee);
  const eaten = totals(meals.flatMap((m) => m.items));
  return {
    target,
    eee,
    zone: calorieBand(plan.goal, target, sex),
    macros: dayMacros(plan, target),
    eaten,
    status: calorieStatus(plan.goal, eaten.kcal, target, sex),
    training: today.length > 0 && !skipped,
    sessions: today.map((s) => ({ session: s, status: status(s.key) })),
  };
}

const sameMeal = (m: Meal) => `${m.title}|${Math.round(totals(m.items).kcal)}`;
/** The last `n` distinct meals, newest first: the same title and calories count once. */
export function recentMeals<T extends { data: Meal }>(meals: T[], n = 5): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const m of [...meals].sort((a, b) => b.data.at.localeCompare(a.data.at))) {
    const k = sameMeal(m.data);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(m);
    if (out.length === n) break;
  }
  return out;
}

/** Foods logged before, newest first, each once, with the grams used last time. */
export function recentFoods(meals: Meal[], n = 8): { foodId: string; grams?: number }[] {
  const seen = new Set<string>();
  const out: { foodId: string; grams?: number }[] = [];
  for (const m of [...meals].sort((a, b) => b.at.localeCompare(a.at))) {
    for (const i of m.items) {
      if (!i.foodId || seen.has(i.foodId)) continue;
      seen.add(i.foodId);
      out.push({ foodId: i.foodId, grams: i.grams });
      if (out.length === n) return out;
    }
  }
  return out;
}

/** The weigh-in prompt shows when the last weigh-in is this many days old or more, or there is none. */
export const WEIGH_PROMPT_DAYS = 3;
export function weighInDue(dates: string[], date: string) {
  const last = dates.filter((d) => d <= date).sort().at(-1);
  return !last || daysBetween(last, date) >= WEIGH_PROMPT_DAYS;
}
