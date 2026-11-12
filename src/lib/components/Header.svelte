<script lang="ts">
  import User from '@lucide/svelte/icons/user';
  import MapIcon from '@lucide/svelte/icons/map';
  import SyncMark, { type SyncState } from './SyncMark.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';

  let {
    title,
    sync = 'idle',
    signedIn = false,
    onaccount,
    onfriends,
    requests = 0,
  }: { title: string; sync?: SyncState; signedIn?: boolean; onaccount?: () => void; onfriends?: () => void; requests?: number } = $props();

  // a hairline appears once content scrolls under the header
  let scrolled = $state(false);
  const circle = 'bg-surface text-ink group-active:bg-surface-2 grid size-11 place-items-center rounded-full transition-[background-color,transform] duration-[var(--d-press)] group-active:scale-[0.97]';
</script>

<svelte:window onscroll={() => (scrolled = scrollY > 4)} />

<header
  class="sticky top-0 z-30 px-4 pt-[env(safe-area-inset-top)] transition-[box-shadow,background-color] duration-[var(--d-ui)] bg-canvas {scrolled ? 'shadow-[0_1px_0_var(--line)]' : ''}"
  data-testid="header"
>
  <div class="flex h-[var(--header-h)] items-center gap-3">
    <h1 class="text-title min-w-0 flex-1 truncate pt-1">{title}</h1>
    <SyncMark state={sync} />
    <!-- S1b: friends and the food map, one tap from every tab; the badge counts requests waiting for a yes -->
    {#if onfriends}
      <button type="button" class="group relative grid size-11 flex-none place-items-center" aria-label={requests ? `${t.social.open}, ${t.social.requests(num(requests))}` : t.social.open} onclick={onfriends} data-testid="friends">
        <span class={circle}><MapIcon size={22} strokeWidth={2} aria-hidden="true" /></span>
        {#if requests}
          <span class="bg-accent text-on-accent text-caption num ring-canvas absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full px-1 font-semibold ring-2" aria-hidden="true" data-testid="friends-badge">{num(requests)}</span>
        {/if}
      </button>
    {/if}
    <!-- the avatar opens the account, or sign in; 44 to tap around the 36 circle -->
    <button type="button" class="group -mr-1 grid size-11 flex-none place-items-center" aria-label={signedIn ? t.shell.account : t.shell.signIn} onclick={onaccount} data-testid="avatar">
      <span class={circle}>
        <User size={22} strokeWidth={2} aria-hidden="true" />
      </span>
    </button>
  </div>
</header>
