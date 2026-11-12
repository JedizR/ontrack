// Training analysis from the program. docs/SCIENCE.md section 11.
import { U, V, type SourceId } from './constants.ts';
import { met, type SessionLike } from './bmr.ts';
import type { Experience, Goal } from './plan.ts';

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

/**
 * How to arrange a week with both lifting and cardio (PRD F20), for the weekdays given. liftFirst: lift before cardio
 * on a day with both (S22). spaceOut: leave `value` hours between them, or use separate days (S23). legDayCardio: on a
 * day with legs, cycling rather than running (S25).
 */
export type HybridPoint = { kind: 'liftFirst' | 'spaceOut' | 'legDayCardio'; weekdays: number[]; value?: number; source: SourceId };
export type AerobicBand = 'below' | 'inRange' | 'above';

export type ProgramAnalysis = {
  /** False when no session lists exercises: the muscle checks did not run. */
  hasExercises: boolean;
  muscles: Record<Muscle, MuscleStats>;
  strengthSessions: number;
  /** Moderate-equivalent aerobic minutes per week: vigorous minutes count double. */
  aerobicMinutes: number;
  aerobicBand: AerobicBand;
  restDays: number;
  /** Most important first. The Train tab shows up to three. */
  recommendations: Finding[];
  notes: Finding[];
  /** Empty unless a day has both a strength and a cardio session. */
  hybrid: HybridPoint[];
};

export const STRENGTH: ReadonlySet<SessionLike['type']> = new Set(['strength', 'circuit']);
const AEROBIC: ReadonlySet<SessionLike['type']> = new Set(['cardio', 'walk', 'sport']);
// a leg day trains one of these directly (S25 found running dulled lower body gains)
const LEGS: ReadonlySet<Muscle> = new Set(['quads', 'hamstrings', 'glutes']);

/** Moderate-equivalent aerobic minutes (S13): cardio, walk and sport at 3 METs or more, vigorous minutes counted double. */
export const aerobicMinutes = (sessions: SessionLike[]) =>
  sessions
    .filter((s) => AEROBIC.has(s.type) && met(s) >= V.moderateMet)
    .reduce((a, s) => a + s.minutes * (met(s) >= V.vigorousMet ? V.vigorousFactor : 1), 0);
/** Against the WHO's 150 to 300 minutes a week (S13). */
export const aerobicBand = (minutes: number): AerobicBand =>
  minutes < V.aerobicMinutes.min ? 'below' : minutes > V.aerobicMinutes.max ? 'above' : 'inRange';

/** Lift first, space them out, and cycle on leg days: one point each, naming the weekdays that have both. */
function hybridPoints(sessions: ProgramSession[], library: Library): HybridPoint[] {
  const both: number[] = [];
  const legDays: number[] = [];
  for (let d = 0; d < U.daysPerWeek; d++) {
    const day = sessions.filter((s) => s.weekday === d);
    const lifts = day.filter((s) => STRENGTH.has(s.type));
    if (!lifts.length || !day.some((s) => s.type === 'cardio')) continue;
    both.push(d);
    if (lifts.some((s) => s.exercises?.some((e) => library[e.exerciseId]?.primary.some((m) => LEGS.has(m))))) legDays.push(d);
  }
  if (!both.length) return [];
  return [
    { kind: 'liftFirst', weekdays: both, source: 'S22' },
    { kind: 'spaceOut', weekdays: both, value: V.hybridGapHours, source: 'S23' },
    ...(legDays.length ? [{ kind: 'legDayCardio' as const, weekdays: legDays, source: 'S25' as const }] : []),
  ];
}

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
  const aerobic = aerobicMinutes(sessions);
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
  if (o.goal === 'gain' && aerobic > V.aerobicMinutes.min) notes.push({ kind: 'aerobicIncluded', value: aerobic, source: 'S13' });
  const longest = Math.max(0, ...sessions.map((s) => s.minutes));
  if (longest > V.longSession) notes.push({ kind: 'longSession', value: longest, source: 'OT' });

  return {
    hasExercises, muscles, strengthSessions, aerobicMinutes: aerobic, aerobicBand: aerobicBand(aerobic), restDays, recommendations, notes,
    hybrid: hybridPoints(sessions, o.library),
  };
}
