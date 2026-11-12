<script lang="ts">
  import User from '@lucide/svelte/icons/user';
  import SyncMark, { type SyncState } from './SyncMark.svelte';
  import { t } from '$lib/i18n';

  let { title, sync = 'idle', signedIn = false, onaccount }: { title: string; sync?: SyncState; signedIn?: boolean; onaccount?: () => void } = $props();

  // a hairline appears once content scrolls under the header
  let scrolled = $state(false);
</script>

<svelte:window onscroll={() => (scrolled = scrollY > 4)} />

<header
  class="sticky top-0 z-30 px-4 pt-[env(safe-area-inset-top)] transition-[box-shadow,background-color] duration-[var(--d-ui)] {scrolled ? 'bar-glass shadow-[0_1px_0_var(--line)]' : 'bg-canvas'}"
  data-testid="header"
>
  <div class="flex h-[var(--header-h)] items-center gap-3">
    <h1 class="text-title min-w-0 flex-1 truncate pt-1">{title}</h1>
    <SyncMark state={sync} />
    <!-- the avatar opens the account, or sign in; 44 to tap around the 36 circle -->
    <button type="button" class="group -mr-1 grid size-11 flex-none place-items-center" aria-label={signedIn ? t.shell.account : t.shell.signIn} onclick={onaccount} data-testid="avatar">
      <span class="bg-surface text-ink group-active:bg-surface-2 grid size-11 place-items-center rounded-full transition-[background-color,transform] duration-[var(--d-press)] group-active:scale-[0.97]">
        <User size={22} strokeWidth={2} aria-hidden="true" />
      </span>
    </button>
  </div>
</header>
