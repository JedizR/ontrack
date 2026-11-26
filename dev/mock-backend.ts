// In-memory stand-in for Supabase: the same sync rules, a fake sign-in, thumbnails, DELETE /api/account, and
// POST /api/analyze and /api/coach through the real handlers with the mock providers and an in-memory quota.
// A web standard handler, so unit tests call it directly and the Vite plugin below mounts it for dev and e2e.
// Every request names a space (header x-mock-space, or ?space= on the Google redirect); each space is its own world,
// which keeps parallel tests apart. Tokens carry their space's epoch, so POST /__mock/expire ends every session in it.
import type { Connect, Plugin } from 'vite';
import { createHash } from 'node:crypto';
import * as z from 'zod/mini';
import { mealSchema, productSchema, recSchema, socialSchema, type Rec } from '../shared/records.ts';
import { SEARCH_MAX, SHARED_MAX, type Friend, type Person, type SharedMeal } from '../src/lib/backend/types.ts';
import { analyze } from '../server/handlers/analyze.ts';
import { coach } from '../server/handlers/coach.ts';
import { billing } from '../server/handlers/billing.ts';
import { FREE, FREE_ADVICE_PER_MONTH, FREE_AI_PER_DAY, TRIAL_DAYS, type Billing } from '../shared/plans.ts';
import type { StripeCall } from '../server/stripe.ts';
import { envInt } from '../server/env.ts';
import { fixture, isFixture, mockProvider } from '../server/vision/mock.ts';
import { mockCoach } from '../server/coach/mock.ts';
import { isOutcome, seedRecords } from './seed.ts';
import { today } from '../src/lib/model/dates.ts';
// Open Food Facts answers for the scanner (B1), as read on 12 November 2026 (open data under the ODbL); one is made up
import mama from '../tests/fixtures/off/8850987101021.json' with { type: 'json' };
import dutchMill from '../tests/fixtures/off/8851717040016.json' with { type: 'json' };
import whey from '../tests/fixtures/off/0748927028669.json' with { type: 'json' };
import noNutrition from '../tests/fixtures/off/8851234567898.json' with { type: 'json' };

const OFF: Record<string, object> = { '8850987101021': mama, '8851717040016': dutchMill, '0748927028669': whey, '8851234567898': noNutrition };

/** The only code the mock accepts. The dev server prints it when a code is "sent". */
export const MOCK_CODE = '123456';
export const MOCK_GOOGLE_EMAIL = 'google.user@example.com';
const PAGE_MAX = 1000;

type Row = { userId: string; rec: Rec; ts: number };
/** What the database publishes from records (supabase/migrations/0005_social.sql), and friendships keyed requester|addressee */
type Published = { profiles: Map<string, Person & { showProgram: boolean }>; programs: Map<string, unknown>; shared: Map<string, SharedMeal>; friends: Map<string, { requester: string; addressee: string; accepted: boolean; yesAt?: number }> };
/** vision: the fixture every analysis returns until cleared; ai: analyses per user and day, aiFrom where a count starts.
 * thumbs are keyed by storage path, `<userId>/<name>.jpg` */
/** billing (R5): each user's plan; `pro` is the plan of a user with none yet (tests seed Pro, the dev server starts free) */
type Space = Published & { demo: boolean; epoch: number; rows: Map<string, Row>; thumbs: Map<string, ArrayBuffer>; lastTs: number; vision: string | null; ai: Map<string, number>; aiFrom: number; billing: Map<string, Billing>; pro: boolean; barcodes: Map<string, unknown> };
type Token = { u: string; e: string; ep: number; s: string };

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
const fail = (status: number, error: string) => json(status, { ok: false, error });

/** The same email always gets the same id, so a restarted dev server still knows its users. */
const userIdFor = (email: string) => {
  const h = createHash('sha256').update(email.toLowerCase()).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const encode = (t: Token) => Buffer.from(JSON.stringify(t)).toString('base64url');
const decode = (s: string): Token | null => {
  try { return JSON.parse(Buffer.from(s, 'base64url').toString()) as Token; } catch { return null; }
};

const emailBody = z.object({ email: z.email() });
const verifyBody = z.object({ email: z.email(), code: z.string() });
const pushBody = z.object({ records: z.array(recSchema).check(z.maxLength(100)) });
const pullBody = z.object({ after: z.nullable(z.string()), inclusive: z.optional(z.boolean()), limit: z.int().check(z.gte(1), z.lte(PAGE_MAX)) });
const planBody = z.object({ pro: z.boolean() });
const visionBody = z.object({ fixture: z.optional(z.nullable(z.string())), used: z.optional(z.int().check(z.gte(0))) });
const handleBody = z.object({ handle: z.string() });
const searchBody = z.object({ prefix: z.string() });
const userBody = z.object({ id: z.string() });
const barcode = z.string().check(z.regex(/^[0-9]{8,14}$/));
const barcodeBody = z.object({ code: barcode });
const addBarcodeBody = z.object({ code: barcode, product: productSchema });
const boxBody = z.object({ south: z.number(), west: z.number(), north: z.number(), east: z.number() });
/** The database's checks on what it publishes: a profile's handle and name, a shared meal's place. */
const publishable = (r: Rec) =>
  r.deleted || (r.collection === 'social' ? socialSchema.safeParse(r.data).success : r.collection !== 'meal' || mealSchema.shape.share.safeParse((r.data as { share?: unknown }).share).success);
const round = (n: number, places: number) => Math.round(n * 10 ** places) / 10 ** places;

const planOf = (space: Space, userId: string): Billing => space.billing.get(userId) ?? (space.pro ? { tier: 'pro' } : FREE);
/** Stripe in memory (R5): Checkout comes straight back paid, as the 0 THB preview does, into the trial. Only the calls server/handlers/billing.ts makes. */
function fakeStripe(space: Space, userId: string): StripeCall {
  const sub = (interval: string, cancel = false) => ({
    id: `sub_mock_${userId}`, status: 'trialing', customer: `cus_mock_${userId}`, cancel_at_period_end: cancel,
    items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + TRIAL_DAYS * 86_400, price: { recurring: { interval } } }] },
  });
  return async (method, path, params = {}) => {
    if (path === 'coupons') return {} as never;
    if (path === 'checkout/sessions') return { url: params.success_url.replace('{CHECKOUT_SESSION_ID}', `mock_${params['line_items[0][price_data][recurring][interval]']}`) } as never;
    if (path.startsWith('checkout/sessions/mock_')) return { client_reference_id: userId, status: 'complete', subscription: sub(path.split('_').pop()!) } as never;
    if (path.startsWith('subscriptions/')) return sub(space.billing.get(userId)?.interval ?? 'month', method === 'POST' ? params.cancel_at_period_end === 'true' : false) as never;
    throw new Error(`fake stripe: ${method} ${path}`);
  };
}

/** The trigger records_publish: a user's accepted write, published for friends or taken back. */
function publish(space: Space, userId: string, rec: Rec) {
  const d = rec.data as Record<string, never>;
  if (rec.collection === 'social') {
    if (rec.deleted) {
      space.profiles.delete(userId);
      for (const [k, f] of space.friends) if (f.requester === userId || f.addressee === userId) space.friends.delete(k);
    } else {
      const was = space.profiles.get(userId);
      // shortcut, as the trigger's: a handle someone else holds is not taken over; the rest publishes
      const handle = [...space.profiles.values()].some((p) => p.handle === d.handle && p.id !== userId) ? was?.handle : (d.handle as string);
      if (handle) space.profiles.set(userId, { id: userId, handle, name: d.name, photo: d.photo ? `${userId}/${d.photo}.jpg` : null, showProgram: !!d.showProgram });
      if (space.demo && !was && !isDemo(userId)) space.friends.set(`${demoId('ploy')}|${userId}`, { requester: demoId('ploy'), addressee: userId, accepted: false });
    }
  }
  if (rec.collection === 'meal') {
    const k = `${userId}|${rec.id}`;
    const share = d.share as { lat: number; lng: number } | undefined;
    if (rec.deleted || !share) space.shared.delete(k);
    else {
      const sum = (f: 'kcal' | 'protein' | 'carbs' | 'fat') => (d.items as Record<string, number>[]).reduce((a, i) => a + i[f], 0);
      space.shared.set(k, {
        owner: userId, mealId: rec.id, lat: round(share.lat, 3), lng: round(share.lng, 3), takenAt: new Date(d.at).toISOString(), title: d.title,
        kcal: Math.round(sum('kcal')), protein: round(sum('protein'), 1), carbs: round(sum('carbs'), 1), fat: round(sum('fat'), 1), photo: d.thumb ? `${userId}/${rec.id}.jpg` : null,
      });
    }
  }
  if (rec.collection === 'social' || rec.collection === 'program') {
    const program = space.rows.get(`${userId}|program|program`)?.rec;
    if (space.profiles.get(userId)?.showProgram && program && !program.deleted) space.programs.set(userId, program.data);
    else space.programs.delete(userId);
  }
}
/** private.sees: the owner, or an accepted friend of the owner */
const sees = (space: Space, viewer: string, owner: string) =>
  viewer === owner || !!(space.friends.get(`${viewer}|${owner}`)?.accepted || space.friends.get(`${owner}|${viewer}`)?.accepted);
const person = ({ showProgram: _, ...p }: Person & { showProgram: boolean }): Person => p;

/** Dev only (the default space, never a test's): people to find, so one phone can try the whole friends loop. Rin, Kai and
 * Mai say yes a few seconds after you ask; Ploy asks you once you have a profile. */
const DEMO = [['rin', 'Rin'], ['kai_lifts', 'Kai'], ['mai', 'Mai'], ['ploy', 'Ploy']] as const;
const demoId = (handle: string) => userIdFor(`${handle}@demo.test`);
const isDemo = (id: string) => DEMO.some(([h]) => demoId(h) === id);
const DEMO_YES_MS = 4000;

export function createMockServer() {
  const spaces = new Map<string, Space>();
  const spaceOf = (name: string) => {
    if (!spaces.has(name)) spaces.set(name, { demo: name === 'default', epoch: 0, rows: new Map(), thumbs: new Map(), lastTs: 0, vision: null, ai: new Map(), aiFrom: 0, billing: new Map(), pro: false, profiles: new Map(), programs: new Map(), shared: new Map(), friends: new Map(), barcodes: new Map() });
    const space = spaces.get(name)!;
    if (space.demo && !space.profiles.size) for (const [handle, who] of DEMO) space.profiles.set(demoId(handle), { id: demoId(handle), handle, name: who, photo: null, showProgram: false });
    return space;
  };
  /** A write as the database takes it: a stale or repeated one is skipped (sync rule 2). */
  const put = (space: Space, userId: string, rec: Rec) => {
    const k = `${userId}|${rec.collection}|${rec.id}`;
    const stored = space.rows.get(k);
    if (stored && rec.updatedAt <= stored.rec.updatedAt) return;
    space.lastTs = Math.max(Date.now(), space.lastTs + 1);
    space.rows.set(k, { userId, rec, ts: space.lastTs });
    publish(space, userId, rec);
  };
  const session = (name: string, email: string) => {
    const userId = userIdFor(email);
    return { token: encode({ u: userId, e: email, ep: spaceOf(name).epoch, s: name }), userId, email };
  };

  return async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const token = decode(req.headers.get('authorization')?.replace(/^Bearer /, '') ?? '');
    // a token knows its space, so the app's own fetch to /api/account needs no mock header
    const name = req.headers.get('x-mock-space') ?? url.searchParams.get('space') ?? token?.s ?? 'default';
    const space = spaceOf(name);
    const path = url.pathname.replace(/^\/__mock/, '');
    const body = async <T>(schema: z.ZodMiniType<T>) => schema.safeParse(await req.json().catch(() => null));

    if (req.method === 'GET' && path === '/auth/google') {
      // the provider round trip: back to the app with a session in the fragment, as a redirect sign-in would
      const back = new URL(url.searchParams.get('redirect') ?? '/', url.origin);
      if (back.origin !== url.origin) return fail(400, 'bad_request');
      back.hash = `mock-session=${encodeURIComponent(JSON.stringify(session(name, MOCK_GOOGLE_EMAIL)))}`;
      return new Response(null, { status: 302, headers: { Location: back.toString() } });
    }
    if (path === '/auth/code') {
      const b = await body(emailBody);
      if (!b.success) return fail(400, 'bad_request');
      console.info(`[mock] sign-in code for ${b.data.email}: ${MOCK_CODE}`);
      return json(200, { ok: true });
    }
    if (path === '/auth/verify') {
      const b = await body(verifyBody);
      if (!b.success) return fail(400, 'bad_request');
      if (b.data.code !== MOCK_CODE) return fail(400, 'wrong_code');
      // <outcome>@seed.test signs in to four weeks of logs with that check-in due today (dev/seed.ts), once
      const outcome = /^(.+)@seed\.test$/.exec(b.data.email.toLowerCase())?.[1];
      const id = userIdFor(b.data.email);
      if (outcome && isOutcome(outcome) && ![...space.rows.values()].some((r) => r.userId === id)) {
        for (const rec of seedRecords(outcome, today())) put(space, id, rec);
      }
      return json(200, { ok: true, ...session(name, b.data.email) });
    }
    if (path.startsWith('/off/api/v2/product/')) {
      // Open Food Facts' product read, with its 404 for a barcode it does not have
      const code = path.slice('/off/api/v2/product/'.length);
      return Object.hasOwn(OFF, code) ? json(200, OFF[code]) : json(404, { code, status: 0, status_verbose: 'product not found' });
    }
    if (path === '/expire') {
      space.epoch++;
      return json(200, { ok: true });
    }
    if (path === '/plan') {
      // tests: { pro } sets the plan of every user in the space without one of their own (R5)
      const b = await body(planBody);
      if (!b.success) return fail(400, 'bad_request');
      space.pro = b.data.pro;
      space.billing.clear();
      return json(200, { ok: true });
    }
    if (path === '/vision') {
      // tests: { fixture } answers every analysis with it (null clears), { used } sets where today's count starts
      const b = await body(visionBody);
      if (!b.success || (b.data.fixture && !isFixture(b.data.fixture))) return fail(400, 'bad_request');
      if (b.data.fixture !== undefined) space.vision = b.data.fixture;
      if (b.data.used !== undefined) {
        space.ai.clear();
        space.aiFrom = b.data.used;
      }
      return json(200, { ok: true });
    }

    const userId = token && token.ep === space.epoch && token.s === name ? token.u : null;
    if (!userId) return fail(401, 'unauthorized');

    if (path === '/push') {
      const b = await body(pushBody);
      // like the database, one bad record refuses the batch
      if (!b.success || !(b.data.records as Rec[]).every(publishable)) return fail(400, 'bad_request');
      for (const rec of b.data.records as Rec[]) put(space, userId, rec);
      return json(200, { ok: true });
    }
    if (path === '/pull') {
      const b = await body(pullBody);
      if (!b.success) return fail(400, 'bad_request');
      const after = b.data.after ? Date.parse(b.data.after) : -Infinity;
      const rows = [...space.rows.values()]
        .filter((r) => r.userId === userId && (b.data.inclusive ? r.ts >= after : r.ts > after))
        .sort((a, z) => a.ts - z.ts)
        .slice(0, b.data.limit)
        .map((r) => ({ rec: r.rec, ts: new Date(r.ts).toISOString() }));
      return json(200, { ok: true, rows });
    }
    if (path.startsWith('/thumb/')) {
      const k = `${userId}/${decodeURIComponent(path.slice('/thumb/'.length))}.jpg`;
      if (req.method === 'PUT') {
        space.thumbs.set(k, await req.arrayBuffer());
        return json(200, { ok: true });
      }
      if (req.method === 'DELETE') {
        space.thumbs.delete(k);
        return json(200, { ok: true });
      }
      const bytes = space.thumbs.get(k);
      return bytes ? new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } }) : fail(404, 'not_found');
    }
    if (path === '/api/analyze' || path === '/api/coach') {
      // one count for both: a coach answer costs what an analysis does
      const deps = {
        caller: async () => ({ id: userId, billing: planOf(space, userId) }),
        async bump(u: string, day: string, limit: number) {
          const k = `${u}|${day}`;
          const used = (space.ai.get(k) ?? space.aiFrom) + 1;
          space.ai.set(k, used);
          return { allowed: used <= limit, used, total: used };
        },
        adviceUsed: async (u: string, month: string) => space.ai.get(`advice|${u}|${month}`) ?? 0,
        async advice(u: string, month: string) {
          const k = `advice|${u}|${month}`;
          const used = (space.ai.get(k) ?? 0) + 1;
          space.ai.set(k, used);
          return used;
        },
        freeAdvice: envInt('AI_FREE_ADVICE_PER_MONTH', FREE_ADVICE_PER_MONTH),
        limit: envInt('AI_DAILY_USER_LIMIT', 40),
        freeLimit: envInt('AI_DAILY_FREE_LIMIT', FREE_AI_PER_DAY),
        cap: envInt('AI_DAILY_GLOBAL_CAP', 400),
      };
      if (path === '/api/coach') return coach(req, { ...deps, provider: async () => mockCoach });
      return analyze(req, {
        ...deps,
        provider: async () => {
          const name = space.vision;
          return name ? { ...mockProvider, analyze: async () => fixture(name) } : mockProvider;
        },
      });
    }
    if (path === '/api/billing') {
      return billing(req, { caller: async () => ({ id: userId, billing: planOf(space, userId) }), save: async (id, b) => void space.billing.set(id, b), stripe: fakeStripe(space, userId), configured: true });
    }
    if (path.startsWith('/social/')) return social(space, userId, path.slice('/social/'.length), req);
    if (path === '/api/account') {
      // the social side first, as the handler does: friends stop seeing this person at once
      publish(space, userId, { collection: 'social', id: 'social', updatedAt: 0, deleted: true, data: {} });
      for (const k of space.shared.keys()) if (k.startsWith(`${userId}|`)) space.shared.delete(k);
      space.programs.delete(userId);
      for (const [k, r] of space.rows) if (r.userId === userId) space.rows.delete(k);
      for (const k of space.thumbs.keys()) if (k.startsWith(`${userId}/`)) space.thumbs.delete(k);
      return json(200, { ok: true });
    }
    return fail(404, 'not_found');
  };
}

/** Backend.social on the mock, under the same visibility as the database's row level security. */
async function social(space: Space, me: string, op: string, req: Request): Promise<Response> {
  const body = async <T>(schema: z.ZodMiniType<T>) => schema.safeParse(await req.json().catch(() => null));
  const ok = (extra: object = {}) => json(200, { ok: true, ...extra });
  if (op.startsWith('photo/')) {
    const path = decodeURIComponent(op.slice('photo/'.length));
    const readable = path.startsWith(`${me}/`) || [...space.shared.values()].some((s) => s.photo === path && sees(space, me, s.owner)) || [...space.profiles.values()].some((p) => p.photo === path);
    const bytes = readable && space.thumbs.get(path);
    return bytes ? new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } }) : fail(404, 'not_found');
  }
  if (op === 'free') {
    const b = await body(handleBody);
    if (!b.success) return fail(400, 'bad_request');
    return ok({ free: ![...space.profiles.values()].some((p) => p.handle === b.data.handle && p.id !== me) });
  }
  if (op === 'search') {
    const b = await body(searchBody);
    if (!b.success) return fail(400, 'bad_request');
    const people = [...space.profiles.values()].filter((p) => p.id !== me && p.handle.startsWith(b.data.prefix)).sort((a, z) => (a.handle < z.handle ? -1 : 1));
    return ok({ people: people.slice(0, SEARCH_MAX).map(person) });
  }
  if (op === 'friends') {
    for (const f of space.friends.values()) if (f.yesAt && f.yesAt <= Date.now()) { f.accepted = true; f.yesAt = undefined; }
    const friends: Friend[] = [];
    for (const f of space.friends.values()) {
      const other = f.requester === me ? f.addressee : f.addressee === me ? f.requester : null;
      const who = other && space.profiles.get(other);
      if (who) friends.push({ ...person(who), status: f.accepted ? 'friend' : f.requester === me ? 'outgoing' : 'incoming' });
    }
    return ok({ friends });
  }
  if (op === 'shared') {
    const b = await body(boxBody);
    if (!b.success) return fail(400, 'bad_request');
    const { south, west, north, east } = b.data;
    const inside = (m: SharedMeal) => m.lat >= south && m.lat <= north && (west <= east ? m.lng >= west && m.lng <= east : m.lng >= west || m.lng <= east);
    const meals = [...space.shared.values()].filter((m) => sees(space, me, m.owner) && inside(m)).sort((a, z) => z.takenAt.localeCompare(a.takenAt));
    return ok({ meals: meals.slice(0, SHARED_MAX) });
  }
  // Backend.products: every user in the space reads them all; the first one added for a barcode stays (0007_advice_barcodes.sql)
  if (op === 'barcode') {
    const c = await body(barcodeBody);
    return c.success ? ok({ product: space.barcodes.get(c.data.code) ?? null }) : fail(400, 'bad_request');
  }
  if (op === 'addBarcode') {
    const c = await body(addBarcodeBody);
    if (!c.success || JSON.stringify(c.data.product).length > 2048) return fail(400, 'bad_request');
    if (space.barcodes.has(c.data.code)) return ok({ added: false });
    space.barcodes.set(c.data.code, c.data.product);
    return ok({ added: true });
  }
  const b = await body(userBody);
  if (!b.success) return fail(400, 'bad_request');
  const them = b.data.id;
  const theirs = space.friends.get(`${them}|${me}`);
  if (op === 'program') return ok({ program: (sees(space, me, them) && space.programs.get(them)) || null });
  if (op === 'accept' || (op === 'request' && theirs)) {
    if (!theirs) return fail(400, 'bad_request');
    theirs.accepted = true;
    return ok();
  }
  if (op === 'request') {
    // the database's checks: both have a profile, not yourself; asking again changes nothing
    if (them === me || !space.profiles.has(me) || !space.profiles.has(them)) return fail(400, 'bad_request');
    if (!space.friends.has(`${me}|${them}`)) space.friends.set(`${me}|${them}`, { requester: me, addressee: them, accepted: false, ...(space.demo && isDemo(them) ? { yesAt: Date.now() + DEMO_YES_MS } : {}) });
    return ok();
  }
  if (op === 'remove') {
    space.friends.delete(`${me}|${them}`);
    space.friends.delete(`${them}|${me}`);
    return ok();
  }
  return fail(404, 'not_found');
}

/** Node request in, web Request to the handler, Response back out. Shared with dev/api-middleware.ts. */
export const toMiddleware = (handle: (r: Request) => Promise<Response>): Connect.NextHandleFunction => (req, res) => {
  const run = async () => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v);
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
    const request = new Request(`http://${req.headers.host}${req.originalUrl ?? req.url}`, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined });
    const out = await handle(request);
    res.writeHead(out.status, Object.fromEntries(out.headers));
    res.end(Buffer.from(await out.arrayBuffer()));
  };
  // a page closed mid-request aborts the body stream; that must not take the dev server down
  run().catch((e) => {
    if (req.destroyed || res.destroyed) return;
    console.error(e);
    if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{"ok":false,"error":"server_error"}');
  });
};

/** Mounts the mock at /__mock, and at /api/account, /api/analyze and /api/coach when the app runs on the mock backend. */
export function mockBackend(): Plugin {
  const mw = toMiddleware(createMockServer());
  const mount = (m: Connect.Server) => {
    m.use('/__mock', mw);
    if (process.env.VITE_BACKEND === 'mock') m.use('/api/account', (req, res, next) => (req.method === 'DELETE' ? void mw(req, res, next) : next()));
    if (process.env.VITE_BACKEND === 'mock') m.use('/api/analyze', mw);
    if (process.env.VITE_BACKEND === 'mock') m.use('/api/coach', mw);
    if (process.env.VITE_BACKEND === 'mock') m.use('/api/billing', mw);
  };
  return { name: 'ontrack-mock-backend', configureServer: (s) => mount(s.middlewares), configurePreviewServer: (s) => mount(s.middlewares) };
}
