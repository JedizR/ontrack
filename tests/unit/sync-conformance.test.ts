// TECH-SPEC section 5, checked against every Backend: the mock always, Supabase when SUPABASE_TEST_EMAIL is set
// (with SUPABASE_URL, SUPABASE_SECRET_KEY and VITE_SUPABASE_PUBLISHABLE_KEY). Test users are made with the secret key
// and removed at the end through the real DELETE /api/account handler.
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
  });

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

  test('deleting the account removes the records', async () => {
    const b = await signIn('k');
    await b.push([rec('gone', 1)]);
    expect(await h.deleteAccount(b)).toBe(200);
    const fresh = await h.signIn(email('k'));
    signedIn.push(fresh);
    expect((await fresh.pull(null)).records).toEqual([]);
  });
});
