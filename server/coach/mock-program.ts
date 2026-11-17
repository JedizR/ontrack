// The mock program coach for dev and tests: it reads a split, the days, the session length and "cardio after" out of the
// request with patterns, and builds the week from the bundled templates (src/lib/data/templates.ts). It is not a model:
// a request it does not recognise changes nothing, and says so. The reply goes through the same validator as Gemini's.
import { suggestTemplate, TEMPLATES } from '../../src/lib/data/templates.js';
import type { Session } from '../../shared/records.js';
import type { ProgramOutput } from './program.js';
import type { ProgramInput } from './provider.js';

type Machine = NonNullable<Session['setup']>['machine'];
const SPLITS: [RegExp, string][] = [
  [/upper[\s/,-]*(?:and\s+)?lower/, 'upper-lower-4'],
  [/push[\s/,-]*(?:and\s+)?pull[\s/,-]*(?:and\s+)?legs?|\bppl\b/, 'push-pull-legs-6'],
  [/full[\s-]*body/, 'full-body-3'],
];
const MACHINES: [RegExp, Machine][] = [
  [/treadmill/, 'treadmill'], [/\bbike|cycl|\bspin/, 'bike'], [/elliptical|cross[\s-]?trainer/, 'elliptical'],
  [/rower|rowing/, 'rower'], [/stair/, 'stairs'], [/outdoor|outside|\brun|\bjog|\bwalk/, 'outdoor'],
];
const WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, six: 6 };
/** The weekdays a week of n lifting days is spread over, Monday first. */
const SPREAD: Record<number, number[]> = { 1: [0], 2: [0, 3], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5] };
const CARDIO_MINUTES = 20; // when cardio is asked for with no length
const MIN = String.raw`(\d{1,3})\s*min\w*`;
const CARDIO = String.raw`(?:cardio|treadmill|bike|cycling|elliptical|rower|rowing|stairs?|stair\s?climber|jog\w*|run\w*|walk\w*)`;
/** The first group that matched, as a number */
const num = (m: RegExpMatchArray | null) => { const v = m?.[1] ?? m?.[2]; return v ? Number(v) : undefined; };

export function mockProgram({ question, program, profile }: ProgramInput): ProgramOutput {
  const q = question.toLowerCase();
  // the minutes next to a cardio word are the cardio's; the first other minutes are each lifting session's
  const cardioMatch = q.match(new RegExp(`${MIN}\\s*(?:of\\s+)?(?:\\w+\\s+)?${CARDIO}`)) ?? q.match(new RegExp(`${CARDIO}\\W+(?:\\w+\\W+){0,2}?${MIN}`));
  const minutes = num((cardioMatch ? q.replace(cardioMatch[0], ' ') : q).match(new RegExp(MIN)));
  const machine = MACHINES.find(([re]) => re.test(q))?.[1];
  const cardio = !!cardioMatch || machine !== undefined || /cardio/.test(q);
  const days = WORDS[q.match(/\b(two|three|four|five|six)\s+days?\b/)?.[1] ?? ''] ?? num(q.match(/\b([2-6])\s*(?:days?|x\b|times)/));
  const speedKmh = num(q.match(/(\d+(?:\.\d+)?)\s*(?:km\/?h|kph)/));
  const inclinePct = num(q.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)?\s*incline|incline\s*(?:of\s*|at\s*)?(\d+(?:\.\d+)?)/));

  const id = SPLITS.find(([re]) => re.test(q))?.[1] ?? (days ? suggestTemplate('lifting', days, profile.experience, profile.goal) : null);
  const template = TEMPLATES.find((t) => t.id === id);
  const base: Session[] = template
    ? template.sessions.slice(0, days ?? undefined).map((s, i, all) => ({ ...s, weekday: SPREAD[all.length][i] }))
    : program.sessions;
  const lifts = (s: Session) => s.type === 'strength' || s.type === 'circuit';
  const timed = base.map((s) => (minutes && lifts(s) ? { ...s, minutes } : s));
  const added: Session[] = cardio
    ? timed.filter(lifts).map((s) => ({
        key: `${s.key}-c`, weekday: s.weekday, name: 'Cardio', type: 'cardio', minutes: num(cardioMatch) ?? CARDIO_MINUTES, intensity: 'moderate',
        ...(machine ? { setup: { machine, ...(speedKmh ? { speedKmh } : {}), ...(inclinePct ? { inclinePct } : {}) } } : {}),
      }))
    : [];
  // each cardio session follows its lifting session; one the program already has is replaced
  const sessions = timed.filter((s) => !added.some((a) => a.key === s.key)).flatMap((s) => [s, ...added.filter((a) => a.key === `${s.key}-c`)]);

  const label = template?.name.replace(/\s\d.*/, '').toLowerCase();
  const said = [
    template && `Your week is now ${label}.`,
    !template && minutes && 'Your lifting sessions now run the length you asked for.',
    cardio && 'Cardio follows each lifting day.',
  ].filter(Boolean);
  const summary = said.length ? said.join(' ') : 'I did not find a change to make, so your program stays as it is. Try naming a split, the days or the session length.';
  return { summary, program: { name: template ? template.name.replace(/\s\d.*/, '') : program.name, sessions: said.length ? sessions : program.sessions } };
}
