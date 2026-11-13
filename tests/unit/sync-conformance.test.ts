// TECH-SPEC section 5, checked against every Backend: the mock always, Supabase when SUPABASE_TEST_EMAIL is set
// (with SUPABASE_URL, SUPABASE_SECRET_KEY and VITE_SUPABASE_PUBLISHABLE_KEY). Test users are made with the secret key
// and removed at the end through the real DELETE /api/account handler. The social tests (S1) are the visibility suite:
// a stranger cannot read, a friend can, a removed friend cannot, for rows and photos.
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterAll, describe, expect, test } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createMockServer, MOCK_CODE } from '../../dev/mock-backend';
import { createMockBackend } from '../../src/lib/backend/mock';
import { createSupabaseBackend } from '../../src/lib/backend/supabase';
import { BackendError, type Backend } from '../../src/lib/backend/types';
import { Store } from '../../src/lib/db/store.svelte';
import { Sync } from '../../src/lib/sync/engine.svelte';
import { account } from '../../server/handlers/account';
import type { Rec } from '../../shared/records';

type Harness = {
  name: string;
  /** a signed in backend for this email; the same email is the same user */
  signIn(email: string): Promise<Backend>;
  /** ends the session the way an expiry would */
  expire(b: Backend): Promise<void>;
  deleteAccount(b: Backend): Promise<number>;
  /** removes test users whose sessions ended before they could delete themselves */
  cleanup(tag: string): Promise<void>;
  /** the database client behind a backend, to try what the app never does (Supabase only) */
  raw?(b: Backend): SupabaseClient;
  /** a new access token for the same session. Supabase's CDN keeps serving an object a token already downloaded until
   * that token expires, whatever the policies say now; a fresh token shows what the database allows */
  renew?(b: Backend): Promise<void>;
};

function mockHarness(): Harness {
  const server = createMockServer();
  const space = `conformance-${Date.now()}`;
  const fetch = (url: RequestInfo | URL, init?: RequestInit) => server(new Request(url, init));
  return {
    name: 'mock',
    async signIn(email) {
      const b = createMockBackend({ base: 'http://mock', fetch, space });
      await b.auth.sendEmailCode(email);
      await b.auth.verifyEmailCode(email, MOCK_CODE);
      return b;
    },
    async expire() {
      await fetch('http://mock/__mock/expire', { method: 'POST', headers: { 'x-mock-space': space } });
    },
    async deleteAccount(b) {
      const res = await fetch('http://mock/api/account', { method: 'DELETE', headers: { 'x-mock-space': space, authorization: `Bearer ${await b.accessToken()}` } });
      return res.status;
    },
    async cleanup() {},
  };
}

function supabaseHarness(): Harness {
  const url = process.env.SUPABASE_URL!;
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const clients = new Map<Backend, SupabaseClient>();
  return {
    name: 'supabase',
    async signIn(email) {
      await admin.auth.admin.createUser({ email, email_confirm: true }); // fails harmlessly when the user exists
      const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
      if (link.error) throw link.error;
      const sb = createClient(url, process.env.VITE_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
      const v = await sb.auth.verifyOtp({ email, token: link.data.properties.email_otp, type: 'email' });
      if (v.error) throw v.error;
      const b = createSupabaseBackend(sb);
      clients.set(b, sb);
      return b;
    },
    async expire(b) {
      await clients.get(b)!.auth.signOut({ scope: 'local' });
    },
    async deleteAccount(b) {
      const res = await account(new Request('http://x/api/account', { method: 'DELETE', headers: { authorization: `Bearer ${await b.accessToken()}` } }));
      return res.status;
    },
    raw: (b) => clients.get(b)!,
    async renew(b) {
      const r = await clients.get(b)!.auth.refreshSession();
      if (r.error) throw r.error;
    },
    async cleanup(tag) {
      const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
      for (const u of data.users.filter((u) => u.email?.includes(tag))) {
        const files = (await admin.storage.from('meal-photos').list(u.id)).data ?? [];
        if (files.length) await admin.storage.from('meal-photos').remove(files.map((f) => `${u.id}/${f.name}`));
        await admin.auth.admin.deleteUser(u.id);
      }
    },
  };
}

const harnesses = [mockHarness()];
if (process.env.SUPABASE_TEST_EMAIL) harnesses.push(supabaseHarness());

const rec = (id: string, updatedAt: number, data: Record<string, unknown> = { date: '2026-11-12', kg: 80 }, deleted = false): Rec => ({
  collection: 'weight',
  id,
  updatedAt,
  data,
  ...(deleted ? { deleted: true as const } : {}),
});
const byId = (rs: Rec[], id: string) => rs.filter((r) => r.id === id).at(-1);
const failKind = (p: Promise<unknown>) => p.then(() => 'ok', (e) => (e instanceof BackendError ? e.kind : String(e)));

/** A phone: its own IndexedDB, store and sync engine. */
async function device(b: Backend) {
  const idb = (globalThis.indexedDB = new IDBFactory());
  const store = new Store();
  const user = (await b.auth.session())!;
  await store.open(user.userId);
  const sync = new Sync(store);
  sync.start(b);
  await sync.run();
  return { store, sync, idb };
}

describe.each(harnesses)('sync conformance: $name', (h) => {
  const tag = `${Date.now()}`;
  const base = process.env.SUPABASE_TEST_EMAIL ?? 'conformance@example.com';
  const email = (who: string) => base.replace('@', `+${who}${tag}@`);
  const signedIn: Backend[] = [];
  const signIn = async (who: string) => {
    const b = await h.signIn(email(who));
    signedIn.push(b);
    return b;
  };

  afterAll(async () => {
    // one deletion per user is enough; later ones fail with 401, which is fine
    for (const b of signedIn) await h.deleteAccount(b).catch(() => 0);
    await h.cleanup(tag);
  }, 60_000); // a network round trip per test user on Supabase

  test('records round trip with their data and tombstones', async () => {
    const b = await signIn('a');
    await b.push([rec('weight:2026-11-10', 1000), rec('weight:2026-11-11', 1000, { date: '2026-11-11', kg: 79.5 }, true)]);
    const { records, cursor } = await b.pull(null);
    expect(byId(records, 'weight:2026-11-10')).toEqual(rec('weight:2026-11-10', 1000));
    expect(byId(records, 'weight:2026-11-11')).toEqual(rec('weight:2026-11-11', 1000, { date: '2026-11-11', kg: 79.5 }, true));
    expect(cursor).not.toBe('');
  });

  test('rule 2: the server keeps the newest write, ignoring stale and repeated ones without error', async () => {
    const b = await signIn('b');
    await b.push([rec('w', 2000, { date: '2026-11-12', kg: 80 })]);
    await b.push([rec('w', 1999, { date: '2026-11-12', kg: 1 })]);
    await b.push([rec('w', 2000, { date: '2026-11-12', kg: 2 })]);
    expect(byId((await b.pull(null)).records, 'w')?.data).toEqual({ date: '2026-11-12', kg: 80 });
    await b.push([rec('w', 2001, { date: '2026-11-12', kg: 81 })]);
    expect(byId((await b.pull(null)).records, 'w')).toEqual(rec('w', 2001, { date: '2026-11-12', kg: 81 }));
  });

  test('rule 3: a pull from the cursor returns what was written after it, and the cursor never moves back', async () => {
    const b = await signIn('c');
    await b.push([rec('first', 1)]);
    const one = await b.pull(null);
    await b.push([rec('second', 1)]);
    const two = await b.pull(one.cursor);
    expect(two.records.map((r) => r.id)).toContain('second');
    expect(Date.parse(two.cursor)).toBeGreaterThanOrEqual(Date.parse(one.cursor));
    const three = await b.pull(two.cursor);
    expect(Date.parse(three.cursor)).toBeGreaterThanOrEqual(Date.parse(two.cursor));
  });

  test('rule 3: pulls page past 500 rows until a short page', async () => {
    const b = await signIn('d');
    const many = Array.from({ length: 620 }, (_, i) => rec(`p${i}`, 1));
    for (let i = 0; i < many.length; i += 100) await b.push(many.slice(i, i + 100));
    const { records } = await b.pull(null);
    expect(records.length).toBe(620); // pages overlap by their boundary timestamp; nothing comes twice
    expect(new Set(records.map((r) => r.id)).size).toBe(620);
  });

  test('each user sees only their own records and thumbnails', async () => {
    const a = await signIn('e');
    const z = await signIn('f');
    await a.push([rec('mine', 5)]);
    await a.putThumb('meal-1', new Blob([new Uint8Array([255, 216, 255, 1, 2, 3])], { type: 'image/jpeg' }));
    expect((await z.pull(null)).records).toEqual([]);
    expect(await z.getThumb('meal-1')).toBeNull();
    const got = await a.getThumb('meal-1');
    expect([...new Uint8Array(await got!.arrayBuffer())]).toEqual([255, 216, 255, 1, 2, 3]);
    expect(await a.getThumb('never')).toBeNull();
    // M9a: a deleted meal's thumbnail leaves storage; another user cannot delete it, and deleting one that is gone is fine
    await z.dropThumb('meal-1');
    expect(await a.getThumb('meal-1')).not.toBeNull();
    await a.dropThumb('meal-1');
    await h.renew?.(a); // Supabase's Storage CDN serves a download it cached for a token until that token changes (S1a)
    expect(await a.getThumb('meal-1')).toBeNull();
    await a.dropThumb('meal-1');
  });

  test('remembered nutrition (the food collection, N1) round trips and stays with its user', async () => {
    const a = await signIn('m');
    const z = await signIn('n');
    const food = (id: string, kcal: number): Rec => ({ collection: 'food', id, updatedAt: 10, data: { name: 'Pad thai', per100: { kcal, protein: 7.4, carbs: 24.9, fat: 8.4 } } });
    await a.push([food('pad-thai', 180), food('name:khao soi', 150)]);
    const { records } = await a.pull(null);
    expect(byId(records, 'pad-thai')).toEqual(food('pad-thai', 180));
    expect(byId(records, 'name:khao soi')).toEqual(food('name:khao soi', 150));
    expect((await z.pull(null)).records).toEqual([]);
  });

  test('supplements (the supplement collection, N2) round trip and stay with their user', async () => {
    const a = await signIn('s');
    const z = await signIn('t');
    const whey: Rec = { collection: 'supplement', id: 'sup-1', updatedAt: 10, data: { name: 'Whey', kind: 'whey', scoopG: 30, perScoop: { kcal: 120, protein: 24, carbs: 3, fat: 1.5 }, lastScoops: 2, lastMix: { foodId: 'milk-whole', grams: 250 } } };
    const entry: Rec = { collection: 'meal', id: 'meal-s', updatedAt: 10, data: { date: '2026-11-12', at: '2026-11-12T00:30:00.000Z', title: 'Whey', method: 'supplement', items: [{ name: 'Whey', grams: 60, kcal: 240, protein: 48, carbs: 6, fat: 3, source: 'yours', supplementId: 'sup-1', scoops: 2 }] } };
    await a.push([whey, entry]);
    const { records } = await a.pull(null);
    expect(byId(records, 'sup-1')).toEqual(whey);
    expect(byId(records, 'meal-s')).toEqual(entry);
    expect((await z.pull(null)).records).toEqual([]);
  });

  test('scanned products (the product collection, B1) round trip by barcode and stay with their user', async () => {
    const a = await signIn('p');
    const z = await signIn('q');
    const mama: Rec = { collection: 'product', id: '8850987101021', updatedAt: 10, data: { name: 'Mama tom yum', brand: 'Mama', source: 'off', unit: 'g', per100: { kcal: 472.73, protein: 9.09, carbs: 61.82, fat: 20 }, servingG: 55, packG: 55, lastG: 55 } };
    const entry: Rec = { collection: 'meal', id: 'meal-b', updatedAt: 10, data: { date: '2026-11-12', at: '2026-11-12T05:30:00.000Z', title: 'Mama tom yum', method: 'barcode', items: [{ name: 'Mama tom yum', grams: 55, kcal: 260, protein: 5, carbs: 34, fat: 11, source: 'off', barcode: '8850987101021' }] } };
    await a.push([mama, entry]);
    const { records } = await a.pull(null);
    expect(byId(records, '8850987101021')).toEqual(mama);
    expect(byId(records, 'meal-b')).toEqual(entry);
    expect((await z.pull(null)).records).toEqual([]);
  });

  test('a record the database would refuse is refused as a bad request', async () => {
    const b = await signIn('g');
    expect(await failKind(b.push([rec('x'.repeat(81), 1)]))).toBe('bad_request');
  });

  test('an ended session fails as auth, not as an error to retry', async () => {
    const b = await signIn('h');
    await h.expire(b);
    expect(await failKind(b.push([rec('late', 1)]))).toBe('auth');
  });

  test('rules 1, 4 and 5 on two devices: offline edits arrive, in-flight edits stay queued, queued copies win ties', async () => {
    const b1 = await signIn('i');
    const b2 = await h.signIn(email('i'));
    signedIn.push(b2);
    const one = await device(b1);
    const two = await device(b2);
    expect(two.sync.pulled).toBe(true);

    one.store.put('weight', 'weight:2026-11-12', { date: '2026-11-12', kg: 80 });
    expect(one.store.pending).toBe(1);
    await one.sync.run();
    expect(one.store.pending).toBe(0);
    await two.sync.run();
    expect(two.store.get('weight', 'weight:2026-11-12')).toEqual({ date: '2026-11-12', kg: 80 });

    // edited while the push is in flight: the newer copy stays in the outbox
    const round = one.sync.run();
    one.store.put('weight', 'weight:2026-11-12', { date: '2026-11-12', kg: 79 });
    await round;
    await one.sync.run();
    expect(one.store.pending).toBe(0);
    await two.sync.run();
    expect(two.store.get('weight', 'weight:2026-11-12')).toEqual({ date: '2026-11-12', kg: 79 });

    // a tombstone travels, and a pulled copy with the same stamp never replaces a queued local one
    const prev = one.store.remove('weight', 'weight:2026-11-12')!;
    await one.sync.run();
    await two.sync.run();
    expect(two.store.get('weight', 'weight:2026-11-12')).toBeUndefined();
    expect(prev.data).toEqual({ date: '2026-11-12', kg: 79 });
    const queued = two.store.put('day', 'day:2026-11-12', { date: '2026-11-12', closed: true });
    two.store.applyRemote([{ ...queued, data: { date: '2026-11-12' } }]);
    expect(two.store.get('day', 'day:2026-11-12')).toEqual({ date: '2026-11-12', closed: true });

    // persisted: a reopened store has the records, the cursor and an empty outbox
    await one.store.settled();
    globalThis.indexedDB = one.idb;
    const again = new Store();
    await again.open(one.store.userId!);
    expect(again.meta.cursor).toBe(one.store.meta.cursor);
    expect(again.pending).toBe(0);
    expect(again.data.weight['weight:2026-11-12'].deleted).toBe(true);

    one.sync.stop();
    two.sync.stop();
  });

  test('a record the server refuses is set aside and never blocks the rest', async () => {
    const b = await signIn('l');
    const one = await device(b);
    one.store.put('weight', 'x'.repeat(81), { date: '2026-11-12', kg: 80 }); // past the id limit, as a bug might
    one.store.put('weight', 'weight:2026-11-12', { date: '2026-11-12', kg: 80 });
    await one.sync.run();
    expect(one.sync.status).toBe('idle');
    expect(one.store.pending).toBe(0);
    expect((await b.pull(null)).records.map((r) => r.id)).toEqual(['weight:2026-11-12']);
    one.sync.stop();
  });

  test('an expired session stops sync with status auth and keeps the data', async () => {
    const b = await signIn('j');
    const one = await device(b);
    await h.expire(b);
    one.store.put('weight', 'weight:2026-11-01', { date: '2026-11-01', kg: 70 });
    await one.sync.run();
    expect(one.sync.status).toBe('auth');
    expect(one.store.pending).toBe(1);
  });

  // ----- friends and the food map (S1): the visibility suite -----
  const SLOW = 60_000; // dozens of round trips to Supabase each
  const world = { south: -90, west: -180, north: 90, east: 180 };
  const jpeg = (n: number) => new Blob([new Uint8Array([255, 216, 255, n])], { type: 'image/jpeg' });
  const bytes = async (b: Blob | null) => b && [...new Uint8Array(await b.arrayBuffer())];
  const social = (handle: string, updatedAt = 1, extra: Record<string, unknown> = {}): Rec => ({ collection: 'social', id: 'social', updatedAt, data: { handle, name: `Name ${handle.slice(0, 2)}`, ...extra } });
  /** a signed in user with a published profile */
  const member = async (who: string, extra: Record<string, unknown> = {}) => {
    const b = await signIn(who);
    const handle = `${who}_${tag}`;
    await b.push([social(handle, 1, extra)]);
    return { b, id: (await b.auth.session())!.userId, handle };
  };
  type Member = Awaited<ReturnType<typeof member>>;
  const befriend = async (x: Member, y: Member) => {
    await x.b.social.request(y.id);
    await y.b.social.accept(x.id);
  };
  const program: Rec = { collection: 'program', id: 'program', updatedAt: 1, data: { name: 'Upper lower', sessions: [{ key: 'u1', weekday: 0, name: 'Upper', type: 'strength', minutes: 60, intensity: 'moderate' }] } };
  const shared = (id: string, updatedAt = 1, extra: Record<string, unknown> = {}): Rec => ({
    collection: 'meal', id, updatedAt,
    data: {
      date: '2026-11-12', at: '2026-11-12T05:30:00.000Z', title: 'Khao man kai', method: 'photo', thumb: true, share: { lat: 13.765, lng: 100.539 },
      items: [{ name: 'Khao man kai', grams: 350, kcal: 596, protein: 25.3, carbs: 70.2, fat: 23.1, source: 'db' }, { name: 'Soup', grams: 200, kcal: 20.4, protein: 1.04, carbs: 1, fat: 1.36, source: 'db' }],
      ...extra,
    },
  });

  // Supabase allows 30 code sign-ins per 5 minutes per address, and a run makes about 25: keep new users few
  test('social visibility: a stranger cannot read, a friend can, a removed friend cannot, rows and photos', async () => {
    const a = await member('va', { photo: 'avatar-a', showProgram: true });
    const z = await member('vb');
    await a.b.push([program, shared('meal-v')]);
    await a.b.putThumb('meal-v', jpeg(1));
    await a.b.putThumb('avatar-a', jpeg(2));
    await a.b.putThumb('meal-private', jpeg(3));
    const path = `${a.id}/meal-v.jpg`;
    // the meal's own nutrition, summed and rounded: no day total, target or weight travels
    const meal = { owner: a.id, mealId: 'meal-v', lat: 13.765, lng: 100.539, takenAt: '2026-11-12T05:30:00.000Z', title: 'Khao man kai', kcal: 616, protein: 26.3, carbs: 71.2, fat: 24.5, photo: path };
    expect(await a.b.social.sharedIn(world)).toEqual([meal]);
    expect(await a.b.social.program(a.id)).toEqual(program.data);

    // anyone signed in finds the handle, the name and the profile photo, and nothing else
    expect(await z.b.social.search(a.handle)).toEqual([{ id: a.id, handle: a.handle, name: 'Name va', photo: `${a.id}/avatar-a.jpg` }]);
    // an underscore or a star is no wildcard: v_ would otherwise find va_...
    expect(await z.b.social.search('v_')).toEqual([]);
    expect(await z.b.social.search('*')).toEqual([]);
    expect(await bytes(await z.b.social.photo(`${a.id}/avatar-a.jpg`))).toEqual([255, 216, 255, 2]);
    const hidden = async () => {
      await h.renew?.(z.b);
      expect(await z.b.social.sharedIn(world)).toEqual([]);
      expect(await z.b.social.photo(path)).toBeNull();
      expect(await z.b.social.program(a.id)).toBeNull();
      expect(await z.b.social.photo(`${a.id}/meal-private.jpg`)).toBeNull();
    };
    await hidden();
    // asked and not yet accepted: still a stranger
    await z.b.social.request(a.id);
    await hidden();

    if (h.raw) {
      // straight at the database: nobody writes what the server publishes, and a request is the other side's to accept
      const sb = h.raw(z.b);
      expect((await sb.from('shared_meals').select()).data).toEqual([]);
      expect((await sb.from('profiles').update({ name: 'Changed' }).eq('user_id', a.id)).error).not.toBeNull();
      expect((await sb.from('shared_meals').insert({ owner: z.id, meal_id: 'x', lat: 1, lng: 1, taken_at: '2026-11-12T00:00:00Z', title: 'x', kcal: 1, protein: 1, carbs: 1, fat: 1 })).error).not.toBeNull();
      expect((await sb.from('shared_programs').insert({ owner: z.id, program: {} })).error).not.toBeNull();
      expect((await sb.from('friendships').insert({ requester: a.id, addressee: z.id })).error).not.toBeNull();
      expect((await sb.from('friendships').update({ status: 'accepted' }).eq('requester', z.id).select()).data ?? []).toEqual([]);
      await hidden();
    }

    await a.b.social.accept(z.id);
    expect(await z.b.social.sharedIn(world)).toEqual([meal]);
    expect(await bytes(await z.b.social.photo(path))).toEqual([255, 216, 255, 1]);
    expect(await z.b.social.program(a.id)).toEqual(program.data);
    // a friend still reads no other photo and no record
    expect(await z.b.social.photo(`${a.id}/meal-private.jpg`)).toBeNull();
    expect((await z.b.pull(null)).records.map((r) => r.collection)).toEqual(['social']);

    // removed, by either side
    await z.b.social.remove(a.id);
    await hidden();
    expect(await a.b.social.friends()).toEqual([]);
  }, SLOW);

  test('social: handles are unique, a request goes one way, only the one asked accepts, either side removes, and changes publish', async () => {
    const a = await member('xa');
    const zb = await signIn('xb');
    const z = { b: zb, id: (await zb.auth.session())!.userId, handle: `xb_${tag}` };
    expect(await z.b.social.handleFree(a.handle)).toBe(false);
    expect(await a.b.social.handleFree(a.handle)).toBe(true);
    expect(await z.b.social.handleFree(z.handle)).toBe(true);
    // a handle someone holds is not published for another, and with no profile there are no requests
    await z.b.push([social(a.handle)]);
    expect(await a.b.social.search(a.handle)).toEqual([]);
    expect(await failKind(z.b.social.request(a.id))).toBe('bad_request');

    await z.b.push([social(z.handle, 2)]);
    const person = (m: Member) => ({ id: m.id, handle: m.handle, name: `Name ${m.handle.slice(0, 2)}`, photo: null });
    await z.b.social.request(a.id);
    await z.b.social.request(a.id); // again: nothing changes
    expect(await z.b.social.friends()).toEqual([{ ...person(a), status: 'outgoing' }]);
    expect(await a.b.social.friends()).toEqual([{ ...person(z), status: 'incoming' }]);
    expect(await failKind(z.b.social.accept(a.id))).toBe('bad_request');

    // declined: gone for both
    await a.b.social.remove(z.id);
    expect(await z.b.social.friends()).toEqual([]);
    expect(await a.b.social.friends()).toEqual([]);
    // asking someone who asked you accepts
    await z.b.social.request(a.id);
    await a.b.social.request(z.id);
    expect(await a.b.social.friends()).toEqual([{ ...person(z), status: 'friend' }]);
    expect(await z.b.social.friends()).toEqual([{ ...person(a), status: 'friend' }]);
    // not yourself, not someone with no profile
    expect(await failKind(a.b.social.request(a.id))).toBe('bad_request');
    expect(await failKind(a.b.social.request(crypto.randomUUID()))).toBe('bad_request');

    // friends now: an edit, unsharing, deleting the meal and turning the program off take effect on the server
    // a client that forgot to round is rounded by the server
    await a.b.push([social(a.handle, 3, { showProgram: true }), program, shared('m1'), shared('m2', 1, { at: '2026-11-12T06:30:00.000Z', share: { lat: 13.7654, lng: 100.5386 } })]);
    await a.b.putThumb('m1', jpeg(1));
    expect((await z.b.social.sharedIn(world)).map((m) => [m.mealId, m.lat, m.lng])).toEqual([['m2', 13.765, 100.539], ['m1', 13.765, 100.539]]);
    // only inside the box, also one across the 180th meridian
    expect(await z.b.social.sharedIn({ south: 0, west: 0, north: 10, east: 10 })).toEqual([]);
    expect(await z.b.social.sharedIn({ south: 13, west: 170, north: 14, east: -170 })).toEqual([]);
    expect((await z.b.social.sharedIn({ south: 13, west: 100, north: 14, east: -170 })).length).toBe(2);

    // an edit follows; unsharing and deleting take the meal and its photo away
    await a.b.push([shared('m1', 2, { title: 'Lunch' })]);
    expect((await z.b.social.sharedIn(world)).find((m) => m.mealId === 'm1')?.title).toBe('Lunch');
    expect(await z.b.social.photo(`${a.id}/m1.jpg`)).not.toBeNull();
    const { share: _, ...unshared } = shared('m1').data as Record<string, unknown>;
    await a.b.push([{ ...shared('m1'), updatedAt: 3, data: unshared }, { ...shared('m2'), updatedAt: 3, deleted: true }]);
    await h.renew?.(z.b);
    expect(await z.b.social.sharedIn(world)).toEqual([]);
    expect(await z.b.social.photo(`${a.id}/m1.jpg`)).toBeNull();

    // the program follows the switch
    expect(await z.b.social.program(a.id)).toEqual(program.data);
    await a.b.push([social(a.handle, 4)]);
    expect(await z.b.social.program(a.id)).toBeNull();
  }, SLOW);

  test('deleting the account removes the records, the profile, friendships, shared meals and photos', async () => {
    const k = await member('ka', { photo: 'avatar-k', showProgram: true });
    const f = await member('kb');
    await befriend(f, k);
    await k.b.push([rec('gone', 1), program, shared('m-k')]);
    await k.b.putThumb('m-k', jpeg(1));
    await k.b.putThumb('avatar-k', jpeg(2));
    expect((await f.b.social.sharedIn(world)).length).toBe(1);

    expect(await h.deleteAccount(k.b)).toBe(200);
    expect(await f.b.social.friends()).toEqual([]);
    expect(await f.b.social.sharedIn(world)).toEqual([]);
    expect(await f.b.social.program(k.id)).toBeNull();
    expect(await f.b.social.photo(`${k.id}/m-k.jpg`)).toBeNull();
    expect(await f.b.social.photo(`${k.id}/avatar-k.jpg`)).toBeNull();
    expect(await f.b.social.search(k.handle)).toEqual([]);
    expect(await f.b.social.handleFree(k.handle)).toBe(true);
    const fresh = await h.signIn(email('ka'));
    signedIn.push(fresh);
    expect((await fresh.pull(null)).records).toEqual([]);
  }, SLOW);
});

test.each([1, 2, 3, 4])('store migration from schema %i: a device that had pulled pulls everything again, still counted as pulled', async (from) => {
  const idb = (globalThis.indexedDB = new IDBFactory());
  const old = new Store();
  await old.open(`migrating-${from}`);
  old.setCursor('2026-11-01T00:00:00.000Z', 1);
  old.meta.schemaVersion = from;
  old.put('weight', 'weight:2026-11-01', { date: '2026-11-01', kg: 70 }); // a write flushes the meta with it
  await old.settled();
  globalThis.indexedDB = idb;
  const now = new Store();
  await now.open(`migrating-${from}`);
  expect(now.meta.schemaVersion).toBe(5);
  expect(now.meta.cursor).toBe(new Date(0).toISOString());
  expect(now.get('weight', 'weight:2026-11-01')).toEqual({ date: '2026-11-01', kg: 70 });
});
