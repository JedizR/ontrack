<!-- SCREENS.md section 13, Friend sheet: who they are, their training program while they show it (never a weight or a
     target), and Remove friend behind a confirm step: undoing it needs their yes. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Row from '$lib/components/Row.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';
  import { friendProgram, removeFriend, type SocialError } from '$lib/actions';
  import { refreshFriends } from '$lib/friends.svelte';
  import type { Friend } from '$lib/backend/types';
  import type { Program } from '../../../shared/records';
  import Avatar from './Avatar.svelte';

  let { friend = $bindable(null) }: { friend?: Friend | null } = $props();

  let mode = $state<'main' | 'remove'>('main');
  let program = $state.raw<Program | null>(null);
  let status = $state<'loading' | 'ready' | SocialError>('loading');
  let busy = $state(false);

  $effect(() => {
    const f = friend;
    if (f) untrack(() => { mode = 'main'; void load(f); });
  });
  async function load(f: Friend) {
    status = 'loading';
    const r = await friendProgram(f.id);
    if (friend?.id !== f.id) return;
    program = r.ok ? r.value : null;
    status = r.ok ? 'ready' : r.error;
  }

  const sessions = $derived([...(program?.sessions ?? [])].sort((a, z) => a.weekday - z.weekday));
  const line = (s: Program['sessions'][number]) => {
    const kind = t.train.line(t.train.types[s.type], num(s.minutes));
    return s.name === t.train.types[s.type] ? kind : `${s.name}. ${kind}`;
  };

  async function remove() {
    if (!friend) return;
    busy = true;
    const r = await removeFriend(friend.id);
    busy = false;
    if (!r.ok) return void toast(r.error === 'offline' ? t.social.actionOffline : t.social.actionFailed);
    toast(t.social.removed(friend.name));
    friend = null;
    await refreshFriends();
  }
</script>

{#snippet confirm()}
  <Button variant="danger" size="lg" full disabled={busy} onclick={remove} data-testid="friend-remove-confirm">{t.social.remove}</Button>
{/snippet}

<Sheet
  bind:open={() => friend !== null, (v) => { if (!v) friend = null; }}
  title={friend ? (mode === 'main' ? friend.name : t.social.removeTitle(friend.name)) : ''}
  layer="base"
  testid="friend-sheet"
  footer={mode === 'remove' ? confirm : undefined}
  onback={mode === 'remove' && !busy ? () => (mode = 'main') : undefined}
  backLabel={t.social.back}
>
  {#if friend}
    {#if mode === 'main'}
      <div class="flex items-center gap-4">
        <Avatar name={friend.name} path={friend.photo} size="lg" />
        <p class="text-body text-ink-2 min-w-0 truncate">{t.social.handle(friend.handle)}</p>
      </div>

      <h3 class="text-eyebrow text-ink-2 mt-6">{t.social.program}</h3>
      <div class="mt-1" data-testid="friend-program">
        {#if status === 'loading'}
          {#each [0, 1, 2] as i (i)}<div class="flex flex-col gap-2 py-3"><Skeleton class="h-5 w-28 rounded-xs" /><Skeleton class="h-4 w-44 rounded-xs" /></div>{/each}
        {:else if status !== 'ready'}
          <p class="text-body text-ink-2">{status === 'offline' ? t.social.programOffline : t.social.programFailed}</p>
          {#if status !== 'offline'}<Button class="mt-3" onclick={() => friend && void load(friend)}>{t.social.retry}</Button>{/if}
        {:else if !program}
          <p class="text-body text-ink-2" data-testid="friend-program-hidden">{t.social.programHidden(friend.name)}</p>
        {:else}
          {#if program.name}<p class="text-body font-semibold">{program.name}</p>{/if}
          {#each sessions as s (s.key)}
            <Row title={t.train.weekdays[s.weekday]} caption={line(s)} testid="friend-session" />
          {:else}
            <p class="text-body text-ink-2">{t.social.programEmpty}</p>
          {/each}
        {/if}
      </div>

      <Button variant="danger" size="sm" class="-ml-4 mt-6" onclick={() => (mode = 'remove')} data-testid="friend-remove">{t.social.remove}</Button>
    {:else}
      <p class="text-lead">{t.social.removeLine}</p>
    {/if}
  {/if}
</Sheet>
