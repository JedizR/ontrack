// Friends and requests as the server last answered (S1b, F16): the header's badge and the map's panel read one list.
import { untrack } from 'svelte';
import { listFriends, type SocialError } from '$lib/actions';
import type { Friend } from '$lib/backend/types';

export const friends = $state({ list: [] as Friend[], status: 'idle' as 'idle' | 'loading' | 'ready' | SocialError });

let run = 0; // an answer older than the latest ask is dropped
export async function refreshFriends() {
  const mine = ++run;
  // called from effects: reading the status here must not make them run again
  untrack(() => { if (friends.status !== 'ready') friends.status = 'loading'; });
  const r = await listFriends();
  if (mine !== run) return;
  if (r.ok) friends.list = r.value;
  friends.status = r.ok ? 'ready' : r.error;
}

/** Requests waiting for your yes. */
export const waiting = () => friends.list.filter((f) => f.status === 'incoming').length;
