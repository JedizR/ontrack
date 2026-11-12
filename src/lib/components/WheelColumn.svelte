<!-- One column of a Wheel: a native scroller whose rows snap to the band. iOS does the momentum. The column is a slider
     for assistive tech (VoiceOver's swipe up and down arrives as arrow keys). Tapping another row brings it to the band;
     tapping the row on the band, or Enter, asks the Wheel for a text field. -->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import { reducedMotion } from '$lib/haptics';

  let {
    labels,
    index = $bindable(),
    label,
    min,
    max,
    valueOf,
    textOf,
    ontype,
  }: {
    labels: string[];
    /** the row on the band */
    index: number;
    label: string;
    min: number;
    max: number;
    /** the value and its words for a row, for aria-valuenow and aria-valuetext */
    valueOf: (i: number) => number;
    textOf: (i: number) => string;
    ontype: () => void;
  } = $props();

  let el = $state<HTMLDivElement>();
  let rowH = 0;
  // the row under the band while the finger moves; index is written only once the scroll settles
  let live = $state(index);
  // scroll events from a move made in code are ignored until this time
  let ignoreUntil = 0;
  let frame = 0;
  let settle: ReturnType<typeof setTimeout> | undefined;
  const last = $derived(labels.length - 1);
  const fit = (i: number) => Math.max(0, Math.min(last, i));

  function measure() {
    // whole pixels: fractional rows drift away from the snap points
    rowH = Math.round((el?.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0);
  }
  function place(i: number, smooth = false) {
    if (!el || !rowH) return;
    const top = i * rowH;
    if (Math.abs(el.scrollTop - top) < 1) return;
    const glide = smooth && !reducedMotion();
    ignoreUntil = performance.now() + (glide ? 700 : 80);
    el.scrollTo({ top, behavior: glide ? 'smooth' : 'instant' });
  }
  /** Write a row and bring it to the band. A bound value can come back clamped (300.7 kg is 300.0). */
  function choose(i: number) {
    index = i;
    live = index;
    place(index, true);
  }
  const go = (i: number) => choose(fit(i));

  function onscroll() {
    if (!el || !rowH || performance.now() < ignoreUntil) return;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => { if (el) live = fit(Math.round(el.scrollTop / rowH)); });
    clearTimeout(settle);
    // Safari before 26.2 has no scrollend: settle 120 ms after the last scroll event
    if (!('onscrollend' in window)) settle = setTimeout(commit, 120);
  }
  function commit() {
    if (!el || !rowH || performance.now() < ignoreUntil) return;
    const i = fit(Math.round(el.scrollTop / rowH));
    if (i !== index) choose(i);
    else live = i;
  }

  // a value set from outside (typed, clamped, a unit change) moves the column at once
  $effect(() => {
    const i = index;
    untrack(() => {
      if (i === live) return;
      live = i;
      place(i);
    });
  });

  onMount(() => {
    // after the first paint, and again once the fonts are in: the row height can change with them
    const again = () => { measure(); place(live); };
    const raf = requestAnimationFrame(again);
    void document.fonts?.ready.then(again);
    const ro = new ResizeObserver(again);
    if (el?.firstElementChild) ro.observe(el.firstElementChild);
    return () => { cancelAnimationFrame(raf); cancelAnimationFrame(frame); clearTimeout(settle); ro.disconnect(); };
  });

  function key(e: KeyboardEvent) {
    const by = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 10, PageDown: -10 }[e.key];
    if (by) go(live + by);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(last);
    else if (e.key === 'Enter') ontype();
    else return;
    e.preventDefault();
  }
  // a tap that starts a scroll is not a click on iOS, so a click is always a tap on a row
  function tap(e: MouseEvent) {
    const row = (e.target as HTMLElement).closest<HTMLElement>('[data-i]');
    if (!row) return;
    const i = Number(row.dataset.i);
    if (i === live) ontype();
    else go(i);
  }
  const width = $derived(Math.max(...labels.map((l) => l.length)));
</script>

<div
  bind:this={el}
  role="slider"
  tabindex="0"
  aria-label={label}
  aria-orientation="vertical"
  aria-valuemin={min}
  aria-valuemax={max}
  aria-valuenow={valueOf(live)}
  aria-valuetext={textOf(live)}
  class="num h-full flex-none snap-y snap-mandatory overflow-y-auto overscroll-contain font-semibold outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
  style="padding-block: calc(2 * var(--wheel-row)); width: calc({width}ch + 12px); font-size: var(--t-heading); mask-image: linear-gradient(transparent, black 30%, black 70%, transparent); -webkit-mask-image: linear-gradient(transparent, black 30%, black 70%, transparent)"
  data-vaul-no-drag
  data-no-swipe
  {onscroll}
  onscrollend={commit}
  onkeydown={key}
  onclick={tap}
>
  {#each labels as text, i (i)}
    <div
      class="grid h-[var(--wheel-row)] snap-center place-items-center transition-colors duration-[var(--d-press)] {i === live ? 'text-ink' : 'text-ink-3'}"
      aria-hidden="true"
      data-i={i}
      data-selected={i === live || undefined}
    >{text}</div>
  {/each}
</div>
