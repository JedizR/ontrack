// Onboarding answers and what they become (SCREENS.md section 4, TECH-SPEC section 4). Pure: the flow keeps the
// draft in prefs so it survives the Google redirect, and actions.finishOnboarding writes what toRecords returns.
import {
  defaultPace, guardrails, paceOptions, plan, V,
  type Experience, type Goal, type Intensity, type Neat, type PlanInput, type SessionType, type Sex,
} from '$lib/model/engine';
import { TEMPLATES } from '$lib/data/templates';
import { weekdayOf, yearOf } from '$lib/model/dates';
import type { Units } from '$lib/model/units';
import { t } from '$lib/i18n';
import type { Plan, Profile, Program, Weight } from '../../../shared/records';

export type Train =
  | { kind: 'custom'; days: number; type: SessionType; minutes: number; intensity: Intensity }
  | { kind: 'template'; id: string }
  | { kind: 'later' };
export type Screening = { pregnant: boolean; medical: boolean; eatingDisorder: boolean };
export type Screen =
  | 'welcome' | 'goal' | 'screening' | 'advice' | 'sex' | 'born' | 'young' | 'body' | 'move' | 'train' | 'experience' | 'pace' | 'plan';

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
  train?: Train;
  experience?: Experience;
  /** percent of body weight a week; 0 holds the weight */
  rate?: number;
  bodyFatPct?: number;
  goalWeightKg?: number;
  even?: boolean;
  /** "Save my plan" was tapped: the draft becomes records once a signed in phone has pulled */
  saved?: true;
};

export const fresh = (): Draft => ({ at: 'welcome', units: 'metric' });

/** What the fields accept, before the engine's own guardrails. Wider than any adult, narrower than the database. */
export const LIMITS = { heightCm: [100, 250], weightKg: [30, 300], oldestAge: 110 } as const;
export const DEFAULT_TRAIN: Train = { kind: 'custom', days: 3, type: 'strength', minutes: 60, intensity: 'moderate' };

/** The nine questions in order. The advice and age screens belong to the question before them. */
export const STEPS: Screen[] = ['goal', 'screening', 'sex', 'born', 'body', 'move', 'train', 'experience', 'pace'];

export const flagged = (d: Draft) => !!d.screening && (d.screening.pregnant || d.screening.medical || d.screening.eatingDisorder);
export const ageOf = (d: Draft, year: number) => year - (d.birthYear ?? year);
/** Strength or circuit sessions, a program, or training still to be set up: the experience question applies. */
export const lifts = (d: Draft) => d.train?.kind !== 'custom' || d.train.type === 'strength' || d.train.type === 'circuit';

/** Every screen this draft passes through, in order. Answers decide which apply. */
export function route(d: Draft, year: number): Screen[] {
  const r: Screen[] = ['welcome', 'goal', 'screening'];
  if (flagged(d)) r.push('advice');
  r.push('sex', 'born');
  if (d.birthYear && ageOf(d, year) < V.minAge) return [...r, 'young'];
  r.push('body', 'move', 'train');
  if (lifts(d)) r.push('experience');
  if (!flagged(d) && d.goal !== 'maintain') r.push('pace');
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
  !!(d.goal && d.screening && d.sex && d.birthYear && d.heightCm && d.weightKg && d.neat && d.train);

/** Sessions for n days a week, spread out, Monday 0. */
const SPREAD = [[], [0], [0, 3], [0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4], [0, 1, 2, 3, 4, 5], [0, 1, 2, 3, 4, 5, 6]];

export function programOf(d: Draft): Program {
  const tr = d.train;
  if (tr?.kind === 'template') {
    const tpl = TEMPLATES.find((x) => x.id === tr.id);
    if (tpl) return { name: tpl.name, sessions: tpl.sessions };
  }
  if (tr?.kind !== 'custom') return { name: '', sessions: [] };
  // the session name is data from here on, like a template's: taken from the catalog once
  const name = t.train.types[tr.type];
  return { name: '', sessions: SPREAD[tr.days].map((weekday) => ({ key: `d${weekday}`, weekday, name, type: tr.type, minutes: tr.minutes, intensity: tr.intensity })) };
}

/** The engine's input. A goal the guardrails remove becomes maintain; a pace not chosen yet is the default. */
export function inputOf(d: Draft, year: number): PlanInput {
  const age = ageOf(d, year);
  const heightCm = d.heightCm ?? 0;
  const weightKg = d.weightKg ?? 0;
  const g = guardrails({ age, heightCm, weightKg });
  const goal: Goal = d.goal && g.goals.includes(d.goal) ? d.goal : 'maintain';
  const experience: Experience = (lifts(d) && d.experience) || 'beginner';
  return {
    sex: d.sex ?? 'unspecified',
    age,
    heightCm,
    weightKg,
    bodyFatPct: d.bodyFatPct,
    neat: d.neat ?? 'seated',
    sessions: programOf(d).sessions,
    goal,
    ratePctPerWeek: d.rate ?? defaultPace(goal, g.bmi, experience)?.rate ?? 0,
    experience,
    maintainOnly: flagged(d),
  };
}

export type Why = 'noLose' | 'gentleOnly' | 'noFaster' | 'leanOnly';
/** The paces offered for this draft, each with its plan, the one picked, and why any pace is missing. */
export function paceChoices(d: Draft, year: number) {
  const base = inputOf(d, year);
  const { bmi } = guardrails(base);
  const offered = paceOptions(base.goal, bmi, base.experience);
  const why: Why | null =
    d.goal === 'lose' && base.goal !== 'lose' ? 'noLose'
    : d.goal === 'lose' && bmi < V.gentleOnlyBmi ? 'gentleOnly'
    : d.goal === 'lose' && bmi < V.fasterPaceMinBmi ? 'noFaster'
    : d.goal === 'gain' && base.experience === 'advanced' ? 'leanOnly'
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
      ...(d.goalWeightKg ? { goalWeightKg: d.goalWeightKg } : {}),
      tdeeSource: 'formula',
      source: 'onboarding',
    },
    weight: { date, kg: input.weightKg },
  };
}
