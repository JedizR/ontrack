// POST /api/analyze (TECH-SPEC section 7): token, body, quota, the provider with a timeout and one retry, the model's
// JSON checked, items resolved against the food table. Logs duration, model and item count, never the image or text.
// The dependencies are passed in so the mock backend and the unit tests run this same handler.
import { admin, caller } from '../auth.js';
import { json } from '../http.js';
import { envInt } from '../env.js';
import { bumpUsage, type Usage } from '../quota.js';
import { visionProvider, type VisionInput, type VisionProvider } from '../vision/provider.js';
import { modelOutput } from '../vision/schema.js';
import { MAX_ITEMS, resolveItems } from '../vision/resolve.js';
import { analyzeRequest, MAX_BODY_BYTES, type AnalyzeError } from '../../shared/analysis.js';

export type Deps = {
  caller(request: Request): Promise<{ id: string } | null>;
  bump(userId: string, day: string, limit: number): Promise<Usage>;
  provider(): Promise<VisionProvider>;
  limit: number;
  cap: number;
  timeoutMs?: number;
};

const STATUS: Record<AnalyzeError, number> = { bad_request: 400, unauthorized: 401, too_large: 413, not_food: 422, daily_limit: 429, busy: 429, provider_error: 502, timeout: 504 };
const fail = (error: AnalyzeError, extra: object = {}) => json(STATUS[error], { ok: false, error, ...extra });
const TIMEOUT_MS = 20_000;

export const liveDeps = (): Deps => {
  const db = admin();
  return {
    caller: (r) => caller(r, db),
    bump: (u, d, l) => bumpUsage(db, u, d, l),
    provider: visionProvider,
    limit: envInt('AI_DAILY_USER_LIMIT', 40),
    cap: envInt('AI_DAILY_GLOBAL_CAP', 400),
  };
};

class Timeout extends Error {}
/** The provider's answer, or Timeout after `ms`, aborting the call. */
async function within(p: VisionProvider, input: VisionInput, ms: number) {
  const ac = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => { timer = setTimeout(() => { reject(new Timeout()); ac.abort(); }, ms); });
  try {
    return await Promise.race([p.analyze({ ...input, signal: ac.signal }), late]);
  } finally {
    clearTimeout(timer);
  }
}

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
  const image = req.kind === 'photo' ? new Uint8Array(Buffer.from(req.image, 'base64')) : undefined;
  if (image && !(image[0] === 0xff && image[1] === 0xd8)) return fail('bad_request'); // not a JPEG

  // the server's UTC day, so a phone cannot pick dates to multiply its quota (it resets at 07:00 in Thailand)
  const usage = await deps.bump(user.id, new Date().toISOString().slice(0, 10), deps.limit).catch((e: Error) => { console.error('analyze quota failed', e.message); return null; });
  if (!usage) return fail('provider_error');
  const quota = { usedToday: Math.min(usage.used, deps.limit), limit: deps.limit };
  if (!usage.allowed) return fail('daily_limit', { usage: quota });
  if (usage.total > deps.cap) return fail('busy');

  const provider = await deps.provider();
  const input: VisionInput = req.kind === 'photo' ? { image, hint: req.hint, locale: req.locale } : { text: req.text, locale: req.locale };
  const started = Date.now();
  let raw: unknown;
  for (let attempt = 1; ; attempt++) {
    try {
      raw = await within(provider, input, deps.timeoutMs ?? TIMEOUT_MS);
      break;
    } catch (e) {
      const timedOut = e instanceof Timeout;
      const status = (e as { status?: number }).status ?? 0;
      if (attempt === 1 && (timedOut || status >= 500)) continue;
      console.error('analyze provider failed', { model: provider.model, attempt, status, timedOut, ms: Date.now() - started });
      return fail(timedOut ? 'timeout' : 'provider_error');
    }
  }

  const out = modelOutput.safeParse(raw);
  if (!out.success) {
    console.error('analyze reply did not match the schema', { model: provider.model, ms: Date.now() - started });
    return fail('provider_error');
  }
  const items = out.data.is_food ? resolveItems(out.data.items) : [];
  if (!items.length) return fail('not_food', { usage: quota });
  console.info('analyze', { kind: req.kind, model: provider.model, items: items.length, ms: Date.now() - started });
  const kept = { ...out.data, items: out.data.items.slice(0, MAX_ITEMS) };
  return json(200, { ok: true, analysis: { title: out.data.title.trim().slice(0, 120), items, model: provider.model, raw: kept }, usage: quota });
}
