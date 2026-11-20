<!-- DESIGN.md section 7, Week strip (R1, the owner's brief). Today is a chip anchored at the right and always there; the days
     before it slide, six at a time, and lock to their slots as a finger lifts (scroll snap). Tapping one of the three
     left slots slides it to the fourth, the middle of the row; tapping Today slides back to the newest days and picks
     today. Days fade out softly where they pass under the Today chip. Each shows its weekday in one letter, the date and
     a dot when the day was on track. The day in view is an ink pill; Today, when another day is in view, keeps an ink ring
     (U1b). Days after today cannot be picked. -->
<script lang="ts">
  import { prefs } from '$lib/prefs.svelte';
  import { untrack } from 'svelte';
  import { t } from '$lib/i18n';
  import { weekdayOf } from '$lib/model/dates';
  import { reducedMotion } from '$lib/haptics';
  const tray = $derived(prefs.tray);

  let {
    days,
    today,
    selected = today,
    onselect,
  }: {
    /** consecutive YYYY-MM-DD local days, oldest first, the last one today */
    days: { date: string; onTrack: boolean }[];
    today: string;
    selected?: string;
    onselect?: (date: string) => void;
  } = $props();

  const SLOTS = 6; // the sliding days showing at once; the seventh slot is Today
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  // a YYYY-MM-DD string is a local calendar day: read it at local noon, never as UTC
  const local = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day, 12);
  };
  const slide = $derived(days.filter((d) => d.date < today));
  const now = $derived(days.find((d) => d.date === today));

  let scroller = $state<HTMLElement>();
  const behavior = () => (reducedMotion() ? 'auto' : 'smooth') as ScrollBehavior;
  const slot = () => (scroller ? scroller.clientWidth / SLOTS : 0);
  /** slide so that day `i` is in the fourth slot of seven, as far as the ends allow */
  function centre(i: number, instant = false) {
    if (!scroller) return;
    const left = Math.min(scroller.scrollWidth - scroller.clientWidth, Math.max(0, (i - 3) * slot()));
    scroller.scrollTo({ left, behavior: instant ? 'auto' : behavior() });
  }
  function pick(date: string, i: number) {
    if (!onselect) return;
    onselect(date);
    // the three left slots lean left: pull them toward the middle. The others stay where they are
    if (scroller && Math.round((i * slot() - scroller.scrollLeft) / slot()) < 3) centre(i);
  }
  function backToNow() {
    scroller?.scrollTo({ left: scroller.scrollWidth, behavior: behavior() });
    onselect?.(today);
  }
  // a day picked elsewhere (History) is brought into view
  $effect(() => {
    const i = slide.findIndex((d) => d.date === selected);
    if (i < 0) return;
    untrack(() => {
      if (!scroller) return;
      const first = Math.round(scroller.scrollLeft / slot());
      if (i < first || i > first + SLOTS - 1) centre(i, true);
    });
  });
  // it opens on the newest days
  const toEnd = (el: HTMLElement) => { el.scrollLeft = el.scrollWidth; };

  // days leave under a soft edge: a hint at the left, a longer one before the Today chip
  const FADE = 'linear-gradient(to right, transparent 0, black 10px, black calc(100% - 26px), transparent 100%)';
  // ui-flat, the owner: yesterday, picked, sits whole against the Today chip, so its fill is never faded at that edge
  const FADE_LEFT = 'linear-gradient(to right, transparent 0, black 10px)';
  const mask = $derived(slide.at(-1)?.date === selected ? FADE_LEFT : FADE);
</script>

{#snippet cell(d: { date: string; onTrack: boolean }, picked: boolean, isToday: boolean)}
  <span
    class="text-caption relative mx-0.5 grid h-16 content-center gap-1 [@media(max-height:620px)]:h-12 [@media(max-height:620px)]:gap-0.5 justify-items-center {tray ? 'rounded-md' : 'rounded-sm'}
      {picked ? 'bg-ink text-canvas' : isToday ? 'ring-ink text-ink-2 ring-2 ring-inset group-enabled:group-active:bg-surface-2' : 'text-ink-2 group-enabled:group-active:bg-surface-2'}"
  >
    {t.week.letters[weekdayOf(d.date)]}
    <b class="text-body num font-semibold {picked ? 'text-canvas' : 'text-ink'}">{local(d.date).getDate()}</b>
    <!-- ui-flat: the dot sits at the foot, out of the flow, so the letter and date are centred with room above them -->
    <i class="absolute bottom-1.5 left-1/2 size-1.25 -translate-x-1/2 rounded-full [@media(max-height:620px)]:bottom-0.5 {d.onTrack ? (picked ? 'bg-success' : 'bg-success-ink') : ''}"></i>
  </span>
{/snippet}

<nav class="flex py-1 [@media(max-height:620px)]:py-0" aria-label={t.week.label} data-testid="week">
  <div
    bind:this={scroller}
    {@attach toEnd}
    class="no-scrollbar flex min-w-0 flex-[6] snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
    style="-webkit-mask-image: {mask}; mask-image: {mask}"
    data-testid="week-slide"
  >
    {#each slide as d, i (d.date)}
      {@const name = fmt.format(local(d.date))}
      <button
        type="button"
        class="group grid w-[calc(100%/6)] flex-none snap-start"
        aria-label={d.onTrack ? t.week.onTrackDay(name) : name}
        aria-pressed={onselect ? d.date === selected : undefined}
        onclick={() => pick(d.date, i)}
      >
        {@render cell(d, d.date === selected, false)}
      </button>
    {/each}
  </div>
  {#if now}
    {@const name = fmt.format(local(now.date))}
    <button
      type="button"
      class="group grid min-w-0 flex-1"
      disabled={!onselect}
      aria-label={now.onTrack ? t.week.onTrackDay(name) : name}
      aria-current="date"
      aria-pressed={onselect ? now.date === selected : undefined}
      onclick={backToNow}
      data-testid="week-today"
    >
      {@render cell(now, now.date === selected, true)}
    </button>
  {/if}
</nav>
