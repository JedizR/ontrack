// The plan: goal adjustment, caps, floors, protein and fat. docs/SCIENCE.md sections 6 to 8 and 12.
import { ENGINE_VERSION, U, V } from './constants.ts';
import { baseline, bmi, bmr, eeeByWeekday, weightAtBmi, type Neat, type SessionLike, type Sex } from './bmr.ts';
import { dayTarget, floorFor, rawTarget, tdeeAvg } from './targets.ts';

export type Goal = 'lose' | 'maintain' | 'gain';
export type Experience = 'beginner' | 'intermediate' | 'advanced';
export type Flag = 'floor' | 'deficitCap' | 'surplusCap' | 'maintainOnly';
export type PaceName = 'gentle' | 'steady' | 'faster' | 'lean' | 'standard';
export type Pace = { name: PaceName; rate: number };

export type PlanInput = {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  bodyFatPct?: number;
  neat: Neat;
  sessions: SessionLike[];
  goal: Goal;
  /** Positive. The direction comes from the goal. */
  ratePctPerWeek: number;
  experience: Experience;
  /** Set by a screening answer: the goal becomes maintain. */
  maintainOnly?: boolean;
};

/** The numbers a stored plan carries (TECH-SPEC Plan, without dates and provenance). */
export type PlanNumbers = {
  goal: Goal;
  ratePctPerWeek: number;
  weightKg: number;
  bmr: number;
  baseline: number;
  eeeByWeekday: number[];
  /** Signed kcal per day after caps, before floors. */
  delta: number;
  proteinG: number;
  fatG: number;
  flags: Flag[];
  engineVersion: number;
};

/** What a plan is computed from once the baseline is known. A check-in passes a measured baseline here. */
export type PlanBasis = Pick<PlanInput, 'sex' | 'heightCm' | 'weightKg' | 'goal' | 'ratePctPerWeek' | 'experience' | 'maintainOnly'> &
  Pick<PlanNumbers, 'bmr' | 'baseline' | 'eeeByWeekday'>;

/** The paces offered for a goal at this BMI and experience, slowest first. Empty means the goal is not offered. */
export function paceOptions(goal: Goal, bmiValue: number, experience: Experience): Pace[] {
  if (goal === 'maintain') return [];
  if (goal === 'gain') {
    const lean: Pace = { name: 'lean', rate: V.gainPace.lean };
    if (experience === 'advanced') return [lean];
    const paces: Pace[] = [lean, { name: 'standard', rate: V.gainPace.standard }];
    // the faster pace (F19) only for lean people; the surplus cap still applies to it
    return bmiValue < V.fasterGainMaxBmi ? [...paces, { name: 'faster', rate: V.gainPaceFaster }] : paces;
  }
  if (bmiValue < V.underweightBmi) return [];
  const p = V.losePace;
  const all: Pace[] = [
    { name: 'gentle', rate: p.gentle },
    { name: 'steady', rate: p.steady },
    { name: 'faster', rate: p.faster },
  ];
  if (bmiValue < V.gentleOnlyBmi) return all.slice(0, 1);
  return bmiValue >= V.fasterPaceMinBmi ? all : all.slice(0, -1);
}

/** Steady for losing; standard for gaining beginners and underweight people, lean otherwise. Faster is never the default. */
export function defaultPace(goal: Goal, bmiValue: number, experience: Experience): Pace | undefined {
  const options = paceOptions(goal, bmiValue, experience);
  const want = goal === 'lose' ? 'steady' : experience === 'beginner' || bmiValue < V.underweightBmi ? 'standard' : 'lean';
  return options.find((o) => o.name === want) ?? options[0];
}

/** Section 12. Goal weight below `minGoalWeightKg` is refused. */
export function guardrails(p: { age: number; heightCm: number; weightKg: number }) {
  const b = bmi(p.weightKg, p.heightCm);
  return {
    bmi: b,
    blocked: p.age < V.minAge,
    doctorCard: b < V.doctorBmi,
    goals: (b < V.underweightBmi ? ['maintain', 'gain'] : ['lose', 'maintain', 'gain']) as Goal[],
    minGoalWeightKg: weightAtBmi(V.underweightBmi, p.heightCm),
  };
}

export function plan(p: PlanInput): PlanNumbers {
  const r = bmr(p);
  return planFromBaseline({ ...p, bmr: r, baseline: baseline(r, p.neat), eeeByWeekday: eeeByWeekday(p.sessions, p.weightKg) });
}

export function planFromBaseline(b: PlanBasis): PlanNumbers {
  const flags: Flag[] = b.maintainOnly ? ['maintainOnly'] : [];
  const goal: Goal = b.maintainOnly ? 'maintain' : b.goal;
  // Never faster than the paces offered at this BMI, so a check-in at a new weight keeps the guardrails.
  const offered = paceOptions(goal, bmi(b.weightKg, b.heightCm), b.experience).map((o) => o.rate);
  const rate = Math.max(0, Math.min(b.ratePctPerWeek, Math.max(0, ...offered)));
  const tdee = tdeeAvg(b);
  const wanted = (((rate / U.percent) * b.weightKg) * V.kcalPerKg) / U.daysPerWeek;

  let delta = 0;
  if (goal === 'lose') {
    const cap = V.deficitCap * tdee;
    if (wanted > cap) flags.push('deficitCap');
    delta = 0 - Math.min(wanted, cap); // never -0
  } else if (goal === 'gain') {
    const cap = (b.experience === 'advanced' ? V.surplusCapAdvanced : V.surplusCap) * tdee;
    if (wanted > cap) flags.push('surplusCap');
    delta = Math.min(wanted, cap);
  }

  const week = { baseline: b.baseline, eeeByWeekday: b.eeeByWeekday, delta };
  // The lowest day a plan can have is a rest or skipped day: if that falls under the floor, the floor applies.
  if (b.baseline + delta < floorFor(b.sex)) flags.push('floor');
  const evenRaw = rawTarget(week, { sex: b.sex, mode: 'even', weekday: 0 });

  const refKg = Math.min(b.weightKg, weightAtBmi(V.proteinRefBmi, b.heightCm));
  const proteinG = Math.round(V.proteinPerKg[goal] * refKg);
  const a = V.atwater;
  let fatG = Math.round(Math.max((V.fatShare * evenRaw) / a.fat, V.fatMinPerKg * b.weightKg));
  const lowest = Math.min(
    dayTarget(week, { sex: b.sex, mode: 'even', weekday: 0 }),
    dayTarget(week, { sex: b.sex, mode: 'matched', weekday: 0, skipped: true }),
  );
  if (a.protein * proteinG + a.fat * fatG > lowest) {
    fatG = Math.round(Math.max(V.fatFloorPerKg * b.weightKg, (lowest - a.protein * proteinG) / a.fat));
  }

  return {
    goal,
    ratePctPerWeek: rate,
    weightKg: b.weightKg,
    bmr: b.bmr,
    baseline: b.baseline,
    eeeByWeekday: b.eeeByWeekday,
    delta,
    proteinG,
    fatG,
    flags,
    engineVersion: ENGINE_VERSION,
  };
}
