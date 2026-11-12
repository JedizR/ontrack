// The Backend interface over Supabase: auth (Google with PKCE, email code), the records table, the thumbnail bucket.
// Merging happens in the database (records_lww trigger); row level security scopes every query to the signed in user.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Program, Rec } from '../../../shared/records';
import { BackendError, PULL_PAGE, pullPages, SEARCH_MAX, SHARED_MAX, type Backend, type FailKind, type Person } from './types';

const BUCKET = 'meal-photos';
type Row = { collection: Rec['collection']; id: string; data: Record<string, unknown>; updated_at: number; deleted: boolean; server_ts: string };
const PERSON = 'user_id,handle,name,photo_path';
type PersonRow = { user_id: string; handle: string; name: string; photo_path: string | null };
const person = (r: PersonRow): Person => ({ id: r.user_id, handle: r.handle, name: r.name, photo: r.photo_path });
type MealRow = { owner: string; meal_id: string; lat: number; lng: number; taken_at: string; title: string; kcal: number; protein: number; carbs: number; fat: number; photo_path: string | null };

/** Supabase errors come in three shapes (auth, PostgREST, storage); all of them carry a status, a code or a message. */
function kindOf(e: { status?: number; code?: string; message?: string; name?: string }, status = e.status ?? 0): FailKind {
  // a constraint the database holds (a unique handle, a profile to befriend, not yourself) refuses the request
  if (e.code?.startsWith('23')) return 'bad_request';
  if (status === 401 || e.code === 'PGRST301' || e.code === 'PGRST303' || e.code === '42501' || e.name === 'AuthSessionMissingError') return 'auth';
  if (e.code === 'otp_expired') return 'wrong_code';
  if (status === 429 || e.code?.startsWith('over_')) return 'rate_limited';
  if (status === 0 || e.name === 'AuthRetryableFetchError' || /fetch|network|load failed/i.test(e.message ?? '')) return 'network';
  if (status === 400 || status === 422) return 'bad_request';
  return 'server';
}
const check = (r: { error: Parameters<typeof kindOf>[0] | null; status?: number }) => {
  if (r.error) throw new BackendError(kindOf(r.error, r.status ?? r.error.status));
};

export function createSupabaseBackend(sb: SupabaseClient, settingsUrl?: string, key?: string): Backend {
  /**
   * The current session. An expired token that cannot be refreshed for lack of network comes back as no session with
   * a retryable error: that is offline, not signed out, so it throws `network` and the engine backs off.
   */
  const current = async () => {
    const { data, error } = await sb.auth.getSession();
    if (error && kindOf(error) === 'network') throw new BackendError('network');
    return data.session;
  };
  const userId = async () => {
    const s = await current();
    if (!s) throw new BackendError('auth');
    return s.user.id;
  };
  let google: Promise<boolean> | null = null;
  /** null for an object that is missing or not the caller's to read: storage answers 400 or 404 for both */
  const download = async (path: string) => {
    const r = await sb.storage.from(BUCKET).download(path);
    if (r.error) {
      const status = (r.error as { status?: number; statusCode?: string }).status ?? Number((r.error as { statusCode?: string }).statusCode);
      if (status === 400 || status === 404) return null;
      check({ error: r.error, status });
    }
    return r.data;
  };
  /** their request to me, accepted; the rows it changed */
  const acceptFrom = async (id: string) => {
    const r = await sb.from('friendships').update({ status: 'accepted' }).eq('requester', id).eq('addressee', await userId()).select('requester');
    check(r);
    return r.data!.length;
  };

  return {
    auth: {
      async session() {
        const s = await current();
        return s && { userId: s.user.id, email: s.user.email };
      },
      onChange(cb) {
        const { data } = sb.auth.onAuthStateChange((event, s) => {
          // only a sign out ends the session; a missing session at start can be an offline refresh (see current)
          if (!s && event !== 'SIGNED_OUT') return;
          // Supabase asks that the callback not call back into the client synchronously
          setTimeout(() => cb(s && { userId: s.user.id, email: s.user.email }));
        });
        return () => data.subscription.unsubscribe();
      },
      googleEnabled() {
        google ??= fetch(settingsUrl ?? '', { headers: { apikey: key ?? '' } })
          .then((r) => r.json())
          .then((s: { external?: { google?: boolean } }) => !!s.external?.google)
          .catch(() => true); // offline: offer it, the redirect explains itself
        return google;
      },
      async signInWithGoogle() {
        check(await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${location.origin}/` } }));
      },
      async sendEmailCode(email) {
        check(await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } }));
      },
      async verifyEmailCode(email, code) {
        check(await sb.auth.verifyOtp({ email, token: code, type: 'email' }));
      },
      async signOut() {
        // this device only: other phones stay signed in. Offline the server cannot be told; the session here goes anyway
        const r = await sb.auth.signOut({ scope: 'local' });
        if (r.error && typeof localStorage !== 'undefined') for (const k of Object.keys(localStorage)) if (k.startsWith('ontrack:auth')) localStorage.removeItem(k);
      },
    },

    async push(records) {
      await userId();
      const rows = records.map((r) => ({ collection: r.collection, id: r.id, data: r.data, updated_at: r.updatedAt, deleted: !!r.deleted }));
      check(await sb.from('records').upsert(rows, { onConflict: 'user_id,collection,id' }));
    },

    async pull(cursor) {
      await userId();
      return pullPages(cursor, async (after, inclusive) => {
        let q = sb.from('records').select('collection,id,data,updated_at,deleted,server_ts').order('server_ts').limit(PULL_PAGE);
        if (after) q = inclusive ? q.gte('server_ts', after) : q.gt('server_ts', after);
        const r = await q;
        check(r);
        return ((r.data ?? []) as Row[]).map((row) => ({
          rec: { collection: row.collection, id: row.id, updatedAt: Number(row.updated_at), data: row.data, ...(row.deleted ? { deleted: true as const } : {}) },
          ts: row.server_ts,
        }));
      });
    },

    async putThumb(mealId, blob) {
      check(await sb.storage.from(BUCKET).upload(`${await userId()}/${mealId}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' }));
    },
    async getThumb(mealId) {
      return download(`${await userId()}/${mealId}.jpg`);
    },
    async accessToken() {
      return (await current().catch(() => null))?.access_token ?? null;
    },

    // what others may read is decided by row level security (supabase/migrations/0005_social.sql), not by these filters
    social: {
      async handleFree(handle) {
        const r = await sb.from('profiles').select('user_id').eq('handle', handle).neq('user_id', await userId());
        check(r);
        return !r.data!.length;
      },
      async search(prefix) {
        const like = `${prefix.replace(/[\\%_]/g, '\\$&')}%`; // an underscore in a handle is not a wildcard
        const r = await sb.from('profiles').select(PERSON).like('handle', like).neq('user_id', await userId()).order('handle').limit(SEARCH_MAX);
        check(r);
        return (r.data as PersonRow[]).map(person);
      },
      async friends() {
        const me = await userId();
        const f = await sb.from('friendships').select('requester,addressee,status');
        check(f);
        const rows = f.data as { requester: string; addressee: string; status: 'requested' | 'accepted' }[];
        const other = (r: (typeof rows)[number]) => (r.requester === me ? r.addressee : r.requester);
        if (!rows.length) return [];
        const p = await sb.from('profiles').select(PERSON).in('user_id', rows.map(other));
        check(p);
        const people = new Map((p.data as PersonRow[]).map((row) => [row.user_id, person(row)]));
        return rows.flatMap((r) => {
          const who = people.get(other(r));
          return who ? [{ ...who, status: r.status === 'accepted' ? ('friend' as const) : r.requester === me ? ('outgoing' as const) : ('incoming' as const) }] : [];
        });
      },
      async request(id) {
        if (await acceptFrom(id)) return;
        const r = await sb.from('friendships').insert({ requester: await userId(), addressee: id });
        if (r.error?.code === '23505') return; // asked before
        check(r);
      },
      async accept(id) {
        if (!(await acceptFrom(id))) throw new BackendError('bad_request');
      },
      async remove(id) {
        const pair = [id, await userId()];
        check(await sb.from('friendships').delete().in('requester', pair).in('addressee', pair));
      },
      async sharedIn(b) {
        await userId();
        let q = sb.from('shared_meals').select('owner,meal_id,lat,lng,taken_at,title,kcal,protein,carbs,fat,photo_path').gte('lat', b.south).lte('lat', b.north);
        q = b.west <= b.east ? q.gte('lng', b.west).lte('lng', b.east) : q.or(`lng.gte.${Number(b.west)},lng.lte.${Number(b.east)}`);
        const r = await q.order('taken_at', { ascending: false }).limit(SHARED_MAX);
        check(r);
        return (r.data as MealRow[]).map((m) => ({
          owner: m.owner, mealId: m.meal_id, lat: Number(m.lat), lng: Number(m.lng), takenAt: new Date(m.taken_at).toISOString(), title: m.title,
          kcal: Number(m.kcal), protein: Number(m.protein), carbs: Number(m.carbs), fat: Number(m.fat), photo: m.photo_path,
        }));
      },
      async photo(path) {
        await userId();
        return download(path);
      },
      async program(id) {
        await userId();
        const r = await sb.from('shared_programs').select('program').eq('owner', id).maybeSingle();
        check(r);
        return ((r.data as { program: Program } | null)?.program) ?? null;
      },
    },
  };
}

export default function browserSupabase(): Backend {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const sb = createClient(url, key, { auth: { flowType: 'pkce', storageKey: 'ontrack:auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return createSupabaseBackend(sb, `${url}/auth/v1/settings`, key);
}
