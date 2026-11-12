// Every change a user makes goes through here (TECH-SPEC section 4): validate with zod, write to the store (which
// stamps updatedAt, persists and queues sync). Deletes return an undo function. Components never touch the store,
// the backend or IndexedDB directly.
import { toast } from 'svelte-sonner';
import { t } from '$lib/i18n';
import { db } from '$lib/db/store.svelte';
import { sync } from '$lib/sync/engine.svelte';
import { session } from '$lib/session.svelte';
import { prefs } from '$lib/prefs.svelte';
import { BackendError } from '$lib/backend';
import type { FailKind } from '$lib/backend/types';
import { ids, recSchema, SCHEMAS, type Checkin, type Collection, type DataOf, type Meal, type Plan, type Profile, type Program, type Saved, type SessionLog, type Weight } from '../../shared/records';

const uid = () => crypto.randomUUID();

function write<C extends Collection>(c: C, id: string, data: DataOf[C]) {
  if (!db.ready) throw new Error('not signed in');
  const parsed = SCHEMAS[c].parse(data) as DataOf[C];
  recSchema.parse({ collection: c, id, updatedAt: 0, data: parsed }); // the id and size the database accepts
  return db.put(c, id, parsed);
}
/** Tombstones the record and returns how to bring it back. */
function remove(c: Collection, id: string): () => void {
  const prev = db.remove(c, id);
  return () => { if (prev) db.restore(prev); };
}

// ----- data -----
export const saveProfile = (p: Profile) => write('profile', ids.profile(), p);
/** A new plan never replaces an old one: the plan for a date is the newest with effectiveFrom on or before it. */
export const savePlan = (p: Plan) => write('plan', uid(), p).id;
export const saveProgram = (p: Program) => write('program', ids.program(), p);
export const logWeight = (date: string, kg: number) => write('weight', ids.weight(date), { date, kg });
export const deleteWeight = (date: string) => remove('weight', ids.weight(date));
export const saveMeal = (m: Meal, id: string = uid()) => write('meal', id, m).id;
export const deleteMeal = (id: string) => remove('meal', id);
export const saveMealThumb = (mealId: string, jpeg: Blob) => db.saveThumb(mealId, jpeg);
export const saveSaved = (s: Saved, id = uid()) => write('saved', id, s).id;
export const deleteSaved = (id: string) => remove('saved', id);
export function useSaved(id: string, at: string) {
  const s = db.get('saved', id);
  if (s) write('saved', id, { ...s, uses: s.uses + 1, lastUsedAt: at });
}
/** A logged meal again, on a day: same title and items, a fresh time, no photo. Returns the new meal's id. */
export function logAgain(m: Meal, date: string, at: string) {
  return saveMeal({ date, at, title: m.title, method: m.method === 'photo' ? 'saved' : m.method, items: m.items });
}
/** A saved meal logged on a day; it counts a use. */
export function logSaved(id: string, date: string, at: string) {
  const s = db.get('saved', id);
  if (!s) return null;
  const mealId = saveMeal({ date, at, title: s.title, method: 'saved', items: s.items });
  useSaved(id, at);
  return mealId;
}
/** Keep a meal to log again from Saved. */
export const saveAsMeal = (m: Meal, title: string) => saveSaved({ title, items: m.items, uses: 0, lastUsedAt: m.at });
export const logSession = (l: SessionLog) => write('slog', ids.slog(l.date, l.sessionKey), l);
export const clearSessionLog = (date: string, key: string) => remove('slog', ids.slog(date, key));
export const saveCheckin = (c: Checkin) => write('checkin', ids.checkin(c.date), c);
/** The end of onboarding: profile, program, the first plan and the first weigh-in. All four are checked before any is written. */
export function finishOnboarding(r: { profile: Profile; program: Program; plan: Plan; weight: Weight }) {
  SCHEMAS.profile.parse(r.profile);
  SCHEMAS.program.parse(r.program);
  SCHEMAS.plan.parse(r.plan);
  SCHEMAS.weight.parse(r.weight);
  saveProgram(r.program);
  savePlan(r.plan);
  logWeight(r.weight.date, r.weight.kg);
  saveProfile(r.profile); // last: a profile is what tells the app onboarding is done
}
export const closeDay = (date: string) => write('day', ids.day(date), { date, closed: true });
export const reopenDay = (date: string) => write('day', ids.day(date), { date });

/** A thumbnail from this device, or downloaded once from the account and kept. */
export async function mealThumb(mealId: string): Promise<Blob | null> {
  const local = await db.thumb(mealId);
  if (local) return local;
  const remote = await session.backend?.getThumb(mealId).catch(() => null);
  if (remote) await db.saveThumb(mealId, remote, false);
  return remote ?? null;
}

// ----- account -----
type Result = 'ok' | FailKind;
async function attempt(f: () => Promise<unknown>): Promise<Result> {
  if (!session.backend) return 'server';
  try {
    await f();
    return 'ok';
  } catch (e) {
    return e instanceof BackendError ? e.kind : 'network';
  }
}
export const signInWithGoogle = () => attempt(() => session.backend!.auth.signInWithGoogle());
export const sendEmailCode = (email: string) => attempt(() => session.backend!.auth.sendEmailCode(email));
export const verifyEmailCode = (email: string, code: string) => attempt(() => session.backend!.auth.verifyEmailCode(email, code));

/**
 * Sign out (sync rule 9): send what is waiting first. With changes that could not be sent, it stops and says so
 * unless `force`. Then the session ends and this user's data is deleted from the phone.
 */
export async function signOut(force = false): Promise<'ok' | 'unsent'> {
  if (db.pending > 0) await sync.run();
  if (db.pending > 0 && !force) return 'unsent';
  session.leaving = true;
  sync.stop();
  try {
    await session.backend?.auth.signOut().catch(() => undefined);
    await db.wipe();
  } finally {
    // the session is gone either way; a fresh start shows the signed out app
    prefs.lastUser = null;
    prefs.lastEmail = null;
    location.reload();
  }
  return 'ok';
}

/** Deletes the account and everything in it on the server, then signs out here. */
export async function deleteAccount(): Promise<Result> {
  const token = await session.backend?.accessToken();
  if (!token || !session.backend) return 'auth';
  // nothing may reach the account while it is being deleted
  sync.stop();
  const res = await fetch('/api/account', { method: 'DELETE', headers: { authorization: `Bearer ${token}` } }).catch(() => null);
  if (!res?.ok) {
    sync.start(session.backend);
    return !res ? 'network' : res.status === 401 ? 'auth' : 'server';
  }
  await signOut(true);
  return 'ok';
}

// ----- undo -----
/** One undo at a time: a new undo toast replaces the last, so Undo is never ambiguous. */
let undoId: string | number | undefined;
/** Closes the undo toast only: a bare toast.dismiss() would also close the update toast. */
export function dismissUndo() {
  if (undoId !== undefined) toast.dismiss(undoId);
  undoId = undefined;
}
export function undoToast(message: string, onUndo: () => void, duration = 5000) {
  dismissUndo();
  undoId = toast(message, { duration, action: { label: t.toast.undo, onClick: onUndo } });
}
