// The onboarding draft: which screens apply, the program it creates, the guardrails it applies, and the records it
// becomes (SCREENS.md section 4, PRD section 7). Vector A of docs/SCIENCE.md is the hardgainer below.
import { describe, expect, test } from 'vitest';
import { SCHEMAS } from '../../shared/records';
import { plan, type PlanNumbers } from '../../src/lib/model/engine';
import { kgPerWeek, targetParts, targetWith, trainingDayEee } from '../../src/lib/model/day';
import { cmToFtIn, ftInToCm, kgToLb, lbToKg } from '../../src/lib/model/units';
import { weekdayOf } from '../../src/lib/model/dates';
import { complete, goalWeightOf, inputOf, paceChoices, progress, programOf, route, sessionsFor, soFar, toRecords, upgrade, type Draft } from '../../src/flows/onboarding/draft';

const YEAR = 2026;
const A: Draft = {
  at: 'plan', units: 'metric', goal: 'gain', screening: { pregnant: false, medical: false, eatingDisorder: false },
  sex: 'male', birthYear: 2001, heightCm: 175, weightKg: 60, neat: 'seated',
  days: 4, kind: 'lifting', experience: 'beginner',
};

describe('route', () => {
  test('a gaining lifter answers all nine questions; the pace is chosen on Your plan', () => {
    expect(route(A, YEAR)).toEqual(['welcome', 'goal', 'screening', 'sex', 'born', 'body', 'move', 'days', 'kind', 'experience', 'plan']);
    expect(progress({ ...A, at: 'sex' }, YEAR)).toEqual({ n: 3, total: 9 });
    expect(progress({ ...A, at: 'plan' }, YEAR)).toBeNull();
  });
  test('experience is asked only of gaining lifters; cardio and Not yet skip it', () => {
    expect(route({ ...A, goal: 'lose' }, YEAR)).not.toContain('experience');
    expect(route({ ...A, goal: 'maintain' }, YEAR)).not.toContain('experience');
    expect(route({ ...A, kind: 'cardio' }, YEAR)).not.toContain('experience');
    expect(route({ ...A, kind: 'both' }, YEAR)).toContain('experience');
    expect(progress({ ...A, goal: 'maintain', at: 'days' }, YEAR)).toEqual({ n: 7, total: 8 });
  });
  test('Not yet skips what is trained and the experience', () => {
    const r = route({ ...A, days: 0, kind: undefined }, YEAR);
    expect(r.slice(-3)).toEqual(['move', 'days', 'plan']);
    expect(progress({ ...A, days: 0, at: 'days' }, YEAR)).toEqual({ n: 7, total: 7 });
  });
  test('the step count assumes the longest route until an answer shortens it, so it never grows', () => {
    const before: Draft = { at: 'goal', units: 'metric' };
    expect(progress(before, YEAR)?.total).toBe(9);
    expect(progress({ ...before, goal: 'gain' }, YEAR)?.total).toBe(9);
    expect(progress({ ...before, goal: 'maintain' }, YEAR)?.total).toBe(8);
    expect(progress({ ...before, goal: 'gain', at: 'days', days: 0 }, YEAR)?.total).toBe(7);
  });
  test('a screening tick adds the advice screen and drops the experience question', () => {
    const r = route({ ...A, screening: { pregnant: true, medical: false, eatingDisorder: false } }, YEAR);
    expect(r.slice(0, 5)).toEqual(['welcome', 'goal', 'screening', 'advice', 'sex']);
    expect(r).not.toContain('experience');
  });
  test('under 18 ends at the age screen', () => {
    expect(route({ ...A, birthYear: 2009 }, YEAR).at(-1)).toBe('young');
    expect(route({ ...A, birthYear: 2008 }, YEAR).at(-1)).toBe('plan');
  });
});

describe('program', () => {
  test('the days and what is trained make the week, spread from Monday', () => {
    const p = programOf(A);
    expect(p.sessions.map((s) => s.weekday)).toEqual([0, 1, 3, 4]);
    expect(p.sessions[0]).toEqual({ key: 'd0', weekday: 0, name: 'Strength', type: 'strength', minutes: 60, intensity: 'moderate' });
    for (let n = 1; n <= 7; n++) expect(new Set(programOf({ ...A, kind: 'cardio', days: n }).sessions.map((s) => s.weekday)).size).toBe(n);
  });
  test('Not yet is an empty week', () => {
    expect(programOf({ ...A, days: 0, kind: undefined })).toEqual({ name: '', sessions: [] });
  });
});

describe('a draft saved before O1', () => {
  const old = (train: unknown, at = 'pace') => ({ ...A, days: undefined, kind: undefined, at, train }) as unknown as Draft;
  test('keeps its answers in the new terms and moves off the screens that are gone', () => {
    expect(upgrade(old({ kind: 'custom', days: 4, type: 'strength', minutes: 60, intensity: 'moderate' }))).toEqual({ ...A, at: 'plan' });
    expect(upgrade(old({ kind: 'custom', days: 3, type: 'cardio', minutes: 30, intensity: 'hard' }, 'train'))).toMatchObject({ at: 'days', days: 3, kind: 'cardio' });
    expect(upgrade(old({ kind: 'template', id: 'upper-lower-cardio-5' }))).toMatchObject({ days: 5, kind: 'both' });
    const later = upgrade(old({ kind: 'later' }))!;
    expect(later).toMatchObject({ days: 0 });
    expect(later.kind).toBeUndefined();
    expect(later).not.toHaveProperty('train');
    expect(complete(later, YEAR)).toBe(true);
    // the sports that were not lifting count as cardio, and an experience question no longer asked moves on
    expect(upgrade(old({ kind: 'custom', days: 2, type: 'sport', minutes: 90, intensity: 'hard' }))).toMatchObject({ days: 2, kind: 'cardio' });
    expect(upgrade({ ...old({ kind: 'custom', days: 3, type: 'strength', minutes: 60, intensity: 'moderate' }, 'experience'), goal: 'lose' })).toMatchObject({ at: 'plan', kind: 'lifting' });
    expect(upgrade(old({ kind: 'custom', days: 3, type: 'strength', minutes: 60, intensity: 'moderate' }, 'experience'))).toMatchObject({ at: 'experience' });
  });
  test('a current draft is left as it is', () => {
    expect(upgrade(A)).toBe(A);
    expect(upgrade(null)).toBeNull();
  });
});

describe('your number so far', () => {
  test('nothing before screening and the body are answered', () => {
    expect(soFar({ ...A, screening: undefined }, YEAR)).toBeNull();
    expect(soFar({ ...A, weightKg: undefined }, YEAR)).toBeNull();
  });
  test("vector A: resting energy, then daily movement, then a training day, in the breakdown's own rows", () => {
    const at = { ...A, neat: undefined, days: undefined, kind: undefined };
    expect(soFar(at, YEAR)).toEqual({ row: 'bmr', value: 1574, added: 0 });
    expect(soFar({ ...at, neat: 'seated' }, YEAR)).toEqual({ row: 'movement', value: 1890, added: 316 });
    expect(soFar({ ...at, neat: 'seated', days: 4 }, YEAR)).toEqual({ row: 'movement', value: 1890, added: 316 }); // kind not yet known
    expect(soFar(A, YEAR)).toEqual({ row: 'training', value: 2130, added: 240 });
    // Your plan then adds the goal: 2,130 + 330 = 2,460
    const p = plan(inputOf(A, YEAR));
    expect(targetWith(p, 'male', trainingDayEee(p)) - soFar(A, YEAR)!.value).toBe(330);
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
  test('the faster gain pace is offered under BMI 20 (F19), never as the default, and holds inside the surplus cap', () => {
    expect(paceChoices(A, YEAR)).toMatchObject({ options: [{ name: 'lean' }, { name: 'standard' }, { name: 'faster' }], why: null, picked: 0.5 });
    const p = plan(inputOf({ ...A, rate: 0.75 }, YEAR));
    expect(p.ratePctPerWeek).toBe(0.75);
    expect(p.delta).toBeLessThanOrEqual(0.2 * (p.baseline + p.eeeByWeekday.reduce((a, b) => a + b, 0) / 7) + 1e-9);
  });
  test('gaining at BMI 20 or more says why the faster pace is missing, in its own words', () => {
    expect(paceChoices({ ...A, weightKg: 65 }, YEAR)).toMatchObject({ options: [{ name: 'lean' }, { name: 'standard' }], why: 'noFasterGain' });
  });
  test('experience counts only for a gaining lifter', () => {
    expect(inputOf({ ...A, goal: 'lose', experience: 'advanced' }, YEAR).experience).toBe('beginner');
    expect(inputOf({ ...A, experience: 'advanced' }, YEAR).experience).toBe('advanced');
  });
  test('a pace no longer offered after an answer changed falls back to the default', () => {
    expect(inputOf({ ...A, weightKg: 65, rate: 0.75 }, YEAR).ratePctPerWeek).toBe(0.5); // BMI 21.2: no faster gain pace
    expect(inputOf({ ...A, rate: 0.25 }, YEAR).ratePctPerWeek).toBe(0.25);
    expect(inputOf({ ...A, rate: 0 }, YEAR).ratePctPerWeek).toBe(0.5); // the old "hold" answer is no pace now
    expect(inputOf({ ...A, goal: 'lose', weightKg: 70, rate: 0.75 }, YEAR).ratePctPerWeek).toBe(0.5); // BMI 22.9: steady
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
    expect(complete(A, YEAR)).toBe(true);
    expect(complete({ ...A, neat: undefined }, YEAR)).toBe(false);
    expect(complete({ ...A, days: 3, kind: undefined }, YEAR)).toBe(false);
    expect(complete({ ...A, birthYear: 2010 }, YEAR)).toBe(false); // never a plan for a minor, whatever the route
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
    const d: Draft = { ...A, sex: 'female', goal: 'lose', heightCm: 155, weightKg: 55, rate: 0.5, days: 3 };
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
