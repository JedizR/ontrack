// The Backend interface over Supabase: auth (Google with PKCE, email code), the records table, the thumbnail bucket.
// Merging happens in the database (records_lww trigger); row level security scopes every query to the signed in user.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Rec } from '../../../shared/records';
import { BackendError, PULL_PAGE, pullPages, type Backend, type FailKind } from './types';

const BUCKET = 'meal-photos';
type Row = { collection: Rec['collection']; id: string; data: Record<string, unknown>; updated_at: number; deleted: boolean; server_ts: string };

/** Supabase errors come in three shapes (auth, PostgREST, storage); all of them carry a status, a code or a message. */
function kindOf(e: { status?: number; code?: string; message?: string; name?: string }, status = e.status ?? 0): FailKind {
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
      const r = await sb.storage.from(BUCKET).download(`${await userId()}/${mealId}.jpg`);
      if (r.error) {
        const status = (r.error as { status?: number; statusCode?: string }).status ?? Number((r.error as { statusCode?: string }).statusCode);
        if (status === 400 || status === 404) return null; // storage answers 400 or 404 for a missing object
        check({ error: r.error, status });
      }
      return r.data;
    },
    async accessToken() {
      return (await current().catch(() => null))?.access_token ?? null;
    },
  };
}

export default function browserSupabase(): Backend {
  const url = import.meta.env.VITE_SUPABASE_URL as string;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
  const sb = createClient(url, key, { auth: { flowType: 'pkce', storageKey: 'ontrack:auth', persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  return createSupabaseBackend(sb, `${url}/auth/v1/settings`, key);
}
