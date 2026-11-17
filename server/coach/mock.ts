// The mock coach for dev and tests: answers built from the facts and candidates, every number a slot, so the same
// validator that checks Gemini checks these. They read like the real thing, which is the point of seeing the screens.
import type { CoachFacts } from '../../shared/coach.js';
import type { CoachProvider, CoachInput } from './provider.js';
import type { ModelOutput } from './prompt.js';
import { mockProgram } from './mock-program.js';

const slot = (id: string) => `{{${id}}}`;
const reply = (o: Partial<ModelOutput>): ModelOutput => ({ headline: '', lines: [], picks: [], ...o });
/** The lines whose facts exist, in order; `false` entries are the lines whose facts do not */
const some = (lines: (string | false | undefined)[]) => lines.filter((l): l is string => !!l);

const INTAKE = (f: CoachFacts) => !!f.avg_kcal && !!f.target_kcal && `You averaged ${slot('avg_kcal')} against a target of ${slot('target_kcal')}.`;
const PROTEIN = (f: CoachFacts) => !!f.protein_days && `Protein was on track on ${slot('protein_days')} days.`;
const SESSIONS = (f: CoachFacts) => !!f.sessions && `You finished ${slot('sessions')} sessions.`;
const WEIGHT = (f: CoachFacts) => !!f.weight_change && `Your weight trend moved ${slot('weight_change')} this week.`;
const BESTS = (f: CoachFacts) => !!f.new_bests && `You set new bests on ${slot('new_bests')}.`;

function week(f: CoachFacts) {
  const lines = some([INTAKE(f), PROTEIN(f), SESSIONS(f), WEIGHT(f), BESTS(f)]).slice(0, 3);
  // too little to say: two lines are still due
  lines.push(...['Log a few more days and this recap fills in.', 'Each day you log makes the next recap sharper.'].slice(0, Math.max(0, 2 - lines.length)));
  // a week with a session done reads as training; none done yet is a week still to build on
  const trained = !!f.sessions && !/^0\b/.test(f.sessions.value);
  return reply({ headline: f.new_bests ? 'A week of new bests' : trained ? 'Training showed up' : 'A week you can build on', lines });
}

function checkin(f: CoachFacts) {
  const outcome = (f.outcome?.value ?? '').toLowerCase();
  const first = f.rate && f.pace ? `Your weight trend is ${slot('rate')} against a pace of ${slot('pace')}.` : INTAKE(f) || 'There are too few weigh-ins to measure your trend yet.';
  const second = f.change && outcome.includes('up') ? `That gap is why your target goes up by ${slot('change')}.`
    : f.change && outcome.includes('down') ? `That gap is why your target goes down by ${slot('change')}.`
    : outcome.includes('first') ? 'Your target looks right, so reaching it comes first.'
    : outcome.includes('weigh-ins') ? 'A few more weigh-ins and your next check-in can read your trend.'
    : 'So your target stays where it is.';
  return reply({ lines: [first, second] });
}

function session(f: CoachFacts) {
  const change = f.volume_change?.value ?? '';
  const headline = f.new_bests ? 'A new best on the bar' : change.startsWith('+') ? 'Stronger than last time' : change.startsWith('-') ? 'A lighter session' : 'Session logged';
  return reply({ headline, lines: f.volume && f.sets ? [`You lifted ${slot('volume')} across ${slot('sets')} sets.`] : [] });
}

/** The 3 candidates with the most protein per kcal, each with a reason by rank */
function gap({ candidates = [] }: CoachInput) {
  const REASONS = ['Most protein for its calories', 'Fits what you have left', 'Easy to add to a meal'];
  const rank = [...candidates].sort((a, b) => b.protein / (b.kcal || 1) - a.protein / (a.kcal || 1)).slice(0, REASONS.length);
  return reply({ picks: rank.map((c, i) => ({ id: c.id, reason: REASONS[i] })) });
}

/** Answers from the facts that match the question's keywords; targets and medical questions are refused as the prompt says */
function ask({ facts: f, question = '' }: CoachInput) {
  const q = question.toLowerCase();
  if (/target|macro|should i eat/.test(q)) return reply({ lines: ['Your weekly check-in sets that.'] });
  if (/doctor|medic|diagnos|injur|pain|pill|disease|diabet|pregnan/.test(q)) return reply({ lines: ['That is a question for your doctor.', 'I can talk through your logged week if that helps.'] });
  const topics: [RegExp, (string | false)[]][] = [
    [/protein/, [PROTEIN(f)]],
    [/weight|trend|scale|kg|lb/, [WEIGHT(f)]],
    [/calor|kcal|intake|eat|food/, [INTAKE(f)]],
    [/train|session|workout|lift|gym|best/, [SESSIONS(f), BESTS(f)]],
  ];
  const matched = topics.filter(([re]) => re.test(q));
  const lines = some(matched.flatMap(([, l]) => l)).slice(0, 4);
  if (lines.length) return reply({ lines });
  return reply({ lines: [matched.length ? 'I do not have that in your numbers yet.' : 'I can answer questions about your protein, weight, calories and training.'] });
}

export const mockCoach: CoachProvider = {
  model: 'mock',
  async write(i) {
    if (i.kind === 'program') return mockProgram(i);
    return i.kind === 'week' ? week(i.facts) : i.kind === 'checkin' ? checkin(i.facts) : i.kind === 'session' ? session(i.facts) : i.kind === 'gap' ? gap(i) : ask(i);
  },
};
