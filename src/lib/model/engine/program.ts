// Training analysis from the program. docs/SCIENCE.md section 11.
import { U, V, type SourceId } from './constants';
import { met, type SessionLike } from './bmr';
import type { Experience, Goal } from './plan';

export type Muscle = 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'core';
export const MUSCLES: readonly Muscle[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes', 'calves', 'core'];

export type ProgramSession = SessionLike & { exercises?: Array<{ exerciseId: string; sets: number }> };
/** Muscles per exercise id. The engine imports nothing, so the caller passes the library. */
export type Library = Readonly<Record<string, { primary: readonly Muscle[]; secondary: readonly Muscle[] }>>;
export type VolumeBand = 'low' | 'building' | 'inRange' | 'high';
export type MuscleStats = { sets: number; sessions: number; band: VolumeBand };

/**
 * One finding. `value` is the current number (sets, sessions, minutes); `change` is how many to add or remove.
 * Recommendations: strengthSessions, addSets, removeSets, frequency, restDay. Notes: aerobicIncluded, longSession.
 */
export type Finding = {
  kind: 'strengthSessions' | 'addSets' | 'removeSets' | 'frequency' | 'restDay' | 'aerobicIncluded' | 'longSession';
  muscle?: Muscle;
  value: number;
  change?: number;
  source: SourceId;
};

export type ProgramAnalysis = {
  /** False when no session lists exercises: the muscle checks did not run. */
  hasExercises: boolean;
  muscles: Record<Muscle, MuscleStats>;
  strengthSessions: number;
  /** Moderate-equivalent aerobic minutes per week: vigorous minutes count double. */
  aerobicMinutes: number;
  aerobicBand: 'below' | 'inRange' | 'above';
  restDays: number;
  /** Most important first. The Train tab shows up to three. */
  recommendations: Finding[];
  notes: Finding[];
};

const STRENGTH: ReadonlySet<SessionLike['type']> = new Set(['strength', 'circuit']);
const AEROBIC: ReadonlySet<SessionLike['type']> = new Set(['cardio', 'walk', 'sport']);

const band = (sets: number): VolumeBand =>
  sets < V.setsBuilding ? 'low' : sets < V.setsRange ? 'building' : sets <= V.setsHigh ? 'inRange' : 'high';

export function analyseProgram(
  sessions: ProgramSession[],
  o: { goal: Goal; experience: Experience; library: Library },
): ProgramAnalysis {
  const muscles = Object.fromEntries(MUSCLES.map((m) => [m, { sets: 0, sessions: 0, band: 'low' as VolumeBand }])) as Record<Muscle, MuscleStats>;
  let hasExercises = false;
  for (const s of sessions) {
    const direct = new Set<Muscle>();
    for (const e of s.exercises ?? []) {
      const ex = o.library[e.exerciseId];
      if (!ex) continue;
      hasExercises = true;
      for (const m of ex.primary) {
        muscles[m].sets += e.sets * V.setPrimary;
        direct.add(m);
      }
      for (const m of ex.secondary) muscles[m].sets += e.sets * V.setSecondary;
    }
    // A session counts toward a muscle's frequency when it trains that muscle directly.
    for (const m of direct) muscles[m].sessions += 1;
  }
  for (const m of MUSCLES) muscles[m].band = band(muscles[m].sets);

  const strengthSessions = sessions.filter((s) => STRENGTH.has(s.type)).length;
  const aerobicMinutes = sessions
    .filter((s) => AEROBIC.has(s.type) && met(s) >= V.moderateMet)
    .reduce((a, s) => a + s.minutes * (met(s) >= V.vigorousMet ? V.vigorousFactor : 1), 0);
  const aerobicBand =
    aerobicMinutes < V.aerobicMinutes.min ? 'below' : aerobicMinutes > V.aerobicMinutes.max ? 'above' : 'inRange';
  const hardDays = new Set(sessions.filter((s) => s.intensity === 'hard').map((s) => s.weekday));
  const restDays = U.daysPerWeek - hardDays.size;

  const strength: Finding[] =
    strengthSessions < V.strengthSessions
      ? [{ kind: 'strengthSessions', value: strengthSessions, change: V.strengthSessions - strengthSessions, source: 'S13' }]
      : [];
  const muscleFindings: Finding[] = [];
  const frequency: Finding[] = [];
  const removeSets: Finding[] = [];
  if (hasExercises) {
    for (const m of MUSCLES) {
      const { sets, sessions: n, band: b } = muscles[m];
      // Beginners are told 5 to 9 sets is a fine start.
      if (b === 'low' || (b === 'building' && o.experience !== 'beginner')) {
        muscleFindings.push({ kind: 'addSets', muscle: m, value: sets, change: Math.ceil(V.setsRange - sets), source: 'S11' });
      }
      if (b === 'high') removeSets.push({ kind: 'removeSets', muscle: m, value: sets, change: Math.ceil(sets - V.setsHigh), source: 'OT' });
      if (sets > 0 && n < V.sessionsPerMuscle) frequency.push({ kind: 'frequency', muscle: m, value: n, source: 'S12' });
    }
    muscleFindings.sort((a, b) => b.change! - a.change!);
  }
  const rest: Finding[] = restDays < V.restDays ? [{ kind: 'restDay', value: restDays, change: V.restDays - restDays, source: 'OT' }] : [];
  // With a gain goal, too few strength sessions is the first recommendation (PRD F10).
  const recommendations =
    o.goal === 'gain'
      ? [...strength, ...muscleFindings, ...frequency, ...removeSets, ...rest]
      : [...muscleFindings, ...frequency, ...removeSets, ...strength, ...rest];

  const notes: Finding[] = [];
  if (o.goal === 'gain' && aerobicMinutes > V.aerobicMinutes.min) notes.push({ kind: 'aerobicIncluded', value: aerobicMinutes, source: 'S13' });
  const longest = Math.max(0, ...sessions.map((s) => s.minutes));
  if (longest > V.longSession) notes.push({ kind: 'longSession', value: longest, source: 'OT' });

  return { hasExercises, muscles, strengthSessions, aerobicMinutes, aerobicBand, restDays, recommendations, notes };
}
