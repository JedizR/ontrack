// Onboarding answers and what they become (SCREENS.md section 4, TECH-SPEC section 4). Pure: the flow keeps the
// draft in prefs so it survives the Google redirect, and actions.finishOnboarding writes what toRecords returns.
import {
  defaultPace, guardrails, paceOptions, plan, V,
  type Experience, type Goal, type Neat, type PlanInput, type Sex,
} from '$lib/model/engine';
import { TEMPLATES, type TrainKind } from '$lib/data/templates';
import { weekdayOf, yearOf } from '$lib/model/dates';
import { targetParts, trainingDayEee } from '$lib/model/day';
import { kgToLb, regionUnits, type Units } from '$lib/model/units';
import { t } from '$lib/i18n';
import type { Plan, Profile, Program, Session, Weight } from '../../../shared/records';

export type Screening = { pregnant: boolean; medical: boolean; eatingDisorder: boolean };
export type Screen =
  | 'welcome' | 'goal' | 'screening' | 'advice' | 'sex' | 'born' | 'young' | 'body' | 'move' | 'days' | 'kind' | 'experience' | 'plan';

export type Draft = {
  at: Screen;
  goal?: Goal;
  screening?: Screening;
  sex?: Sex;
  birthYear?: number;
  heightCm?: number;
  weightKg?: number;
  units: Units;
  neat?: Neat;
  /** training days a week; 0 is "Not yet" */
  days?: number;
  /** "What do you train?" (O1) */
  kind?: TrainKind;
  experience?: Experience;
  /** percent of body weight a week, chosen on Your plan; 0 holds the weight */
  rate?: number;
  bodyFatPct?: number;
  goalWeightKg?: number;
  even?: boolean;
  /** "Save this plan" was tapped: the draft becomes records once a signed in phone has pulled */
  saved?: true;
};

export const fresh = (): Draft => ({ at: 'welcome', units: regionUnits() });

type Before = Omit<Draft, 'at'> & { at: Screen | 'train' | 'pace'; train?: { kind: 'custom'; days: number; type: string } | { kind: 'template'; id: string } | { kind: 'later' } };
/** A draft saved before O1 (its training step and pace screen), in O1's terms: the answers kept, the screen moved on. */
export function upgrade(d: Draft | null): Draft | null {
  if (!d) return null;
  const { train, at: was, ...rest } = d as Before;
  const at: Screen = was === 'train' ? 'days' : was === 'pace' ? 'plan' : was;
  if (!train) return was === at ? d : { ...rest, at };
  const tpl = train.kind === 'template' ? TEMPLATES.find((x) => x.id === train.id) : undefined;
  const days = train.kind === 'custom' ? train.days : (tpl?.daysPerWeek ?? 0);
  const cardio = train.kind === 'custom' ? train.type === 'cardio' : !!tpl?.sessions.some((x) => x.type === 'cardio');
  const kind: TrainKind = cardio ? (train.kind === 'custom' ? 'cardio' : 'both') : 'lifting';
  return { ...rest, at, days, ...(days ? { kind } : {}) };
}

/** What the fields accept, before the engine's own guardrails. Wider than any adult, narrower than the database. */
export const LIMITS = { heightCm: [100, 250], weightKg: [30, 300], oldestAge: 110 } as const;
/**
 * Where the wheels start when there is no answer yet: interface defaults, not science. Age 25 is the middle of the 18 to
 * 35 persona (owner, onboarding RESEARCH section 11). Height and weight start at the sex's median adult height (CDC
 * NCHS 2021, Vital Health Stat 3(46)) and BMI 22 there; prefer not to say between the two.
 */
export const START = {
  ageYears: 25,
  weightKg: 70,
  bodyFatPct: 20,
  // the wheel shows whole centimetres; kg is BMI 22 at the rounded height
  body: { male: { cm: Math.round(175.4), kg: 67 }, female: { cm: Math.round(161.3), kg: 57 }, unspecified: { cm: 168, kg: 62 } },
} as const;

/** A weight wheel's ends in the user's units, to the tenth, inside the given kg (the field limits by default). */
export function weightWheel(units: Units, minKg: number = LIMITS.weightKg[0], maxKg: number = LIMITS.weightKg[1]) {
  const shown = (kg: number) => +((units === 'metric' ? kg : kgToLb(kg)) * 10).toFixed(6);
  return { min: Math.ceil(shown(minKg)) / 10, max: Math.floor(shown(maxKg)) / 10 };
}
/** The nine questions in order. The advice and age screens belong to the question before them. */
export const STEPS: Screen[] = ['goal', 'screening', 'sex', 'born', 'body', 'move', 'days', 'kind', 'experience'];

export const flagged = (d: Draft) => !!d.screening && (d.screening.pregnant || d.screening.medical || d.screening.eatingDisorder);
export const ageOf = (d: Draft, year: number) => year - (d.birthYear ?? year);
/** Lifts some days. Unanswered counts as yes, so the step count can only shrink as answers come in. */
const lifts = (d: Draft) => d.days !== 0 && d.kind !== 'cardio';
/** Experience changes only a gain plan's paces and surplus cap (SCIENCE.md section 6), so only gaining lifters are asked. */
export const asksExperience = (d: Draft) => (d.goal ?? 'gain') === 'gain' && !flagged(d) && lifts(d);

/** Every screen this draft passes through, in order. Answers decide which apply. */
export function route(d: Draft, year: number): Screen[] {
  const r: Screen[] = ['welcome', 'goal', 'screening'];
  if (flagged(d)) r.push('advice');
  r.push('sex', 'born');
  if (d.birthYear && ageOf(d, year) < V.minAge) return [...r, 'young'];
  r.push('body', 'move', 'days');
  if (d.days !== 0) r.push('kind');
  if (asksExperience(d)) r.push('experience');
  return [...r, 'plan'];
}

/** The screen after or before this one, given the answers so far. */
export function step(d: Draft, year: number, by: 1 | -1): Screen {
  const r = route(d, year);
  const i = r.indexOf(d.at);
  return i < 0 ? 'welcome' : (r[i + by] ?? d.at);
}

/** "Step 3 of 9" among the questions that apply; null on screens that are not questions. */
export function progress(d: Draft, year: number) {
  if (!STEPS.includes(d.at)) return null;
  const steps = route(d, year).filter((s) => STEPS.includes(s));
  return { n: steps.indexOf(d.at) + 1, total: steps.length };
}

/** Everything the plan needs is answered. */
export const complete = (d: Draft) =>
  !!(d.goal && d.screening && d.sex && d.birthYear && d.heightCm && d.weightKg && d.neat && d.days !== undefined && (d.days === 0 || d.kind));

/** Sessions for n days a week, spread out, Monday 0. */
const SPREAD = [[], [0], [0, 3], [0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6]];

/** Session defaults for "What do you train?": interface defaults from the onboarding research, not science. */
const KIND_DEFAULTS = { strength: { minutes: 60, intensity: 'moderate' }, cardio: { minutes: 30, intensity: 'moderate' } } as const;
/** The week an answer to "What do you train?" and n days make (O1): lifting or cardio each day, or both taking turns, lifting first. */
export function sessionsFor(kind: TrainKind, days: number): Session[] {
  return (SPREAD[days] ?? []).map((weekday, i) => {
    const type = kind === 'cardio' || (kind === 'both' && i % 2 === 1) ? 'cardio' : 'strength';
    return { key: `d${weekday}`, weekday, name: t.train.types[type], type, ...KIND_DEFAULTS[type] };
  });
}

/** The week the answers make; the session names are data from here on, taken from the catalog once. */
export const programOf = (d: Draft): Program => ({ name: '', sessions: d.days && d.kind ? sessionsFor(d.kind, d.days) : [] });

/**
 * The engine's input. A goal the guardrails remove becomes maintain; a pace not chosen yet, or no longer offered after
 * an answer changed, is the default. 0 holds the weight. Only here are the faster gain pace's BMI limits applied.
 */
export function inputOf(d: Draft, year: number): PlanInput {
  const age = ageOf(d, year);
  const heightCm = d.heightCm ?? 0;
  const weightKg = d.weightKg ?? 0;
  const g = guardrails({ age, heightCm, weightKg });
  const goal: Goal = d.goal && g.goals.includes(d.goal) ? d.goal : 'maintain';
  const experience: Experience = (asksExperience(d) && d.experience) || 'beginner';
  return {
    sex: d.sex ?? 'unspecified',
    age,
    heightCm,
    weightKg,
    bodyFatPct: d.bodyFatPct,
    neat: d.neat ?? 'seated',
    sessions: programOf(d).sessions,
    goal,
    ratePctPerWeek:
      (d.rate === 0 || paceOptions(goal, g.bmi, experience).some((o) => o.rate === d.rate) ? d.rate : defaultPace(goal, g.bmi, experience)?.rate) ?? 0,
    experience,
    maintainOnly: flagged(d),
  };
}

/**
 * "Your number so far" (O1): the breakdown's rows the answers have reached, on a maintenance plan so the goal comes last,
 * as the same rounded parts the breakdown shows. Null until screening and the body are answered (PRD section 7).
 */
export function soFar(d: Draft, year: number) {
  if (!d.screening || !d.sex || !d.birthYear || !d.heightCm || !d.weightKg) return null;
  const input = inputOf(d, year);
  const n = plan({ ...input, goal: 'maintain', ratePctPerWeek: 0 });
  const p = targetParts(n, input.sex, trainingDayEee(n));
  if (!d.neat) return { row: 'bmr' as const, value: p.bmr, added: 0 };
  if (!p.training) return { row: 'movement' as const, value: p.bmr + p.movement, added: p.movement };
  return { row: 'training' as const, value: p.bmr + p.movement + p.training, added: p.training };
}

/** The lowest goal weight offered: BMI 18.5 at this height (PRD section 7), and never under what the field accepts. */
export const minGoalWeightKg = (d: Draft) => Math.max(guardrails({ age: 0, heightCm: d.heightCm ?? 0, weightKg: d.weightKg ?? 0 }).minGoalWeightKg, LIMITS.weightKg[0]);
/** The goal weight, unless a later change of height put it below the minimum. */
export const goalWeightOf = (d: Draft) => (d.goalWeightKg && d.goalWeightKg >= minGoalWeightKg(d) ? d.goalWeightKg : undefined);

export type Why = 'noLose' | 'gentleOnly' | 'noFaster' | 'leanOnly' | 'noFasterGain';
/** The paces offered for this draft, each with its plan, the one picked, and why any pace is missing. */
export function paceChoices(d: Draft, year: number) {
  const base = inputOf(d, year);
  const { bmi } = guardrails(base);
  const offered = flagged(d) ? [] : paceOptions(base.goal, bmi, base.experience);
  const why: Why | null =
    flagged(d) ? null
    : d.goal === 'lose' && base.goal !== 'lose' ? 'noLose'
    : d.goal === 'lose' && bmi < V.gentleOnlyBmi ? 'gentleOnly'
    : d.goal === 'lose' && bmi < V.fasterPaceMinBmi ? 'noFaster'
    : d.goal === 'gain' && base.experience === 'advanced' ? 'leanOnly'
    : d.goal === 'gain' && bmi >= V.fasterGainMaxBmi ? 'noFasterGain'
    : null;
  const options = offered.map((o) => ({ ...o, plan: plan({ ...base, ratePctPerWeek: o.rate }) }));
  const picked = (offered.find((o) => o.rate === d.rate) ?? defaultPace(base.goal, bmi, base.experience))?.rate ?? 0;
  return { options, why, picked, hold: plan({ ...base, goal: 'maintain', ratePctPerWeek: 0 }) };
}

/** The records onboarding creates: profile, program, the first plan and the first weigh-in. */
export function toRecords(d: Draft, date: string, at: string): { profile: Profile; program: Program; plan: Plan; weight: Weight } {
  const input = inputOf(d, yearOf(date));
  const numbers = plan(input);
  return {
    profile: {
      sex: input.sex,
      birthYear: d.birthYear ?? 0,
      heightCm: input.heightCm,
      ...(d.bodyFatPct ? { bodyFatPct: d.bodyFatPct } : {}),
      neat: input.neat,
      experience: input.experience,
      units: d.units,
      calorieMode: d.even ? 'even' : 'matched',
      // the check-in falls on the weekday the plan started
      checkinWeekday: weekdayOf(date),
      screening: { pregnant: false, medical: false, eatingDisorder: false, ...d.screening, at },
      onboardedAt: at,
    },
    program: programOf(d),
    plan: {
      ...numbers,
      effectiveFrom: date,
      ...(goalWeightOf(d) ? { goalWeightKg: goalWeightOf(d) } : {}),
      tdeeSource: 'formula',
      source: 'onboarding',
    },
    weight: { date, kg: input.weightKg },
  };
}
