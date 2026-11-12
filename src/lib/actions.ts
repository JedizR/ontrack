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
import type { Backend, Box, FailKind } from '$lib/backend/types';
import { roundPosition, wrapBox, type Position } from '$lib/geo';
import { eeeByWeekday, planFromBaseline, type CheckinResult } from '$lib/model/engine';
import { planFor } from '$lib/model/day';
import { addDays, today } from '$lib/model/dates';
import { foodKey, per100Of, type Food } from '$lib/data/foods';
import { supplementItems } from '$lib/model/supplements';
import { productItem } from '$lib/model/products';
import { fetchOff } from '$lib/data/off';
import { avatarPhoto, preparePhoto } from '$lib/photo';
import type { AnalyzeRequest, AnalyzeResponse, LabelResponse } from '../../shared/analysis';
import { foodSchema, ids, productSchema, recSchema, SCHEMAS, socialSchema, type Checkin, type Collection, type DataOf, type Meal, type MealItem, type Plan, type Product, type Profile, type Program, type Saved, type SessionLog, type Supplement, type Weight } from '../../shared/records';

const uid = () => crypto.randomUUID();
/** a plain copy of the store's proxy, for undo */
const copy = <T>(v: T) => JSON.parse(JSON.stringify(v)) as T;

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
export const saveSaved = (s: Saved, id: string = uid()) => write('saved', id, s).id;
export const deleteSaved = (id: string) => remove('saved', id);
export function useSaved(id: string, at: string) {
  const s = db.get('saved', id);
  if (s) write('saved', id, { ...s, uses: s.uses + 1, lastUsedAt: at });
}
/** A logged meal again, on a day: same title and items, a fresh time, no photo. Returns the new meal's id. */
export function logAgain(m: Meal, date: string, at: string) {
  return saveMeal({ date, at, title: m.title, method: m.method === 'photo' ? 'saved' : m.method, items: m.items });
}
/** A saved meal logged on a day; it counts a use. Returns how to take both back. */
export function logSaved(id: string, date: string, at: string) {
  const s = db.get('saved', id);
  if (!s) return null;
  const was = JSON.parse(JSON.stringify(s)) as Saved; // a plain copy of the store's proxy, for undo
  const mealId = saveMeal({ date, at, title: s.title, method: 'saved', items: s.items });
  useSaved(id, at);
  return () => { deleteMeal(mealId); saveSaved(was, id); };
}
/** Keep a meal to log again from Saved. */
/** Remembers the numbers the user corrected these items to, per 100 g, for the next time each food is logged (F15).
 * An item without grams, or with values no food has (over 1,000 kcal or 100 g of a macro in 100 g, a typo), is not
 * remembered. */
export function rememberFoods(items: MealItem[]) {
  for (const i of items) {
    // a scanned product's numbers belong to the product: the next scan uses them, labelled Yours (B1)
    const product = i.barcode ? db.get('product', i.barcode) : undefined;
    if (product) {
      const per100 = per100Of(i);
      if (per100 && productSchema.shape.per100.safeParse(per100).success) write('product', i.barcode!, { ...copy(product), per100, source: 'yours' });
      continue;
    }
    const data = { name: i.name, per100: per100Of(i) };
    if (foodSchema.safeParse(data).success) write('food', foodKey(i), data as DataOf['food']);
  }
}
/** Forgets the user's numbers for a food: it goes back to the table's or the model's. */
export const forgetFood = (key: string) => remove('food', key);
export const saveAsMeal = (m: Meal, title: string) => saveSaved({ title, items: m.items, uses: 0, lastUsedAt: m.at });
/** A supplement set up from its label, or changes to one (N2, F21). Returns its id. */
export const saveSupplement = (s: Supplement, id: string = uid()) => write('supplement', id, s).id;
/** Removes a supplement; what was logged from it keeps its numbers. Returns the undo. */
export const removeSupplement = (id: string) => remove('supplement', id);
/**
 * A supplement logged on a day, or a logged one changed (`mealId`, keeping its day and time). Its items come from the
 * supplement's current label. A new entry's amount and mix become the next start; correcting an old entry leaves the
 * start alone. Returns the undo: the entry gone (or as it was) and the last amount and mix back.
 */
export function logSupplement(id: string, scoops: number, milk: { food: Food; grams: number } | null, date: string, at: string, mealId?: string) {
  const s = db.get('supplement', id);
  if (!s) return null;
  const was = copy(s);
  const before = mealId ? db.get('meal', mealId) : undefined;
  const old = before && copy(before);
  const items = supplementItems(id, s, scoops, milk ? { ...milk, mine: db.get('food', milk.food.id)?.per100 } : undefined);
  const newId = saveMeal({ ...(old ?? { date, at, method: 'supplement' as const }), title: s.name, items }, mealId);
  const { lastMix: _, ...rest } = was;
  if (!mealId) saveSupplement({ ...rest, lastScoops: scoops, ...(milk ? { lastMix: { foodId: milk.food.id, grams: milk.grams } } : {}) }, id);
  return () => {
    if (old) return void saveMeal(old, newId);
    deleteMeal(newId);
    saveSupplement(was, id);
  };
}
/** A product kept under its barcode (B1, F22): confirmed from its label, corrected, or logged from Open Food Facts. */
export const saveProduct = (p: Product, code: string) => write('product', code, p).id;
/**
 * A scanned product logged on a day at an amount. The product is kept under its barcode with that amount as the next
 * start, so the next scan is instant and works offline. Returns the undo: the entry gone, the product as it was.
 */
export function logProduct(code: string, p: Product, grams: number, date: string, at: string) {
  const before = db.get('product', code);
  const was = before && copy(before);
  const id = saveMeal({ date, at, title: p.name, method: 'barcode', items: [productItem(code, p, grams)] }); // checked first
  saveProduct({ ...copy(p), lastG: grams }, code);
  return () => {
    deleteMeal(id);
    if (was) saveProduct(was, code);
  };
}
/** What a barcode finds: the user's product, Open Food Facts' (`empty` when it has no nutrition), or nothing. */
export type Found =
  | { kind: 'found'; code: string; product: Product }
  | { kind: 'empty'; code: string; name: string; brand?: string }
  | { kind: 'missing' | 'offline' | 'failed'; code: string };
/** The user's saved product first, at once and offline too, then Open Food Facts. Never throws. */
export async function findProduct(code: string): Promise<Found> {
  const mine = db.get('product', code);
  if (mine) return { kind: 'found', code, product: copy(mine) };
  if (!navigator.onLine) return { kind: 'offline', code };
  try {
    const p = await fetchOff(code);
    if (!p) return { kind: 'missing', code };
    const { per100, ...rest } = p;
    const name = p.name || p.brand || t.scan.unnamed;
    if (!per100) return { kind: 'empty', code, name, ...(p.brand ? { brand: p.brand } : {}) };
    return { kind: 'found', code, product: { ...rest, name, per100, source: 'off' } };
  } catch {
    return { kind: navigator.onLine ? 'failed' : 'offline', code };
  }
}
const kept = (p: Program) => p.sessions.map(({ exercises: _, ...s }) => s);
/**
 * A changed program, with a plan from tomorrow whose exercise energy follows it: today and every day before keep their
 * targets and sessions (BUILD-PLAN M7). Plans from before plans kept their sessions get the old program's first.
 * Returns the undo: the old program back, the new plan gone.
 */
export function changeProgram(p: Program) {
  recSchema.parse({ collection: 'program', id: ids.program(), updatedAt: 0, data: SCHEMAS.program.parse(p) }); // before any write
  const was = JSON.parse(JSON.stringify(db.get('program', 'program') ?? { name: '', sessions: [] })) as Program; // a plain copy, for undo
  const profile = db.get('profile', 'profile');
  const plans = db.live('plan');
  const current = planFor(plans, addDays(today(), 1));
  let id: string | null = null;
  if (profile && current) {
    for (const r of [...plans].sort((a, b) => a.updatedAt - b.updatedAt)) if (!r.data.sessions) write('plan', r.id, { ...r.data, sessions: kept(was) });
    const numbers = planFromBaseline({
      sex: profile.sex,
      heightCm: profile.heightCm,
      experience: profile.experience,
      weightKg: current.weightKg,
      goal: current.goal,
      ratePctPerWeek: current.ratePctPerWeek,
      maintainOnly: current.flags.includes('maintainOnly'),
      bmr: current.bmr,
      baseline: current.baseline,
      eeeByWeekday: eeeByWeekday(p.sessions, current.weightKg),
    });
    const { goalWeightKg, tdeeSource } = current;
    id = savePlan({ ...numbers, effectiveFrom: addDays(today(), 1), ...(goalWeightKg ? { goalWeightKg } : {}), tdeeSource, source: 'edit', sessions: kept(p) });
  }
  saveProgram(p);
  return () => {
    saveProgram(was);
    if (id) remove('plan', id);
  };
}
export const logSession = (l: SessionLog) => write('slog', ids.slog(l.date, l.sessionKey), l);
export const clearSessionLog = (date: string, key: string) => remove('slog', ids.slog(date, key));
export const saveCheckin = (c: Checkin) => write('checkin', ids.checkin(c.date), c);
/**
 * The check-in on `date`, decided. Accepting a raise or a lower writes a plan from the next day on the measured
 * baseline, carrying the sessions of the plan it replaces (or the program's, for a plan from before M7), so the days
 * it covers keep their training. Then the record: stats, proposal, decision and the new plan's id.
 */
export function decideCheckin(date: string, r: CheckinResult, decision?: 'accepted' | 'kept') {
  let planId: string | undefined;
  if (decision === 'accepted' && r.plan) {
    const from = addDays(date, 1);
    const replaced = planFor(db.live('plan'), from);
    const goalWeightKg = replaced?.goalWeightKg;
    const sessions = replaced?.sessions ?? kept(db.get('program', 'program') ?? { name: '', sessions: [] });
    planId = savePlan({ ...r.plan, effectiveFrom: from, ...(goalWeightKg ? { goalWeightKg } : {}), tdeeSource: 'measured', source: 'checkin', sessions });
  }
  saveCheckin({ date, stats: r.stats, proposal: r.proposal, ...(decision ? { decision } : {}), ...(planId ? { planId } : {}) });
}
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

/** Photo or text analysis on the server (TECH-SPEC section 7). Never throws; no connection is `offline`. */
type Failed = Extract<AnalyzeResponse, { ok: false }> | { ok: false; error: 'offline'; usage?: undefined };
export type Analyzed = Extract<AnalyzeResponse, { ok: true }> | Failed;
export const analyzeMeal = (req: Exclude<AnalyzeRequest, { kind: 'label' }>) => analyze<Extract<AnalyzeResponse, { ok: true }>>(req);
/** A pack's nutrition label read by the vision provider (B1): printed values only. Never throws. */
export type LabelResult = Extract<LabelResponse, { ok: true }> | Failed;
export async function readLabel(file: Blob, localDate: string): Promise<LabelResult> {
  if (!navigator.onLine) return { ok: false, error: 'offline' };
  const photo = await preparePhoto(file).catch(() => null);
  if (!photo) return { ok: false, error: 'bad_request' };
  return analyze<Extract<LabelResponse, { ok: true }>>({ kind: 'label', image: photo.image, localDate, locale: 'en' });
}
const ANALYZE_WAIT_MS = 55_000; // two provider tries of 20 s each, plus the checks around them
async function analyze<R extends { ok: true }>(req: AnalyzeRequest): Promise<R | Failed> {
  if (!navigator.onLine) return { ok: false, error: 'offline' };
  const token = await session.backend?.accessToken();
  if (!token) return { ok: false, error: 'unauthorized' };
  try {
    const res = await fetch('/api/analyze', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(req), signal: AbortSignal.timeout(ANALYZE_WAIT_MS) });
    const body = (await res.json().catch(() => null)) as R | Failed | null;
    // a platform error page (a gateway timeout, a body too large) is not JSON
    return body && typeof body.ok === 'boolean' ? body : { ok: false, error: res.status === 504 ? 'timeout' : res.status === 413 ? 'too_large' : 'provider_error' };
  } catch (e) {
    return { ok: false, error: (e as Error).name === 'TimeoutError' ? 'timeout' : 'offline' };
  }
}
/**
 * A reviewed photo or description: the thumbnail is stored before the meal, so Today shows it at once. `share`: where
 * the photo was taken, to put it on the food map (F17), rounded like `shareMeal`; only a meal with its photo goes on.
 * Returns the undo.
 */
export async function logReviewed(m: Meal, thumb: Blob | null, share?: Position) {
  const id = uid();
  // a thumbnail the phone cannot store must not cost the meal
  const kept = thumb ? await saveMealThumb(id, thumb).then(() => true, () => false) : false;
  saveMeal(kept ? { ...m, thumb: true, ...(share ? { share: roundPosition(share) } : {}) } : m, id);
  return () => { deleteMeal(id); };
}

// ----- friends and the food map (S1, F16, F17) -----
/** Why a call about friends failed. offline: no connection (friends' data lives on the server only); taken: the handle
 * is someone else's; auth: signed out or the session ended; bad_request: refused (no such request, no profile yet). */
export type SocialError = 'offline' | 'taken' | Exclude<FailKind, 'network' | 'wrong_code'>;
export type SocialResult<T> = { ok: true; value: T } | { ok: false; error: SocialError };
async function online<T>(f: (b: Backend) => Promise<T>): Promise<SocialResult<T>> {
  const b = session.backend;
  if (!b) return { ok: false, error: 'auth' };
  if (!navigator.onLine) return { ok: false, error: 'offline' };
  try {
    return { ok: true, value: await f(b) };
  } catch (e) {
    const kind = e instanceof BackendError ? e.kind : 'network';
    return { ok: false, error: kind === 'network' ? 'offline' : kind === 'wrong_code' ? 'server' : kind };
  }
}
/** A handle as typed: no spaces, no leading @, lower case. */
const handleOf = (typed: string) => typed.trim().replace(/^@/, '').toLowerCase();

/**
 * Your profile for friends (F16): a record like the rest of your data, which the server publishes as it syncs. A new
 * or changed handle is checked with the server first, so it needs the network; the name, the photo and the program
 * switch save offline. `photo`: a new picture (made a 256 px square here, dropping its location), null to remove it,
 * left out to keep it. bad_request: the picture could not be read.
 */
export async function saveSocial(p: { handle: string; name: string; showProgram: boolean }, photo?: Blob | null): Promise<'ok' | SocialError> {
  const was = db.get('social', ids.social());
  const data = socialSchema.parse({ handle: handleOf(p.handle), name: p.name.trim(), ...(p.showProgram ? { showProgram: true } : {}) });
  if (data.handle !== was?.handle) {
    const free = await online((b) => b.social.handleFree(data.handle));
    if (!free.ok) return free.error;
    if (!free.value) return 'taken';
  }
  let name = photo === null ? undefined : was?.photo;
  if (photo) {
    // anyone signed in can see it, so never the file as picked: that can carry where it was taken
    const square = await avatarPhoto(photo).catch(() => null);
    if (!square) return 'bad_request';
    name = `avatar-${uid()}`; // a new name for a new picture, so no phone keeps showing the old one
    await saveMealThumb(name, square);
  }
  write('social', ids.social(), { ...data, ...(name ? { photo: name } : {}) });
  return 'ok';
}
export const handleFree = (typed: string) => online((b) => b.social.handleFree(handleOf(typed)));
/** People by the start of their handle; nothing for an empty search. */
export const findPeople = (typed: string) => (handleOf(typed) ? online((b) => b.social.search(handleOf(typed))) : Promise.resolve({ ok: true as const, value: [] }));
export const listFriends = () => online((b) => b.social.friends());
/** Asks them, or accepts when they asked you first. */
export const requestFriend = (userId: string) => online((b) => b.social.request(userId));
export const acceptFriend = (userId: string) => online((b) => b.social.accept(userId));
/** Ends a friendship, or withdraws your request: either side can, and it is gone for both at once. */
export const removeFriend = (userId: string) => online((b) => b.social.remove(userId));
export const declineFriend = removeFriend;
/** A friend's program while they show it (null otherwise). */
export const friendProgram = (userId: string) => online((b) => b.social.program(userId));
/** Shared meals inside a map box (the map's bounds as they come), yours and your friends', newest first: the pins to
 * group with `clusterPins`. */
export const mapMeals = (box: Box) => online((b) => b.social.sharedIn(wrapBox(box)));
/** A shared meal's or a profile's photo, fetched each time: a friend's photo is never kept on this phone. */
export const sharedPhoto = (path: string) => online((b) => b.social.photo(path));
/**
 * A logged photo meal onto the food map (F17) at where it was taken, rounded to about 100 m here, before it is stored
 * or sent. Friends see it once it syncs. false when the meal is gone or has no photo.
 */
export function shareMeal(id: string, at: Position) {
  const m = db.get('meal', id);
  if (!m?.thumb) return false;
  write('meal', id, { ...copy(m), share: roundPosition(at) });
  return true;
}
/** Off the map: friends stop seeing it, and its photo, once it syncs. Deleting the meal does the same. */
export function unshareMeal(id: string) {
  const m = db.get('meal', id);
  if (!m?.share) return;
  const { share: _, ...rest } = copy(m);
  write('meal', id, rest);
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
    // the account's first days and its dismissed suggestion (O1) are not the next account's
    prefs.firstDay = null;
    prefs.suggestOff = false;
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
