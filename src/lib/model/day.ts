// A plan turned into the numbers a screen shows: the day's target and the lines that sum to it.
import { dayTarget, effectiveRate, floorFor, weeklyEee, U, type PlanNumbers, type Sex } from '$lib/model/engine';

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

/** The change a plan delivers after caps and floors, kg a week; positive either way, the goal gives the direction. */
export const kgPerWeek = (p: PlanNumbers, sex: Sex) => (effectiveRate(p, sex) / U.percent) * p.weightKg;
