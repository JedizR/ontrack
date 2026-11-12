// Library and template validity (TECH-SPEC section 10).
import { describe, expect, test } from 'vitest';
import { analyseProgram, MUSCLES, type Experience, type Goal } from '../../src/lib/model/engine';
import { EXERCISES, LIBRARY } from '../../src/lib/data/exercises';
import { suggestTemplate, TEMPLATES } from '../../src/lib/data/templates';

const EQUIPMENT = ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'other'];

describe('exercise library', () => {
  test('at least 60 exercises with unique ids and a valid shape', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.id).toMatch(/^[a-z0-9-]{1,40}$/);
      expect(e.name.trim()).toBe(e.name);
      expect(e.name[0]).toBe(e.name[0].toUpperCase());
      expect(e.primary.length).toBeGreaterThan(0);
      for (const m of [...e.primary, ...e.secondary]) expect(MUSCLES).toContain(m);
      expect(e.primary.filter((m) => e.secondary.includes(m))).toEqual([]);
      expect(EQUIPMENT).toContain(e.equipment);
    }
  });
  test.each(MUSCLES)('%s is primary in at least four exercises', (m) => {
    expect(EXERCISES.filter((e) => e.primary.includes(m)).length).toBeGreaterThanOrEqual(4);
  });
});

describe('templates', () => {
  test('the four programs named in the PRD and two that mix strength and cardio (F20)', () => {
    expect(TEMPLATES.map((t) => t.name)).toEqual([
      'Full body 3 days', 'Upper lower 4 days', 'Push pull legs 6 days', 'Minimal 2 days',
      'Full body and cardio 3 days', 'Upper lower and cardio 5 days',
    ]);
  });
  test('the hybrids show their arrangement points; the others have none', () => {
    const points = (id: string) =>
      analyseProgram(TEMPLATES.find((t) => t.id === id)!.sessions, { goal: 'gain', experience: 'intermediate', library: LIBRARY }).hybrid;
    expect(points('full-body-cardio-3').map((p) => [p.kind, p.weekdays])).toEqual([['liftFirst', [0, 2, 4]], ['spaceOut', [0, 2, 4]], ['legDayCardio', [0, 2, 4]]]);
    expect(points('upper-lower-cardio-5').map((p) => [p.kind, p.weekdays])).toEqual([['liftFirst', [0, 3]], ['spaceOut', [0, 3]]]);
    for (const id of ['full-body-3', 'upper-lower-4', 'push-pull-legs-6', 'minimal-2']) expect(points(id), id).toEqual([]);
  });
  test('the hybrids reach the WHO 150 cardio minutes', () => {
    for (const id of ['full-body-cardio-3', 'upper-lower-cardio-5']) {
      const a = analyseProgram(TEMPLATES.find((t) => t.id === id)!.sessions, { goal: 'lose', experience: 'intermediate', library: LIBRARY });
      expect(a.aerobicMinutes, id).toBe(150);
      expect(a.strengthSessions, id).toBeGreaterThanOrEqual(2);
    }
  });
  test.each(TEMPLATES)('$name is well formed', (t) => {
    expect(new Set(t.sessions.map((s) => s.weekday)).size).toBe(t.daysPerWeek);
    expect(new Set(t.sessions.map((s) => s.key)).size).toBe(t.sessions.length);
    for (const s of t.sessions) {
      expect(s.weekday).toBeGreaterThanOrEqual(0);
      expect(s.weekday).toBeLessThanOrEqual(6);
      for (const e of s.exercises ?? []) {
        expect(LIBRARY[e.exerciseId], e.exerciseId).toBeDefined();
        expect(e.sets).toBeGreaterThan(0);
        expect(e.repsMin).toBeLessThanOrEqual(e.repsMax);
      }
    }
  });
  const contexts: [Goal, Experience][] = [['gain', 'beginner'], ['gain', 'advanced'], ['lose', 'intermediate'], ['maintain', 'beginner']];
  test.each(TEMPLATES)('$name lands inside every band', (t) => {
    for (const [goal, experience] of contexts) {
      const a = analyseProgram(t.sessions, { goal, experience, library: LIBRARY });
      expect(a.hasExercises).toBe(true);
      for (const m of MUSCLES) {
        expect(a.muscles[m].band, m).toBe('inRange');
        expect(a.muscles[m].sessions, m).toBeGreaterThanOrEqual(2);
      }
      expect(a.recommendations).toEqual([]);
      expect(a.notes).toEqual([]);
    }
  });
});

test('every template saves as a program record', async () => {
  const { programSchema } = await import('../../shared/records');
  for (const tpl of TEMPLATES) expect(programSchema.safeParse({ name: tpl.name, sessions: tpl.sessions }).success, tpl.id).toBe(true);
});

describe('the template suggested for "What do you train?" (onboarding RESEARCH section 5)', () => {
  test.each([
    ['both', 3, 'beginner', 'gain', 'full-body-cardio-3'],
    ['both', 5, 'beginner', 'lose', 'full-body-cardio-3'],
    ['both', 5, 'intermediate', 'maintain', 'upper-lower-cardio-5'],
    ['cardio', 4, 'beginner', 'gain', 'minimal-2'],
    ['cardio', 4, 'beginner', 'lose', null],
    ['lifting', 0, 'beginner', 'gain', 'minimal-2'],
    ['lifting', 0, 'beginner', 'maintain', null],
    ['lifting', 2, 'advanced', 'gain', 'minimal-2'],
    ['lifting', 3, 'intermediate', 'gain', 'full-body-3'],
    ['lifting', 4, 'beginner', 'gain', 'full-body-3'],
    ['lifting', 4, 'intermediate', 'gain', 'upper-lower-4'],
    ['lifting', 6, 'beginner', 'lose', 'upper-lower-4'],
    ['lifting', 6, 'advanced', 'lose', 'push-pull-legs-6'],
  ] as const)('%s, %i days, %s, %s: %s', (kind, days, experience, goal, id) => {
    expect(suggestTemplate(kind, days, experience, goal)).toBe(id);
    if (id) expect(TEMPLATES.map((t) => t.id)).toContain(id);
  });
});
