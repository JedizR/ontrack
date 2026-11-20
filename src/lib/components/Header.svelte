<script lang="ts">
  import { prefs } from '$lib/prefs.svelte';
  import User from '@lucide/svelte/icons/user';
  import MapIcon from '@lucide/svelte/icons/map';
  import SyncMark, { type SyncState } from './SyncMark.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';
  const curvy = $derived(prefs.look === 'curvy');

  let {
    title,
    sync = 'idle',
    signedIn = false,
    onaccount,
    onfriends,
    requests = 0,
  }: { title: string; sync?: SyncState; signedIn?: boolean; onaccount?: () => void; onfriends?: () => void; requests?: number } = $props();

  // once content scrolls under the header it fades into the canvas below it (U1b), never a hard edge
  let scrolled = $state(false);
  const circle = $derived(`${curvy ? 'bg-surface ' : ''}text-ink group-active:bg-surface-2 grid size-11 place-items-center rounded-full transition-[background-color,transform] duration-[var(--d-press)] group-active:scale-[0.97]`);
</script>

<svelte:window onscroll={() => (scrolled = scrollY > 4)} />

<!-- Default (the owner, 19 Nov): no glass. The header is a plain bar the colour of the page; once anything scrolls under
     it, a hairline marks its foot. Curvy (R2): at rest the header is the page; once anything scrolls under it, it becomes
     the landing page's floating glass capsule, its title moving in from 8 to 24 -->
<header
  class="sticky top-0 z-30 px-2 pt-[env(safe-area-inset-top)] {curvy ? '' : `bg-canvas transition-shadow duration-[var(--d-ui)] ${scrolled ? 'shadow-[0_1px_0_var(--line)]' : ''}`}"
  data-scrolled={scrolled || undefined}
  data-testid="header"
>
  <div class="relative mt-1 flex h-[var(--header-h)] items-center gap-3 pr-1.5 {curvy ? `rounded-full transition-[background-color,box-shadow,padding] duration-[var(--d-ui)] ${scrolled ? 'liquid pl-6' : 'pl-2'}` : 'pl-2'}" data-testid="header-bar">
    <h1 class="text-heading min-w-0 flex-1 truncate">{title}</h1>
    <SyncMark state={sync} />
    <!-- S1b: friends and the food map, one tap from every tab; the badge counts requests waiting for a yes -->
    {#if onfriends}
      <span class="relative flex-none">
        <button type="button" class="group grid size-11 place-items-center" aria-label={requests ? `${t.social.open}, ${t.social.requests(num(requests))}` : t.social.open} onclick={onfriends} data-testid="friends">
          <span class={circle}><MapIcon size={22} strokeWidth={2} aria-hidden="true" /></span>
        </button>
        {#if requests}
          <span class="bg-accent text-on-accent text-caption num ring-canvas pointer-events-none absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full px-1 font-semibold ring-2" aria-hidden="true" data-testid="friends-badge">{num(requests)}</span>
        {/if}
      </span>
    {/if}
    <!-- the avatar opens the account, or sign in; 44 to tap around the 36 circle -->
    <button type="button" class="group grid size-11 flex-none place-items-center" aria-label={signedIn ? t.shell.account : t.shell.signIn} onclick={onaccount} data-testid="avatar">
      <span class={circle}>
        <User size={22} strokeWidth={2} aria-hidden="true" />
      </span>
    </button>
  </div>
</header>
