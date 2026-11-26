// R2: the AI coach from the app's side (TECH-SPEC section 7b). `askCoach` sends the facts that src/lib/model/coach.ts
// built, gets text with `{{slot}}` where each number goes, and fills the slots from the same facts, so the model cannot
// change a number. It never throws and always answers: when the coach cannot (offline, over the daily limit, signed out,
// an error), the answer is a template from the catalog, marked `source: 'template'` so "Written by AI" shows only on text
// the model wrote. Answers are kept on the device by request, so the same facts cost nothing twice.
import { t } from '$lib/i18n';
import { session } from '$lib/session.svelte';
import { num } from '$lib/model/format';
import { programSchema, type Program } from '../../shared/records';
import type { AnalyzeError } from '../../shared/analysis';
import { FREE_ADVICE_PER_MONTH } from '../../shared/plans';
import type { CoachFacts, CoachPick, CoachRequest, CoachResponse, CoachText, CoachTextResponse, ProgramRequest } from '../../shared/coach';

/** `left`: the free plan's AI answers left this month, when the server said; `limited`: none left (27 Nov) */
export type CoachAnswer = { source: 'ai' | 'template'; text: CoachText; picks?: CoachPick[]; left?: number; limited?: boolean };

/** Each `{{id}}` in the text replaced by that fact's value. */
export function fill(text: CoachText, facts: CoachFacts): CoachText {
  const one = (s: string) => s.replace(/\{\{([a-z_]+)\}\}/g, (_, id: string) => facts[id]?.value ?? '');
  return { ...(text.headline ? { headline: one(text.headline) } : {}), lines: text.lines.map(one) };
}

// ----- kept answers -----
const PREFIX = 'ot-coach:';
const KEEP = 40;
type Kept = { at: number; text: CoachText; picks?: CoachPick[] };

/** cyrb53: a 53 bit hash, so two requests share a key only by a 1 in 10^15 chance */
function hash(s: string) {
  let [a, b] = [0xdeadbeef, 0x41c6ce57];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 2654435761);
    b = Math.imul(b ^ c, 1597334677);
  }
  a = Math.imul(a ^ (a >>> 16), 2246822507) ^ Math.imul(b ^ (b >>> 13), 3266489909);
  b = Math.imul(b ^ (b >>> 16), 2246822507) ^ Math.imul(a ^ (a >>> 13), 3266489909);
  return (4294967296 * (2097151 & b) + (a >>> 0)).toString(36);
}
/** What identifies a request: the facts in id order, so how the caller built the object does not matter. */
const keyOf = (r: CoachRequest) =>
  `${PREFIX}${r.kind}:${hash(JSON.stringify([r.localDate, r.question ?? '', Object.entries(r.facts).sort(([a], [b]) => (a < b ? -1 : 1)), r.candidates ?? [], r.history ?? []]))}`;

// storage can be absent or full (a private window); then nothing is kept and every call asks
function recall(key: string): Kept | null {
  try {
    const kept = JSON.parse(localStorage.getItem(key) ?? 'null') as Kept | null;
    return kept && Array.isArray(kept.text?.lines) ? kept : null;
  } catch {
    return null;
  }
}
function remember(key: string, answer: { text: CoachText; picks?: CoachPick[] }) {
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), ...answer }));
    const all = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter((k) => k.startsWith(PREFIX));
    const age = (k: string) => recall(k)?.at ?? 0;
    for (const k of all.sort((a, b) => age(a) - age(b)).slice(0, Math.max(0, all.length - KEEP))) localStorage.removeItem(k);
  } catch { /* not kept */ }
}

// ----- the call -----
const WAIT_MS = 25_000; // the server tries twice, 10 s each
const PROGRAM_WAIT_MS = 55_000; // a program: two tries of 25 s (server/handlers/coach.ts)
/** The endpoint's reply as it came, `unauthorized` when there is no token, or null: offline, no reply, or not JSON. */
async function post(req: CoachRequest | ProgramRequest): Promise<CoachResponse | null> {
  if (!navigator.onLine) return null;
  try {
    const token = await session.backend?.accessToken();
    if (!token) return { ok: false, error: 'unauthorized' };
    const res = await fetch('/api/coach', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(req), signal: AbortSignal.timeout(req.kind === 'program' ? PROGRAM_WAIT_MS : WAIT_MS) });
    return (await res.json().catch(() => null)) as CoachResponse | null;
  } catch {
    return null;
  }
}
async function fetchAnswer(req: CoachRequest): Promise<CoachTextResponse | 'month_limit' | null> {
  const body = await post(req);
  if (body && !body.ok && body.error === 'month_limit') return 'month_limit';
  return body?.ok && body.kind === req.kind && Array.isArray(body.text?.lines) ? body : null;
}
/** What the free plan has left this month, from a response's usage */
const leftOf = (u: CoachTextResponse['usage'] | undefined) => (u && 'usedThisMonth' in u ? Math.max(0, u.limit - u.usedThisMonth) : undefined);

// ----- the template -----
/** The words the coach would have written, from the same facts and the catalog: no AI, the same on every call. */
export function template({ kind, facts, candidates = [] }: CoachRequest): CoachAnswer {
  const v = (id: string) => facts[id]?.value;
  const [avg, target, protein, sessions, weight, bests] = ['avg_kcal', 'target_kcal', 'protein_days', 'sessions', 'weight_change', 'new_bests'].map(v);
  const some = (lines: (string | false | undefined)[]) => lines.filter((l): l is string => !!l);
  const answer = (text: CoachText, picks?: CoachPick[]): CoachAnswer => ({ source: 'template', text, ...(picks ? { picks } : {}) });

  if (kind === 'week') {
    const c = t.coach.week;
    const lines = some([avg && target && c.intake(avg, target), protein && c.protein(protein), sessions && c.sessions(sessions), weight && c.weight(weight), bests && c.bests(bests)]).slice(0, 3);
    return answer({ headline: c.headline, lines: lines.length ? lines : [c.more] });
  }
  if (kind === 'checkin') {
    const c = t.coach.checkin;
    const o = t.coach.values.outcome;
    const [rate, pace, change, outcome] = ['rate', 'pace', 'change', 'outcome'].map(v);
    const why = rate && pace ? c.trend(rate, pace) : avg && target ? c.intake(avg, target) : c.few;
    const so = outcome === o.up && change ? c.up(change) : outcome === o.down && change ? c.down(change) : outcome === o.adherence ? c.first : outcome === o.data ? c.more : c.stays;
    return answer({ lines: [why, so] });
  }
  if (kind === 'session') {
    const c = t.coach.session;
    const [volume, sets, change] = ['volume', 'sets', 'volume_change'].map(v);
    const headline = bests ? c.best : change?.startsWith('+') ? c.stronger : change?.startsWith('-') ? c.lighter : c.logged;
    return answer({ headline, lines: volume && sets ? [c.lifted(volume, sets)] : [] });
  }
  if (kind === 'gap') {
    // the most protein for the calories
    const rank = [...candidates].sort((a, b) => b.protein / (b.kcal || 1) - a.protein / (a.kcal || 1)).slice(0, 3);
    return answer({ lines: [] }, rank.map((c) => ({ id: c.id, reason: t.coach.gap.reason(num(c.protein), num(c.kcal)) })));
  }
  // ask: no answer to give, so the numbers it would have drawn on
  const shown = Object.values(facts).slice(0, 3).map((f) => t.coach.ask.fact(f.label, f.value));
  return answer({ lines: [t.coach.ask.offline, ...shown] });
}

/** The coach's answer for this request: from the device if kept, else from the server, else the template. Never throws. */
export async function askCoach(req: CoachRequest): Promise<CoachAnswer> {
  const key = keyOf(req);
  const kept = recall(key);
  const body = kept ?? (await fetchAnswer(req));
  if (body === 'month_limit') return { source: 'template', text: { lines: [t.ask.monthLimit(num(FREE_ADVICE_PER_MONTH))] }, limited: true };
  if (!body) return template(req);
  if (!kept) remember(key, body);
  const left = kept ? undefined : leftOf((body as CoachTextResponse).usage);
  return { source: 'ai', text: fill(body.text, req.facts), ...(body.picks ? { picks: body.picks } : {}), ...(left !== undefined ? { left } : {}) };
}

// ----- the program -----
export type ProgramAnswer = { ok: true; program: Program; summary: string; source: 'ai' } | { ok: false; error: string };

/**
 * The coach's change to the program, for the request in the user's words. The program comes back checked by the server and
 * again here, and is only a proposal: the caller shows it and saves it (changeProgram) if the user agrees. Never kept, so
 * each ask is a new answer. Never throws; when there is no answer, `error` is a sentence for the user.
 */
export async function askProgram(question: string, program: Program, profile: ProgramRequest['profile'], localDate: string): Promise<ProgramAnswer> {
  const p = t.programAi;
  if (!navigator.onLine) return { ok: false, error: p.offline };
  const body = await post({ kind: 'program', question, program, profile, localDate });
  if (body?.ok && body.kind === 'program') {
    const checked = programSchema.safeParse(body.program);
    if (checked.success && typeof body.summary === 'string') return { ok: true, program: checked.data, summary: body.summary, source: 'ai' };
  }
  const why: Partial<Record<AnalyzeError, string>> = { unauthorized: p.signedOut, daily_limit: p.limit, month_limit: p.monthLimit(num(FREE_ADVICE_PER_MONTH)), busy: p.busy, timeout: p.busy };
  return { ok: false, error: (body && !body.ok && why[body.error]) || p.failed };
}
