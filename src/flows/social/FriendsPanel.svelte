<!-- SCREENS.md section 13, Friends panel: a bottom sheet on the food map that never blocks it. Lowered: the grabber and
     "Search for friends" (and "2 friend requests" when any wait). Raised: you or the profile setup, requests, friends,
     requests sent; or, while typing, people by handle with where you stand with each. -->
<script lang="ts">
  import { toast } from 'svelte-sonner';
  import SearchIcon from '@lucide/svelte/icons/search';
  import X from '@lucide/svelte/icons/x';
  import Button from '$lib/components/Button.svelte';
  import Row from '$lib/components/Row.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';
  import { db } from '$lib/db/store.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { friends, refreshFriends } from '$lib/friends.svelte';
  import { acceptFriend, declineFriend, findPeople, requestFriend, removeFriend, syncNow, type SocialError } from '$lib/actions';
  import type { Friend, Person } from '$lib/backend/types';
  import Avatar from './Avatar.svelte';

  let { lowered = $bindable(0), raised = $bindable(false), onfriend }: { lowered?: number; raised?: boolean; onfriend: (f: Friend) => void } = $props();

  let typed = $state('');
  let results = $state.raw<Person[] | null>(null);
  let searching = $state<'idle' | 'loading' | SocialError>('idle');
  let busy = $state<string | null>(null);
  let full = $state(0);
  let head = $state(0);
  let drag = $state<number | null>(null);

  const social = $derived(db.get('social', 'social'));
  const incoming = $derived(friends.list.filter((f) => f.status === 'incoming'));
  const accepted = $derived(friends.list.filter((f) => f.status === 'friend'));
  const outgoing = $derived(friends.list.filter((f) => f.status === 'outgoing'));
  const failed = $derived(friends.status !== 'idle' && friends.status !== 'loading' && friends.status !== 'ready');
  const query = $derived(typed.trim().replace(/^@/, '').toLowerCase());
  // the lowered panel shows the grabber and the field; the rest waits under the screen's edge
  $effect(() => { lowered = head; });
  const offset = $derived(Math.max(0, (raised ? 0 : full - head) + (drag ?? 0)));

  // people by handle, after a short pause
  $effect(() => {
    const q = query;
    if (!q) {
      results = null;
      searching = 'idle';
      return;
    }
    searching = 'loading';
    const timer = setTimeout(async () => {
      const r = await findPeople(q);
      if (q !== query) return;
      results = r.ok ? r.value : null;
      searching = r.ok ? 'idle' : r.error;
    }, 250);
    return () => clearTimeout(timer);
  });

  function say(e: SocialError) {
    toast(e === 'offline' ? t.social.actionOffline : e === 'auth' ? t.social.actionAuth : e === 'bad_request' ? t.social.gone : t.social.actionFailed);
  }
  async function act(p: Person, f: () => Promise<{ ok: true } | { ok: false; error: SocialError }>, done?: string) {
    busy = p.id;
    const r = await f();
    busy = null;
    if (!r.ok) return say(r.error);
    if (done) toast(done);
    await refreshFriends();
  }
  function add(p: Person) {
    // the server knows only people with a profile: set one up first, then the request goes once it has synced
    if (!social) return void (sheets.profile = { then: () => add(p) });
    void act(p, async () => { if (db.pending) await syncNow(); return requestFriend(p.id); }, t.social.sentTo(p.name));
  }
  const accept = (p: Person) => act(p, () => acceptFriend(p.id), t.social.nowFriends(p.name));
  const decline = (p: Person) => act(p, () => declineFriend(p.id));
  const withdraw = (p: Person) => act(p, () => removeFriend(p.id));
  const statusOf = (id: string) => friends.list.find((f) => f.id === id)?.status ?? null;

  // the grabber: a tap raises or lowers, a drag follows the finger and settles past 40 px
  let from = 0;
  let moved = false;
  function down(e: PointerEvent) {
    from = e.clientY;
    moved = false;
    drag = 0;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (drag === null) return;
    const dy = e.clientY - from;
    if (Math.abs(dy) > 4) moved = true;
    drag = raised ? Math.max(0, dy) : Math.min(0, dy);
  }
  function up(e: PointerEvent) {
    if (drag === null) return;
    const dy = e.clientY - from;
    drag = null;
    raised = moved ? (raised ? dy < 40 : dy < -40) : !raised;
  }
</script>

{#snippet person(p: Person, caption: string)}
  {#snippet leading()}<Avatar name={p.name} path={p.photo} size="row" />{/snippet}
  {#snippet trailing()}
    {@const s = statusOf(p.id)}
    {#if s === 'friend'}
      <span class="text-callout text-ink-2 flex-none">{t.social.isFriend}</span>
    {:else if s === 'outgoing'}
      <span class="text-callout text-ink-2 flex-none">{t.social.requested}</span>
    {:else if s === 'incoming'}
      <Button size="sm" disabled={busy === p.id} onclick={() => void accept(p)} data-testid="person-accept">{t.social.accept}</Button>
    {:else}
      <Button size="sm" disabled={busy === p.id} onclick={() => add(p)} data-testid="person-add">{t.social.add}</Button>
    {/if}
  {/snippet}
  <Row title={p.name} {caption} {leading} {trailing} testid="person" />
{/snippet}

<section
  bind:clientHeight={full}
  class="bg-surface shadow-float absolute inset-x-0 bottom-0 z-10 flex h-[76svh] flex-col rounded-t-sheet {drag === null ? 'transition-transform duration-[var(--d-move)] ease-[var(--ease-sheet)]' : ''}"
  style="transform: translateY({offset}px)"
  aria-label={t.social.friendsTitle}
  data-testid="friends-panel"
  data-raised={raised}
>
  <div bind:clientHeight={head} class="flex-none pb-[max(16px,env(safe-area-inset-bottom))]">
    <button
      type="button"
      class="flex h-8 w-full touch-none items-start justify-center pt-2"
      aria-label={raised ? t.social.lower : t.social.raise}
      aria-expanded={raised}
      onpointerdown={down}
      onpointermove={move}
      onpointerup={up}
      onpointercancel={() => (drag = null)}
      data-testid="panel-grabber"
    >
      <span class="bg-line-strong block h-1.25 w-9 rounded-full"></span>
    </button>
    <div class="px-4">
      <label class="relative block">
        <span class="sr-only">{t.social.search}</span>
        <SearchIcon class="text-ink-2 pointer-events-none absolute top-1/2 left-4 -translate-y-1/2" size={20} strokeWidth={2} aria-hidden="true" />
        <input
          type="search"
          bind:value={typed}
          placeholder={t.social.search}
          autocapitalize="none"
          autocomplete="off"
          spellcheck="false"
          enterkeyhint="search"
          class="input-field w-full min-w-0 pl-12"
          onpointerdown={() => (raised = true)}
          onfocus={() => (raised = true)}
          data-testid="friend-search"
        />
      </label>
      {#if !raised && incoming.length}
        <Button variant="plain" size="sm" class="-ml-4 mt-1" onclick={() => (raised = true)} data-testid="panel-requests">{t.social.requests(num(incoming.length))}</Button>
      {/if}
    </div>
  </div>

  <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pb-[max(24px,env(safe-area-inset-bottom))]" inert={!raised}>
    {#if query}
      {#if searching === 'loading' && !results}
        {@render skeleton()}
      {:else if searching === 'offline'}
        <p class="text-body text-ink-2" data-testid="panel-message">{t.social.offline}</p>
      {:else if searching !== 'idle' && searching !== 'loading'}
        <p class="text-body text-ink-2" data-testid="panel-message">{t.social.failed}</p>
      {:else if results && !results.length}
        <p class="text-body text-ink-2" data-testid="search-none">{t.social.noMatch(query)}</p>
      {:else if results}
        <div data-testid="search-results">
          {#each results as p (p.id)}{@render person(p, t.social.handle(p.handle))}{/each}
        </div>
      {/if}
    {:else}
      {#if social}
        {#snippet me()}<Avatar name={social.name} local={social.photo ?? null} size="row" />{/snippet}
        <Row title={social.name} caption={t.social.handle(social.handle)} leading={me} onclick={() => (sheets.profile = {})} testid="panel-me" />
      {:else}
        <div class="bg-surface-2 rounded-md p-4" data-testid="panel-setup">
          <p class="text-body font-semibold">{t.social.setup}</p>
          <p class="text-callout text-ink-2 mt-1">{t.social.setupLine}</p>
          <Button variant="primary" class="mt-3" onclick={() => (sheets.profile = {})} data-testid="panel-setup-open">{t.social.setupAction}</Button>
        </div>
      {/if}

      {#if friends.status === 'loading' && !friends.list.length}
        <div class="mt-6">{@render skeleton()}</div>
      {:else if failed}
        <div class="mt-6" role="status" data-testid="panel-message">
          <p class="text-body text-ink-2">{friends.status === 'offline' ? t.social.offline : friends.status === 'auth' ? t.social.signedOut : t.social.failed}</p>
          {#if friends.status !== 'offline' && friends.status !== 'auth'}<Button class="mt-3" onclick={() => void refreshFriends()}>{t.social.retry}</Button>{/if}
        </div>
      {/if}

      {#if incoming.length}
        <h3 class="text-eyebrow text-ink-2 mt-6">{t.social.requestsTitle}</h3>
        <div data-testid="requests">
          {#each incoming as p (p.id)}
            {#snippet leading()}<Avatar name={p.name} path={p.photo} size="row" />{/snippet}
            {#snippet trailing()}
              <Button size="sm" disabled={busy === p.id} onclick={() => void accept(p)} data-testid="request-accept">{t.social.accept}</Button>
              <button type="button" class="text-ink-2 active:bg-surface-2 -mr-2 grid size-11 flex-none place-items-center rounded-sm transition-colors duration-[var(--d-press)]" aria-label={t.social.decline(p.name)} disabled={busy === p.id} onclick={() => void decline(p)} data-testid="request-decline">
                <X size={20} strokeWidth={2} aria-hidden="true" />
              </button>
            {/snippet}
            <Row title={p.name} caption={t.social.wants(p.handle)} {leading} {trailing} wrap testid="request" />
          {/each}
        </div>
      {/if}

      {#if friends.status === 'ready' || friends.list.length}
        <h3 class="text-eyebrow text-ink-2 mt-6">{t.social.friendsTitle}</h3>
        {#if accepted.length}
          <div data-testid="friend-list">
            {#each accepted as f (f.id)}
              {#snippet leading()}<Avatar name={f.name} path={f.photo} size="row" />{/snippet}
              <Row title={f.name} caption={t.social.handle(f.handle)} {leading} onclick={() => onfriend(f)} testid="friend" />
            {/each}
          </div>
        {:else}
          <p class="text-body text-ink-2 mt-2" data-testid="friends-none">{t.social.noFriends}</p>
        {/if}
      {/if}

      {#if outgoing.length}
        <h3 class="text-eyebrow text-ink-2 mt-6">{t.social.sentTitle}</h3>
        <div data-testid="sent">
          {#each outgoing as p (p.id)}
            {#snippet leading()}<Avatar name={p.name} path={p.photo} size="row" />{/snippet}
            {#snippet trailing()}<Button variant="plain" size="sm" class="-mr-4" disabled={busy === p.id} onclick={() => void withdraw(p)} data-testid="sent-withdraw">{t.social.withdraw}</Button>{/snippet}
            <Row title={p.name} caption={t.social.sent} {leading} {trailing} testid="sent-row" />
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</section>

{#snippet skeleton()}
  {#each [0, 1, 2] as i (i)}
    <div class="flex items-center gap-4 py-2"><Skeleton class="size-12 rounded-full" /><div class="flex flex-1 flex-col gap-2"><Skeleton class="h-5 w-32 rounded-xs" /><Skeleton class="h-4 w-20 rounded-xs" /></div></div>
  {/each}
{/snippet}
