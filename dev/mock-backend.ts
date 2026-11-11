// In-memory stand-in for Supabase: the same sync rules, a fake sign-in, thumbnails and DELETE /api/account.
// A web standard handler, so unit tests call it directly and the Vite plugin below mounts it for dev and e2e.
// Every request names a space (header x-mock-space, or ?space= on the Google redirect); each space is its own world,
// which keeps parallel tests apart. Tokens carry their space's epoch, so POST /__mock/expire ends every session in it.
import type { Connect, Plugin } from 'vite';
import { createHash } from 'node:crypto';
import * as z from 'zod/mini';
import { recSchema, type Rec } from '../shared/records.ts';

/** The only code the mock accepts. The dev server prints it when a code is "sent". */
export const MOCK_CODE = '123456';
export const MOCK_GOOGLE_EMAIL = 'google.user@example.com';
const PAGE_MAX = 1000;

type Row = { userId: string; rec: Rec; ts: number };
type Space = { epoch: number; rows: Map<string, Row>; thumbs: Map<string, ArrayBuffer>; lastTs: number };
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

export function createMockServer() {
  const spaces = new Map<string, Space>();
  const spaceOf = (name: string) => {
    if (!spaces.has(name)) spaces.set(name, { epoch: 0, rows: new Map(), thumbs: new Map(), lastTs: 0 });
    return spaces.get(name)!;
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
      return json(200, { ok: true, ...session(name, b.data.email) });
    }
    if (path === '/expire') {
      space.epoch++;
      return json(200, { ok: true });
    }

    const userId = token && token.ep === space.epoch && token.s === name ? token.u : null;
    if (!userId) return fail(401, 'unauthorized');

    if (path === '/push') {
      const b = await body(pushBody);
      if (!b.success) return fail(400, 'bad_request'); // like the database, one bad record refuses the batch
      for (const rec of b.data.records as Rec[]) {
        const k = `${userId}|${rec.collection}|${rec.id}`;
        const stored = space.rows.get(k);
        if (stored && rec.updatedAt <= stored.rec.updatedAt) continue; // sync rule 2: stale or repeated
        space.lastTs = Math.max(Date.now(), space.lastTs + 1);
        space.rows.set(k, { userId, rec, ts: space.lastTs });
      }
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
      const k = `${userId}/${decodeURIComponent(path.slice('/thumb/'.length))}`;
      if (req.method === 'PUT') {
        space.thumbs.set(k, await req.arrayBuffer());
        return json(200, { ok: true });
      }
      const bytes = space.thumbs.get(k);
      return bytes ? new Response(bytes, { headers: { 'Content-Type': 'image/jpeg' } }) : fail(404, 'not_found');
    }
    if (path === '/api/account') {
      for (const [k, r] of space.rows) if (r.userId === userId) space.rows.delete(k);
      for (const k of space.thumbs.keys()) if (k.startsWith(`${userId}/`)) space.thumbs.delete(k);
      return json(200, { ok: true });
    }
    return fail(404, 'not_found');
  };
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

/** Mounts the mock at /__mock, and at /api/account when the app runs on the mock backend. */
export function mockBackend(): Plugin {
  const mw = toMiddleware(createMockServer());
  const mount = (m: Connect.Server) => {
    m.use('/__mock', mw);
    if (process.env.VITE_BACKEND === 'mock') m.use('/api/account', (req, res, next) => (req.method === 'DELETE' ? void mw(req, res, next) : next()));
  };
  return { name: 'ontrack-mock-backend', configureServer: (s) => mount(s.middlewares), configurePreviewServer: (s) => mount(s.middlewares) };
}
