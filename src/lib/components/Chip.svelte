<!-- DESIGN.md section 7, Chip: 36 high on screen, 44 to tap. Selected is an ink fill with canvas text. -->
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
    class="text-callout inline-flex h-9 items-center rounded-full px-4 font-medium whitespace-nowrap transition-[transform,background-color] duration-[var(--d-press)] group-active:scale-[0.97] {selected ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink group-active:bg-surface-3'}"
  >
    {@render children()}
  </span>
</button>
