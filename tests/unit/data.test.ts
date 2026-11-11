// Library and template validity (TECH-SPEC section 10).
import { describe, expect, test } from 'vitest';
import { analyseProgram, MUSCLES, type Experience, type Goal } from '../../src/lib/model/engine';
import { EXERCISES, LIBRARY } from '../../src/lib/data/exercises';
import { TEMPLATES } from '../../src/lib/data/templates';

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
  test('the four programs named in the PRD', () => {
    expect(TEMPLATES.map((t) => t.name)).toEqual(['Full body 3 days', 'Upper lower 4 days', 'Push pull legs 6 days', 'Minimal 2 days']);
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
