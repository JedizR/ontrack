// The one interface both backends implement (TECH-SPEC section 5). The sync engine and the actions only see this.
import type { Program, Rec } from '../../../shared/records.ts';

export type User = { userId: string; email?: string };

/** Someone with a profile, as search and friends see them (S1, F16). photo: the picture's storage path, for `photo()`. */
export type Person = { id: string; handle: string; name: string; photo: string | null };
/** friend: accepted. incoming: they asked you. outgoing: you asked them */
export type Friend = Person & { status: 'friend' | 'incoming' | 'outgoing' };
/** A map box in degrees. A west edge east of the east edge crosses the 180th meridian. */
export type Box = { south: number; west: number; north: number; east: number };
/** A meal on the food map (F17) as its owner and their friends see it: its own nutrition, never a day's total, a target
 * or a weight (PRD section 7). takenAt is ISO, photo a storage path for `photo()`. */
export type SharedMeal = { owner: string; mealId: string; lat: number; lng: number; takenAt: string; title: string; kcal: number; protein: number; carbs: number; fat: number; photo: string | null };
/** At most this many people per search and meals per map box. */
export const SEARCH_MAX = 20;
export const SHARED_MAX = 500;

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
  /** a deleted meal's thumbnail or a replaced profile photo (M9a); deleting one that is gone succeeds */
  dropThumb(mealId: string): Promise<void>;
  accessToken(): Promise<string | null>; // for /api calls
  /**
   * Friends and the food map (S1). Your own profile and shares are records (collection `social`, a meal's `share`)
   * that the server publishes as they sync; these read what others published and write friendships. Network only.
   */
  social: {
    /** nobody else has this handle (yours counts as free) */
    handleFree(handle: string): Promise<boolean>;
    /** people whose handle starts with this, not you, by handle, at most SEARCH_MAX */
    search(prefix: string): Promise<Person[]>;
    /** your friends and the requests either way */
    friends(): Promise<Friend[]>;
    /** asks them; accepts instead when they asked you first; asking again changes nothing */
    request(userId: string): Promise<void>;
    /** their request to you; bad_request when there is none (withdrawn meanwhile) */
    accept(userId: string): Promise<void>;
    /** declines, withdraws or ends a friendship: gone for both at once */
    remove(userId: string): Promise<void>;
    /** shared meals inside the box, yours and accepted friends', newest first, at most SHARED_MAX */
    sharedIn(box: Box): Promise<SharedMeal[]>;
    /** a shared meal's photo or a profile photo by its storage path; null when gone or not yours to see */
    photo(path: string): Promise<Blob | null>;
    /** a friend's training program while they show it, otherwise null */
    program(userId: string): Promise<Program | null>;
  };
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
