// Development only: an account with four weeks of realistic logs whose check-in today reaches a chosen outcome
// (BUILD-PLAN M8). The account is plan A of docs/SCIENCE.md, the hardgainer, with the check-in due today. 'raise' is
// vector F and 'adherence' vector G: 12 complete days in the 21 day window at a mean of 2,300 or 2,050 kcal, and
// weigh-ins on a line rising 0.010 kg a day. Their noise is symmetric about the window's middle, which leaves the
// slope exact. The mock backend fills an account signed in as <outcome>@seed.test; end to end tests push it themselves.
import { plan, type PlanInput } from '../src/lib/model/engine/index.ts';
import { addDays, atTime, weekdayOf, yearOf } from '../src/lib/model/dates.ts';
import { ids, type Rec } from '../shared/records.ts';

export const OUTCOMES = ['raise', 'lower', 'on_track', 'adherence', 'need_data'] as const;
export type Outcome = (typeof OUTCOMES)[number];
export const isOutcome = (s: string): s is Outcome => (OUTCOMES as readonly string[]).includes(s);

/** Mean intake on complete days, and the weight change a day. */
const SCENARIO: Record<Outcome, { intake: number; kgPerDay: number }> = {
  raise: { intake: 2300, kgPerDay: 0.01 }, // vector F: eating to target and gaining slower than planned
  adherence: { intake: 2050, kgPerDay: 0.01 }, // vector G: 87 percent of the target
  on_track: { intake: 2350, kgPerDay: 0.042 }, // about 0.5 percent a week
  lower: { intake: 2350, kgPerDay: 0.07 }, // gaining faster than planned
  need_data: { intake: 2350, kgPerDay: 0.042 }, // the same, with too few weigh-ins
};

const DAYS = 28;
const AGE = 25;
const A: PlanInput = {
  sex: 'male', age: AGE, heightCm: 175, weightKg: 60, neat: 'seated', experience: 'beginner', goal: 'gain', ratePctPerWeek: 0.5,
  sessions: [0, 2, 4, 5].map((weekday) => ({ weekday, type: 'strength', minutes: 60, intensity: 'moderate' })),
};
const SESSIONS = A.sessions.map((s, i) => ({ ...s, key: `s${i}`, name: 'Strength' }));

// days before today: in the 21 day window (0 to 20), 9 are not complete, so 12 are; before it, 2 of 7
const INCOMPLETE = [0, 2, 5, 6, 9, 12, 13, 16, 19, 23, 26];
// zero sum, so the window's 12 complete days average exactly the scenario's intake
const INTAKE_NOISE = [120, -80, 40, -150, 60, 10, -40, 90, -20, -110, 30, 50];
// weigh-ins, days before today: symmetric about day 10 inside the window
const WEIGHED = [0, 1, 3, 4, 6, 8, 10, 12, 14, 16, 17, 19, 20, 21, 22, 24, 25, 27];
const WEIGHED_FEW = [1, 4, 8, 12, 16, 19, 21, 22, 24, 25, 27]; // 6 in the window: fewer than 8
// a scale's day to day noise, kg, by distance from day 10
const KG_NOISE = [0, 0.2, 0.1, -0.1, -0.2, 0.1, 0.2, -0.1, 0, 0.1, -0.1, 0.1, -0.2, 0, 0.1, 0, 0, -0.1];

const MENU = [
  ['Oats, banana and whey', 'Chicken rice', 'Salmon, rice and greens'],
  ['Eggs on toast', 'Pad kra pao with egg', 'Pork steak and potatoes'],
  ['Jok with pork', 'Beef noodle soup', 'Pad thai'],
];
const SHARE = [0.25, 0.35]; // breakfast and lunch; dinner is the rest
const TIMES = ['08:10', '12:40', '19:05'];
const round = (x: number, places = 0) => Math.round(x * 10 ** places) / 10 ** places;
/** About a fifth of the energy from protein, half from carbs, the rest from fat. */
const item = (name: string, kcal: number) =>
  ({ name, kcal, protein: round((kcal * 0.2) / 4), carbs: round((kcal * 0.5) / 4), fat: round((kcal * 0.3) / 9), source: 'db' as const });

/** Every record of the seeded account, for a check-in on `today`. */
export function seedRecords(outcome: Outcome, today: string): Rec[] {
  const { intake, kgPerDay } = SCENARIO[outcome];
  const start = addDays(today, 1 - DAYS);
  const numbers = plan(A);
  const at = `${start}T03:00:00.000Z`;
  const recs: Rec[] = [];
  const add = (collection: Rec['collection'], id: string, data: object) => recs.push({ collection, id, updatedAt: 1, data });

  add('profile', ids.profile(), {
    sex: 'male', birthYear: yearOf(today) - AGE, heightCm: 175, neat: 'seated', experience: 'beginner', units: 'metric', calorieMode: 'matched',
    checkinWeekday: weekdayOf(today), screening: { pregnant: false, medical: false, eatingDisorder: false, at }, onboardedAt: at,
  });
  add('program', ids.program(), { name: '', sessions: SESSIONS });
  add('plan', 'seed-plan', { ...numbers, effectiveFrom: start, tdeeSource: 'formula', source: 'onboarding', sessions: SESSIONS });

  let noise = 0;
  for (let ago = DAYS - 1; ago >= 0; ago--) {
    const date = addDays(today, -ago);
    const weekday = weekdayOf(date);
    const menu = MENU[ago % MENU.length];
    if (!INCOMPLETE.includes(ago)) {
      const kcal = intake + INTAKE_NOISE[noise++ % INTAKE_NOISE.length];
      const parts = [round(kcal * SHARE[0]), round(kcal * SHARE[1])];
      parts.push(kcal - parts[0] - parts[1]);
      parts.forEach((k, n) => add('meal', `seed-meal-${date}-${n}`, { date, at: atTime(date, TIMES[n]), title: menu[n], method: 'search', items: [item(menu[n], k)] }));
    } else if (ago === 0) {
      // the check-in is read in the morning: breakfast so far
      add('meal', `seed-meal-${date}-0`, { date, at: atTime(date, TIMES[0]), title: menu[0], method: 'search', items: [item(menu[0], round(intake * SHARE[0]))] });
    } else if (ago % 2) {
      add('meal', `seed-meal-${date}-0`, { date, at: atTime(date, '15:30'), title: 'Iced latte', method: 'quick', items: [{ ...item('Iced latte', 180), source: 'manual' }] });
    }
    if (ago > 0 && SESSIONS.some((s) => s.weekday === weekday)) {
      for (const s of SESSIONS.filter((x) => x.weekday === weekday)) add('slog', ids.slog(date, s.key), { date, sessionKey: s.key, status: 'done' });
    }
    if ((outcome === 'need_data' ? WEIGHED_FEW : WEIGHED).includes(ago)) {
      add('weight', ids.weight(date), { date, kg: round(A.weightKg + kgPerDay * (10 - ago) + KG_NOISE[Math.abs(ago - 10)], 2) });
    }
  }
  return recs;
}
