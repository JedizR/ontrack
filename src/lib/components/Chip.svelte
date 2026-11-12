<!-- DESIGN.md section 7, Chip: OneFin's tab cell, 44 high at radius 16. Selected is an ink fill with canvas text. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { haptic } from '$lib/haptics';

  let { selected, onclick, children }: { selected?: boolean; onclick: () => void; children: Snippet } = $props();
</script>

<button
  type="button"
  class="group inline-grid min-h-[var(--tap)] flex-none place-items-center"
  aria-pressed={selected}
  onclick={() => { if (selected !== undefined) haptic(); onclick(); }}
>
  <span
    class="text-callout inline-flex h-11 items-center rounded-sm px-4 font-semibold whitespace-nowrap transition-[transform,background-color,color] duration-[var(--d-ui)] ease-[var(--spring-default)] group-active:scale-[0.97] {selected ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink group-active:bg-surface-3'}"
  >
    {@render children()}
  </span>
</button>
