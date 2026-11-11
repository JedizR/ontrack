// The hand over from onboarding to the account (TECH-SPEC section 4). Once a signed in phone has pulled in this
// session: an account that already has a profile keeps it and the draft is discarded; otherwise a saved draft becomes
// the records. An older pull is not enough: the account may have been set up on another phone since.
import { prefs } from '$lib/prefs.svelte';
import { db } from '$lib/db/store.svelte';
import { sync } from '$lib/sync/engine.svelte';
import { finishOnboarding } from '$lib/actions';
import { nowIso, today } from '$lib/model/dates';
import { complete, toRecords } from './draft';

export function settle() {
  const d = prefs.draft;
  if (!d || !db.ready || !sync.pulledNow) return;
  if (db.get('profile', 'profile')) {
    prefs.draft = null;
    return;
  }
  if (!d.saved || !complete(d)) return;
  try {
    finishOnboarding(toRecords(d, today(), nowIso()));
    prefs.draft = null;
  } catch (e) {
    // nothing was written; back to Your plan rather than a Today with no plan
    console.error('the plan could not be saved', e);
    prefs.draft = { ...d, saved: undefined };
  }
}
