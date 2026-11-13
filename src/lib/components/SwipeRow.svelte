<!-- A list row that deletes on a swipe to the left, as iOS Mail does (SCREENS.md section 6, U1c). The row follows the
     finger over a red action that fills the space it leaves, full height and clipped by the card, so no edge shows. Let go
     past a short swipe and it stays open on a Delete button; past half the row the action takes over, and letting go
     deletes with a haptic: the row slides out, collapses, and ondelete offers Undo. A tap on an open row closes it.
     Only one row is open at a time. -->
<script lang="ts" module>
  let openRow = $state<symbol | null>(null);
</script>

<script lang="ts">
  import type { Snippet } from 'svelte';
  import Trash from '@lucide/svelte/icons/trash-2';
  import { swipe } from '$lib/swipe';
  import { collapse, dur, haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';

  let { ondelete, testid, children }: { ondelete: () => void; testid?: string; children: Snippet } = $props();

  const me = Symbol();
  const ACTION = 88; // the open Delete button: wide enough for its word at the largest text
  let w = $state(0);
  let dx = $state(0);
  let base = 0; // where a drag starts from: 0, or -ACTION when open
  let dragging = $state(false);
  let gone = $state(false);
  // past half the row a letting go deletes; the action shows it by jumping to the row's edge
  const armed = $derived(-dx > w / 2);
  // another row opening closes this one
  $effect(() => { if (openRow !== me && !dragging && !gone && dx !== 0) dx = 0; });

  // let go: open or closed by where it is; past half the row, deleted. A cancelled gesture (a second finger, the system
  // taking the touch) only snaps, never deletes
  function snap() {
    dragging = false;
    dx = -dx > ACTION / 2 ? -ACTION : 0;
    openRow = dx ? me : openRow === me ? null : openRow;
  }
  const settle = () => (armed ? remove() : snap());
  // the haptic plays here, inside the touchend or the tap: iOS plays it only from a user's gesture
  function remove() {
    if (gone) return; // a second swipe or tap while it slides out must not delete twice and spoil Undo
    dragging = false;
    haptic();
    gone = true;
    dx = -w;
    openRow = null;
    // the row slides out first; then the list collapses it
    setTimeout(ondelete, dur('--d-settle'));
  }
  const opts = {
    commit: 0,
    onDrag: (d: number) => {
      if (gone) return;
      if (!dragging) { base = dx; openRow = me; }
      dragging = true;
      // a little give past closed, as iOS has
      dx = Math.min(8, base + d);
    },
    onSwipe: settle,
    onCancel: () => { if (!gone) snap(); },
  };
  // an open row's tap closes it instead of opening the meal
  const close = (e: MouseEvent) => {
    if (dx === 0) return;
    e.stopPropagation();
    e.preventDefault();
    dx = 0;
    openRow = null;
  };
</script>

<!-- the hairline between swipe rows sits on the wrapper, inset to where the row text starts (inset, tile, gap). No clip
     here: the card's own clip and corners cut the action, and the first and last rows' action fills the card's padding -->
<div
  class="relative -mx-6 [&+&]:before:bg-line [&+&]:before:absolute [&+&]:before:top-0 [&+&]:before:right-0 [&+&]:before:left-22 [&+&]:before:z-10 [&+&]:before:h-px"
  data-no-swipe
  data-testid={testid}
  data-open={dx < 0 || undefined}
  bind:clientWidth={w}
  use:swipe={opts}
  in:collapse
  out:collapse={{ leave: true }}
  onintrostart={() => { gone = false; dx = 0; }}
>
  <!-- capture: a tap on an open row closes it before the row's own button sees it -->
  <div
    class="bg-surface relative px-6"
    style="transform: translateX({dx}px); transition: {dragging ? 'none' : 'transform var(--d-settle) var(--ease-out)'}"
    onclickcapture={close}
  >
    {@render children()}
  </div>
  <!-- the action fills exactly the space the row leaves, over the hairline and into the card's padding at the ends. It
       stays drawn at no width when closed, so it shrinks with the row as it slides back, and comes after the row in the
       document, so the row's own button is the first one there -->
  <div
    class="bg-danger text-on-danger absolute inset-y-0 right-0 z-20 overflow-hidden [:first-child>&]:-top-1 [:last-child>&]:-bottom-1"
    style="width: {Math.max(0, -dx)}px; transition: {dragging ? 'none' : 'width var(--d-settle) var(--ease-out)'}"
    inert={dx !== -ACTION}
    aria-hidden={dx !== -ACTION}
  >
    <button
      type="button"
      class="text-callout absolute inset-y-0 grid w-22 place-items-center content-center gap-0.5 font-semibold transition-[left] duration-[var(--d-settle)] ease-[var(--ease-out)]"
      style="left: {armed || gone ? 0 : Math.max(0, -dx - ACTION)}px"
      onclick={remove}
      data-testid="swipe-delete"
    >
      <Trash size={20} strokeWidth={2} aria-hidden="true" />{t.today.delete}
    </button>
  </div>
</div>
