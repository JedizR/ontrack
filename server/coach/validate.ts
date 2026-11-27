// The rule that makes the coach safe (TECH-SPEC section 7b): the model never writes a digit. A number is `{{id}}`, one of
// the request's fact ids. Anything else is refused, so the model cannot change a number the engine computed.
import type { CoachKind, CoachPick, CoachRequest, CoachText } from '../../shared/coach.js';
import { modelOutput } from './prompt.js';

export type Checked = { ok: true; text: CoachText; picks?: CoachPick[] } | { ok: false; why: string };
const bad = (why: string): Checked => ({ ok: false, why });

/** Per kind: the longest headline in words (0 means none), how many lines, and the most words in all. */
const RULES: Record<Exclude<CoachKind, 'gap'>, { headline: number; lines: [number, number]; words: number }> = {
  week: { headline: 6, lines: [2, 3], words: 40 },
  checkin: { headline: 0, lines: [1, 2], words: 40 },
  session: { headline: 8, lines: [0, 1], words: 40 },
  // Ask Ontrack (27 Nov): super concise
  ask: { headline: 0, lines: [1, 2], words: 45 },
};
const PICKS = 3;
const REASON_WORDS = 8;
const MAX_LINE = 220;
const CHECKIN_SENTENCES = 2;

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
const sentences = (s: string) => s.split(/[.?]+(?:\s+|$)/).filter((x) => x.trim()).length;

/** Em and en dashes become a comma, emoji go, `!` becomes `.`, spaces collapse and none stay before a full stop or comma. */
export const sanitise = (s: string) =>
  s.replace(/\s*[\u{2013}\u{2014}]\s*/gu, ', ').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/!+/g, '.').replace(/\s+/g, ' ').replace(/ ([.,?])/g, '$1').trim();

/** Why `s` breaks the slot rule, or null: a slot that was not given, a digit outside a slot (unless `digits`), or a stray brace. */
export function slotProblem(s: string, slots: ReadonlySet<string>, digits = false) {
  for (const [, id] of s.matchAll(/\{\{([^{}]*)\}\}/g)) if (!slots.has(id)) return 'unknown slot';
  const bare = s.replace(/\{\{[^{}]*\}\}/g, '');
  return !digits && /\p{Nd}/u.test(bare) ? 'digit' : /[{}]/.test(bare) ? 'stray brace' : null;
}

/**
 * Ask's plain numbers (R8) are for general facts only: never a calorie amount to aim for, and never one of the user's own
 * numbers copied out of its slot (two or more digits, so "2 eggs" is fine). Null when the line is fine.
 */
export function askNumberProblem(s: string, facts: CoachRequest['facts']) {
  const bare = s.replace(/\{\{[^{}]*\}\}/g, '');
  if (/\b(aim|target|eat|stay|keep|limit|cut|drop|go|reduce|increase|raise|lower|set)\b[^.]{0,40}?\d[\d,.]*\s*(kcal|calories|cal)\b/i.test(bare)) return 'a target';
  const NUM = /\d[\d,.]*\d|\d/g;
  const own = new Set(Object.values(facts).flatMap((f) => f.value.match(NUM) ?? []).filter((n) => n.replace(/\D/g, '').length >= 2));
  return (bare.match(NUM) ?? []).some((n) => own.has(n)) ? 'a fact as digits' : null;
}

/**
 * The model's reply for this request, checked and sanitised, or why not. Fields a kind does not use are dropped, not
 * refused. The reasons name the rule and never carry the text.
 */
export function validate(req: Pick<CoachRequest, 'kind' | 'facts' | 'candidates'>, raw: unknown): Checked {
  const out = modelOutput.safeParse(raw);
  if (!out.success) return bad('schema');
  if (req.kind === 'gap') {
    const ids = new Set(req.candidates?.map((c) => c.id));
    const picks = out.data.picks.map((p) => ({ id: p.id, reason: sanitise(p.reason) }));
    const want = Math.min(PICKS, ids.size);
    if (picks.length !== want || new Set(picks.map((p) => p.id)).size !== want) return bad('picks');
    // a reason has no slots: any `{{id}}` in it is unknown
    for (const p of picks) {
      if (!ids.has(p.id)) return bad('unknown id');
      if (!p.reason || words(p.reason) > REASON_WORDS || p.reason.length > MAX_LINE || slotProblem(p.reason, new Set())) return bad('reason');
    }
    return { ok: true, text: { lines: [] }, picks };
  }

  const rule = RULES[req.kind];
  const headline = rule.headline ? sanitise(out.data.headline) : '';
  const lines = out.data.lines.map(sanitise);
  if (rule.headline && (!headline || words(headline) > rule.headline)) return bad('headline');
  if (lines.length < rule.lines[0] || lines.length > rule.lines[1] || lines.some((l) => !l || l.length > MAX_LINE)) return bad('lines');
  const slots = new Set(Object.keys(req.facts));
  for (const s of [headline, ...lines]) {
    // Ask may give a general fact in plain numbers ("two eggs add about 12 g"); the user's own numbers stay slots
    const why = slotProblem(s, slots, req.kind === 'ask') ?? (req.kind === 'ask' ? askNumberProblem(s, req.facts) : null);
    if (why) return bad(why);
  }
  if (words([headline, ...lines].join(' ')) > rule.words) return bad('too long');
  if (req.kind === 'checkin' && sentences(lines.join(' ')) !== CHECKIN_SENTENCES) return bad('sentences');
  return { ok: true, text: { ...(headline ? { headline } : {}), lines } };
}
