// R1: what a logged workout adds up to, and what the next one starts from. Pure. Set logging left in R3; the coach's
// session facts still read it.
import type { Workout } from '../../../shared/records';
import { V, type Muscle } from './engine';

export type Lift = Workout['lifts'][number];
type Logged = { date: string; workout?: Workout };

/** Sets that count: a set with no reps was a tap, not a lift. */
const done = (l: Lift) => l.sets.filter((s) => s.reps > 0);

export function totals(w: Workout) {
  const sets = w.lifts.flatMap(done);
  return { sets: sets.length, reps: sets.reduce((a, s) => a + s.reps, 0), volumeKg: sets.reduce((a, s) => a + s.kg * s.reps, 0) };
}

/** The sets of the latest logged workout that lifted this exercise, for the next one to start from. */
export function lastSets(logs: Logged[], exerciseId: string): Lift['sets'] | null {
  for (const l of [...logs].sort((a, b) => b.date.localeCompare(a.date))) {
    const lift = l.workout?.lifts.find((x) => x.exerciseId === exerciseId);
    const sets = lift ? done(lift) : [];
    if (sets.length) return sets;
  }
  return null;
}

/** The heaviest weight lifted for at least one rep, per exercise, over every logged workout. */
export function heaviest(logs: Logged[]): Map<string, { kg: number; reps: number; date: string }> {
  const best = new Map<string, { kg: number; reps: number; date: string }>();
  for (const l of [...logs].sort((a, b) => a.date.localeCompare(b.date))) {
    for (const lift of l.workout?.lifts ?? []) {
      for (const s of done(lift)) {
        const was = best.get(lift.exerciseId);
        if (!was || s.kg > was.kg || (s.kg === was.kg && s.reps > was.reps)) best.set(lift.exerciseId, { kg: s.kg, reps: s.reps, date: l.date });
      }
    }
  }
  return best;
}

/** The lifts of `w` that beat the heaviest weight before it (a first time is not a best: there was nothing to beat). */
export function newBests(before: Logged[], w: Workout): { exerciseId: string; kg: number; reps: number }[] {
  const prior = heaviest(before);
  const out: { exerciseId: string; kg: number; reps: number }[] = [];
  for (const lift of w.lifts) {
    const was = prior.get(lift.exerciseId);
    const top = done(lift).reduce<{ kg: number; reps: number } | null>((a, s) => (!a || s.kg > a.kg || (s.kg === a.kg && s.reps > a.reps) ? { kg: s.kg, reps: s.reps } : a), null);
    if (was && top && top.kg > was.kg) out.push({ exerciseId: lift.exerciseId, ...top });
  }
  return out;
}

/** R2, the muscle map: sets per muscle in these workouts, a primary muscle counting a whole set and a secondary one
 *  half (V.setPrimary, V.setSecondary), as the program's analysis counts them. */
export function muscleSets(workouts: Workout[], library: Record<string, { primary: Muscle[]; secondary: Muscle[] }>) {
  const out: Partial<Record<Muscle, number>> = {};
  for (const w of workouts) for (const lift of w.lifts) {
    const ex = library[lift.exerciseId];
    const n = done(lift).length;
    if (!ex || !n) continue;
    for (const m of ex.primary) out[m] = (out[m] ?? 0) + n * V.setPrimary;
    for (const m of ex.secondary) out[m] = (out[m] ?? 0) + n * V.setSecondary;
  }
  return out;
}

/** A week's sets per muscle as the map's three steps, by the volume bands (S11): building, in range, high. */
export const weekLevels = (sets: Partial<Record<Muscle, number>>) =>
  Object.fromEntries(Object.entries(sets).filter(([, n]) => n! > 0).map(([m, n]) => [m, n! < V.setsBuilding ? 1 : n! < V.setsRange ? 2 : 3])) as Partial<Record<Muscle, 1 | 2 | 3>>;

/** One session's sets per muscle as the map's steps: a set or two, three or more, five or more (OT, display only). */
export const sessionLevels = (sets: Partial<Record<Muscle, number>>) =>
  Object.fromEntries(Object.entries(sets).filter(([, n]) => n! > 0).map(([m, n]) => [m, n! < 3 ? 1 : n! < 5 ? 2 : 3])) as Partial<Record<Muscle, 1 | 2 | 3>>;
