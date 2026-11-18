<!-- A sheet's grouped page (the owner, 19 Nov): the canvas under white cards that hold small grey boxes, as every tab's top
     card, without the gradient. It bleeds to the sheet's edges and under its foot, so the canvas fills the scroll area. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { footer = false, children }: { /** the sheet has a pinned foot: its padding is 16, not the safe area */ footer?: boolean; children: Snippet } = $props();
</script>

<div class="bg-canvas -mx-6 -mt-3 flex flex-col gap-6 px-4 pt-4 {footer ? '-mb-4 pb-4' : '-mb-[max(24px,var(--kb-safe,env(safe-area-inset-bottom)))] pb-[max(24px,var(--kb-safe,env(safe-area-inset-bottom)))]'}">
  {@render children()}
</div>
