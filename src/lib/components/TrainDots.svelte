<!-- R7b, the owner: Progress's Train chart as GitHub draws commits, one dot a day, the weekdays down and the weeks across:
     green a day with a workout done, grey a training day without one, an outline a rest day. The dot stays one size for
     every range, so the card keeps its height: a short range sits centred, a long one scrolls sideways and opens on the
     latest week, as GitHub's phone view does. -->
<script lang="ts">
  import { addDays, daysBetween, monthShort, weekdayOf } from '$lib/model/dates';
  import { t } from '$lib/i18n';

  export type Dot = { date: string; state: 'done' | 'missed' | 'rest' };
  let { days, label }: { days: Dot[]; label: string } = $props();

  const P = 24; // a dot's pitch: 17 across, 7 between
  const R = 8.5;
  const TOP = 20; // the month row
  const start = $derived(days.length ? addDays(days[0].date, -weekdayOf(days[0].date)) : '');
  const at = (date: string) => ({ col: Math.floor(daysBetween(start, date) / 7), row: weekdayOf(date) });
  const cols = $derived(days.length ? at(days.at(-1)!.date).col + 1 : 0);
  // a month's name over the first column it starts in, kept 3 columns from the last name so two never touch
  const months = $derived.by(() => {
    const out: { col: number; text: string }[] = [];
    let last = '';
    for (const d of days) {
      const m = d.date.slice(0, 7);
      if (m === last) continue;
      last = m;
      const { col } = at(d.date);
      if (!out.length || col - out.at(-1)!.col >= 3) out.push({ col, text: monthShort(d.date) });
    }
    return out;
  });
  const ROWS = [0, 2, 4]; // Mon, Wed, Fri, as GitHub labels them
  const CLS = { done: 'fill-success', missed: 'fill-surface-3', rest: 'fill-none stroke-surface-3' } as const;
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
        {#each days as d (d.date)}
          {@const { col, row } = at(d.date)}
          <circle cx={col * P + P / 2} cy={TOP + row * P + P / 2} r={d.state === 'rest' ? R - 0.75 : R} stroke-width={d.state === 'rest' ? 1.5 : 0} class={CLS[d.state]} data-testid="dot-{d.state}" />
        {/each}
      </svg>
    </div>
  </div>
  <div class="text-caption text-ink-2 mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1" aria-hidden="true">
    <span class="inline-flex items-center gap-1.5"><i class="bg-success size-2.5 rounded-full"></i>{t.progress.dotDone}</span>
    <span class="inline-flex items-center gap-1.5"><i class="bg-surface-3 size-2.5 rounded-full"></i>{t.progress.dotMissed}</span>
    <span class="inline-flex items-center gap-1.5"><i class="border-surface-3 size-2.5 rounded-full border-[1.5px]"></i>{t.progress.dotRest}</span>
  </div>
</div>
