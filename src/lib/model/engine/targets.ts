// Daily targets, macros for a day and on track status. docs/SCIENCE.md sections 7 to 9.
import { U, V } from './constants.ts';
import type { Sex } from './bmr.ts';
import type { Goal, PlanNumbers } from './plan.ts';

export type CalorieMode = 'matched' | 'even';
export type DayStatus = 'below' | 'on' | 'above';
type Week = Pick<PlanNumbers, 'baseline' | 'eeeByWeekday'>;

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
export const weeklyEee = (p: Pick<PlanNumbers, 'eeeByWeekday'>) => sum(p.eeeByWeekday);
/** Average maintenance, kcal per day: the baseline plus the week's exercise spread over seven days. */
export const tdeeAvg = (p: Week) => p.baseline + weeklyEee(p) / U.daysPerWeek;
export const floorFor = (sex: Sex) => V.floor[sex];
export const roundTarget = (raw: number) => Math.round(raw / V.targetStep) * V.targetStep;

export type DayOptions = { sex: Sex; mode: CalorieMode; weekday: number; /** every session that day was skipped */ skipped?: boolean };

/** The day's target before rounding, after the floor. */
export function rawTarget(p: Week & Pick<PlanNumbers, 'delta'>, o: DayOptions): number {
  const eee = o.mode === 'even' ? weeklyEee(p) / U.daysPerWeek : o.skipped ? 0 : p.eeeByWeekday[o.weekday];
  return Math.max(floorFor(o.sex), p.baseline + eee + p.delta);
}
export const dayTarget = (p: Week & Pick<PlanNumbers, 'delta'>, o: DayOptions) => roundTarget(rawTarget(p, o));

/** Protein and fat are the same every day; carbs fill what is left of the day's target. */
export function dayMacros(p: Pick<PlanNumbers, 'proteinG' | 'fatG'>, target: number) {
  const a = V.atwater;
  const carbsG = Math.max(0, Math.round((target - a.protein * p.proteinG - a.fat * p.fatG) / a.carbs));
  return { proteinG: p.proteinG, fatG: p.fatG, carbsG };
}

/** The rate the plan actually delivers after caps and floors, percent of body weight per week in the goal's direction. */
export function effectiveRate(p: PlanNumbers, sex: Sex): number {
  const applied = rawTarget(p, { sex, mode: 'even', weekday: 0 }) - tdeeAvg(p);
  const kgPerWeek = ((p.goal === 'lose' ? 0 - applied : applied) * U.daysPerWeek) / V.kcalPerKg; // 0 - x: never -0
  return (kgPerWeek / p.weightKg) * U.percent;
}

/** The day's on track band in kcal, [from, to] (section 9). On a lose goal it never starts below the floor. */
export function calorieBand(goal: Goal, target: number, sex: Sex): [number, number] {
  const b = V.onTrackBand;
  const [lo, hi] =
    goal === 'gain' ? [b.gainMin, b.gainMax] : goal === 'lose' ? [b.loseMin, b.loseMax] : [b.maintainMin, b.maintainMax];
  return [goal === 'lose' ? Math.max(lo * target, floorFor(sex)) : lo * target, hi * target];
}

/** Calories against the day's band. Below the band is "to go" on a gain goal and neutral otherwise. */
export function calorieStatus(goal: Goal, intake: number, target: number, sex: Sex): DayStatus {
  const [min, max] = calorieBand(goal, target, sex);
  return intake < min ? 'below' : intake > max ? 'above' : 'on';
}

export const proteinOnTrack = (grams: number, target: number) => grams >= V.proteinOnTrack * target;
/** Protein's band: from the on track share of the target, with no upper end. */
export const proteinBand = (target: number): [number, number] => [V.proteinOnTrack * target, Infinity];
