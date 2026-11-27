// POST /api/coach (TECH-SPEC section 7b): token, body, quota, the provider with a timeout, the reply checked against the
// slot rule (server/coach/validate.ts), or for a program against the program rules (server/coach/program.ts), and tried
// once more when it fails. Logs duration, model and kind, never the
// facts or the question. The dependencies are passed in so the mock backend and the unit tests run this same handler.
import { admin, caller } from '../auth.js';
import { json } from '../http.js';
import { envInt } from '../env.js';
import { adviceUsed, bumpAdvice, bumpUsage, type Usage } from '../quota.js';
import { Timeout, within } from '../call.js';
import { coachProvider, type CoachProvider } from '../coach/provider.js';
import { validate } from '../coach/validate.js';
import { validateProgram } from '../coach/program.js';
import type { AnalyzeError } from '../../shared/analysis.js';
import { coachBody, MAX_BODY_BYTES, type CoachUsage } from '../../shared/coach.js';
import { ADVICE_KINDS, FREE_ADVICE_PER_MONTH, isPro, PRO_AI_PER_DAY, type Billing } from '../../shared/plans.js';

export type Deps = {
  caller(request: Request): Promise<{ id: string; billing?: Billing } | null>;
  bump(userId: string, day: string, limit: number): Promise<Usage>;
  /** the free plan's advice this month so far */
  adviceUsed(userId: string, month: string): Promise<number>;
  /** the free plan's advice: counts one for the month and returns the month's count */
  advice(userId: string, month: string): Promise<number>;
  freeAdvice: number;
  provider(): Promise<CoachProvider>;
  limit: number;
  cap: number;
  timeoutMs?: number;
};

const STATUS: Record<AnalyzeError, number> = { bad_request: 400, unauthorized: 401, too_large: 413, not_food: 422, daily_limit: 429, busy: 429, provider_error: 502, timeout: 504, pro_only: 402, month_limit: 429 };
const fail = (error: AnalyzeError, extra: object = {}) => json(STATUS[error], { ok: false, error, ...extra });
// the app waits 25 s (src/lib/coach.ts): two tries must fit inside it
const TIMEOUT_MS = 10_000;
/** a whole week of sessions takes the model longer than a few sentences (R2) */
const PROGRAM_TIMEOUT_MS = 25_000;

export const liveDeps = (): Deps => {
  const db = admin();
  return {
    caller: (r) => caller(r, db),
    bump: (u, d, l) => bumpUsage(db, u, d, l),
    adviceUsed: (u, m) => adviceUsed(db, u, m),
    advice: (u, m) => bumpAdvice(db, u, m),
    freeAdvice: envInt('AI_FREE_ADVICE_PER_MONTH', FREE_ADVICE_PER_MONTH),
    provider: coachProvider,
    // the same per-user limit and global cap as /api/analyze, and the same count
    limit: envInt('AI_DAILY_USER_LIMIT', PRO_AI_PER_DAY),
    cap: envInt('AI_DAILY_GLOBAL_CAP', 400),
  };
};

export async function coach(request: Request, deps: Deps = liveDeps()): Promise<Response> {
  if (request.method !== 'POST') return fail('bad_request');
  const user = await deps.caller(request);
  if (!user) return fail('unauthorized');
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fail('too_large');
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) return fail('too_large');
  let parsed;
  try { parsed = coachBody.safeParse(JSON.parse(text)); } catch { return fail('bad_request'); }
  if (!parsed.success) return fail('bad_request');
  const req = parsed.data;
  // R5, and the owner on 27 Nov: on the free plan, Ask and Adjust with AI within the month's allowance; the automatic
  // words (the week recap, the check-in, a session, the protein picks) stay the app's own from the engine's facts
  const pro = isPro(user.billing);
  if (!pro && !(ADVICE_KINDS as readonly string[]).includes(req.kind)) return fail('pro_only');

  // the server's UTC day and month, so a phone cannot pick dates to multiply its quota
  const now = new Date().toISOString();
  const month = `${now.slice(0, 7)}-01`;
  let quota: CoachUsage;
  if (pro) {
    const usage = await deps.bump(user.id, now.slice(0, 10), deps.limit).catch((e: Error) => { console.error('coach quota failed', e.message); return null; });
    if (!usage) return fail('provider_error');
    quota = { usedToday: Math.min(usage.used, deps.limit), limit: deps.limit };
    if (!usage.allowed) return fail('daily_limit', { usage: quota });
    if (usage.total > deps.cap) return fail('busy');
  } else {
    // shortcut: free advice is outside the global cap, bounded at freeAdvice a user a month; count it there if users grow.
    // Checked now, counted only once there is an answer (a timeout or a refused reply costs nothing); two asks at the
    // same moment can pass the check together, one over at most
    const used = await deps.adviceUsed(user.id, month).catch((e: Error) => { console.error('coach advice quota failed', e.message); return null; });
    if (used === null) return fail('provider_error');
    quota = { usedThisMonth: Math.min(used, deps.freeAdvice), limit: deps.freeAdvice };
    if (used >= deps.freeAdvice) return fail('month_limit', { usage: quota });
  }

  const provider = await deps.provider();
  const started = Date.now();
  // one try: the provider's reply, checked, as the fields the response carries
  type Done = { ok: true; fields: object } | { ok: false; why: string };
  const run = (input: Parameters<typeof provider.write>[0]) => within((signal) => provider.write({ ...input, signal }), deps.timeoutMs ?? (req.kind === 'program' ? PROGRAM_TIMEOUT_MS : TIMEOUT_MS));
  const once = async (): Promise<Done> => {
    if (req.kind === 'program') {
      const c = validateProgram(await run({ kind: 'program', question: req.question, program: req.program, profile: req.profile }));
      return c.ok ? { ok: true, fields: { program: c.program, summary: c.summary } } : c;
    }
    const c = validate(req, await run({ kind: req.kind, facts: req.facts, question: req.question, candidates: req.candidates, history: req.history }));
    return c.ok ? { ok: true, fields: { text: c.text, ...(c.picks ? { picks: c.picks } : {}) } } : c;
  };
  let answer: Extract<Done, { ok: true }>;
  for (let attempt = 1; ; attempt++) {
    let why: string;
    try {
      const checked = await once();
      if (checked.ok) { answer = checked; break; }
      why = checked.why;
    } catch (e) {
      const timedOut = e instanceof Timeout;
      const status = (e as { status?: number }).status ?? 0;
      if (attempt === 1 && (timedOut || status >= 500)) continue;
      console.error('coach provider failed', { kind: req.kind, model: provider.model, attempt, status, timedOut, ms: Date.now() - started });
      // the provider's own rate limit reads as busy, not broken
      return fail(timedOut ? 'timeout' : status === 429 ? 'busy' : 'provider_error');
    }
    // a reply that broke a rule: one more try, then the app shows its own template (a program: its error)
    if (attempt === 2) {
      console.error('coach reply refused', { kind: req.kind, model: provider.model, why, ms: Date.now() - started });
      return fail('provider_error');
    }
  }
  console.info('coach', { kind: req.kind, model: provider.model, ms: Date.now() - started });
  if (!pro) {
    const used = await deps.advice(user.id, month).catch((e: Error) => { console.error('coach advice count failed', e.message); return null; });
    if (used !== null) quota = { usedThisMonth: Math.min(used, deps.freeAdvice), limit: deps.freeAdvice };
  }
  return json(200, { ok: true, kind: req.kind, ...answer.fields, model: provider.model, usage: quota });
}
