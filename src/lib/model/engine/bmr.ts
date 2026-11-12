// Resting energy, daily movement and exercise energy. docs/SCIENCE.md sections 2 to 5.
import { U, V } from './constants.ts';

export type Sex = 'male' | 'female' | 'unspecified';
export type Neat = 'seated' | 'light' | 'moving' | 'physical';
export type SessionType = 'strength' | 'circuit' | 'cardio' | 'sport' | 'mobility' | 'walk';
export type Intensity = 'light' | 'moderate' | 'hard';
/** The part of a program session the energy maths needs. Weekday 0 is Monday. */
export type SessionLike = { weekday: number; type: SessionType; minutes: number; intensity: Intensity };

const squareM = (heightCm: number) => (heightCm / U.cmPerM) * (heightCm / U.cmPerM);
export const bmi = (kg: number, heightCm: number) => kg / squareM(heightCm);
/** The weight at a given BMI for this height. */
export const weightAtBmi = (bmiValue: number, heightCm: number) => bmiValue * squareM(heightCm);

const SEX_TERM: Record<Sex, number> = { male: V.mifflin.male, female: V.mifflin.female, unspecified: V.mifflinUnspecified };

/** Resting energy in kcal per day. Body fat between 5 and 60 percent uses fat-free mass (S2), otherwise Mifflin-St Jeor (S1). */
export function bmr(p: { sex: Sex; age: number; heightCm: number; weightKg: number; bodyFatPct?: number }): number {
  const bf = p.bodyFatPct;
  if (bf != null && bf >= V.bodyFatRange.min && bf <= V.bodyFatRange.max) {
    return V.cunningham.intercept + V.cunningham.perKgFfm * p.weightKg * (1 - bf / U.percent);
  }
  const m = V.mifflin;
  return m.weight * p.weightKg + m.height * p.heightCm - m.age * p.age + SEX_TERM[p.sex];
}

export const baseline = (bmrKcal: number, neat: Neat) => bmrKcal * V.neat[neat];

const MET: Record<SessionType, Record<Intensity, number>> = {
  strength: V.metStrength,
  circuit: V.metCircuit,
  cardio: V.metCardio,
  mobility: V.metMobility,
  walk: V.metWalk,
  sport: V.metSport,
};
export const met = (s: Pick<SessionLike, 'type' | 'intensity'>) => MET[s.type][s.intensity];

/** Exercise energy above rest for one session, kcal. */
export const sessionKcal = (s: SessionLike, weightKg: number) =>
  (met(s) - V.restingMet) * V.kcalPerMetHour * weightKg * (s.minutes / U.minutesPerHour);

/** Exercise kcal for each weekday, Monday first. */
export function eeeByWeekday(sessions: SessionLike[], weightKg: number): number[] {
  const days: number[] = Array(U.daysPerWeek).fill(0);
  for (const s of sessions) days[s.weekday] += sessionKcal(s, weightKg);
  return days;
}
