<!-- R7b, the owner: Progress's Train chart as GitHub draws commits, one rounded square a day, the weekdays down and the weeks across:
     green a day with a workout done, grey a training day without one, an outline a rest day. The dot stays one size for
     every range, so the card keeps its height: a short range sits centred, a long one scrolls sideways and opens on the
     latest week, as GitHub's phone view does. The owner (25 Nov): the grid is drawn whole, as a habit tracker draws it,
     through the end of this month, with the days still to come faint. -->
<script lang="ts">
  import { addDays, daysBetween, monthShort, weekdayOf } from '$lib/model/dates';
  import { t } from '$lib/i18n';

  export type Dot = { date: string; state: 'done' | 'missed' | 'rest' };
  let { days, today, label }: { days: Dot[]; today: string; label: string } = $props();

  const P = 24; // a dot's pitch: 17 across, 7 between
  const R = 8.5; // half a square's side
  const CORNER = 4.5; // the owner (25 Nov): rounded squares, as a habit tracker draws its days
  const TOP = 20; // the month row
  const first = $derived(days[0]?.date ?? today);
  const start = $derived(addDays(first, -weekdayOf(first)));
  // the last day of today's month, then the Sunday that ends its week
  const monthEnd = $derived.by(() => {
    const [y, m] = today.split('-').map(Number);
    return `${today.slice(0, 8)}${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
  });
  const end = $derived(addDays(monthEnd, 6 - weekdayOf(monthEnd)));
  const at = (date: string) => ({ col: Math.floor(daysBetween(start, date) / 7), row: weekdayOf(date) });
  const cols = $derived(at(end).col + 1);
  /** every day of the grid: its state where the range has one, else faint (still to come, or before the range) */
  type Cell = { date: string; state: Dot['state'] | 'faint' };
  const cells = $derived.by(() => {
    const known = new Map(days.map((d) => [d.date, d.state]));
    const out: Cell[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) out.push({ date: d, state: known.get(d) ?? 'faint' });
    return out;
  });
  // a month's name over the first column it starts in, kept 3 columns from the last name so two never touch
  const months = $derived.by(() => {
    const out: { col: number; text: string }[] = [];
    let last = '';
    for (const d of cells) {
      if (d.date > monthEnd) break; // the days that only finish the last week are not a month of their own
      const m = d.date.slice(0, 7);
      if (m === last) continue;
      last = m;
      const { col } = at(d.date);
      if (!out.length || col - out.at(-1)!.col >= 3) out.push({ col, text: monthShort(d.date) });
    }
    return out;
  });
  const ROWS = [0, 2, 4]; // Mon, Wed, Fri, as GitHub labels them
  const CLS = { done: 'fill-success', missed: 'fill-ink-3', rest: 'fill-none stroke-ink-3', faint: 'fill-track' } as const;
</script>

<div data-testid="train-dots">
  <div class="mx-auto flex w-fit max-w-full">
    <div class="text-caption text-ink-2 relative w-9 flex-none" style="height: {TOP + 7 * P}px" aria-hidden="true">
      {#each ROWS as r (r)}<span class="absolute left-0 leading-none" style="top: {TOP + r * P + P / 2}px; transform: translateY(-50%)">{t.train.weekdaysShort[r]}</span>{/each}
    </div>
    <!-- the latest week in view at first: a long range scrolls back from there -->
    <div class="min-w-0 overflow-x-auto [scrollbar-width:none]" {@attach (el) => { el.scrollLeft = el.scrollWidth; }}>
      <svg width={cols * P} height={TOP + 7 * P} role="img" aria-label={label} class="block">
        {#each months as m (m.col)}<text x={m.col * P + 3} y={TOP - 7} class="fill-ink-2 text-caption">{m.text}</text>{/each}
        {#each cells as d (d.date)}
          {@const { col, row } = at(d.date)}
          {@const inset = d.state === 'rest' ? 0.75 : 0}
          <rect x={col * P + P / 2 - R + inset} y={TOP + row * P + P / 2 - R + inset} width={2 * (R - inset)} height={2 * (R - inset)} rx={CORNER - inset} stroke-width={d.state === 'rest' ? 1.5 : 0} class={CLS[d.state]} data-testid="dot-{d.state}" />
        {/each}
      </svg>
    </div>
  </div>
  <div class="text-caption text-ink-2 mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1" aria-hidden="true">
    <span class="inline-flex items-center gap-1.5"><svg width="10" height="10" aria-hidden="true"><rect width="10" height="10" rx="2.6" class="fill-success" /></svg>{t.progress.dotDone}</span>
    <span class="inline-flex items-center gap-1.5"><svg width="10" height="10" aria-hidden="true"><rect width="10" height="10" rx="2.6" class="fill-ink-3" /></svg>{t.progress.dotMissed}</span>
    <span class="inline-flex items-center gap-1.5"><svg width="10" height="10" aria-hidden="true"><rect x="0.75" y="0.75" width="8.5" height="8.5" rx="2" stroke-width="1.5" class="fill-none stroke-ink-3" /></svg>{t.progress.dotRest}</span>
  </div>
</div>
