// Settings' plan edits (M9a, SCREENS.md section 11): a changed profile, goal or pace becomes the plan from tomorrow, as a
// program change and an accepted check-in do. Pure, so the page can show the new target before it is saved.
import { bmi, guardrails, paceOptions, plan, planFromBaseline, type Goal, type Pace, type PlanNumbers } from '$lib/model/engine';
import { evenEee, targetWith, trainingDayEee } from './day';
import type { Plan, Profile, Session } from '../../../shared/records';

/** The profile fields the resting energy equation reads: changing one reruns it from the latest weight. */
const FORMULA = ['sex', 'birthYear', 'heightCm', 'bodyFatPct', 'neat'] as const;

export type Change = { profile: Profile; goal: Goal; rate: number };

/**
 * The plan a change gives, from `from`. A goal, pace or experience change keeps the baseline (a measured one too); a change
 * to what the equation reads recomputes it from the latest weigh-in and the program's sessions, as onboarding does.
 */
export function nextPlan(base: Plan, was: Profile, c: Change, o: { weightKg: number; sessions: Session[]; year: number; from: string }): Plan {
  const p = c.profile;
  const maintainOnly = base.flags.includes('maintainOnly');
  const formula = FORMULA.some((k) => was[k] !== p[k]);
  const n: PlanNumbers = formula
    ? plan({
        sex: p.sex, age: o.year - p.birthYear, heightCm: p.heightCm, weightKg: o.weightKg, bodyFatPct: p.bodyFatPct, neat: p.neat,
        sessions: base.sessions ?? o.sessions, goal: c.goal, ratePctPerWeek: c.rate, experience: p.experience, maintainOnly,
      })
    : planFromBaseline({
        sex: p.sex, heightCm: p.heightCm, weightKg: base.weightKg, goal: c.goal, ratePctPerWeek: c.rate, experience: p.experience, maintainOnly,
        bmr: base.bmr, baseline: base.baseline, eeeByWeekday: base.eeeByWeekday,
      });
  const { goalWeightKg, sessions } = base;
  return {
    ...n,
    effectiveFrom: o.from,
    ...(goalWeightKg && n.goal === base.goal ? { goalWeightKg } : {}),
    tdeeSource: formula ? 'formula' : base.tdeeSource,
    source: 'edit',
    ...(sessions ? { sessions } : {}),
  };
}

/** Whether a new plan would change any number a day shows. */
export const moves = (a: Plan, b: Plan) =>
  a.goal !== b.goal || a.ratePctPerWeek !== b.ratePctPerWeek || a.delta !== b.delta || a.baseline !== b.baseline || a.bmr !== b.bmr ||
  a.proteinG !== b.proteinG || a.fatG !== b.fatG || a.eeeByWeekday.some((e, i) => e !== b.eeeByWeekday[i]);

/** The new target as the page words it: a training day and a rest day in matched mode with training, else one number. */
export function targetsOf(p: Plan, sex: Profile['sex'], mode: Profile['calorieMode']) {
  const eee = trainingDayEee(p);
  if (mode === 'matched' && eee > 0) return { training: targetWith(p, sex, eee), rest: targetWith(p, sex, 0) };
  return { every: targetWith(p, sex, mode === 'even' ? evenEee(p) : 0) };
}

/** The goals Settings offers at this weight: the guardrails of onboarding (SCREENS.md section 4). */
export const goalsFor = (heightCm: number, weightKg: number) => guardrails({ age: 0, heightCm, weightKg }).goals;

/**
 * The paces offered for a goal, slowest first, and the plan's own pace too when the BMI rules no longer offer it (a
 * faster gain pace chosen under BMI 20 holds, F19), so stepping down is one tap and staying is none.
 */
export function pacesFor(goal: Goal, p: { heightCm: number; experience: Profile['experience'] }, weightKg: number, current?: { goal: Goal; rate: number }): Pace[] {
  const offered = paceOptions(goal, bmi(weightKg, p.heightCm), p.experience);
  if (goal !== 'gain' || current?.goal !== 'gain' || offered.some((o) => o.rate === current.rate)) return offered;
  const own = paceOptions('gain', 0, p.experience).find((o) => o.rate === current.rate);
  return own ? [...offered, own].sort((a, b) => a.rate - b.rate) : offered;
}
