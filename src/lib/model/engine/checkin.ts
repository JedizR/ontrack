// The weekly check-in. docs/SCIENCE.md section 10.
import { U, V } from './constants';
import type { Sex } from './bmr';
import { planFromBaseline, type Experience, type PlanNumbers } from './plan';
import { effectiveRate, rawTarget, roundTarget, tdeeAvg, weeklyEee } from './targets';
import { slope, type WeighIn } from './trend';

export type CheckinReason = 'on_track' | 'raise' | 'lower' | 'adherence' | 'need_data';
/** One day in the window. `items` is the number of logged items; `closed` means the user closed the day. */
export type CheckinDay = { day: number; target: number; intake: number; items: number; closed?: boolean };

export type CheckinInput = {
  /** Day number of the check-in. The window is the 21 days ending today. */
  today: number;
  plan: PlanNumbers;
  profile: { sex: Sex; heightCm: number; experience: Experience };
  weighIns: WeighIn[];
  days: CheckinDay[];
  /** Current trend weight, kg. */
  trendKg: number;
};

export type CheckinResult = {
  stats: {
    days: number;
    weighIns: number;
    completeDays: number;
    ratePctPerWeek: number | null;
    meanIntake: number | null;
    meanTarget: number;
    tdeeObserved: number | null;
  };
  proposal: { kcalChange: number; reason: CheckinReason };
  /** The plan to create if the user accepts. Only for raise and lower. */
  plan?: PlanNumbers;
};

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

/** Closed by the user, or at least two items and half the target. */
export const isComplete = (d: CheckinDay) =>
  !!d.closed || (d.items >= V.completeMinItems && d.intake >= V.completeMinShare * d.target);

/** Runs on the chosen weekday once 14 days have passed since the plan started or changed. */
export const checkinDue = (daysSincePlan: number, weekday: number, checkinWeekday: number) =>
  weekday === checkinWeekday && daysSincePlan >= V.checkinEveryDays;

export function checkin(c: CheckinInput): CheckinResult {
  const from = c.today - V.rateWindowDays + 1;
  const inWindow = <T extends { day: number }>(x: T) => x.day >= from && x.day <= c.today;
  const weighIns = c.weighIns.filter(inWindow);
  const days = c.days.filter(inWindow);
  const complete = days.filter(isComplete);
  const evenNow = rawTarget(c.plan, { sex: c.profile.sex, mode: 'even', weekday: 0 });

  const span = weighIns.length ? Math.max(...weighIns.map((w) => w.day)) - Math.min(...weighIns.map((w) => w.day)) + 1 : 0;
  const s = weighIns.length >= V.minWeighIns && span >= V.minSpanDays ? slope(weighIns) : null;
  const w = c.trendKg;
  const meanIntake = complete.length ? mean(complete.map((d) => d.intake)) : null;
  const stats: CheckinResult['stats'] = {
    days: days.length,
    weighIns: weighIns.length,
    completeDays: complete.length,
    ratePctPerWeek: s == null ? null : ((s * U.daysPerWeek) / w) * U.percent,
    meanIntake,
    meanTarget: days.length ? mean(days.map((d) => d.target)) : roundTarget(evenNow),
    tdeeObserved: null,
  };
  const result = (reason: CheckinReason, kcalChange = 0, plan?: PlanNumbers): CheckinResult => ({
    stats,
    proposal: { kcalChange, reason },
    ...(plan ? { plan } : {}),
  });

  if (s == null) return result('need_data');

  // A new plan from a new baseline at the current trend weight, its even target moved at most 200 kcal.
  const propose = (baselineNew: number) => {
    const next = (b: number) =>
      planFromBaseline({
        ...c.profile,
        weightKg: w,
        goal: c.plan.goal,
        ratePctPerWeek: c.plan.ratePctPerWeek,
        maintainOnly: c.plan.flags.includes('maintainOnly'),
        bmr: c.plan.bmr,
        baseline: b,
        eeeByWeekday: c.plan.eeeByWeekday,
      });
    const moveOf = (p: PlanNumbers) => rawTarget(p, { sex: c.profile.sex, mode: 'even', weekday: 0 }) - evenNow;
    let p = next(baselineNew);
    let move = moveOf(p);
    if (Math.abs(move) < V.onTrackChange) return result('on_track');
    if (Math.abs(move) > V.moveClamp) {
      // Under a cap the even target moves 0.75 or 1.2 kcal per kcal of baseline, so scale the correction by that rate.
      const perKcal = moveOf(next(baselineNew + 1)) - move || 1;
      p = next(baselineNew + (Math.sign(move) * V.moveClamp - move) / perKcal);
      move = moveOf(p);
    }
    return result(move > 0 ? 'raise' : 'lower', roundTarget(move), p);
  };

  if (meanIntake == null || complete.length < V.minCompleteDays) {
    // Too few complete days to trust intake: steer by the rate alone.
    const g = c.plan.goal;
    const targetRate = g === 'lose' ? -effectiveRate(c.plan, c.profile.sex) : g === 'gain' ? effectiveRate(c.plan, c.profile.sex) : 0;
    const change = (((targetRate - stats.ratePctPerWeek!) / U.percent) * w * V.kcalPerKg) / U.daysPerWeek;
    if (Math.abs(change) < V.onTrackChange) return result('on_track');
    return propose(c.plan.baseline + clamp(change, -V.rateOnlyClamp, V.rateOnlyClamp));
  }

  const tdeeObserved = meanIntake - s * V.kcalPerKg;
  stats.tdeeObserved = tdeeObserved;
  const share = meanIntake / stats.meanTarget;
  if ((c.plan.goal === 'gain' && share < V.adherence.gainMin) || (c.plan.goal === 'lose' && share > V.adherence.loseMax)) {
    return result('adherence');
  }
  const tdee = tdeeAvg(c.plan);
  const blended = (1 - V.observedWeight) * tdee + V.observedWeight * tdeeObserved;
  const tdeeNew = clamp(blended, tdee * (1 - V.tdeeClamp), tdee * (1 + V.tdeeClamp));
  return propose(tdeeNew - weeklyEee(c.plan) / U.daysPerWeek);
}
