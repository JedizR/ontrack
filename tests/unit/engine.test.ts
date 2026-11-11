// docs/SCIENCE.md section 13 vectors A to E, plus caps, floors, guardrails and properties.
import { describe, expect, test } from 'vitest';
import {
  bmi,
  bmr,
  calorieStatus,
  dayMacros,
  dayTarget,
  defaultPace,
  effectiveRate,
  guardrails,
  paceOptions,
  plan,
  proteinOnTrack,
  sessionKcal,
  tdeeAvg,
  weeklyEee,
  type CalorieMode,
  type Goal,
  type Neat,
  type PlanInput,
  type SessionLike,
  type Sex,
} from '../../src/lib/model/engine';

const strength = (weekday: number, minutes = 60, intensity: SessionLike['intensity'] = 'moderate'): SessionLike => ({
  weekday,
  type: 'strength',
  minutes,
  intensity,
});
const day = (p: ReturnType<typeof plan>, sex: Sex, weekday: number, mode: CalorieMode = 'matched') =>
  dayTarget(p, { sex, mode, weekday });

const A: PlanInput = {
  sex: 'male', age: 25, heightCm: 175, weightKg: 60, neat: 'seated',
  sessions: [0, 2, 4, 5].map((d) => strength(d)), goal: 'gain', ratePctPerWeek: 0.5, experience: 'beginner',
};
const B: PlanInput = {
  sex: 'female', age: 30, heightCm: 165, weightKg: 70, neat: 'light',
  sessions: [
    { weekday: 1, type: 'cardio', minutes: 45, intensity: 'moderate' },
    { weekday: 3, type: 'cardio', minutes: 45, intensity: 'moderate' },
    strength(5, 45, 'light'),
  ],
  goal: 'lose', ratePctPerWeek: 0.5, experience: 'intermediate',
};
const C: PlanInput = {
  sex: 'male', age: 40, heightCm: 180, weightKg: 95, bodyFatPct: 30, neat: 'seated',
  sessions: [], goal: 'lose', ratePctPerWeek: 0.75, experience: 'intermediate',
};
const D: PlanInput = {
  sex: 'female', age: 45, heightCm: 155, weightKg: 55, neat: 'seated',
  sessions: [], goal: 'lose', ratePctPerWeek: 0.5, experience: 'beginner',
};

describe('vector A, hardgainer', () => {
  const p = plan(A);
  test('energy', () => {
    expect(bmi(60, 175)).toBeCloseTo(19.59, 2);
    expect(p.bmr).toBe(1573.75);
    expect(p.baseline).toBeCloseTo(1888.5, 9);
    expect(sessionKcal(strength(0), 60)).toBe(240);
    expect(weeklyEee(p)).toBe(960);
    expect(tdeeAvg(p)).toBeCloseTo(2025.642857, 6);
    expect(p.delta).toBeCloseTo(330, 9); // wanted 330 under the cap of 405.13
    expect(0.2 * tdeeAvg(p)).toBeCloseTo(405.13, 2);
  });
  test('targets', () => {
    for (const d of [0, 2, 4, 5]) expect(day(p, 'male', d)).toBe(2460);
    for (const d of [1, 3, 6]) expect(day(p, 'male', d)).toBe(2220);
    expect(day(p, 'male', 0, 'even')).toBe(2360);
  });
  test('macros and flags', () => {
    expect(p.proteinG).toBe(108);
    expect(p.fatG).toBe(65);
    expect(dayMacros(p, 2460).carbsG).toBe(361);
    expect(dayMacros(p, 2220).carbsG).toBe(301);
    expect(dayMacros(p, 2360).carbsG).toBe(336);
    expect(p.flags).toEqual([]);
  });
});

describe('vector B, cutter', () => {
  const p = plan(B);
  test('energy', () => {
    expect(bmi(70, 165)).toBeCloseTo(25.71, 2);
    expect(p.bmr).toBe(1420.25);
    expect(p.baseline).toBeCloseTo(1846.325, 9);
    expect(p.eeeByWeekday[1]).toBeCloseTo(304.5, 9);
    expect(p.eeeByWeekday[5]).toBeCloseTo(131.25, 9);
    expect(weeklyEee(p)).toBeCloseTo(740.25, 9);
    expect(tdeeAvg(p)).toBeCloseTo(1952.075, 9);
    expect(0.25 * tdeeAvg(p)).toBeCloseTo(488.02, 2);
    expect(p.delta).toBeCloseTo(-385, 9);
  });
  test('targets', () => {
    expect(day(p, 'female', 1)).toBe(1770);
    expect(day(p, 'female', 3)).toBe(1770);
    expect(day(p, 'female', 5)).toBe(1590);
    for (const d of [0, 2, 4, 6]) expect(day(p, 'female', d)).toBe(1460);
    expect(day(p, 'female', 0, 'even')).toBe(1570);
  });
  test('macros and flags', () => {
    expect(p.proteinG).toBe(140);
    expect(p.fatG).toBe(44);
    expect(dayMacros(p, 1770).carbsG).toBe(204);
    expect(dayMacros(p, 1590).carbsG).toBe(159);
    expect(dayMacros(p, 1460).carbsG).toBe(126);
    expect(p.flags).toEqual([]);
  });
});

describe('vector C, body fat path and deficit cap', () => {
  const p = plan(C);
  test('all of it', () => {
    expect(bmi(95, 180)).toBeCloseTo(29.32, 2);
    expect(p.bmr).toBeCloseTo(1806.4, 9); // FFM 66.5
    expect(p.baseline).toBeCloseTo(2167.68, 9);
    expect(tdeeAvg(p)).toBeCloseTo(2167.68, 9);
    expect(p.delta).toBeCloseTo(-541.92, 9); // wanted 783.75, capped
    for (let d = 0; d < 7; d++) expect(day(p, 'male', d)).toBe(1630);
    expect(p.flags).toEqual(['deficitCap']);
    expect(effectiveRate(p, 'male')).toBeCloseTo(0.519, 3);
    expect(p.proteinG).toBe(190);
    expect(p.fatG).toBe(57);
    expect(dayMacros(p, 1630).carbsG).toBe(89);
  });
});

describe('vector D, floor', () => {
  const p = plan(D);
  test('all of it', () => {
    expect(bmi(55, 155)).toBeCloseTo(22.89, 2);
    expect(p.bmr).toBeCloseTo(1132.75, 9);
    expect(tdeeAvg(p)).toBeCloseTo(1359.3, 9);
    expect(p.delta).toBeCloseTo(-302.5, 9); // cap 339.83 not reached
    expect(tdeeAvg(p) + p.delta).toBeCloseTo(1056.8, 9);
    for (let d = 0; d < 7; d++) expect(day(p, 'female', d)).toBe(1200);
    expect(day(p, 'female', 0, 'even')).toBe(1200);
    expect(p.flags).toEqual(['floor']);
    expect(effectiveRate(p, 'female')).toBeCloseTo(0.263, 3);
    expect(p.proteinG).toBe(110);
    expect(p.fatG).toBe(33);
    expect(dayMacros(p, 1200).carbsG).toBe(116);
  });
});

test('vector E, unspecified sex', () => {
  expect(bmr({ sex: 'unspecified', age: 30, heightCm: 170, weightKg: 70 })).toBe(1534.5);
});

describe('details', () => {
  test('body fat outside 5 to 60 uses Mifflin-St Jeor', () => {
    const base = { sex: 'male' as const, age: 40, heightCm: 180, weightKg: 95 };
    expect(bmr({ ...base, bodyFatPct: 4 })).toBe(bmr(base));
    expect(bmr({ ...base, bodyFatPct: 61 })).toBe(bmr(base));
    expect(bmr({ ...base, bodyFatPct: 5 })).not.toBe(bmr(base));
  });
  test('a skipped day falls back to the rest target', () => {
    const p = plan(A);
    expect(dayTarget(p, { sex: 'male', mode: 'matched', weekday: 0, skipped: true })).toBe(2220);
  });
  test('surplus cap applies and is flagged; advanced lifters get 10 percent', () => {
    const big = { ...A, age: 30, heightCm: 180, weightKg: 120, sessions: [] }; // wants 660, cap 523.2
    const p = plan(big);
    expect(p.flags).toEqual(['surplusCap']);
    expect(p.delta).toBeCloseTo(0.2 * tdeeAvg(p), 9);
    const adv = plan({ ...big, experience: 'advanced', ratePctPerWeek: 0.25 }); // wants 330, cap 261.6
    expect(adv.flags).toEqual(['surplusCap']);
    expect(adv.delta).toBeCloseTo(0.1 * tdeeAvg(adv), 9);
  });
  test('maintain only forces maintain', () => {
    const p = plan({ ...B, maintainOnly: true });
    expect(p.goal).toBe('maintain');
    expect(p.delta).toBe(0);
    expect(p.flags).toContain('maintainOnly');
    expect(p.proteinG).toBe(Math.round(1.6 * 70));
  });
  test('protein reference weight is capped at the weight for BMI 30', () => {
    const p = plan({ ...C, weightKg: 130, bodyFatPct: undefined });
    expect(p.proteinG).toBe(Math.round(2 * 30 * 1.8 * 1.8));
  });
  test('fat drops when protein and fat alone exceed the target', () => {
    // Heavy with a low maintenance: 200 g protein and 60 g fat (1,340 kcal) overrun the 1,330 target.
    const p = plan({ sex: 'female', age: 100, heightCm: 183, weightKg: 100, neat: 'seated', sessions: [], goal: 'lose', ratePctPerWeek: 0.5, experience: 'beginner' });
    expect(dayTarget(p, { sex: 'female', mode: 'even', weekday: 0 })).toBe(1330);
    expect(p.proteinG).toBe(200);
    expect(p.fatG).toBe(59); // (1330 - 800) / 9, above the 50 g floor
  });
});

describe('guardrails and paces', () => {
  test('under 18 is blocked', () => {
    expect(guardrails({ age: 17, heightCm: 175, weightKg: 60 }).blocked).toBe(true);
    expect(guardrails({ age: 18, heightCm: 175, weightKg: 60 }).blocked).toBe(false);
  });
  test('BMI under 18.5 removes lose; under 16 shows the doctor card', () => {
    const g = guardrails({ age: 30, heightCm: 180, weightKg: 58 }); // 17.9
    expect(g.goals).toEqual(['maintain', 'gain']);
    expect(g.doctorCard).toBe(false);
    expect(guardrails({ age: 30, heightCm: 180, weightKg: 50 }).doctorCard).toBe(true); // 15.4
    expect(g.minGoalWeightKg).toBeCloseTo(18.5 * 1.8 * 1.8, 9);
  });
  test('lose paces by BMI', () => {
    const names = (b: number) => paceOptions('lose', b, 'beginner').map((o) => o.name);
    expect(names(18)).toEqual([]);
    expect(names(19)).toEqual(['gentle']);
    expect(names(22)).toEqual(['gentle', 'steady']);
    expect(names(25)).toEqual(['gentle', 'steady', 'faster']);
  });
  test('gain paces and defaults', () => {
    expect(paceOptions('gain', 22, 'advanced').map((o) => o.name)).toEqual(['lean']);
    expect(defaultPace('gain', 22, 'beginner')?.name).toBe('standard');
    expect(defaultPace('gain', 22, 'intermediate')?.name).toBe('lean');
    expect(defaultPace('gain', 18, 'intermediate')?.name).toBe('standard');
    expect(defaultPace('lose', 22, 'beginner')?.name).toBe('steady');
    expect(defaultPace('lose', 19, 'beginner')?.name).toBe('gentle');
    expect(defaultPace('maintain', 22, 'beginner')).toBeUndefined();
  });
  test('a plan never runs faster than the paces offered', () => {
    expect(plan({ ...B, weightKg: 52, ratePctPerWeek: 0.75 }).ratePctPerWeek).toBe(0.25); // BMI 19.1
    const under = plan({ ...B, weightKg: 48, ratePctPerWeek: 0.5 }); // BMI 17.6
    expect(under.delta).toBe(0);
    expect(Object.is(effectiveRate(under, 'female'), 0)).toBe(true); // not -0
    expect(plan({ ...B, ratePctPerWeek: -0.75 }).delta).toBe(0); // a negative rate never turns a lose goal into a surplus
  });
});

describe('on track', () => {
  test('gain: 95 to 115 percent', () => {
    expect(calorieStatus('gain', 2337, 2460, 'male')).toBe('on');
    expect(calorieStatus('gain', 2330, 2460, 'male')).toBe('below');
    expect(calorieStatus('gain', 2829, 2460, 'male')).toBe('on');
    expect(calorieStatus('gain', 2830, 2460, 'male')).toBe('above');
  });
  test('maintain: 90 to 110 percent', () => {
    expect(calorieStatus('maintain', 1800, 2000, 'male')).toBe('on');
    expect(calorieStatus('maintain', 1799, 2000, 'male')).toBe('below');
    expect(calorieStatus('maintain', 2201, 2000, 'male')).toBe('above');
  });
  test('lose: 90 to 105 percent and not below the floor', () => {
    expect(calorieStatus('lose', 1314, 1460, 'female')).toBe('on');
    expect(calorieStatus('lose', 1534, 1460, 'female')).toBe('above');
    expect(calorieStatus('lose', 1150, 1200, 'female')).toBe('below');
    expect(calorieStatus('lose', 1200, 1200, 'female')).toBe('on');
  });
  test('protein: 90 percent or more', () => {
    expect(proteinOnTrack(98, 108)).toBe(true);
    expect(proteinOnTrack(97, 108)).toBe(false);
  });
});

describe('properties', () => {
  const sexes: Sex[] = ['male', 'female', 'unspecified'];
  const neats: Neat[] = ['seated', 'light', 'moving', 'physical'];
  const programs: SessionLike[][] = [
    [],
    [0, 2, 4].map((d) => strength(d)),
    [...[0, 1, 3, 4].map((d) => strength(d, 75, 'hard')), { weekday: 5, type: 'cardio', minutes: 90, intensity: 'hard' }],
  ];
  const cases: PlanInput[] = [];
  for (const sex of sexes)
    for (const heightCm of [150, 170, 195])
      for (const weightKg of [45, 60, 80, 110, 150])
        for (const neat of neats)
          for (const sessions of programs)
            for (const [goal, rate] of [['lose', 0.25], ['lose', 0.75], ['maintain', 0], ['gain', 0.25], ['gain', 0.5]] as [Goal, number][])
              cases.push({ sex, age: 35, heightCm, weightKg, neat, sessions, goal, ratePctPerWeek: rate, experience: 'intermediate' });

  test('a cap is never exceeded', () => {
    for (const c of cases) {
      const p = plan(c);
      const t = tdeeAvg(p);
      expect(-p.delta).toBeLessThanOrEqual(0.25 * t + 1e-9);
      expect(p.delta).toBeLessThanOrEqual(0.2 * t + 1e-9);
    }
  });
  test('a floor is never broken', () => {
    const floor = { male: 1500, female: 1200, unspecified: 1350 };
    for (const c of cases) {
      const p = plan(c);
      for (let d = 0; d < 7; d++)
        for (const mode of ['matched', 'even'] as const)
          for (const skipped of [false, true])
            expect(dayTarget(p, { sex: c.sex, mode, weekday: d, skipped })).toBeGreaterThanOrEqual(floor[c.sex]);
    }
  });
  test('protein never falls when weight rises', () => {
    for (const sex of sexes)
      for (const goal of ['lose', 'maintain', 'gain'] as Goal[])
        for (const heightCm of [150, 175, 195]) {
          let last = 0;
          for (let weightKg = 40; weightKg <= 200; weightKg += 0.5) {
            const g = plan({ sex, age: 35, heightCm, weightKg, neat: 'light', sessions: [], goal, ratePctPerWeek: 0.25, experience: 'beginner' }).proteinG;
            expect(g).toBeGreaterThanOrEqual(last);
            last = g;
          }
        }
  });
  test('the matched week sums to the even week within rounding', () => {
    for (const c of cases) {
      const p = plan(c);
      if (p.flags.includes('floor')) continue; // a floor lifts some days and not others
      const matched = [0, 1, 2, 3, 4, 5, 6].reduce((a, d) => a + day(p, c.sex, d), 0);
      expect(Math.abs(matched - 7 * day(p, c.sex, 0, 'even'))).toBeLessThanOrEqual(7 * 5 + 7 * 5);
    }
  });
});
