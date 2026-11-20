<!-- A sheet's grouped page, groups 24 apart. Bento: grey boxes straight on the sheet. Tray: the canvas under white cards
     that hold the grey boxes. It bleeds to the sheet's edges and under its foot. -->
<script lang="ts">
  import { prefs } from '$lib/prefs.svelte';
  import type { Snippet } from 'svelte';
  const tray = $derived(prefs.tray);

  let { footer = false, children }: { /** the sheet has a pinned foot: its padding is 16, not the safe area */ footer?: boolean; children: Snippet } = $props();
</script>

<div class="{tray ? 'bg-canvas' : ''} -mx-6 -mt-3 flex flex-col gap-6 px-4 pt-4 {footer ? '-mb-4 pb-4' : '-mb-[max(24px,var(--kb-safe,env(safe-area-inset-bottom)))] pb-[max(24px,var(--kb-safe,env(safe-area-inset-bottom)))]'}">
  {@render children()}
</div>
