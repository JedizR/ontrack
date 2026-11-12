// Who is signed in, and opening the store and starting sync for them (TECH-SPEC sections 4, 5 and 11).
// Start: the last user's store opens from IndexedDB at once, then the backend loads and restores the session.
// A store with no session is an expired session: the data stays and the app asks to sign in again.
import { db } from '$lib/db/store.svelte';
import { sync } from '$lib/sync/engine.svelte';
import { BackendError, loadBackend, type Backend, type User } from '$lib/backend';
import { prefs } from '$lib/prefs.svelte';

class Session {
  user = $state<User | null>(null);
  /** the backend has loaded and any saved session is restored */
  ready = $state(false);
  backend: Backend | null = null;
  /** set while signing out, so the session ending is not read as an expiry */
  leaving = false;
  /** another account signed in while this browser held unsent changes for the last one; it was signed out again */
  wrongAccount = $state(false);

  async boot() {
    if (prefs.lastUser) await db.open(prefs.lastUser).catch((e) => console.error('store failed to open', e));
    try {
      this.backend = await loadBackend();
      this.backend.auth.onChange((u) => void this.#use(u));
      let u: User | null;
      try {
        u = await this.backend.auth.session();
      } catch (e) {
        // offline with a token due for refresh: still this browser's user, and sync backs off until the network is back
        if (!(e instanceof BackendError && e.kind === 'network' && prefs.lastUser)) throw e;
        u = { userId: prefs.lastUser, email: prefs.lastEmail ?? undefined };
      }
      await this.#use(u);
    } catch (e) {
      console.error('sign in is unavailable', e);
    }
    this.ready = true;
  }

  async #use(u: User | null) {
    if (this.leaving || !this.backend) return;
    if (!u) {
      if (!this.user && !db.ready) return;
      this.user = null;
      sync.stop(db.ready ? 'auth' : 'idle');
      return;
    }
    if (db.ready && db.userId !== u.userId) {
      if (db.pending > 0) {
        // the changes waiting on this browser belong to the last account and would be stranded: keep it, refuse this one
        this.wrongAccount = true;
        await this.backend.auth.signOut().catch(() => undefined);
        return;
      }
      await db.wipe(); // all backed up: the last account's data leaves the phone
    }
    this.wrongAccount = false;
    const same = this.user?.userId === u.userId;
    this.user = { userId: u.userId, email: u.email ?? this.user?.email };
    if (same && sync.status !== 'auth') return; // a token refresh, not a new sign in
    if (db.userId !== u.userId) await db.open(u.userId);
    prefs.lastUser = u.userId;
    prefs.lastEmail = this.user.email ?? null;
    sync.start(this.backend);
  }
}

export const session = new Session();
