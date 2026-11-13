// Local-first store, ported from watermelon: records in $state maps, mirrored to IndexedDB, with an outbox for sync.
// One IndexedDB database per user (TECH-SPEC section 4). Only actions.ts writes; the sync engine merges and acks.
import { clear, createStore, del, get, getMany, keys, set, setMany, type UseStore } from 'idb-keyval';
import { COLLECTIONS, type Collection, type DataOf, type Rec } from '../../../shared/records';
import { MIGRATIONS, SCHEMA_VERSION } from './migrations';

type Maps = { [C in Collection]: Record<string, Rec<DataOf[C]>> };
export type Meta = { schemaVersion: number; cursor: string | null; lastSyncAt: number | null };

const empty = (): Maps => Object.fromEntries(COLLECTIONS.map((c) => [c, {}])) as Maps;
const recKey = (c: Collection, id: string) => `r:${c}:${id}`;
const freshMeta = (): Meta => ({ schemaVersion: SCHEMA_VERSION, cursor: null, lastSyncAt: null });

export class Store {
  userId = $state<string | null>(null);
  ready = $state(false);
  data = $state<Maps>(empty());
  /** records changed here and not yet accepted by the server */
  pending = $state(0);
  meta: Meta = freshMeta();
  /** called after every local write: the sync engine hooks in here */
  onLocalChange: (() => void) | null = null;

  #idb: UseStore | null = null;
  #outbox = new Set<string>();
  #blobq: string[] = [];
  #dropq: { id: string; at: number }[] = [];
  #dirty = new Set<string>();
  #flushing: Promise<void> = Promise.resolve();
  #flushQueued = false;

  async open(userId: string) {
    if (this.userId === userId && this.ready) return;
    this.ready = false;
    const idb = createStore(`ontrack-${userId}`, 'kv');
    try { await navigator.storage?.persist?.(); } catch { /* best effort */ }
    const recKeys = ((await keys(idb)) as string[]).filter((k) => k.startsWith('r:'));
    const [meta, outbox, blobq, dropq, ...recs] = await getMany<unknown>(['meta', 'outbox', 'blobq', 'dropq', ...recKeys], idb);
    const loaded = (recs as Rec[]).filter((r) => r && COLLECTIONS.includes(r.collection));
    this.meta = { ...freshMeta(), ...(meta as Meta | undefined) };
    const dirty = new Set<string>();
    while (this.meta.schemaVersion < SCHEMA_VERSION) {
      MIGRATIONS[this.meta.schemaVersion]?.(loaded, this.meta);
      loaded.forEach((r) => dirty.add(recKey(r.collection, r.id)));
      this.meta.schemaVersion++;
    }
    const data = empty();
    for (const r of loaded) (data[r.collection] as Record<string, Rec>)[r.id] = r;
    this.#idb = idb;
    this.#outbox = new Set((outbox as string[] | undefined) ?? []);
    this.#blobq = (blobq as string[] | undefined) ?? [];
    this.#dropq = (dropq as { id: string; at: number }[] | undefined) ?? [];
    this.#dirty = dirty;
    this.data = data;
    this.pending = this.#outbox.size;
    this.userId = userId;
    await this.#flush();
    this.ready = true;
  }

  /** Live (not deleted) records of a collection. */
  live<C extends Collection>(c: C): Rec<DataOf[C]>[] {
    return Object.values(this.data[c]).filter((r) => !r.deleted);
  }
  get<C extends Collection>(c: C, id: string): DataOf[C] | undefined {
    const r = this.data[c][id];
    return r && !r.deleted ? r.data : undefined;
  }

  /** Create or replace. updatedAt only moves forward, even if the clock steps back. */
  put<C extends Collection>(c: C, id: string, data: DataOf[C]): Rec<DataOf[C]> {
    const prev = this.data[c][id];
    const rec: Rec<DataOf[C]> = { collection: c, id, updatedAt: Math.max(Date.now(), (prev?.updatedAt ?? 0) + 1), data };
    this.#write(rec, true);
    this.onLocalChange?.();
    return rec;
  }

  /** Tombstone. Returns the record as it was, for undo. */
  remove<C extends Collection>(c: C, id: string): Rec<DataOf[C]> | undefined {
    const prev = this.data[c][id];
    if (!prev || prev.deleted) return;
    const snap = $state.snapshot(prev) as Rec<DataOf[C]>;
    this.#write({ ...snap, updatedAt: Math.max(Date.now(), snap.updatedAt + 1), deleted: true }, true);
    this.onLocalChange?.();
    return snap;
  }

  restore<C extends Collection>(prev: Rec<DataOf[C]>) {
    return this.put(prev.collection as C, prev.id, prev.data);
  }

  /**
   * Merge pulled records (sync rule 4): take one when there is no local copy, when it is newer, or when it is equally
   * new and the local copy is not waiting to be sent. Pulled records never join the outbox.
   */
  applyRemote(records: Rec[]) {
    for (const r of records) {
      if (!COLLECTIONS.includes(r.collection)) continue;
      const local = this.data[r.collection][r.id];
      const queued = this.#outbox.has(recKey(r.collection, r.id));
      if (!local || r.updatedAt > local.updatedAt || (r.updatedAt === local.updatedAt && !queued)) this.#write(r, false);
    }
  }

  // ----- outbox, used by the sync engine -----
  outboxBatch(limit: number): Rec[] {
    const out: Rec[] = [];
    for (const k of this.#outbox) {
      const [, c, ...rest] = k.split(':');
      const r = this.data[c as Collection]?.[rest.join(':')];
      if (r) out.push($state.snapshot(r) as Rec);
      else this.#outbox.delete(k);
      if (out.length === limit) break;
    }
    return out;
  }
  /** Sync rule 1: drop a key only if the record was not edited again while it was in flight. */
  ack(sent: Rec[]) {
    for (const r of sent) if (this.data[r.collection][r.id]?.updatedAt === r.updatedAt) this.#outbox.delete(recKey(r.collection, r.id));
    this.pending = this.#outbox.size;
    this.#queueFlush();
  }
  setCursor(cursor: string, lastSyncAt: number) {
    this.meta = { ...this.meta, cursor, lastSyncAt };
    this.#queueFlush();
  }

  // ----- thumbnails: blob:<mealId>, and blobq for the ones waiting to upload -----
  // Kept as bytes: WebKit refuses Blobs in IndexedDB in private browsing (and in Playwright's WebKit).
  async saveThumb(mealId: string, blob: Blob, upload = true) {
    if (!this.#idb) return;
    await set(`blob:${mealId}`, { type: blob.type, bytes: await blob.arrayBuffer() }, this.#idb);
    if (upload && !this.#blobq.includes(mealId)) {
      this.#blobq.push(mealId);
      await set('blobq', [...this.#blobq], this.#idb);
      this.onLocalChange?.();
    }
  }
  thumb(mealId: string): Promise<Blob | undefined> {
    if (!this.#idb) return Promise.resolve(undefined);
    return get<{ type: string; bytes: ArrayBuffer }>(`blob:${mealId}`, this.#idb).then((v) => (v ? new Blob([v.bytes], { type: v.type }) : undefined));
  }
  thumbQueue() {
    return [...this.#blobq];
  }
  async thumbSent(mealId: string) {
    this.#blobq = this.#blobq.filter((id) => id !== mealId);
    if (this.#idb) await set('blobq', [...this.#blobq], this.#idb);
  }
  // M9a: thumbnails to delete here and on the server (a deleted meal's, a replaced profile photo), kept with when they
  // were asked so a sync round sends them once Undo has had its time, and only if nothing uses them again
  async dropThumb(mealId: string) {
    if (!this.#idb) return;
    // a second delete after an Undo starts the wait again
    this.#dropq = [...this.#dropq.filter((d) => d.id !== mealId), { id: mealId, at: Date.now() }];
    await set('dropq', [...this.#dropq], this.#idb);
  }
  /** a live meal or the profile photo still shows this picture */
  thumbUsed(id: string) {
    return !!this.get('meal', id) || this.get('social', 'social')?.photo === id;
  }
  dropQueue() {
    return [...this.#dropq];
  }
  /** Out of the queue; `gone` also deletes the bytes on this phone and any upload still waiting. */
  async thumbDropped(mealId: string, gone: boolean) {
    this.#dropq = this.#dropq.filter((d) => d.id !== mealId);
    if (gone) this.#blobq = this.#blobq.filter((id) => id !== mealId);
    if (!this.#idb) return;
    await setMany([['dropq', [...this.#dropq]], ['blobq', [...this.#blobq]]], this.#idb);
    if (gone) await del(`blob:${mealId}`, this.#idb);
  }

  /** Resolves once everything written so far is in IndexedDB. */
  async settled() {
    while (this.#flushQueued) await new Promise((r) => setTimeout(r, 0));
    await this.#flushing;
  }

  /** Sign out: delete everything this user has on this device. */
  async wipe() {
    await this.settled();
    if (this.#idb) await clear(this.#idb);
    this.#idb = null;
    this.#outbox.clear();
    this.#blobq = [];
    this.#dirty.clear();
    this.data = empty();
    this.meta = freshMeta();
    this.pending = 0;
    this.userId = null;
    this.ready = false;
  }

  #write(rec: Rec, queue: boolean) {
    const k = recKey(rec.collection, rec.id);
    (this.data[rec.collection] as Record<string, Rec>)[rec.id] = rec;
    if (queue) this.#outbox.add(k);
    this.pending = this.#outbox.size;
    this.#dirty.add(k);
    this.#queueFlush();
  }

  // writes coalesce into one IndexedDB transaction per microtask
  #queueFlush() {
    if (this.#flushQueued) return;
    this.#flushQueued = true;
    // shortcut: a refused write is only logged; the record stays in memory and in the outbox. M9 adds the storage full state
    queueMicrotask(() => { this.#flushing = this.#flushing.then(() => this.#flush()).catch((e) => console.error('store write failed', e)); });
  }

  async #flush() {
    this.#flushQueued = false;
    const idb = this.#idb;
    if (!idb) return;
    const entries: [string, unknown][] = [];
    for (const k of this.#dirty) {
      const [, c, ...rest] = k.split(':');
      const r = this.data[c as Collection][rest.join(':')];
      if (r) entries.push([k, $state.snapshot(r)]);
    }
    this.#dirty.clear();
    entries.push(['outbox', [...this.#outbox]], ['meta', { ...this.meta }]);
    await setMany(entries, idb);
  }
}

export const db = new Store();
