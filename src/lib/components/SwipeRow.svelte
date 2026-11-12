<!-- A list row that deletes on a swipe to the left (SCREENS.md section 6). The row follows the finger over a Delete
     label; past the commit distance it slides out and calls ondelete, which offers undo. Keeps the row hairline. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { swipe } from '$lib/swipe';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';

  let { ondelete, testid, children }: { ondelete: () => void; testid?: string; children: Snippet } = $props();

  let dx = $state(0);
  let dragging = $state(false);
  const opts = {
    commit: 96,
    onDrag: (d: number) => { dragging = true; dx = Math.min(0, d); },
    onSwipe: (dir: 1 | -1) => {
      dragging = false;
      if (dir === -1) return void (dx = 0);
      haptic();
      dx = -innerWidth;
      setTimeout(() => { ondelete(); dx = 0; }, 180);
    },
    onCancel: () => { dragging = false; dx = 0; },
  };
</script>

<!-- the hairline between swipe rows sits on the wrapper, inset to where the row text starts (inset, tile, gap) -->
<div
  class="relative -mx-6 overflow-hidden [&+&]:before:bg-line [&+&]:before:absolute [&+&]:before:top-0 [&+&]:before:right-0 [&+&]:before:left-22 [&+&]:before:z-10 [&+&]:before:h-px"
  data-no-swipe
  data-testid={testid}
  use:swipe={opts}
>
  <div class="bg-danger text-on-danger text-callout absolute inset-0 flex items-center justify-end px-6 font-semibold" aria-hidden="true">{t.today.delete}</div>
  <div class="bg-surface relative px-6" style="transform: translateX({dx}px); transition: {dragging ? 'none' : 'transform 180ms var(--ease-out)'}">
    {@render children()}
  </div>
</div>
