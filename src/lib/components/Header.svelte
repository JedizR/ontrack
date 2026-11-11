<script lang="ts">
  import User from '@lucide/svelte/icons/user';
  import SyncMark, { type SyncState } from './SyncMark.svelte';
  import { t } from '$lib/i18n';

  let { title, sync = 'idle' }: { title: string; sync?: SyncState } = $props();

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
    <div class="bg-surface-2 text-ink-2 grid size-9 place-items-center rounded-full" role="img" aria-label={t.shell.account}>
      <User size={24} strokeWidth={1.75} aria-hidden="true" />
    </div>
  </div>
</header>
