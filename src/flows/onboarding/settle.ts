// The hand over from onboarding to the account (TECH-SPEC section 4). Once a signed in phone has pulled: an account
// that already has a profile keeps it and the draft is discarded; otherwise a saved draft becomes the records.
import { prefs } from '$lib/prefs.svelte';
import { db } from '$lib/db/store.svelte';
import { finishOnboarding } from '$lib/actions';
import { nowIso, today } from '$lib/model/dates';
import { complete, toRecords } from './draft';

/** Signed in and pulled at least once, so the account's own data is on the phone. */
export const pulled = () => db.ready && db.meta.cursor !== null;

export function settle() {
  const d = prefs.draft;
  if (!d || !pulled()) return;
  if (db.get('profile', 'profile')) {
    prefs.draft = null;
    return;
  }
  if (!d.saved || !complete(d)) return;
  finishOnboarding(toRecords(d, today(), nowIso()));
  prefs.draft = null;
}
