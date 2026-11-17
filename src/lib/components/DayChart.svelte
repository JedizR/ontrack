<!-- R2, Progress's day chart (hand built SVG with d3, as TrendChart): one bar a day, violet until the day is on track and
     then green; a day not fully logged is faint. Optional layers: calories out as a step line (what living takes, with
     the day's exercise as a lavender band on top of it), and a target band (protein). Bars grow in on arrival. Its
     numbers are in the label for assistive tech. -->
<script lang="ts">
  import { scaleLinear } from 'd3-scale';
  import { num } from '$lib/model/format';

  type Day = { value: number | null; faint?: boolean; reached?: boolean; out?: { living: number; exercise: number } };
  let {
    days,
    band,
    from,
    to,
    label,
    height = 184,
  }: {
    days: Day[];
    /** a target range drawn behind the bars, [from, to] */
    band?: [number, number];
    from: string;
    to: string;
    label: string;
    height?: number;
  } = $props();

  let w = $state(320);
  const M = { top: 18, bottom: 26 };
  const top = $derived(Math.max(1, ...days.flatMap((d) => [d.value ?? 0, d.out ? d.out.living + d.out.exercise : 0]), band && Number.isFinite(band[1]) ? band[1] : (band?.[0] ?? 0)) * 1.08);
  const y = $derived(scaleLinear().domain([0, top]).range([height - M.bottom, M.top]));
  const slot = $derived(w / Math.max(1, days.length));
  const bar = $derived(Math.max(2, Math.min(14, slot * 0.62)));
  // the out line steps across each day's slot, so a day's in and out sit in the same column
  const outPath = $derived(
    days
      .map((d, i) => (d.out ? `M${i * slot},${y(d.out.living + d.out.exercise)}H${(i + 1) * slot}` : ''))
      .join(''),
  );
</script>

<div bind:clientWidth={null, (v) => { if (v) w = v; }} data-testid="day-chart">
  <svg width={w} {height} role="img" aria-label={label} class="block">
    <text x="0" y="11" class="fill-ink-2 text-caption">{num(Math.round(top))}</text>
    <line x1="0" x2={w} y1={y(0)} y2={y(0)} class="stroke-line" />
    {#if band}
      <!-- an open top (protein: no upper limit) runs to the top of the chart -->
      {@const hi = Number.isFinite(band[1]) ? y(band[1]) : M.top}
      <rect x="0" width={w} y={hi} height={Math.max(1, y(band[0]) - hi)} class="fill-success opacity-15" />
    {/if}
    {#each days as d, i (i)}
      {#if d.out && d.out.exercise > 0}
        <!-- the day's exercise: a band on top of what living takes -->
        <rect x={i * slot + 1} width={Math.max(1, slot - 2)} y={y(d.out.living + d.out.exercise)} height={y(d.out.living) - y(d.out.living + d.out.exercise)} class="fill-lavender opacity-80" data-testid="day-exercise" />
      {/if}
    {/each}
    {#each days as d, i (i)}
      {#if d.value != null && d.value > 0}
        {@const mid = (i + 0.5) * slot}
        <rect x={mid - bar / 2} width={bar} y={y(d.value)} height={y(0) - y(d.value)} rx={Math.min(4, bar / 2)} class="grow-up {d.reached ? 'fill-success' : 'fill-progress'} {d.faint ? 'opacity-35' : ''}" style="--i: {Math.min(i, 20)}" data-testid="bar" />
      {/if}
    {/each}
    {#if outPath}
      <path d={outPath} class="stroke-ink" stroke-width="2" fill="none" stroke-linecap="round" data-testid="day-out" />
    {/if}
    <text x="0" y={height - 6} class="fill-ink-2 text-caption">{from}</text>
    <text x={w} y={height - 6} text-anchor="end" class="fill-ink-2 text-caption">{to}</text>
  </svg>
</div>
