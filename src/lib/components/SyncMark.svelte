<!-- DESIGN.md section 7, Sync mark: an 8 px dot beside the avatar. Hidden when idle, pulsing while syncing, hollow offline,
     attention colour when it needs attention. Tapping it says what it means. -->
<script lang="ts" module>
  export type SyncState = 'idle' | 'syncing' | 'offline' | 'attention';
</script>

<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/i18n';

  let { state }: { state: SyncState } = $props();

  const DOT = {
    syncing: 'bg-ink-3 animate-pulse motion-reduce:animate-none',
    offline: 'border-ink-2 border-[1.5px]',
    attention: 'bg-attention',
  };
</script>

{#if state !== 'idle'}
  <button
    type="button"
    class="active:bg-surface-2 -mx-2 grid size-11 flex-none place-items-center rounded-full"
    aria-label={t.sync[state]}
    data-testid="sync-mark"
    data-state={state}
    onclick={() => toast(t.sync[state])}
  >
    <span class="size-2 rounded-full {DOT[state]}"></span>
  </button>
{/if}
