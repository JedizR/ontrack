// R2: what the coach is told, as facts. Each is a slot id with its label and its value already formatted for the screen
// ("2,310 kcal", "+0.3 kg"); the model reads them and writes `{{id}}` where a number goes, and the app fills it from the
// same value (src/lib/coach.ts). Pure: the callers pass in what Progress, the check-in and the finished session already
// compute. A number that is not known is left out, so the coach never talks about it.
import { t } from '$lib/i18n';
import { proteinOnTrack, roundTarget, type Goal } from '$lib/model/engine';
import { LIBRARY } from '$lib/data/exercises';
import type { Food } from '$lib/data/foods';
import { num } from './format';
import { weightText, type Units } from './units';
import { lastSets, newBests, totals } from './workout';
import type { WeekStats } from './progress';
import { MAX_CANDIDATES, type CoachCandidate, type CoachFacts } from '../../../shared/coach';
import type { Checkin, SessionLog, Workout } from '../../../shared/records';

type Id = keyof typeof t.coach.facts;
/** The facts with a value: each gets its label from the catalog, the others are left out. */
const facts = (rows: [Id, string | null | undefined | false][]): CoachFacts =>
  Object.fromEntries(rows.flatMap(([id, value]) => (value ? [[id, { label: t.coach.facts[id], value }]] : [])));
const kcal = (n: number) => t.after.kcalN(num(Math.round(n)));
const grams = (n: number) => `${num(n)} ${t.after.g}`;
/** "+0.3 kg" or "-0.2 kg", or "0 kg" when it rounds to nothing, in the user's units. `kg` is the change in kg. */
const change = (kg: number, units: Units, decimals = 1) => {
  const text = weightText(Math.abs(kg), units, decimals);
  return Number.parseFloat(text) === 0 ? text : `${kg > 0 ? '+' : '-'}${text}`;
};
const signed = (n: number) => `${n > 0 ? '+' : ''}${num(n, 1)}`;

export type WeekInput = {
  /** the week as Progress computes it: `account.weeks(today, 1)[0]` */
  week: WeekStats;
  /** the plan's daily protein target, g */
  proteinG: number;
  units: Units;
  /** the trend weight now and seven days ago, kg, when both are known */
  trend?: { now: number; was: number };
  /** every logged session, to find the week's new best lifts */
  logs: SessionLog[];
};
/** The week recap's facts (and what Ask Ontrack is told): intake against target, days logged, protein days, sessions, trend, new bests. */
export function weekFacts({ week, proteinG, units, trend, logs }: WeekInput): CoachFacts {
  const { days, training } = week;
  const complete = days.filter((d) => d.complete);
  const proteinDays = complete.filter((d) => proteinOnTrack(d.protein, proteinG)).length;
  const [from, to] = [days[0]?.date, days.at(-1)?.date];
  const bests = logs
    .filter((l) => l.workout && from && to && l.date >= from && l.date <= to)
    .reduce((n, l) => n + newBests(logs.filter((o) => o.date < l.date), l.workout!).length, 0);
  return facts([
    ['avg_kcal', week.meanIntake != null && kcal(week.meanIntake)],
    ['target_kcal', week.meanTarget > 0 && kcal(week.meanTarget)],
    ['days_logged', days.length > 0 && t.checkin.of(num(complete.length), num(days.length))],
    ['protein_days', complete.length > 0 && t.checkin.of(num(proteinDays), num(complete.length))],
    ['sessions', training.planned > 0 && t.checkin.of(num(training.done), num(training.planned))],
    ['weight_change', trend && change(trend.now - trend.was, units)],
    ['new_bests', bests > 0 && t.coach.values.lifts(num(bests))],
  ]);
}

export type CheckinFactsInput = Pick<Checkin, 'stats' | 'proposal'> & {
  goal: Goal;
  /** the pace the plan aims for, percent of body weight a week, negative to lose */
  targetRate: number;
};
/** The check-in's facts, from its stats and proposal: a stored check-in works as well as a fresh one. */
export function checkinFacts({ stats: s, proposal: p, goal, targetRate }: CheckinFactsInput): CoachFacts {
  const o = t.coach.values.outcome;
  const moves = p.reason === 'raise' || p.reason === 'lower';
  const outcome = moves ? (p.kcalChange > 0 ? o.up : o.down) : p.reason === 'on_track' ? o.stays : p.reason === 'need_data' ? o.data : o.adherence;
  return facts([
    ['goal', t.coach.values.goal[goal]],
    ['outcome', outcome],
    ['rate', s.ratePctPerWeek != null && t.progress.rate(signed(s.ratePctPerWeek))],
    ['pace', s.ratePctPerWeek != null && t.progress.rate(signed(targetRate))],
    ['avg_kcal', s.meanIntake != null && kcal(s.meanIntake)],
    ['target_kcal', kcal(s.meanTarget)],
    ['days_logged', t.checkin.of(num(s.completeDays), num(s.days))],
    ['weigh_ins', num(s.weighIns)],
    ['maintenance', s.tdeeObserved != null && kcal(roundTarget(s.tdeeObserved))],
    ['change', moves && t.coach.values.perDay(num(Math.abs(p.kcalChange)))],
  ]);
}

export type SessionInput = {
  workout: Workout;
  /** the logs before this session, with their workouts */
  before: SessionLog[];
  units: Units;
};
/** A finished strength session: its totals, its new bests, and its volume against last time on the lifts done before. */
export function sessionFacts({ workout, before, units }: SessionInput): CoachFacts {
  const sum = totals(workout);
  const bests = newBests(before, workout);
  const best = bests[0] && LIBRARY[bests[0].exerciseId];
  // like for like: only the lifts that were done before, this time against last time
  const volume = (lifts: Workout['lifts']) => totals({ ...workout, lifts }).volumeKg;
  let [now, was] = [0, 0];
  for (const lift of workout.lifts) {
    const sets = lastSets(before, lift.exerciseId);
    if (!sets) continue;
    now += volume([lift]);
    was += volume([{ exerciseId: lift.exerciseId, sets }]);
  }
  return facts([
    ['sets', sum.sets > 0 && num(sum.sets)],
    ['volume', sum.volumeKg > 0 && weightText(sum.volumeKg, units, 0)],
    ['volume_change', now > 0 && was > 0 && change(now - was, units, 0)],
    ['new_bests', bests.length > 0 && t.coach.values.lifts(num(bests.length))],
    ['best_lift', best && `${best.name} ${weightText(bests[0].kg, units, 1)}`.slice(0, 40)],
    ['time', workout.seconds >= 60 && t.after.minN(num(Math.round(workout.seconds / 60)))],
    ['effort', workout.effort != null && t.coach.values.effort(num(workout.effort))],
  ]);
}

/** What is left of today, for the gap request's facts. */
export const gapFacts = ({ kcalLeft, proteinLeft }: { kcalLeft: number; proteinLeft: number }): CoachFacts =>
  facts([['kcal_left', kcal(kcalLeft)], ['protein_left', grams(Math.round(proteinLeft))]]);

/**
 * Foods that fit the calories left and give the most protein: what was logged before (at the grams it was logged at)
 * and the table's protein foods (at 100 g), the most protein first, as many as the coach may be asked about.
 */
export function gapCandidates({ foods, recent, kcalLeft }: { foods: Food[]; recent: { foodId: string; grams?: number }[]; kcalLeft: number }): CoachCandidate[] {
  const usual = new Map(recent.map((r) => [r.foodId, r.grams]));
  return foods
    .filter((f) => usual.has(f.id) || f.tags.includes('protein'))
    .map((f) => {
      // how this person logs it, else the food's own first portion (a scoop, a fillet), never a bare 100 g of whey
      const g = usual.get(f.id) || f.portions.find((p) => p.label !== '100 g')?.grams || 100;
      return { id: f.id, name: f.name, grams: g, kcal: Math.round((f.per100.kcal * g) / 100), protein: Math.round((f.per100.protein * g) / 10) / 10 };
    })
    .filter((c) => c.protein > 0 && c.kcal <= kcalLeft)
    .sort((a, b) => b.protein - a.protein || a.kcal - b.kcal)
    .slice(0, MAX_CANDIDATES);
}
