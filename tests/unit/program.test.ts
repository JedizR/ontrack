// docs/SCIENCE.md section 11.
import { describe, expect, test } from 'vitest';
import { analyseProgram, type Library, type ProgramSession } from '../../src/lib/model/engine';

const library: Library = {
  row: { primary: ['back'], secondary: ['biceps'] },
  bench: { primary: ['chest'], secondary: ['triceps', 'shoulders'] },
  curl: { primary: ['biceps'], secondary: [] },
  squat: { primary: ['quads', 'glutes'], secondary: ['hamstrings'] },
  calf: { primary: ['calves'], secondary: [] },
};
const lift = (weekday: number, exercises: ProgramSession['exercises'], intensity: ProgramSession['intensity'] = 'moderate'): ProgramSession => ({
  weekday,
  type: 'strength',
  minutes: 60,
  intensity,
  exercises,
});
const run = (sessions: ProgramSession[], goal: 'gain' | 'lose' = 'lose', experience: 'beginner' | 'intermediate' = 'intermediate') =>
  analyseProgram(sessions, { goal, experience, library });

describe('muscle volume', () => {
  test('a set counts 1 for a primary muscle and 0.5 for a secondary', () => {
    const a = run([lift(0, [{ exerciseId: 'bench', sets: 4 }])]);
    expect(a.muscles.chest.sets).toBe(4);
    expect(a.muscles.triceps.sets).toBe(2);
    expect(a.muscles.shoulders.sets).toBe(2);
  });
  test('bands: under 5 low, 5 to 9 building, 10 to 20 in range, over 20 high', () => {
    const band = (sets: number) => run([lift(0, [{ exerciseId: 'curl', sets }])]).muscles.biceps.band;
    expect(band(4.5)).toBe('low');
    expect(band(5)).toBe('building');
    expect(band(9.5)).toBe('building');
    expect(band(10)).toBe('inRange');
    expect(band(20)).toBe('inRange');
    expect(band(21)).toBe('high');
  });
  test('the PRD example: back gets 6 sets, add 4', () => {
    const a = run([lift(0, [{ exerciseId: 'row', sets: 3 }]), lift(3, [{ exerciseId: 'row', sets: 3 }])]);
    expect(a.recommendations).toContainEqual({ kind: 'addSets', muscle: 'back', value: 6, change: 4, source: 'S11' });
  });
  test('beginners are not asked to add sets in the building band', () => {
    const sessions = [lift(0, [{ exerciseId: 'row', sets: 3 }]), lift(3, [{ exerciseId: 'row', sets: 3 }])];
    expect(run(sessions, 'lose', 'beginner').recommendations.find((r) => r.muscle === 'back')).toBeUndefined();
    const low = [lift(0, [{ exerciseId: 'row', sets: 2 }]), lift(3, [{ exerciseId: 'row', sets: 2 }])];
    expect(run(low, 'lose', 'beginner').recommendations).toContainEqual({ kind: 'addSets', muscle: 'back', value: 4, change: 6, source: 'S11' });
  });
  test('over 20 sets: remove the excess', () => {
    const a = run([lift(0, [{ exerciseId: 'curl', sets: 12 }]), lift(3, [{ exerciseId: 'curl', sets: 11 }])]);
    expect(a.recommendations).toContainEqual({ kind: 'removeSets', muscle: 'biceps', value: 23, change: 3, source: 'OT' });
  });
  test('a muscle trained directly once a week gets a frequency finding', () => {
    const a = run([lift(0, [{ exerciseId: 'curl', sets: 12 }])]);
    expect(a.muscles.biceps.sessions).toBe(1);
    expect(a.recommendations).toContainEqual({ kind: 'frequency', muscle: 'biceps', value: 1, source: 'S12' });
    // secondary work does not count as a session for that muscle
    expect(run([lift(0, [{ exerciseId: 'row', sets: 4 }])]).muscles.biceps.sessions).toBe(0);
  });
  test('no exercises listed: only the session checks run', () => {
    const a = run([lift(0, undefined), lift(2, undefined)]);
    expect(a.hasExercises).toBe(false);
    expect(a.recommendations).toEqual([]);
  });
});

describe('session checks', () => {
  test('fewer than two strength sessions; first on a gain goal', () => {
    const one = [lift(0, [{ exerciseId: 'row', sets: 3 }])];
    expect(run(one, 'gain').recommendations[0]).toEqual({ kind: 'strengthSessions', value: 1, change: 1, source: 'S13' });
    expect(run(one, 'lose').recommendations[0].kind).not.toBe('strengthSessions');
    expect(run(one, 'lose').recommendations.map((r) => r.kind)).toContain('strengthSessions');
  });
  test('circuit sessions count as strength', () => {
    expect(run([lift(0, undefined), { ...lift(2, undefined), type: 'circuit' }]).strengthSessions).toBe(2);
  });
  test('aerobic minutes: moderate counts once, vigorous twice, light not at all', () => {
    const s = (type: ProgramSession['type'], intensity: ProgramSession['intensity'], minutes: number): ProgramSession => ({ weekday: 1, type, intensity, minutes });
    expect(run([s('walk', 'moderate', 60)]).aerobicMinutes).toBe(60); // 3.8 MET
    expect(run([s('walk', 'light', 60)]).aerobicMinutes).toBe(0); // 2.8 MET
    expect(run([s('cardio', 'moderate', 45)]).aerobicMinutes).toBe(90); // 6.8 MET is vigorous
    expect(run([s('strength', 'hard', 60)]).aerobicMinutes).toBe(0);
    expect(run([s('cardio', 'moderate', 75)]).aerobicBand).toBe('inRange');
    expect(run([s('walk', 'moderate', 100)]).aerobicBand).toBe('below');
    expect(run([s('cardio', 'hard', 160)]).aerobicBand).toBe('above');
  });
  test('gain goal over 150 aerobic minutes: a note that the target includes it', () => {
    const cardio: ProgramSession = { weekday: 1, type: 'cardio', intensity: 'moderate', minutes: 90 };
    expect(run([cardio], 'gain').notes).toEqual([{ kind: 'aerobicIncluded', value: 180, source: 'S13' }]);
    expect(run([cardio], 'lose').notes).toEqual([]);
  });
  test('a rest day is a day with no hard session', () => {
    const week = [0, 1, 2, 3, 4, 5, 6].map((d) => lift(d, undefined, 'hard'));
    const a = run(week);
    expect(a.restDays).toBe(0);
    expect(a.recommendations).toContainEqual({ kind: 'restDay', value: 0, change: 1, source: 'OT' });
    expect(run(week.slice(0, 6)).recommendations.map((r) => r.kind)).not.toContain('restDay');
  });
  test('sessions over 120 minutes get a note', () => {
    expect(run([{ ...lift(0, undefined), minutes: 150 }, lift(2, undefined)]).notes).toEqual([{ kind: 'longSession', value: 150, source: 'OT' }]);
    expect(run([{ ...lift(0, undefined), minutes: 120 }, lift(2, undefined)]).notes).toEqual([]);
  });
});

describe('lifting and cardio in one week (F20)', () => {
  const cardio = (weekday: number): ProgramSession => ({ weekday, type: 'cardio', minutes: 30, intensity: 'moderate' });
  test('a day with both: lift first and leave 6 hours, naming the days', () => {
    const a = run([lift(0, [{ exerciseId: 'row', sets: 3 }]), cardio(0), lift(2, undefined), cardio(2), cardio(4)]);
    expect(a.hybrid).toEqual([
      { kind: 'liftFirst', weekdays: [0, 2], source: 'S22' },
      { kind: 'spaceOut', weekdays: [0, 2], value: 6, source: 'S23' },
    ]);
  });
  test('cardio on a day that trains legs directly: cycle rather than run', () => {
    const a = run([lift(1, [{ exerciseId: 'squat', sets: 4 }]), cardio(1), lift(3, [{ exerciseId: 'calf', sets: 4 }]), cardio(3)]);
    expect(a.hybrid.find((p) => p.kind === 'legDayCardio')).toEqual({ kind: 'legDayCardio', weekdays: [1], source: 'S25' });
  });
  test('lifting and cardio on separate days, a walk beside a lift, or no lifting: nothing to arrange', () => {
    expect(run([lift(0, undefined), cardio(1)]).hybrid).toEqual([]);
    expect(run([lift(0, undefined), { weekday: 0, type: 'walk', minutes: 30, intensity: 'moderate' }]).hybrid).toEqual([]);
    expect(run([cardio(0), cardio(2)]).hybrid).toEqual([]);
  });
  test('circuit counts as lifting', () => {
    expect(run([{ ...lift(0, undefined), type: 'circuit' }, cardio(0)]).hybrid.map((p) => p.kind)).toEqual(['liftFirst', 'spaceOut']);
  });
});
