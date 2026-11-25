<!-- Progress's Train chart, the owner's habit grid (25 Nov): four weeks as four rows of seven rounded squares, Sunday on
     the left and Saturday on the right, this week at the bottom. Each row is named by its Sunday ("1 NOV"), so no month
     name is needed. Green a day with a workout done (a rest day's activity too), grey a training day without one, a grey
     outline a rest day, and faint the days still to come or before the plan. -->
<script lang="ts">
  import { addDays, monthShort, weekdayOf } from '$lib/model/dates';
  import { t } from '$lib/i18n';

  export type Dot = { date: string; state: 'done' | 'missed' | 'rest' };
  let { days, today, label }: { days: Dot[]; today: string; label: string } = $props();

  const WEEKS = 4;
  const HEAD = 22; // the weekday letters
  const LEFT = 54; // the row labels
  // the owner (25 Nov): as wide as the other charts, the squares a little smaller; seven columns share the width
  let w = $state(320);
  const colW = $derived((w - LEFT) / 7);
  const S = $derived(Math.min(24, colW - 8));
  const rowH = $derived(S + 8);
  const CORNER = $derived(S / 4);
  const SUNDAY_FIRST = [6, 0, 1, 2, 3, 4, 5]; // weekdayOf counts Monday as 0
  // the Sunday that starts this week, then three weeks back
  const start = $derived(addDays(today, -((weekdayOf(today) + 1) % 7) - 7 * (WEEKS - 1)));
  type Cell = { date: string; row: number; col: number; state: Dot['state'] | 'faint' };
  const cells = $derived.by(() => {
    const known = new Map(days.filter((d) => d.date <= today).map((d) => [d.date, d.state]));
    return Array.from({ length: WEEKS * 7 }, (_, i): Cell => {
      const date = addDays(start, i);
      return { date, row: Math.floor(i / 7), col: i % 7, state: known.get(date) ?? 'faint' };
    });
  });
  const rows = $derived(Array.from({ length: WEEKS }, (_, r) => {
    const d = addDays(start, 7 * r);
    return `${Number(d.slice(8))} ${monthShort(d).toUpperCase()}`;
  }));
  const CLS = { done: 'fill-success', missed: 'fill-ink-3', rest: 'fill-none stroke-ink-3', faint: 'fill-track' } as const;
</script>

<!-- a tab kept mounted but hidden measures 0 wide (U2): keep the last width -->
<div bind:clientWidth={null, (v) => { if (v) w = v; }} data-testid="train-dots">
  <svg width={w} height={HEAD + WEEKS * rowH} role="img" aria-label={label} class="block">
    {#each SUNDAY_FIRST as d, c (d)}
      <text x={LEFT + c * colW + colW / 2} y={HEAD - 9} text-anchor="middle" class="fill-ink-2 text-caption">{t.week.letters[d]}</text>
    {/each}
    {#each rows as r, i (i)}
      <text x={0} y={HEAD + i * rowH + rowH / 2 + 4} class="fill-ink-2 text-caption num">{r}</text>
    {/each}
    {#each cells as d (d.date)}
      {@const inset = d.state === 'rest' ? 0.75 : 0}
      <rect x={LEFT + d.col * colW + (colW - S) / 2 + inset} y={HEAD + d.row * rowH + (rowH - S) / 2 + inset} width={S - 2 * inset} height={S - 2 * inset} rx={CORNER - inset} stroke-width={d.state === 'rest' ? 1.5 : 0} class={CLS[d.state]} data-testid="dot-{d.state}" />
    {/each}
  </svg>
  <div class="text-caption text-ink-2 mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1" aria-hidden="true">
    <span class="inline-flex items-center gap-1.5"><svg width="10" height="10" aria-hidden="true"><rect width="10" height="10" rx="2.6" class="fill-success" /></svg>{t.progress.dotDone}</span>
    <span class="inline-flex items-center gap-1.5"><svg width="10" height="10" aria-hidden="true"><rect width="10" height="10" rx="2.6" class="fill-ink-3" /></svg>{t.progress.dotMissed}</span>
    <span class="inline-flex items-center gap-1.5"><svg width="10" height="10" aria-hidden="true"><rect x="0.75" y="0.75" width="8.5" height="8.5" rx="2" stroke-width="1.5" class="fill-none stroke-ink-3" /></svg>{t.progress.dotRest}</span>
  </div>
</div>
