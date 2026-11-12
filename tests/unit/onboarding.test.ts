// The onboarding draft: which screens apply, the program it creates, the guardrails it applies, and the records it
// becomes (SCREENS.md section 4, PRD section 7). Vector A of docs/SCIENCE.md is the hardgainer below.
import { describe, expect, test } from 'vitest';
import { SCHEMAS } from '../../shared/records';
import { plan, type PlanNumbers } from '../../src/lib/model/engine';
import { kgPerWeek, targetParts, targetWith, trainingDayEee } from '../../src/lib/model/day';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '../../src/lib/model/units';
import { weekdayOf } from '../../src/lib/model/dates';
import { complete, goalWeightOf, inputOf, paceChoices, progress, programOf, route, sessionsFor, toRecords, type Draft } from '../../src/flows/onboarding/draft';

const YEAR = 2026;
const A: Draft = {
  at: 'plan', units: 'metric', goal: 'gain', screening: { pregnant: false, medical: false, eatingDisorder: false },
  sex: 'male', birthYear: 2001, heightCm: 175, weightKg: 60, neat: 'seated',
  train: { kind: 'custom', days: 4, type: 'strength', minutes: 60, intensity: 'moderate' }, experience: 'beginner',
};

describe('route', () => {
  test('a gain goal with strength training asks all nine questions', () => {
    expect(route(A, YEAR)).toEqual(['welcome', 'goal', 'screening', 'sex', 'born', 'body', 'move', 'train', 'experience', 'pace', 'plan']);
    expect(progress({ ...A, at: 'sex' }, YEAR)).toEqual({ n: 3, total: 9 });
    expect(progress({ ...A, at: 'plan' }, YEAR)).toBeNull();
  });
  test('maintain has no pace; cardio only has no experience question', () => {
    const r = route({ ...A, goal: 'maintain', train: { kind: 'custom', days: 3, type: 'cardio', minutes: 30, intensity: 'hard' } }, YEAR);
    expect(r).not.toContain('pace');
    expect(r).not.toContain('experience');
    expect(progress({ ...A, goal: 'maintain', at: 'train' }, YEAR)).toEqual({ n: 7, total: 8 });
  });
  test('a screening tick adds the advice screen and removes the pace', () => {
    const r = route({ ...A, screening: { pregnant: true, medical: false, eatingDisorder: false } }, YEAR);
    expect(r.slice(0, 5)).toEqual(['welcome', 'goal', 'screening', 'advice', 'sex']);
    expect(r).not.toContain('pace');
  });
  test('under 18 ends at the age screen', () => {
    expect(route({ ...A, birthYear: 2009 }, YEAR).at(-1)).toBe('young');
    expect(route({ ...A, birthYear: 2008 }, YEAR).at(-1)).toBe('plan');
  });
});

describe('program', () => {
  test('a custom week spreads its sessions from Monday', () => {
    const p = programOf(A);
    expect(p.sessions.map((s) => s.weekday)).toEqual([0, 1, 3, 4]);
    expect(p.sessions[0]).toEqual({ key: 'd0', weekday: 0, name: 'Strength', type: 'strength', minutes: 60, intensity: 'moderate' });
    for (let n = 1; n <= 7; n++) expect(new Set(programOf({ ...A, train: { kind: 'custom', days: n, type: 'walk', minutes: 30, intensity: 'light' } }).sessions.map((s) => s.weekday)).size).toBe(n);
  });
  test('a template is copied whole, later is an empty week', () => {
    expect(programOf({ ...A, train: { kind: 'template', id: 'minimal-2' } })).toMatchObject({ name: 'Minimal 2 days' });
    expect(programOf({ ...A, train: { kind: 'later' } })).toEqual({ name: '', sessions: [] });
  });
});

describe('guardrails', () => {
  test('lose below BMI 18.5 becomes maintain, with no pace offered', () => {
    const d: Draft = { ...A, goal: 'lose', weightKg: 55 };
    expect(inputOf(d, YEAR).goal).toBe('maintain');
    expect(paceChoices(d, YEAR)).toMatchObject({ options: [], why: 'noLose' });
  });
  test('lose between BMI 18.5 and 20 is gentle only; under 25 has no faster pace', () => {
    expect(paceChoices({ ...A, goal: 'lose', weightKg: 60 }, YEAR)).toMatchObject({ options: [{ name: 'gentle' }], why: 'gentleOnly' });
    expect(paceChoices({ ...A, goal: 'lose', weightKg: 70 }, YEAR).why).toBe('noFaster');
    expect(paceChoices({ ...A, goal: 'lose', weightKg: 90 }, YEAR)).toMatchObject({ options: [{}, {}, { name: 'faster' }], why: null, picked: 0.5 });
  });
  test('the faster gain pace stays off the pace screen until T1b labels it', () => {
    expect(paceChoices(A, YEAR).options.map((o) => o.name)).toEqual(['lean', 'standard']);
  });
  test('advanced lifters gaining get the lean pace only', () => {
    expect(paceChoices({ ...A, experience: 'advanced' }, YEAR)).toMatchObject({ options: [{ name: 'lean' }], why: 'leanOnly', picked: 0.25 });
  });
  test('a screening tick makes the plan maintenance only', () => {
    const p = plan(inputOf({ ...A, screening: { pregnant: false, medical: true, eatingDisorder: false } }, YEAR));
    expect(p).toMatchObject({ goal: 'maintain', delta: 0, flags: ['maintainOnly'] });
  });
});

describe('records', () => {
  test('vector A becomes a valid profile, program, plan and first weigh-in', () => {
    expect(complete(A)).toBe(true);
    expect(complete({ ...A, neat: undefined })).toBe(false);
    const r = toRecords({ ...A, goalWeightKg: 66, even: true }, '2026-11-11', '2026-11-11T03:00:00.000Z');
    for (const [c, data] of Object.entries(r)) expect(() => SCHEMAS[c as keyof typeof SCHEMAS].parse(data), c).not.toThrow();
    expect(r.profile).toMatchObject({ birthYear: 2001, calorieMode: 'even', checkinWeekday: 2, units: 'metric', screening: { at: '2026-11-11T03:00:00.000Z' } });
    expect(r.profile).not.toHaveProperty('bodyFatPct');
    expect(r.plan).toMatchObject({ goal: 'gain', ratePctPerWeek: 0.5, delta: 330, proteinG: 108, goalWeightKg: 66, effectiveFrom: '2026-11-11', tdeeSource: 'formula', source: 'onboarding' });
    expect(r.weight).toEqual({ date: '2026-11-11', kg: 60 });
  });
  test('a goal weight that a later height change put under BMI 18.5 is dropped', () => {
    const d: Draft = { ...A, goalWeightKg: 57 };
    expect(goalWeightOf(d)).toBe(57);
    expect(goalWeightOf({ ...d, heightCm: 180 })).toBeUndefined();
    expect(toRecords({ ...d, heightCm: 180 }, '2026-11-11', '2026-11-11T03:00:00.000Z').plan).not.toHaveProperty('goalWeightKg');
    expect(goalWeightOf({ ...A, heightCm: 100, goalWeightKg: 19 })).toBeUndefined(); // under what the database takes
  });
});

describe('plan breakdown', () => {
  const pA = plan(inputOf(A, YEAR));
  test('vector A: 2,460 on a training day, 2,220 at rest, about 0.3 kg a week', () => {
    expect(trainingDayEee(pA)).toBeCloseTo(240, 6);
    expect(targetWith(pA, 'male', trainingDayEee(pA))).toBe(2460);
    expect(targetWith(pA, 'male', 0)).toBe(2220);
    expect(targetParts(pA, 'male', 240)).toEqual({ bmr: 1574, movement: 316, training: 240, goal: 330, floorLift: 0, total: 2460 });
    expect(kgPerWeek(pA, 'male', 'matched')).toBeCloseTo(0.3, 1);
    expect(kgPerWeek(pA, 'male', 'even')).toBeCloseTo(0.3, 1);
  });
  test('a floor that lifts only rest days slows the change, and the expectation says so', () => {
    const d: Draft = { ...A, sex: 'female', goal: 'lose', heightCm: 155, weightKg: 55, rate: 0.5, train: { kind: 'custom', days: 3, type: 'strength', minutes: 60, intensity: 'moderate' } };
    const p = plan(inputOf(d, YEAR));
    expect(p.flags).toContain('floor');
    expect(kgPerWeek(p, 'female', 'matched')).toBeLessThan(kgPerWeek(p, 'female', 'even'));
  });
  test('the lines always add up to the target, floor included', () => {
    let floored = 0;
    for (const heightCm of [150, 175]) for (let kg = 40; kg <= 140; kg += 7) for (const sex of ['male', 'female', 'unspecified'] as const) for (const goal of ['lose', 'gain', 'maintain'] as const) {
      const p: PlanNumbers = plan(inputOf({ ...A, sex, goal, heightCm, weightKg: kg, rate: goal === 'lose' ? 0.75 : undefined }, YEAR));
      for (const eee of [0, trainingDayEee(p), 333.3]) {
        const x = targetParts(p, sex, eee);
        expect(x.bmr + x.movement + x.training + x.goal + x.floorLift).toBe(x.total);
        if (x.floorLift) floored++;
      }
    }
    expect(floored).toBeGreaterThan(0);
  });
});

test('units convert both ways', () => {
  expect(lbToKg(kgToLb(72.5))).toBeCloseTo(72.5, 10);
  expect(cmToFtIn(175)).toEqual({ ft: 5, inches: 9 });
  expect(ftInToCm(5, 9)).toBeCloseTo(175.26, 2);
  expect(weekdayOf('2026-11-16')).toBe(0);
  expect(weekdayOf('2026-11-15')).toBe(6);
});

describe('"What do you train?" (O1, F20)', () => {
  const shape = (kind: 'lifting' | 'cardio' | 'both', days: number) => sessionsFor(kind, days).map((s) => [s.weekday, s.type, s.minutes]);
  test('lifting: an hour of strength on each day, spread over the week', () => {
    expect(shape('lifting', 3)).toEqual([[0, 'strength', 60], [2, 'strength', 60], [4, 'strength', 60]]);
  });
  test('cardio: half an hour each day', () => {
    expect(shape('cardio', 2)).toEqual([[0, 'cardio', 30], [3, 'cardio', 30]]);
  });
  test('both: the two take turns, lifting first', () => {
    expect(shape('both', 4)).toEqual([[0, 'strength', 60], [1, 'cardio', 30], [3, 'strength', 60], [4, 'cardio', 30]]);
    expect(shape('both', 1)).toEqual([[0, 'strength', 60]]);
  });
  test('no days, no sessions; every week saves as a program', () => {
    expect(sessionsFor('both', 0)).toEqual([]);
    for (const kind of ['lifting', 'cardio', 'both'] as const)
      for (let days = 0; days <= 7; days++) expect(SCHEMAS.program.safeParse({ name: '', sessions: sessionsFor(kind, days) }).success).toBe(true);
  });
});
