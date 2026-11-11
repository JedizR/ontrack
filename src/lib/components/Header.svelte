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
  class="bg-canvas sticky top-0 z-30 px-5 pt-[env(safe-area-inset-top)] transition-shadow duration-200 {scrolled ? 'shadow-[0_1px_0_var(--line)]' : ''}"
  data-testid="header"
>
  <div class="flex h-[var(--header-h)] items-center gap-3">
    <h1 class="text-title min-w-0 flex-1 truncate">{title}</h1>
    <SyncMark state={sync} />
    <!-- the avatar opens the account, or sign in; 44 to tap around the 36 circle -->
    <button type="button" class="group -mr-1 grid size-11 flex-none place-items-center" aria-label={signedIn ? t.shell.account : t.shell.signIn} onclick={onaccount} data-testid="avatar">
      <span class="bg-surface-2 text-ink-2 group-active:bg-surface-3 grid size-9 place-items-center rounded-full transition-colors duration-[var(--d-press)]">
        <User size={24} strokeWidth={1.75} aria-hidden="true" />
      </span>
    </button>
  </div>
</header>
