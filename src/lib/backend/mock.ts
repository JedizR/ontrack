// The app's side of dev/mock-backend.ts: the Backend interface over fetch to /__mock. Used by `pnpm dev`, the e2e
// tests and the conformance suite. The session is kept in localStorage like supabase-js keeps its own.
import type { Rec } from '../../../shared/records';
import { BackendError, PULL_PAGE, pullPages, type Backend, type FailKind, type User } from './types';

type Session = { token: string; userId: string; email: string };
const SESSION_KEY = 'ontrack:mock-session';
/** e2e tests put a space name here so each test has its own server data */
export const SPACE_KEY = 'ontrack:mock-space';

export function createMockBackend(opts: { base?: string; fetch?: typeof fetch; space?: string; storage?: Storage | null } = {}): Backend {
  const base = opts.base ?? '';
  const doFetch = opts.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
  const space = opts.space ?? 'default';
  const storage = opts.storage ?? null;
  let current: Session | null = null;
  try { current = JSON.parse(storage?.getItem(SESSION_KEY) ?? 'null'); } catch { /* none */ }
  const listeners = new Set<(s: User | null) => void>();
  const setSession = (s: Session | null) => {
    current = s;
    if (s) storage?.setItem(SESSION_KEY, JSON.stringify(s));
    else storage?.removeItem(SESSION_KEY);
    for (const cb of listeners) cb(s && { userId: s.userId, email: s.email });
  };

  /** null for a 404 (a thumbnail never uploaded), the response when ok, a BackendError otherwise */
  async function call(path: string, init: RequestInit & { auth?: boolean } = {}): Promise<Response | null> {
    const headers = new Headers(init.headers);
    headers.set('x-mock-space', space);
    if (init.auth !== false) {
      if (!current) throw new BackendError('auth');
      headers.set('authorization', `Bearer ${current.token}`);
    }
    let res: Response;
    try {
      res = await doFetch(`${base}/__mock${path}`, { ...init, headers });
    } catch {
      throw new BackendError('network');
    }
    if (res.ok) return res;
    if (res.status === 404) return null;
    const error = ((await res.json().catch(() => ({}))) as { error?: string }).error;
    const kind: FailKind = res.status === 401 ? 'auth' : error === 'wrong_code' ? 'wrong_code' : res.status === 429 ? 'rate_limited' : res.status === 400 ? 'bad_request' : 'server';
    throw new BackendError(kind);
  }
  const post = (path: string, body: unknown, auth = true) =>
    call(path, { method: 'POST', auth, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  return {
    auth: {
      async session() {
        return current && { userId: current.userId, email: current.email };
      },
      onChange(cb) {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      googleEnabled: async () => true,
      async signInWithGoogle() {
        location.assign(`${base}/__mock/auth/google?space=${encodeURIComponent(space)}&redirect=${encodeURIComponent(location.pathname)}`);
      },
      async sendEmailCode(email) {
        await post('/auth/code', { email }, false);
      },
      async verifyEmailCode(email, code) {
        const s = (await (await post('/auth/verify', { email, code }, false))!.json()) as Session;
        setSession({ token: s.token, userId: s.userId, email: s.email });
      },
      async signOut() {
        setSession(null);
      },
    },
    async push(records) {
      await post('/push', { records });
    },
    pull(cursor) {
      return pullPages(cursor, async (after, inclusive) => ((await (await post('/pull', { after, inclusive, limit: PULL_PAGE }))!.json()) as { rows: { rec: Rec; ts: string }[] }).rows);
    },
    async putThumb(mealId, blob) {
      await call(`/thumb/${encodeURIComponent(mealId)}`, { method: 'PUT', body: blob });
    },
    async getThumb(mealId) {
      return (await call(`/thumb/${encodeURIComponent(mealId)}`))?.blob() ?? null;
    },
    async accessToken() {
      return current?.token ?? null;
    },
  };
}

/** In the browser: the space from the e2e test, and a session returning from the fake Google redirect. */
export default function browserMock(): Backend {
  const m = /[#&]mock-session=([^&]+)/.exec(location.hash);
  if (m) {
    localStorage.setItem(SESSION_KEY, decodeURIComponent(m[1]));
    history.replaceState(null, '', location.pathname + location.search);
  }
  return createMockBackend({ space: localStorage.getItem(SPACE_KEY) ?? 'default', storage: localStorage });
}
