// Background sync, ported from watermelon onto the Backend interface (TECH-SPEC section 5). Never blocks the UI:
// push the outbox in batches, pull since the cursor, upload waiting thumbnails. Debounced, backed off, and silent
// unless something needs the user.
import { db as defaultStore, type Store } from '$lib/db/store.svelte';
import { BackendError, PUSH_BATCH, type Backend } from '$lib/backend/types';
import type { Rec } from '../../../shared/records';

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error' | 'auth';

const DEBOUNCE_MS = 1500;
const EVERY_MS = 5 * 60_000;
const BACKOFF_MS = 2000;
const BACKOFF_MAX_MS = 5 * 60_000;
const offline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
const refused = (e: unknown) => e instanceof BackendError && e.kind === 'bad_request';

export class Sync {
  status = $state<SyncStatus>('idle');
  lastSyncAt = $state<number | null>(null);
  /** this device has finished a full pull since it was signed in */
  pulled = $state(false);
  /** a pull has landed since sync last started: what the account holds now is on the phone, not an old copy */
  pulledNow = $state(false);
  lastError = $state<string | null>(null);

  #store: Store;
  #backend: Backend | null = null;
  #timer: ReturnType<typeof setTimeout> | undefined;
  #failures = 0;
  #running: Promise<void> | null = null;
  #again = false;
  #listening = false;

  constructor(store: Store = defaultStore) {
    this.#store = store;
  }

  start(backend: Backend) {
    this.#backend = backend;
    this.#failures = 0;
    this.pulled = this.#store.meta.cursor !== null;
    this.pulledNow = false;
    this.lastSyncAt = this.#store.meta.lastSyncAt;
    // while backing off, an edit waits for the backoff instead of retrying at once (rule 6)
    this.#store.onLocalChange = () => { if (!this.#failures) this.schedule(); };
    this.#listen();
    this.status = offline() ? 'offline' : 'idle';
    this.schedule(0);
  }

  /** Stop syncing. `auth` keeps the store and says the session has expired. */
  stop(status: SyncStatus = 'idle') {
    clearTimeout(this.#timer);
    this.#backend = null;
    this.#store.onLocalChange = null;
    this.status = status;
  }

  schedule(ms = DEBOUNCE_MS) {
    clearTimeout(this.#timer);
    if (this.#backend) this.#timer = setTimeout(() => void this.run(), ms);
  }

  /** One full round. Resolves when it (and any round asked for meanwhile) is done. */
  run(): Promise<void> {
    if (this.#running) {
      this.#again = true;
      return this.#running;
    }
    this.#running = this.#round().finally(() => {
      this.#running = null;
      if (this.#again) {
        this.#again = false;
        this.schedule(0);
      }
    });
    return this.#running;
  }

  async #round() {
    const backend = this.#backend;
    const store = this.#store;
    if (!backend || !store.ready) return;
    if (offline()) {
      this.status = 'offline';
      return;
    }
    clearTimeout(this.#timer);
    this.status = 'syncing';
    try {
      // rule 5: push, then pull
      for (let batch = store.outboxBatch(PUSH_BATCH); batch.length; batch = store.outboxBatch(PUSH_BATCH)) {
        await this.#push(backend, batch);
        if (backend !== this.#backend) return; // signed out mid-flight
        store.ack(batch); // a record edited while in flight stays queued and goes in the next batch
      }
      const { records, cursor } = await backend.pull(store.meta.cursor);
      if (backend !== this.#backend) return;
      store.applyRemote(records);
      const now = Date.now();
      store.setCursor(cursor, now);
      this.pulledNow = true;
      for (const mealId of store.thumbQueue()) {
        const blob = await store.thumb(mealId);
        if (blob) await backend.putThumb(mealId, blob).catch((e) => { if (!refused(e)) throw e; console.error('thumbnail refused', mealId); });
        await store.thumbSent(mealId);
      }
      this.#failures = 0;
      this.lastSyncAt = now;
      this.lastError = null;
      this.pulled = true;
      this.status = 'idle';
      if (store.pending > 0) this.schedule(300);
    } catch (e) {
      if (backend !== this.#backend) return;
      const kind = e instanceof BackendError ? e.kind : 'network';
      this.lastError = kind;
      if (kind === 'auth') {
        // the session is gone: keep everything on the phone and wait for the user to sign in again
        this.stop('auth');
        return;
      }
      this.#failures++;
      this.status = offline() ? 'offline' : 'error';
      this.schedule(Math.min(BACKOFF_MAX_MS, BACKOFF_MS * 2 ** (this.#failures - 1)));
    }
  }

  /**
   * A batch the server refuses as a whole (one record it cannot store) would block every later change forever. Send
   * that batch one by one instead; a refused record stays on this browser, out of the outbox, and is logged.
   */
  async #push(backend: Backend, batch: Rec[]) {
    try {
      await backend.push(batch);
    } catch (e) {
      if (!refused(e) || batch.length === 1) {
        if (refused(e)) console.error('record refused by the server', batch[0].collection, batch[0].id);
        else throw e;
        return;
      }
      for (const r of batch) await this.#push(backend, [r]);
    }
  }

  #listen() {
    if (this.#listening || typeof window === 'undefined') return;
    this.#listening = true;
    addEventListener('online', () => this.schedule(0));
    addEventListener('offline', () => { if (this.#backend) this.status = 'offline'; });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.schedule(0); });
    setInterval(() => { if (document.visibilityState === 'visible') this.schedule(0); }, EVERY_MS);
  }
}

export const sync = new Sync();
