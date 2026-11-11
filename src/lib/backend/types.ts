// The one interface both backends implement (TECH-SPEC section 5). The sync engine and the actions only see this.
import type { Rec } from '../../../shared/records';

export type User = { userId: string; email?: string };

export interface Backend {
  auth: {
    session(): Promise<User | null>;
    onChange(cb: (s: User | null) => void): () => void;
    /** false when the project has no Google provider yet, so the button is not offered */
    googleEnabled(): Promise<boolean>;
    signInWithGoogle(): Promise<void>; // leaves the page
    sendEmailCode(email: string): Promise<void>;
    verifyEmailCode(email: string, code: string): Promise<void>;
    signOut(): Promise<void>;
  };
  push(records: Rec[]): Promise<void>;
  pull(cursor: string | null): Promise<{ records: Rec[]; cursor: string }>;
  putThumb(mealId: string, blob: Blob): Promise<void>;
  getThumb(mealId: string): Promise<Blob | null>;
  accessToken(): Promise<string | null>; // for /api calls
}

/** What went wrong, in the terms the app reacts to. `auth` means the session is gone: sign in again. */
export type FailKind = 'auth' | 'network' | 'wrong_code' | 'rate_limited' | 'bad_request' | 'server';
export class BackendError extends Error {
  constructor(public kind: FailKind) {
    super(kind);
  }
}

export const PUSH_BATCH = 100;
export const PULL_PAGE = 500;
export const PULL_OVERLAP_MS = 30_000;

/**
 * Sync rule 3: from 30 s before the cursor (writes can commit slightly out of order), 500 rows at a time, until a
 * short page. `page(after, inclusive)` returns rows with server_ts after `after` (or equal to it when inclusive),
 * oldest first. Later pages start at the last timestamp seen, inclusive, so rows sharing it across a page boundary are
 * not skipped; rows already seen are dropped. An empty string cursor means "pulled before, nothing on the server yet".
 */
export async function pullPages(cursor: string | null, page: (after: string | null, inclusive: boolean) => Promise<{ rec: Rec; ts: string }[]>) {
  let after = cursor ? new Date(Date.parse(cursor) - PULL_OVERLAP_MS).toISOString() : null;
  let inclusive = false;
  let last = cursor ?? '';
  const records: Rec[] = [];
  const seen = new Set<string>();
  for (;;) {
    const rows = await page(after, inclusive);
    let fresh = 0;
    for (const r of rows) {
      const k = `${r.rec.collection}:${r.rec.id}:${r.ts}`;
      if (seen.has(k)) continue;
      seen.add(k);
      records.push(r.rec);
      fresh++;
    }
    if (rows.length) after = last = rows[rows.length - 1].ts;
    if (rows.length < PULL_PAGE) break;
    // shortcut: a full page of one timestamp with nothing new steps past it; needs 500 writes in one microsecond
    inclusive = fresh > 0;
  }
  // the overlap can return rows older than the cursor; the cursor never moves back
  if (cursor && Date.parse(last) < Date.parse(cursor)) last = cursor;
  return { records, cursor: last };
}
