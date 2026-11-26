// R2, the AI coach: the slot rule that keeps the model from writing a number, the handler, the app's side (fill, the
// template, the kept answers) and the facts builders.
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { coach, type Deps } from '../../server/handlers/coach';
import { mockCoach } from '../../server/coach/mock';
import { sanitise, validate } from '../../server/coach/validate';
import { validateProgram, PROGRAM_JSON_SCHEMA } from '../../server/coach/program';
import type { CoachInput, CoachProvider } from '../../server/coach/provider';
import { coachRequest, MAX_BODY_BYTES, type CoachFacts, type CoachRequest, type ProgramRequest } from '../../shared/coach';
import { en } from '../../src/lib/i18n/en';
import { askFacts, checkinFacts, gapCandidates, gapFacts, sessionFacts, weekFacts } from '../../src/lib/model/coach';
import type { DayStats, WeekStats } from '../../src/lib/model/progress';
import type { Food } from '../../src/lib/data/foods';
import { TEMPLATES } from '../../src/lib/data/templates';
import { programSchema, type Checkin, type Program, type SessionLog, type Workout } from '../../shared/records';

vi.mock('../../src/lib/session.svelte', () => ({ session: { backend: { accessToken: async () => 'good' } } }));
const { askCoach, askProgram, fill, template } = await import('../../src/lib/coach');

const DATE = '2026-11-16';
const fact = (value: string, label = 'Label') => ({ label, value });
const FACTS: CoachFacts = {
  avg_kcal: fact('2,310 kcal'), target_kcal: fact('2,400 kcal'), days_logged: fact('6 of 7'), protein_days: fact('5 of 6'),
  sessions: fact('3 of 4'), weight_change: fact('+0.3 kg'), new_bests: fact('2 lifts'),
};
const CANDIDATES = [
  { id: 'chicken', name: 'Grilled chicken breast', grams: 100, kcal: 151, protein: 30.5 },
  { id: 'yogurt', name: 'Greek yogurt', grams: 150, kcal: 100, protein: 15 },
  { id: 'rice', name: 'Rice', grams: 200, kcal: 260, protein: 5 },
  { id: 'tuna', name: 'Tuna', grams: 100, kcal: 116, protein: 25.5 },
];
const req = (o: Partial<CoachRequest> & Pick<CoachRequest, 'kind'>): CoachRequest => ({ facts: FACTS, localDate: DATE, ...o });
const ASK = req({ kind: 'ask', question: 'How is my protein?' });
const GAP = req({ kind: 'gap', candidates: CANDIDATES, facts: { kcal_left: fact('640 kcal'), protein_left: fact('42 g') } });
const KINDS = [req({ kind: 'week' }), req({ kind: 'checkin' }), req({ kind: 'session' }), GAP, ASK];
const PROFILE = { goal: 'lose', experience: 'intermediate' } as const;
const PROGRAM: Program = { name: 'My week', sessions: TEMPLATES.find((t) => t.id === 'full-body-3')!.sessions };
/** The owner's example, with the treadmill said */
const OWNER = 'I train 4 days upper/lower split, 60 mins each, with 30 mins cardio after on the treadmill.';
const PROG = (question = OWNER): ProgramRequest => ({ kind: 'program', question, program: PROGRAM, profile: PROFILE, localDate: DATE });

describe('the slot rule', () => {
  const week = (o: { headline?: string; lines?: string[] }) => validate({ kind: 'week', facts: FACTS }, { headline: 'A steady week', lines: ['One.', 'Two.'], picks: [], ...o });
  const ok = (c: ReturnType<typeof validate>) => (c.ok ? c.text : c.why);

  test('slots are accepted, anywhere in a line', () => {
    expect(ok(week({ lines: ['You averaged {{avg_kcal}} against {{target_kcal}}.', 'Protein: {{protein_days}}.'] }))).toEqual({ headline: 'A steady week', lines: ['You averaged {{avg_kcal}} against {{target_kcal}}.', 'Protein: {{protein_days}}.'] });
  });
  test('a digit outside a slot is refused, in a headline or a line', () => {
    expect(ok(week({ lines: ['You ate 2310 kcal.', 'Fine.'] }))).toBe('digit');
    expect(ok(week({ lines: ['Fine.', 'Day 3 of {{days_logged}}.'] }))).toBe('digit');
    expect(ok(week({ headline: '7 good days' }))).toBe('digit');
    expect(ok(week({ lines: ['Fine.', 'Two ٣ days.'] }))).toBe('digit'); // an Arabic-Indic digit is a digit
  });
  test('a slot that was not given is refused, and so is a broken one', () => {
    expect(ok(week({ lines: ['You averaged {{secret}}.', 'Fine.'] }))).toBe('unknown slot');
    expect(ok(week({ lines: ['You averaged {{ avg_kcal }}.', 'Fine.'] }))).toBe('unknown slot');
    expect(ok(week({ lines: ['You averaged {{avg_kcal.', 'Fine.'] }))).toBe('stray brace');
  });
  test('dashes, emoji and exclamation marks are sanitised, spaces collapse', () => {
    expect(sanitise('Steady — and strong – well done!')).toBe('Steady, and strong, well done.');
    expect(sanitise('Nice  week \u{1F4AA}!!  Keep   going')).toBe('Nice week. Keep going');
    expect(ok(week({ headline: 'Strong — steady', lines: ['Good!', 'Better–still.'] }))).toEqual({ headline: 'Strong, steady', lines: ['Good.', 'Better, still.'] });
  });
  test('over-length is refused: a long headline, too many or too few lines, too many words, a long line', () => {
    expect(ok(week({ headline: 'One two three four five six seven' }))).toBe('headline');
    expect(ok(week({ headline: '' }))).toBe('headline');
    expect(ok(week({ lines: ['Only one.'] }))).toBe('lines');
    expect(ok(week({ lines: ['A.', 'B.', 'C.', 'D.'] }))).toBe('lines');
    expect(ok(week({ lines: ['x'.repeat(221), 'B.'] }))).toBe('lines');
    expect(ok(week({ lines: [Array(30).fill('word').join(' ') + '.', Array(30).fill('more').join(' ') + '.'] }))).toBe('too long');
  });
  test('a reply that is not the schema is refused', () => {
    for (const bad of [null, 'text', {}, { headline: 'x', lines: 'x', picks: [] }]) expect(validate({ kind: 'week', facts: FACTS }, bad)).toMatchObject({ ok: false, why: 'schema' });
  });
  test('each kind has its own shape; fields it does not use are dropped', () => {
    const r = (kind: CoachRequest['kind'], o: object) => validate({ kind, facts: FACTS, candidates: CANDIDATES }, { headline: '', lines: [], picks: [], ...o });
    // checkin: two sentences in all, no headline
    expect(r('checkin', { headline: 'Dropped', lines: ['One {{avg_kcal}}.', 'Two.'] })).toEqual({ ok: true, text: { lines: ['One {{avg_kcal}}.', 'Two.'] } });
    expect(r('checkin', { lines: ['One.', 'Two.', 'Three.'] })).toMatchObject({ ok: false });
    expect(r('checkin', { lines: ['One. Two.'] })).toMatchObject({ ok: true });
    expect(r('checkin', { lines: ['One. Two. Three.'] })).toMatchObject({ ok: false, why: 'sentences' });
    // session: a headline, and none or one line
    expect(r('session', { headline: 'Stronger than last time' })).toEqual({ ok: true, text: { headline: 'Stronger than last time', lines: [] } });
    expect(r('session', { headline: 'Done', lines: ['A.', 'B.'] })).toMatchObject({ ok: false });
    expect(r('session', { lines: [] })).toMatchObject({ ok: false, why: 'headline' });
    // ask (27 Nov): one or two lines, 45 words, plain numbers allowed for a general fact
    expect(r('ask', { lines: [] })).toMatchObject({ ok: false });
    expect(r('ask', { lines: ['A.', 'B.', 'C.'] })).toMatchObject({ ok: false, why: 'lines' });
    expect(r('ask', { lines: [Array(46).fill('w').join(' ')] })).toMatchObject({ ok: false, why: 'too long' });
    expect(r('ask', { lines: [Array(45).fill('w').join(' ')] })).toMatchObject({ ok: true });
    expect(r('ask', { lines: ['Two eggs add about 12 g of protein to your {{avg_kcal}}.'] })).toMatchObject({ ok: true });
    expect(r('ask', { lines: ['{{nope}} left.'] })).toMatchObject({ ok: false, why: 'unknown slot' });
    // but never a calorie amount to aim for, nor the user's own number copied out of its slot
    expect(r('ask', { lines: ['Aim for 1,800 kcal today.'] })).toMatchObject({ ok: false, why: 'a target' });
    expect(r('ask', { lines: ['You averaged 2,310 kcal.'] })).toMatchObject({ ok: false, why: 'a fact as digits' });
    expect(r('ask', { lines: ['A banana has about 105 kcal.'] })).toMatchObject({ ok: true });
  });
  test('gap: three distinct candidates, each with a short reason and no digits or slots', () => {
    const pick = (id: string, reason = 'Lots of protein') => ({ id, reason });
    const r = (picks: { id: string; reason: string }[]) => validate(GAP, { headline: '', lines: [], picks });
    expect(r([pick('chicken'), pick('tuna'), pick('yogurt')])).toMatchObject({ ok: true, picks: [{ id: 'chicken' }, { id: 'tuna' }, { id: 'yogurt' }] });
    expect(r([pick('chicken'), pick('tuna')])).toMatchObject({ ok: false, why: 'picks' });
    expect(r([pick('chicken'), pick('chicken'), pick('tuna')])).toMatchObject({ ok: false, why: 'picks' });
    expect(r([pick('chicken'), pick('tuna'), pick('pizza')])).toMatchObject({ ok: false, why: 'unknown id' });
    expect(r([pick('chicken'), pick('tuna'), pick('yogurt', '30 g of protein')])).toMatchObject({ ok: false, why: 'reason' });
    expect(r([pick('chicken'), pick('tuna'), pick('yogurt', '{{kcal_left}} left')])).toMatchObject({ ok: false, why: 'reason' });
    expect(r([pick('chicken'), pick('tuna'), pick('yogurt', 'one two three four five six seven eight nine')])).toMatchObject({ ok: false, why: 'reason' });
    // two candidates can only be asked for two picks
    expect(validate({ ...GAP, candidates: CANDIDATES.slice(0, 2) }, { headline: '', lines: [], picks: [pick('chicken'), pick('yogurt')] })).toMatchObject({ ok: true });
  });
});

describe('the mock coach passes the same validator', () => {
  const subsets = (f: CoachFacts) => [f, {}, ...Object.keys(f).map((k) => Object.fromEntries(Object.entries(f).filter(([id]) => id === k)))];
  test.each(KINDS.map((r) => [r.kind, r] as const))('%s, with every subset of its facts', async (_, r) => {
    for (const facts of subsets(r.facts)) {
      for (const question of r.kind === 'ask' ? ['How is my protein?', 'What about my weight and training?', 'Hello', 'Why is my target so low?', 'Is this pain a worry? My doctor says'] : [undefined]) {
        const input: CoachInput = { kind: r.kind, facts, question, candidates: r.candidates };
        const checked = validate(input, await mockCoach.write(input));
        expect(checked, JSON.stringify({ kind: r.kind, facts: Object.keys(facts), question })).toMatchObject({ ok: true });
      }
    }
  });
  test('it answers an ask from the matching facts, and refuses a target and a medical question', async () => {
    const lines = async (question: string) => (validate(ASK, await mockCoach.write({ kind: 'ask', facts: FACTS, question })) as { text: { lines: string[] } }).text.lines;
    expect(await lines('How is my protein?')).toEqual(['Protein was on track on {{protein_days}} days.']);
    expect(await lines('And my weight?')).toEqual(['Your weight trend moved {{weight_change}} this week.']);
    expect(await lines('What should my calorie target be?')).toEqual(['Your weekly check-in sets that.']);
    expect((await lines('I have a pain in my knee'))[0]).toBe('That is a question for your doctor.');
    expect((await lines('Hello'))[0]).toMatch(/protein, weight, calories and training/);
  });
});

describe('the program rules', () => {
  const session = (o: object = {}) => ({ key: 'a', weekday: 0, name: 'Upper', type: 'strength', minutes: 60, intensity: 'moderate', exercises: [{ exerciseId: 'bench-press', sets: 4, repsMin: 5, repsMax: 8 }], ...o });
  const lift = (exerciseId: string, sets: number, repsMin: number, repsMax: number) => ({ exerciseId, sets, repsMin, repsMax });
  const check = (sessions: object[], summary = 'Your week is now upper lower.') => validateProgram({ summary, program: { name: 'Mine', sessions } });
  const first = (c: ReturnType<typeof validateProgram>) => (c.ok ? c.program.sessions[0] : c.why);

  test('a good reply passes as it is, and what the app does not know, such as calories, is dropped', () => {
    expect(check([{ ...session(), calories: 400 }])).toEqual({ ok: true, summary: 'Your week is now upper lower.', program: { name: 'Mine', sessions: [session()] } });
  });
  test('sets, reps and minutes are clamped to their ranges, and reps stay in order', () => {
    const c = first(check([session({ minutes: 5, exercises: [lift('bench-press', 9, 1, 40), lift('barbell-row', 0, 12, 8), lift('deadlift', 3.4, 4.6, 9)] })]));
    expect(c).toMatchObject({ minutes: 10, exercises: [{ sets: 6, repsMin: 3, repsMax: 20 }, { sets: 1, repsMin: 8, repsMax: 12 }, { sets: 3, repsMin: 5, repsMax: 9 }] });
    expect(first(check([session({ minutes: 400 })]))).toMatchObject({ minutes: 180 });
  });
  test('a plank counts seconds, so its reps are not cut to 20', () => {
    expect(first(check([session({ exercises: [lift('plank', 2, 30, 60), lift('side-plank', 2, 5, 500)] })]))).toMatchObject({ exercises: [{ repsMin: 30, repsMax: 60 }, { repsMin: 10, repsMax: 90 }] });
  });
  test('an id that is not in the library is dropped, and a session left with none stays without exercises', () => {
    const c = check([session({ exercises: [lift('bench-press', 3, 8, 12), lift('moon-press', 3, 8, 12), lift('constructor', 3, 8, 12)] }), session({ key: 'b', exercises: [lift('moon-press', 3, 8, 12)] }), session({ key: 'c', exercises: [] })]);
    expect(c).toMatchObject({ ok: true, program: { sessions: [{ key: 'a', exercises: [{ exerciseId: 'bench-press' }] }, { key: 'b' }, { key: 'c' }] } });
    if (c.ok) for (const s of c.program.sessions.slice(1)) expect(s).not.toHaveProperty('exercises');
  });
  test('at most 28 sessions and 20 exercises each; a key used twice, or no session, is refused', () => {
    const many = Array.from({ length: 30 }, (_, i) => session({ key: `s${i}`, exercises: Array(25).fill(lift('plank', 2, 30, 60)) }));
    const c = check(many);
    expect(c.ok && c.program.sessions.length).toBe(28);
    expect(c.ok && c.program.sessions[0].exercises?.length).toBe(20);
    expect(check([session(), session({ weekday: 2 })])).toMatchObject({ ok: false, why: 'sessions' });
    expect(check([])).toMatchObject({ ok: false, why: 'sessions' });
  });
  test('the summary has no digit, no slot and no brace; dashes, emoji and exclamation marks are tidied', () => {
    for (const summary of ['You train 4 days.', 'Your week is {{days}}.', 'Your week {is now.', '', 'x'.repeat(301)]) expect(check([session()], summary), summary).toMatchObject({ ok: false, why: 'summary' });
    expect(check([session()], 'Your week is now upper lower — nice!')).toMatchObject({ ok: true, summary: 'Your week is now upper lower, nice.' });
  });
  test('a reply that is not the schema is refused: a weekday off the week, an unknown type, no summary, text', () => {
    for (const bad of [null, 'text', {}, { summary: 'x' }, { summary: 'x', program: { name: '', sessions: [session({ weekday: 7 })] } }, { summary: 'x', program: { name: '', sessions: [session({ type: 'yoga' })] } }]) expect(validateProgram(bad)).toMatchObject({ ok: false, why: 'schema' });
  });
  test('a cardio session carries its machine and settings', () => {
    const c = first(check([{ key: 'a-c', weekday: 0, name: 'Cardio', type: 'cardio', minutes: 30, intensity: 'moderate', setup: { machine: 'treadmill', speedKmh: 6, inclinePct: 5 } }]));
    expect(c).toMatchObject({ setup: { machine: 'treadmill', speedKmh: 6, inclinePct: 5 } });
    expect(check([{ key: 'a-c', weekday: 0, name: 'Cardio', type: 'cardio', minutes: 30, intensity: 'moderate', setup: { machine: 'jetpack' } }])).toMatchObject({ ok: false });
  });
  test('the schema sent to the model names the machines and asks for the whole program', () => {
    const json = JSON.stringify(PROGRAM_JSON_SCHEMA);
    expect(json).toContain('treadmill');
    expect(json).toContain('"summary"');
    expect(json).not.toContain('$schema');
  });
});

describe('the mock program coach', () => {
  const ask = async (question: string, program: Program = PROGRAM) => {
    const checked = validateProgram(await mockCoach.write({ kind: 'program', question, program, profile: PROFILE }));
    if (!checked.ok) throw new Error(`${question}: ${checked.why}`);
    return checked;
  };
  const lifts = (p: Program) => p.sessions.filter((s) => s.type === 'strength');
  const cardio = (p: Program) => p.sessions.filter((s) => s.type === 'cardio');

  test("the owner's request: four upper and lower days of an hour, each followed by thirty minutes on the treadmill", async () => {
    const { program, summary } = await ask(OWNER);
    expect(lifts(program).map((s) => [s.name, s.weekday, s.minutes])).toEqual([['Upper A', 0, 60], ['Lower A', 1, 60], ['Upper B', 3, 60], ['Lower B', 4, 60]]);
    expect(lifts(program).every((s) => s.exercises?.length)).toBe(true);
    expect(cardio(program)).toEqual(lifts(program).map((s) => ({ key: `${s.key}-c`, weekday: s.weekday, name: 'Cardio', type: 'cardio', minutes: 30, intensity: 'moderate', setup: { machine: 'treadmill' } })));
    // each cardio session follows its lifting session
    expect(program.sessions.map((s) => s.key)).toEqual(['a', 'a-c', 'b', 'b-c', 'c', 'c-c', 'd', 'd-c']);
    expect(summary).toBe('Your week is now upper lower. Cardio follows each lifting day.');
  });
  test('without a machine the cardio has no setup, and "cardio after 20 min" reads the same as "20 min cardio"', async () => {
    for (const q of ['push pull legs, cardio after 20 min', 'push pull legs with 20 minutes of cardio after']) {
      const { program } = await ask(q);
      expect(lifts(program)).toHaveLength(6);
      expect(cardio(program).map((s) => [s.minutes, s.setup])).toEqual(Array(6).fill([20, undefined]));
    }
  });
  test('the machine words, with a speed and an incline when they are said', async () => {
    const machine = async (q: string) => cardio((await ask(q)).program)[0].setup;
    expect(await machine('upper lower and 30 min treadmill at 6 km/h and 5% incline')).toEqual({ machine: 'treadmill', speedKmh: 6, inclinePct: 5 });
    expect(await machine('upper lower, 25 min on the bike')).toEqual({ machine: 'bike' });
    expect(await machine('upper lower, 25 min elliptical')).toEqual({ machine: 'elliptical' });
    expect(await machine('upper lower, 25 min rowing')).toEqual({ machine: 'rower' });
    expect(await machine('upper lower, 25 min stair climber')).toEqual({ machine: 'stairs' });
    expect(await machine('upper lower, a 25 min run outside')).toEqual({ machine: 'outdoor' });
  });
  test('days, in digits or words, take the first sessions of the split, spread over the week', async () => {
    const days = async (q: string) => lifts((await ask(q)).program).map((s) => [s.name, s.weekday]);
    expect(await days('upper lower three days a week')).toEqual([['Upper A', 0], ['Lower A', 2], ['Upper B', 4]]);
    expect(await days('full body 5x a week')).toEqual([['Full body A', 0], ['Full body B', 2], ['Full body C', 4]]); // the split has three
    expect(await days('push pull legs 4 days')).toHaveLength(4);
  });
  test('days with no split pick a template by the person\'s experience and goal', async () => {
    expect(lifts((await ask('I can only train 2 days')).program).map((s) => s.weekday)).toEqual([0, 3]);
    expect(lifts((await ask('I can train 6 days')).program).map((s) => s.weekday)).toEqual([0, 1, 2, 3, 4, 5]); // an intermediate: push pull legs
  });
  test('a request it cannot place keeps the program as it is, and says so', async () => {
    const { program, summary } = await ask('make me stronger');
    expect(program).toEqual(PROGRAM);
    expect(summary).toMatch(/^I did not find a change to make/);
  });
  test('with no split, only the minutes and the cardio change on the current program', async () => {
    const { program } = await ask('45 mins a session please', { name: 'Mine', sessions: [...PROGRAM.sessions, { key: 'x', weekday: 5, name: 'Long walk', type: 'walk', minutes: 90, intensity: 'light' }] });
    expect(program.name).toBe('Mine');
    expect(program.sessions.map((s) => s.minutes)).toEqual([45, 45, 45, 90]);
    expect(lifts(program).map((s) => s.exercises)).toEqual(lifts(PROGRAM).map((s) => s.exercises));
  });
  test('cardio added to the current program is replaced, not doubled, when it is asked for again', async () => {
    const once = await ask('add 25 min cardio after');
    expect(cardio(once.program).map((s) => [s.key, s.minutes])).toEqual([['a-c', 25], ['b-c', 25], ['c-c', 25]]);
    const twice = await ask('add 35 min cardio after', once.program);
    expect(cardio(twice.program).map((s) => [s.key, s.minutes])).toEqual([['a-c', 35], ['b-c', 35], ['c-c', 35]]);
    expect(twice.program.sessions).toHaveLength(6);
  });
});

describe('POST /api/coach', () => {
  function deps(o: Partial<Deps> = {}): Deps {
    let used = 0;
    return {
      caller: async (r) => (r.headers.get('authorization') === 'Bearer good' ? { id: 'u1', billing: { tier: 'pro' as const } } : null),
      bump: async (_u, _d, limit) => { used++; return { allowed: used <= limit, used, total: used }; },
      adviceUsed: async () => used,
      advice: async () => ++used,
      provider: async () => mockCoach,
      limit: 40,
      freeAdvice: 10,
      cap: 400,
      ...o,
    };
  }
  const post = (body: unknown, d = deps(), auth = 'Bearer good') =>
    coach(new Request('http://x/api/coach', { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }), d);
  const read = async (r: Response) => ({ status: r.status, body: await r.json() });
  const withProvider = (write: CoachProvider['write']) => deps({ provider: async () => ({ model: 'm', write }) });
  const GOOD = { headline: 'A steady week', lines: ['You averaged {{avg_kcal}}.', 'Keep going.'], picks: [] };

  test('refuses a missing or wrong token before counting', async () => {
    const bump = vi.fn();
    expect((await read(await post(KINDS[0], deps({ bump }), ''))).status).toBe(401);
    expect((await read(await post(KINDS[0], deps({ bump }), 'Bearer bad'))).body).toEqual({ ok: false, error: 'unauthorized' });
    expect(bump).not.toHaveBeenCalled();
  });
  test('refuses a body over 16 KB with 413', async () => {
    const big = req({ kind: 'ask', question: 'q', facts: { a: fact('x'.repeat(40), 'y'.repeat(60)) } });
    expect(await read(await post({ ...big, pad: 'x'.repeat(MAX_BODY_BYTES) }))).toEqual({ status: 413, body: { ok: false, error: 'too_large' } });
  });
  test('refuses a body that does not match the contract, without counting it', async () => {
    const bump = vi.fn();
    const many = Object.fromEntries(Array.from({ length: 31 }, (_, i) => [`fact_${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`, fact('x')]));
    for (const bad of [
      'not json', {}, { ...KINDS[0], kind: 'tweet' }, { ...KINDS[0], localDate: '16/11/2026' },
      { ...KINDS[0], facts: { Avg1: fact('x') } }, // a slot id is lower case letters and underscores
      { ...KINDS[0], facts: { avg: { label: 'x'.repeat(61), value: 'y' } } },
      { ...KINDS[0], facts: { avg: { label: 'x', value: 'y'.repeat(41) } } },
      { ...KINDS[0], facts: many },
      { kind: 'ask', facts: FACTS, localDate: DATE }, { ...ASK, question: '' }, { ...ASK, question: 'x'.repeat(201) },
      { ...GAP, candidates: undefined }, { ...GAP, candidates: [] }, { ...GAP, candidates: Array(13).fill(CANDIDATES[0]) },
    ]) expect(await read(await post(bad, deps({ bump })))).toEqual({ status: 400, body: { ok: false, error: 'bad_request' } });
    expect(bump).not.toHaveBeenCalled();
  });
  test('answers every kind, with the slots still in the text', async () => {
    for (const r of KINDS) {
      const out = await read(await post(r));
      expect(out.status, r.kind).toBe(200);
      expect(out.body).toMatchObject({ ok: true, kind: r.kind, model: 'mock', usage: { usedToday: 1, limit: 40 } });
      expect(out.body.text.lines).toBeInstanceOf(Array);
      if (r.kind === 'gap') expect(out.body.picks.map((p: { id: string }) => p.id)).toEqual(['tuna', 'chicken', 'yogurt']); // by protein per kcal
      else expect(out.body.picks).toBeUndefined();
    }
    const week = (await read(await post(KINDS[0]))).body.text;
    expect(week.headline).toBe('A week of new bests');
    expect(week.lines.join(' ')).toContain('{{avg_kcal}}');
    expect(week.lines.join(' ')).not.toMatch(/\d/);
  });
  test('counts each answer, and refuses past the user limit with 429 and past the global cap as busy', async () => {
    const d = deps({ limit: 2 });
    await post(KINDS[0], d);
    await post(KINDS[0], d);
    expect(await read(await post(KINDS[0], d))).toEqual({ status: 429, body: { ok: false, error: 'daily_limit', usage: { usedToday: 2, limit: 2 } } });
    expect((await read(await post(KINDS[0], deps({ cap: 0 })))).body.error).toBe('busy');
  });
  test('a reply that breaks the rule is asked for again once, then it is a provider error', async () => {
    const write = vi.fn().mockResolvedValueOnce({ ...GOOD, lines: ['You ate 2310.', 'Fine.'] }).mockResolvedValueOnce(GOOD);
    const out = await read(await post(KINDS[0], withProvider(write)));
    expect(out.status).toBe(200);
    expect(out.body.text.lines[0]).toBe('You averaged {{avg_kcal}}.');
    expect(write).toHaveBeenCalledTimes(2);
    const never = vi.fn(async () => ({ ...GOOD, lines: ['{{secret}}.', 'Fine.'] }));
    expect(await read(await post(KINDS[0], withProvider(never)))).toEqual({ status: 502, body: { ok: false, error: 'provider_error' } });
    expect(never).toHaveBeenCalledTimes(2);
    const junk = vi.fn(async () => null); // JSON the provider could not parse
    expect((await read(await post(KINDS[0], withProvider(junk)))).body.error).toBe('provider_error');
  });
  test('a 5xx is retried once; a refusal or a rate limit is not', async () => {
    const flaky = vi.fn().mockRejectedValueOnce(Object.assign(new Error('x'), { status: 503 })).mockResolvedValueOnce(GOOD);
    expect((await post(KINDS[0], withProvider(flaky))).status).toBe(200);
    const down = vi.fn(async () => { throw Object.assign(new Error('x'), { status: 500 }); });
    expect((await read(await post(KINDS[0], withProvider(down)))).status).toBe(502);
    expect(down).toHaveBeenCalledTimes(2);
    const refused = vi.fn(async () => { throw Object.assign(new Error('x'), { status: 400 }); });
    expect((await read(await post(KINDS[0], withProvider(refused)))).status).toBe(502);
    expect(refused).toHaveBeenCalledTimes(1);
    const limited = vi.fn(async () => { throw Object.assign(new Error('x'), { status: 429 }); });
    expect((await read(await post(KINDS[0], withProvider(limited)))).body.error).toBe('busy');
    expect(limited).toHaveBeenCalledTimes(1);
  });
  test('a provider that does not answer in time is retried once, then 504', async () => {
    const write = vi.fn((i: CoachInput) => new Promise<never>((_, reject) => i.signal?.addEventListener('abort', () => reject(new Error('aborted')))));
    expect(await read(await post(KINDS[0], { ...withProvider(write), timeoutMs: 20 }))).toEqual({ status: 504, body: { ok: false, error: 'timeout' } });
    expect(write).toHaveBeenCalledTimes(2);
  });
  describe('the program kind', () => {
    const GOOD_PROGRAM = { summary: 'Your week is now upper lower.', program: { name: 'Mine', sessions: [{ key: 'a', weekday: 0, name: 'Upper A', type: 'strength', minutes: 60, intensity: 'moderate', exercises: [{ exerciseId: 'bench-press', sets: 4, repsMin: 5, repsMax: 8 }] }] } };
    test('is answered through the mock: the checked program and a summary, and no text', async () => {
      const out = await read(await post(PROG()));
      expect(out.status).toBe(200);
      expect(out.body).toMatchObject({ ok: true, kind: 'program', model: 'mock', usage: { usedToday: 1, limit: 40 }, summary: 'Your week is now upper lower. Cardio follows each lifting day.' });
      expect(programSchema.safeParse(out.body.program).success).toBe(true);
      expect(out.body.program.sessions).toHaveLength(8);
      expect(out.body.text).toBeUndefined();
    });
    test('is refused without counting when the body does not match the contract', async () => {
      const bump = vi.fn();
      for (const bad of [
        { ...PROG(), question: '' }, { ...PROG(), question: 'x'.repeat(301) }, { ...PROG(), program: undefined }, { ...PROG(), profile: { goal: 'bulk', experience: 'beginner' } },
        { ...PROG(), profile: undefined }, { ...PROG(), localDate: '17/11/2026' },
        { ...PROG(), program: { name: 'x', sessions: Array(29).fill({ key: 'a', weekday: 0, name: 'A', type: 'cardio', minutes: 30, intensity: 'light' }) } },
        { ...PROG(), program: { name: 'x', sessions: [{ ...PROGRAM.sessions[0], minutes: 0 }] } },
      ]) expect(await read(await post(bad, deps({ bump })))).toEqual({ status: 400, body: { ok: false, error: 'bad_request' } });
      expect(bump).not.toHaveBeenCalled();
      expect((await read(await post({ ...PROG(), question: 'x'.repeat(300) }))).status).toBe(200);
    });
    test('gives the provider the program, the profile and the request, and nothing else', async () => {
      const write = vi.fn(async () => GOOD_PROGRAM);
      expect((await post(PROG('Add cardio'), withProvider(write))).status).toBe(200);
      expect(write).toHaveBeenCalledWith({ kind: 'program', question: 'Add cardio', program: PROGRAM, profile: PROFILE, signal: expect.any(AbortSignal) });
    });
    test('a program that breaks a rule is asked for again once, then it is a provider error', async () => {
      const write = vi.fn().mockResolvedValueOnce({ ...GOOD_PROGRAM, summary: 'You train 4 days.' }).mockResolvedValueOnce(GOOD_PROGRAM);
      const out = await read(await post(PROG(), withProvider(write)));
      expect(out.status).toBe(200);
      expect(out.body.summary).toBe('Your week is now upper lower.');
      expect(write).toHaveBeenCalledTimes(2);
      const never = vi.fn(async () => ({ ...GOOD_PROGRAM, program: { name: 'x', sessions: [] } }));
      expect(await read(await post(PROG(), withProvider(never)))).toEqual({ status: 502, body: { ok: false, error: 'provider_error' } });
      expect(never).toHaveBeenCalledTimes(2);
    });
    test('what comes back is clamped, and an id the library does not have is gone', async () => {
      const sessions = [{ ...GOOD_PROGRAM.program.sessions[0], minutes: 500, exercises: [{ exerciseId: 'bench-press', sets: 12, repsMin: 5, repsMax: 8 }, { exerciseId: 'moon-press', sets: 3, repsMin: 5, repsMax: 8 }] }];
      const out = await read(await post(PROG(), withProvider(async () => ({ ...GOOD_PROGRAM, program: { name: 'x', sessions } }))));
      expect(out.body.program.sessions).toEqual([{ ...sessions[0], minutes: 180, exercises: [{ exerciseId: 'bench-press', sets: 6, repsMin: 5, repsMax: 8 }] }]);
    });
  });
  test('only POST is answered', async () => {
    expect((await coach(new Request('http://x/api/coach'), deps())).status).toBe(400);
  });
});

describe('the app side', () => {
  test('fill puts each slot\'s value in, in the headline and the lines', () => {
    expect(fill({ headline: 'Up {{weight_change}}', lines: ['{{avg_kcal}} of {{target_kcal}}, {{avg_kcal}} again.', 'None.'] }, FACTS)).toEqual({ headline: 'Up +0.3 kg', lines: ['2,310 kcal of 2,400 kcal, 2,310 kcal again.', 'None.'] });
    expect(fill({ lines: ['Hello {{nothing}}.'] }, FACTS)).toEqual({ lines: ['Hello .'] });
  });

  describe('the template', () => {
    test('the week reads from its facts, three lines at most', () => {
      const a = template(req({ kind: 'week' }));
      expect(a).toEqual({ source: 'template', text: { headline: en.coach.week.headline, lines: ['You averaged 2,310 kcal against a target of 2,400 kcal.', 'Protein was on track on 5 of 6 days.', 'You finished 3 of 4 sessions.'] } });
      expect(template(req({ kind: 'week', facts: {} })).text.lines).toEqual([en.coach.week.more]);
    });
    test('the check-in is two sentences for each outcome', () => {
      const facts = (outcome: string, more: CoachFacts = {}): CoachFacts => ({ rate: fact('+0.3 percent a week'), pace: fact('+0.5 percent a week'), outcome: fact(outcome), ...more });
      const o = en.coach.values.outcome;
      const lines = (f: CoachFacts) => template(req({ kind: 'checkin', facts: f })).text.lines;
      expect(lines(facts(o.up, { change: fact('150 kcal a day') }))).toEqual(['Your weight trend is +0.3 percent a week against a pace of +0.5 percent a week.', 'That gap is why your target goes up by 150 kcal a day.']);
      expect(lines(facts(o.down, { change: fact('150 kcal a day') }))[1]).toBe('That gap is why your target goes down by 150 kcal a day.');
      expect(lines(facts(o.stays))[1]).toBe(en.coach.checkin.stays);
      expect(lines({ outcome: fact(o.data) })).toEqual([en.coach.checkin.few, en.coach.checkin.more]);
      expect(lines({ ...FACTS, outcome: fact(o.adherence) })).toEqual(['You averaged 2,310 kcal against a target of 2,400 kcal.', en.coach.checkin.first]);
    });
    test('the session leads with a new best, then the change from last time', () => {
      const head = (facts: CoachFacts) => template(req({ kind: 'session', facts })).text.headline;
      expect(head({ new_bests: fact('1 lift') })).toBe(en.coach.session.best);
      expect(head({ volume_change: fact('+450 kg') })).toBe(en.coach.session.stronger);
      expect(head({ volume_change: fact('-450 kg') })).toBe(en.coach.session.lighter);
      expect(head({})).toBe(en.coach.session.logged);
      expect(template(req({ kind: 'session', facts: { volume: fact('4,250 kg'), sets: fact('18') } })).text.lines).toEqual(['You lifted 4,250 kg across 18 sets.']);
    });
    test('the gap picks the three with the most protein per kcal, with their own numbers as the reason', () => {
      expect(template(GAP)).toEqual({
        source: 'template', text: { lines: [] },
        picks: [{ id: 'tuna', reason: '25.5 g protein for 116 kcal' }, { id: 'chicken', reason: '30.5 g protein for 151 kcal' }, { id: 'yogurt', reason: '15 g protein for 100 kcal' }],
      });
    });
    test('the free plan (27 Nov): the automatic words stay Pro, before any count; Ask and Adjust count by the month', async () => {
    let bumped = 0;
    const months: string[] = [];
    const d: Deps = {
      caller: async () => ({ id: 'u1', billing: { tier: 'free' as const } }), bump: async () => { bumped++; return { allowed: true, used: 1, total: 1 }; },
      adviceUsed: async () => months.length, advice: async (_u, month) => { months.push(month); return months.length; }, freeAdvice: 2, provider: async () => mockCoach, limit: 40, cap: 400,
    };
    const send = async (body: unknown) => { const r = await coach(new Request('http://x/api/coach', { method: 'POST', headers: { authorization: 'Bearer good' }, body: JSON.stringify(body) }), d); return [r.status, await r.json()] as const; };
    const week = await send(KINDS[0]);
    expect([week[0], week[1].error, bumped, months.length]).toEqual([402, 'pro_only', 0, 0]);
    const ask = KINDS.find((k) => k.kind === 'ask')!;
    expect(await send(ask)).toMatchObject([200, { ok: true, usage: { usedThisMonth: 1, limit: 2 } }]);
    expect(await send(ask)).toMatchObject([200, { usage: { usedThisMonth: 2, limit: 2 } }]);
    expect(await send(ask)).toEqual([429, { ok: false, error: 'month_limit', usage: { usedThisMonth: 2, limit: 2 } }]);
    expect(months[0]).toMatch(/^\d{4}-\d{2}-01$/);
    expect(bumped).toBe(0);
    // a reply that keeps breaking the rules is not counted
    const counted = months.length;
    const d2: Deps = { ...d, adviceUsed: async () => 0, provider: async () => ({ model: 'm', write: async () => ({ headline: '', lines: [], picks: [] }) }) };
    const r = await coach(new Request('http://x/api/coach', { method: 'POST', headers: { authorization: 'Bearer good' }, body: JSON.stringify(ask) }), d2);
    expect([r.status, months.length]).toEqual([502, counted]);
  });
  test('an ask offers the facts it has', () => {
      expect(template(ASK).text.lines).toEqual([en.coach.ask.offline, 'Label: 2,310 kcal', 'Label: 2,400 kcal', 'Label: 6 of 7']);
      expect(template({ ...ASK, facts: {} }).text.lines).toEqual([en.coach.ask.offline]);
    });
  });

  describe('askCoach', () => {
    const store = new Map<string, string>();
    const calls = vi.fn();
    let fetchWith: (r: Request) => Promise<Response>;
    const d: Deps = { caller: async () => ({ id: 'u1', billing: { tier: 'pro' as const } }), bump: async () => ({ allowed: true, used: 1, total: 1 }), adviceUsed: async () => 0, advice: async () => 1, freeAdvice: 10, provider: async () => mockCoach, limit: 40, cap: 400 };
    beforeEach(() => {
      store.clear();
      calls.mockClear();
      fetchWith = (r) => coach(r, d);
      vi.stubGlobal('navigator', { onLine: true });
      vi.stubGlobal('localStorage', {
        getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k),
        key: (i: number) => [...store.keys()][i] ?? null, get length() { return store.size; },
      });
      vi.stubGlobal('fetch', async (url: string, init: RequestInit) => { calls(url); return fetchWith(new Request(`http://x${url}`, init)); });
    });
    afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

    test('writes with the model, fills the slots, and keeps the answer', async () => {
      const a = await askCoach(req({ kind: 'week' }));
      expect(a.source).toBe('ai');
      expect(a.text.lines[0]).toBe('You averaged 2,310 kcal against a target of 2,400 kcal.');
      expect(a.text.headline).toBe('A week of new bests');
      expect([...store.keys()]).toHaveLength(1);
      expect([...store.keys()][0]).toMatch(/^ot-coach:week:[0-9a-z]+$/);
      // slots are kept unfilled, the values come from the facts each time
      expect(store.values().next().value).toContain('{{avg_kcal}}');
      expect(await askCoach(req({ kind: 'week' }))).toEqual(a);
      expect(calls).toHaveBeenCalledTimes(1);
    });
    test('the same facts in another order are the same request; other facts or another day are not', async () => {
      await askCoach(req({ kind: 'week', facts: { sessions: FACTS.sessions, avg_kcal: FACTS.avg_kcal } }));
      await askCoach(req({ kind: 'week', facts: { avg_kcal: FACTS.avg_kcal, sessions: FACTS.sessions } }));
      expect(calls).toHaveBeenCalledTimes(1);
      await askCoach(req({ kind: 'week', facts: { avg_kcal: fact('2,311 kcal'), sessions: FACTS.sessions } }));
      await askCoach(req({ kind: 'week', localDate: '2026-11-17', facts: { avg_kcal: FACTS.avg_kcal, sessions: FACTS.sessions } }));
      expect(calls).toHaveBeenCalledTimes(3);
    });
    test('gap and ask come back as the model chose', async () => {
      expect((await askCoach(GAP)).picks?.map((p) => p.id)).toEqual(['tuna', 'chicken', 'yogurt']);
      expect((await askCoach(ASK)).text.lines).toEqual(['Protein was on track on 5 of 6 days.']);
    });
    test('keeps at most 40 answers and drops the oldest', async () => {
      for (let i = 0; i < 45; i++) {
        vi.setSystemTime(new Date(2026, 10, 16, 8, 0, i));
        await askCoach(req({ kind: 'ask', question: `Question ${i}?` }));
      }
      expect(store.size).toBe(40);
      const questions = [...store.values()].map((v) => (JSON.parse(v) as { at: number }).at);
      expect(Math.min(...questions)).toBeGreaterThanOrEqual(new Date(2026, 10, 16, 8, 0, 5).getTime());
      store.set('other-key', 'x');
      await askCoach(req({ kind: 'ask', question: 'One more?' }));
      expect(store.has('other-key')).toBe(true);
    });
    test.each([
      ['offline', () => vi.stubGlobal('navigator', { onLine: false })],
      ['signed out', () => { fetchWith = async () => new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 }); }],
      ['over the daily limit', () => { fetchWith = (r) => coach(r, { ...d, bump: async () => ({ allowed: false, used: 41, total: 41 }) }); }],
      ['a server error', () => { fetchWith = async () => new Response('<html>Bad gateway</html>', { status: 502 }); }],
      ['the network failing', () => { fetchWith = async () => { throw new TypeError('Failed to fetch'); }; }],
      ['a reply for another kind', () => { fetchWith = async (r) => new Response(JSON.stringify({ ok: true, kind: (await r.json()).kind === 'ask' ? 'week' : 'ask', text: { lines: ['x'] }, model: 'm', usage: {} })); }],
    ])('%s: the template, marked as such, and nothing kept', async (_, fail) => {
      fail();
      for (const r of KINDS) expect(await askCoach(r), r.kind).toEqual(template(r));
      expect((await askCoach(KINDS[0])).source).toBe('template');
      expect(store.size).toBe(0);
    });
    describe('askProgram', () => {
      const ask = () => askProgram(OWNER, PROGRAM, PROFILE, DATE);
      test('answers with the checked program and its summary, and keeps nothing', async () => {
        const a = await ask();
        expect(a).toMatchObject({ ok: true, source: 'ai', summary: 'Your week is now upper lower. Cardio follows each lifting day.' });
        expect(a.ok && a.program.sessions).toHaveLength(8);
        await ask();
        expect(calls).toHaveBeenCalledTimes(2);
        expect(store.size).toBe(0);
      });
      test('sends the program, the profile and the request, not facts', async () => {
        const seen = vi.fn();
        fetchWith = async (r) => { seen(await r.clone().json()); return coach(r, d); };
        await ask();
        expect(seen).toHaveBeenCalledWith({ kind: 'program', question: OWNER, program: PROGRAM, profile: PROFILE, localDate: DATE });
      });
      test.each([
        ['offline', en.programAi.offline, () => vi.stubGlobal('navigator', { onLine: false })],
        ['signed out', en.programAi.signedOut, () => { fetchWith = async () => new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401 }); }],
        ['over the daily limit', en.programAi.limit, () => { fetchWith = (r) => coach(r, { ...d, bump: async () => ({ allowed: false, used: 41, total: 41 }) }); }],
        ['busy', en.programAi.busy, () => { fetchWith = (r) => coach(r, { ...d, cap: 0 }); }],
        ['a slow answer', en.programAi.busy, () => { fetchWith = async () => new Response(JSON.stringify({ ok: false, error: 'timeout' }), { status: 504 }); }],
        ['a server error', en.programAi.failed, () => { fetchWith = async () => new Response('<html>Bad gateway</html>', { status: 502 }); }],
        ['the network failing', en.programAi.failed, () => { fetchWith = async () => { throw new TypeError('Failed to fetch'); }; }],
        ['a reply for another kind', en.programAi.failed, () => { fetchWith = async () => new Response(JSON.stringify({ ok: true, kind: 'week', text: { lines: ['x'] }, model: 'm', usage: {} })); }],
        ['a program the app would refuse', en.programAi.failed, () => { fetchWith = async () => new Response(JSON.stringify({ ok: true, kind: 'program', program: { name: 'x', sessions: [{ key: 'a' }] }, summary: 'x', model: 'm', usage: {} })); }],
      ])('%s: no program, and the catalog says why', async (_, error, fail) => {
        fail();
        expect(await ask()).toEqual({ ok: false, error });
        expect(store.size).toBe(0);
      });
    });
    test('storage that throws does not stop the answer', async () => {
      vi.stubGlobal('localStorage', { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); }, removeItem: () => {}, key: () => null, length: 0 });
      expect((await askCoach(req({ kind: 'week' }))).source).toBe('ai');
    });
  });
});

// ----- the facts builders -----
const day = (date: string, o: Partial<DayStats> = {}): DayStats => ({ date, target: 2400, intake: 2300, protein: 130, items: 4, closed: false, onTrack: true, complete: true, sessions: [], ...o });
const WEEK: WeekStats = {
  start: '2026-11-10',
  days: [day('2026-11-10', { protein: 140 }), day('2026-11-11', { intake: 2400, protein: 90 }), day('2026-11-12', { intake: 0, protein: 0, complete: false })],
  meanIntake: 2350, meanTarget: 2400, meanProtein: 115, onTrack: 2,
  training: { planned: 2, done: 1, skipped: 0, strength: 1, cardioMinutes: 0, cardioBand: 'below' },
};
const lifted = (kg: number, reps: number, exerciseId = 'bench-press'): Workout => ({ startedAt: '2026-11-11T03:00:00.000Z', seconds: 3300, effort: 8, lifts: [{ exerciseId, sets: [{ kg, reps }, { kg, reps }] }] });
const log = (date: string, workout: Workout): SessionLog => ({ date, sessionKey: 'push', status: 'done', workout });
const values = (f: CoachFacts) => Object.fromEntries(Object.entries(f).map(([id, x]) => [id, x.value]));
/** every built set of facts is one the endpoint accepts */
const accepted = (facts: CoachFacts, kind: CoachRequest['kind'] = 'ask') => expect(coachRequest.safeParse({ kind, facts, localDate: DATE, question: 'Why?' }).success).toBe(true);

describe('weekFacts', () => {
  const input = { week: WEEK, proteinG: 130, units: 'metric' as const, trend: { now: 72.3, was: 72 }, logs: [log('2026-11-03', lifted(60, 5)), log('2026-11-11', lifted(62.5, 5)), log('2026-11-20', lifted(70, 5))] };
  test('intake against target, days logged, protein days, sessions, the trend and new bests', () => {
    const f = weekFacts(input);
    expect(values(f)).toEqual({
      avg_kcal: '2,350 kcal', target_kcal: '2,400 kcal', days_logged: '2 of 3', protein_days: '1 of 2', sessions: '1 of 2', weight_change: '+0.3 kg', new_bests: '1 lift',
    });
    expect(f.avg_kcal.label).toBe('Average intake');
    accepted(f, 'week');
  });
  test('leaves out what is not known, and counts only the logs of that week', () => {
    const f = weekFacts({ ...input, week: { ...WEEK, meanIntake: null, training: { ...WEEK.training, planned: 0, done: 0 } }, trend: undefined, logs: [log('2026-11-03', lifted(60, 5))] });
    expect(Object.keys(f)).toEqual(['target_kcal', 'days_logged', 'protein_days']);
    expect(Object.keys(weekFacts({ ...input, week: { ...WEEK, days: [] }, logs: [] }))).toEqual(['avg_kcal', 'target_kcal', 'sessions', 'weight_change']);
  });
  test('shows the trend in the user\'s units, with its sign', () => {
    expect(weekFacts({ ...input, units: 'imperial', trend: { now: 72, was: 72.5 } }).weight_change.value).toBe('-1.1 lb');
    expect(weekFacts({ ...input, trend: { now: 72, was: 72.01 } }).weight_change.value).toBe('0 kg');
  });
});

describe('checkinFacts', () => {
  const stats: Checkin['stats'] = { days: 21, weighIns: 9, completeDays: 18, ratePctPerWeek: 0.3, meanIntake: 2310, meanTarget: 2400, tdeeObserved: 2652 };
  test('a raise: the trend against the pace, intake, maintenance and the change', () => {
    const f = checkinFacts({ stats, proposal: { reason: 'raise', kcalChange: 150 }, goal: 'gain', targetRate: 0.5 });
    expect(values(f)).toEqual({
      goal: 'Gain weight', outcome: 'Target goes up', rate: '+0.3 percent a week', pace: '+0.5 percent a week', avg_kcal: '2,310 kcal', target_kcal: '2,400 kcal',
      days_logged: '18 of 21', weigh_ins: '9', maintenance: '2,650 kcal', change: '150 kcal a day',
    });
    accepted(f, 'checkin');
  });
  test('a lower, a hold, too few weigh-ins and an adherence outcome', () => {
    const of = (reason: 'lower' | 'on_track' | 'need_data' | 'adherence', kcalChange: number, s = stats) => checkinFacts({ stats: s, proposal: { reason, kcalChange }, goal: 'lose', targetRate: -0.5 });
    expect(values(of('lower', -120))).toMatchObject({ outcome: 'Target goes down', change: '120 kcal a day', pace: '-0.5 percent a week' });
    expect(values(of('on_track', 0))).toMatchObject({ outcome: 'Target stays' });
    expect(of('on_track', 0).change).toBeUndefined();
    const few = of('need_data', 0, { ...stats, ratePctPerWeek: null, tdeeObserved: null, meanIntake: null, weighIns: 2 });
    expect(Object.keys(few)).toEqual(['goal', 'outcome', 'target_kcal', 'days_logged', 'weigh_ins']);
    expect(values(of('adherence', 0)).outcome).toBe('Reaching the target comes first');
  });
});

describe('sessionFacts', () => {
  const before = [log('2026-11-03', lifted(60, 5)), log('2026-11-05', lifted(100, 5, 'squat'))];
  test('totals, new bests, and the volume against last time on the lifts done before', () => {
    const f = sessionFacts({ workout: lifted(62.5, 5), before, units: 'metric' });
    expect(values(f)).toEqual({ sets: '2', volume: '625 kg', volume_change: '+25 kg', new_bests: '1 lift', best_lift: 'Bench press 62.5 kg', time: '55 min', effort: '8 out of 10' });
    accepted(f, 'session');
  });
  test('a lighter session, a first time, and a short one', () => {
    expect(sessionFacts({ workout: lifted(55, 5), before, units: 'metric' }).volume_change.value).toBe('-50 kg');
    expect(sessionFacts({ workout: lifted(55, 5), before, units: 'metric' }).new_bests).toBeUndefined();
    const first = sessionFacts({ workout: { ...lifted(60, 5, 'deadlift'), seconds: 20, effort: undefined }, before, units: 'metric' });
    expect(Object.keys(first)).toEqual(['sets', 'volume']); // nothing to compare, nothing to beat, no time or effort
    expect(sessionFacts({ workout: { startedAt: '2026-11-11T03:00:00.000Z', seconds: 0, lifts: [] }, before: [], units: 'imperial' })).toEqual({});
  });
  test('in pounds', () => {
    expect(sessionFacts({ workout: lifted(62.5, 5), before, units: 'imperial' }).volume.value).toBe('1,378 lb');
  });
});

describe('gapFacts and gapCandidates', () => {
  const food = (id: string, kcal: number, protein: number, tags: Food['tags'] = ['protein']): Food =>
    ({ id, name: id, aliases: [], per100: { kcal, protein, carbs: 0, fat: 0 }, portions: [{ label: '1', grams: 100 }], tags, source: { set: 'usda-sr-legacy', id } });
  const FOODS = [food('chicken', 150, 30), food('tuna', 116, 25.5), food('salmon', 208, 20), food('bacon', 540, 37), food('rice', 130, 2.7, ['staple']), food('milk', 61, 3.2, ['drink']), food('oil', 884, 0, ['oil']), food('egg', 143, 12.6, [])];
  test('the facts say what is left', () => {
    expect(values(gapFacts({ kcalLeft: 640.4, proteinLeft: 41.6 }))).toEqual({ kcal_left: '640 kcal', protein_left: '42 g' });
  });
  test('protein foods that fit the calories left, the most protein first, at 100 g', () => {
    expect(gapCandidates({ foods: FOODS, recent: [], kcalLeft: 400 })).toEqual([
      { id: 'chicken', name: 'chicken', grams: 100, kcal: 150, protein: 30 },
      { id: 'tuna', name: 'tuna', grams: 100, kcal: 116, protein: 25.5 },
      { id: 'salmon', name: 'salmon', grams: 100, kcal: 208, protein: 20 },
    ]);
  });
  test('foods logged before come in at the grams they were logged at, whatever their tags', () => {
    const c = gapCandidates({ foods: FOODS, recent: [{ foodId: 'egg', grams: 100 }, { foodId: 'milk', grams: 250 }, { foodId: 'rice' }, { foodId: 'gone', grams: 5 }], kcalLeft: 400 });
    expect(c.map((x) => [x.id, x.grams, x.kcal, x.protein])).toEqual([['chicken', 100, 150, 30], ['tuna', 100, 116, 25.5], ['salmon', 100, 208, 20], ['egg', 100, 143, 12.6], ['milk', 250, 153, 8], ['rice', 100, 130, 2.7]]);
  });
  test('nothing fits when no calories are left, and at most 12 are offered', () => {
    expect(gapCandidates({ foods: FOODS, recent: [], kcalLeft: 0 })).toEqual([]);
    const lots = Array.from({ length: 30 }, (_, i) => food(`f${i}`, 100, 10 + i));
    const c = gapCandidates({ foods: lots, recent: [], kcalLeft: 500 });
    expect(c).toHaveLength(12);
    expect(c[0].id).toBe('f29');
    expect(coachRequest.safeParse({ kind: 'gap', facts: gapFacts({ kcalLeft: 500, proteinLeft: 40 }), localDate: DATE, candidates: c }).success).toBe(true);
  });
});

describe('askFacts (27 Nov)', () => {
  test('tells Ask who the user is, their day and their program, and keeps the week', () => {
    const f = askFacts({
      week: { avg_kcal: { label: 'Average intake', value: '1,800 kcal' } },
      profile: { sex: 'male', birthYear: 2005, heightCm: 165, units: 'metric', experience: 'beginner' },
      year: 2026, goal: 'lose', ratePct: 0.75, goalWeightKg: 67, weightKg: 80.5,
      day: { target: 1964, eaten: { kcal: 1200, protein: 80 }, macros: { proteinG: 163, carbsG: 180, fatG: 51 }, sessions: [{ name: 'Upper B', done: true }, { name: 'Cardio', done: false }] },
      meals: ['Khao man gai', 'Whey protein'],
      program: { name: 'Upper lower 4 days', sessions: [3, 0, 6].map((weekday, i) => ({ key: `k${i}`, weekday, name: 'Upper A', type: 'strength' as const, minutes: 60, intensity: 'moderate' as const })) },
    });
    expect(f.age.value).toBe('21 years');
    expect(f.kcal_left.value).toBe('764 kcal');
    expect(f.protein_left.value).toBe('83 g');
    expect(f.meals_today.value).toBe('Khao man gai, Whey protein');
    expect(f.training_done.value).toBe('1 of 2');
    expect(f.training_days.value).toBe('Sun, Mon, Thu');
    expect(f.avg_kcal.value).toBe('1,800 kcal');
    expect(Object.keys(f).length).toBeLessThanOrEqual(30);
    for (const v of Object.values(f)) expect(v.value.length).toBeLessThanOrEqual(40);
  });
});
