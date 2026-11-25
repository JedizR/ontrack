// POST /api/analyze (TECH-SPEC section 7): token, body, quota, the provider with a timeout and one retry, the model's
// JSON checked, items resolved against the food table. Logs duration, model and item count, never the image or text.
// The dependencies are passed in so the mock backend and the unit tests run this same handler.
import { admin, caller } from '../auth.js';
import { json } from '../http.js';
import { envInt } from '../env.js';
import { bumpUsage, type Usage } from '../quota.js';
import { Timeout, within } from '../call.js';
import { visionProvider, type VisionInput, type VisionProvider } from '../vision/provider.js';
import { modelOutput } from '../vision/schema.js';
import { MAX_ITEMS, resolveItems } from '../vision/resolve.js';
import { labelOutput, toLabel } from '../vision/label.js';
import { analyzeRequest, MAX_BODY_BYTES, MAX_TEXT, MAX_VOICE_BYTES, type AnalyzeError } from '../../shared/analysis.js';
import { FREE_AI_PER_DAY, isPro, PRO_AI_PER_DAY, type Billing } from '../../shared/plans.js';

export type Deps = {
  caller(request: Request): Promise<{ id: string; billing?: Billing } | null>;
  bump(userId: string, day: string, limit: number): Promise<Usage>;
  provider(): Promise<VisionProvider>;
  /** a day's analyses on Pro (fair use), and on the free plan (R5) */
  limit: number;
  freeLimit: number;
  cap: number;
  timeoutMs?: number;
};

const STATUS: Record<AnalyzeError, number> = { bad_request: 400, unauthorized: 401, too_large: 413, not_food: 422, daily_limit: 429, busy: 429, provider_error: 502, timeout: 504, pro_only: 402 };
const fail = (error: AnalyzeError, extra: object = {}) => json(STATUS[error], { ok: false, error, ...extra });
const TIMEOUT_MS = 20_000;

export const liveDeps = (): Deps => {
  const db = admin();
  return {
    caller: (r) => caller(r, db),
    bump: (u, d, l) => bumpUsage(db, u, d, l),
    provider: visionProvider,
    limit: envInt('AI_DAILY_USER_LIMIT', PRO_AI_PER_DAY),
    freeLimit: envInt('AI_DAILY_FREE_LIMIT', FREE_AI_PER_DAY),
    cap: envInt('AI_DAILY_GLOBAL_CAP', 400),
  };
};

export async function analyze(request: Request, deps: Deps = liveDeps()): Promise<Response> {
  if (request.method !== 'POST') return fail('bad_request');
  const user = await deps.caller(request);
  if (!user) return fail('unauthorized');
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) return fail('too_large');
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return fail('too_large');
  let parsed;
  try { parsed = analyzeRequest.safeParse(JSON.parse(text)); } catch { return fail('bad_request'); }
  if (!parsed.success) return fail('bad_request');
  const req = parsed.data;
  if (req.kind === 'voice') return voice(new Uint8Array(Buffer.from(req.audio, 'base64')), deps);
  const image = req.kind !== 'text' ? new Uint8Array(Buffer.from(req.image, 'base64')) : undefined;
  if (image && !(image[0] === 0xff && image[1] === 0xd8)) return fail('bad_request'); // not a JPEG

  // the server's UTC day, so a phone cannot pick dates to multiply its quota (it resets at 07:00 in Thailand)
  // R5: the plan sets the day's limit; the count is the same either way, so upgrading mid-day frees the rest at once
  const pro = isPro(user.billing);
  const limit = pro ? deps.limit : deps.freeLimit;
  const usage = await deps.bump(user.id, new Date().toISOString().slice(0, 10), limit).catch((e: Error) => { console.error('analyze quota failed', e.message); return null; });
  if (!usage) return fail('provider_error');
  const quota = { usedToday: Math.min(usage.used, limit), limit, plan: pro ? 'pro' : 'free' };
  if (!usage.allowed) return fail('daily_limit', { usage: quota });
  if (usage.total > deps.cap) return fail('busy');

  const provider = await deps.provider();
  const started = Date.now();
  const input: VisionInput = req.kind === 'photo' ? { image, hint: req.hint, locale: req.locale } : req.kind === 'label' ? { image, label: true, locale: req.locale } : { text: req.text, locale: req.locale };
  const got = await attempt(provider, (signal) => provider.analyze({ ...input, signal }), deps);
  if (!got.ok) return got.res;
  const raw = got.value;

  if (req.kind === 'label') {
    const read = labelOutput.safeParse(raw);
    if (!read.success) {
      console.error('label reply did not match the schema', { model: provider.model, ms: Date.now() - started });
      return fail('provider_error');
    }
    const label = toLabel(read.data);
    if (!label) return fail('not_food', { usage: quota });
    console.info('analyze', { kind: req.kind, model: provider.model, ms: Date.now() - started });
    return json(200, { ok: true, label, model: provider.model, usage: quota });
  }
  const out = modelOutput.safeParse(raw);
  if (!out.success) {
    console.error('analyze reply did not match the schema', { model: provider.model, ms: Date.now() - started });
    return fail('provider_error');
  }
  const items = out.data.is_food ? resolveItems(out.data.items, { photo: req.kind === 'photo' }) : [];
  if (!items.length) return fail('not_food', { usage: quota });
  console.info('analyze', { kind: req.kind, model: provider.model, items: items.length, ms: Date.now() - started });
  const kept = { ...out.data, items: out.data.items.slice(0, MAX_ITEMS) };
  return json(200, { ok: true, analysis: { title: out.data.title.trim().slice(0, 120), items, model: provider.model, raw: kept }, usage: quota });
}

/** The provider with a timeout and one retry on a timeout or a 5xx; a failure is the response to send. */
async function attempt<T>(provider: VisionProvider, run: (signal: AbortSignal) => Promise<T>, deps: Deps): Promise<{ ok: true; value: T } | { ok: false; res: Response }> {
  const started = Date.now();
  for (let n = 1; ; n++) {
    try {
      return { ok: true, value: await within(run, deps.timeoutMs ?? TIMEOUT_MS) };
    } catch (e) {
      const timedOut = e instanceof Timeout;
      const status = (e as { status?: number }).status ?? 0;
      if (n === 1 && (timedOut || status >= 500)) continue;
      console.error('analyze provider failed', { model: provider.model, attempt: n, status, timedOut, ms: Date.now() - started });
      // the provider's own rate limit (the free tier's daily cap) reads as busy, not broken
      return { ok: false, res: fail(timedOut ? 'timeout' : status === 429 ? 'busy' : 'provider_error') };
    }
  }
}

/**
 * R7, voice: a short WAV written down by the provider, for the Describe field to show and the person to fix. It is not
 * an analysis and is not counted: the description it becomes is, when it is sent. Never stored or logged.
 * shortcut: a signed-in caller can transcribe without a daily count, bounded by 15 s a call; count it if it is abused.
 */
async function voice(audio: Uint8Array, deps: Deps): Promise<Response> {
  const tag = (at: number) => String.fromCharCode(...audio.subarray(at, at + 4));
  if (audio.length <= 44 || tag(0) !== 'RIFF' || tag(8) !== 'WAVE') return fail('bad_request');
  if (audio.length > MAX_VOICE_BYTES) return fail('too_large');
  const provider = await deps.provider();
  const started = Date.now();
  const got = await attempt(provider, (signal) => provider.transcribe(audio, signal), deps);
  if (!got.ok) return got.res;
  console.info('analyze', { kind: 'voice', model: provider.model, ms: Date.now() - started });
  return json(200, { ok: true, text: String(got.value ?? '').trim().slice(0, MAX_TEXT), model: provider.model });
}
