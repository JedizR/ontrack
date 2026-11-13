<!-- SCREENS.md section 9, the weight chart, hand built SVG with d3 (ARCHITECTURE A17): weigh-ins as dots, the trend as
     a line, and the target rate as a faint band from the first trend point in view. Ink and the track tint only: the
     chart judges nothing. Its numbers are in the label for assistive tech. -->
<script lang="ts">
  import { line } from 'd3-shape';
  import { scaleLinear } from 'd3-scale';
  import { num } from '$lib/model/format';

  type Point = { day: number; value: number; trend: number };
  let {
    points,
    span,
    band,
    from,
    to,
    label,
  }: {
    /** weigh-ins in the user's unit, `day` counted from the first day in view */
    points: Point[];
    /** days in view, the first counted 0 */
    span: number;
    /** the target change a day and the width either side of it, in the user's unit */
    band: { perDay: number; tol: number };
    from: string;
    to: string;
    label: string;
  } = $props();

  let w = $state(300);
  const H = 176;
  const M = { top: 8, right: 4, bottom: 28, left: 40 };
  const x = $derived(scaleLinear().domain([0, Math.max(1, span)]).range([M.left, w - M.right]));
  const start = $derived(points[0]);
  const bandAt = (day: number, side: number) => start.trend + (band.perDay + side * band.tol) * (day - start.day);
  const y = $derived.by(() => {
    const ys = start ? [...points.flatMap((p) => [p.value, p.trend]), bandAt(span, 1), bandAt(span, -1)] : [0, 1];
    return scaleLinear().domain([Math.min(...ys), Math.max(...ys)]).nice(3).range([H - M.bottom, M.top]);
  });
  const trend = $derived(line<Point>().x((p) => x(p.day)).y((p) => y(p.trend))(points) ?? '');
  const bandPath = $derived(start ? `M${x(start.day)},${y(start.trend)}L${x(span)},${y(bandAt(span, 1))}L${x(span)},${y(bandAt(span, -1))}Z` : '');
</script>

<div bind:clientWidth={w} data-testid="weight-chart">
  <svg width={w} height={H} role="img" aria-label={label} class="block">
    {#each y.ticks(3) as v (v)}
      <line x1={M.left} x2={w - M.right} y1={y(v)} y2={y(v)} class="stroke-line" />
      <text x={M.left - 8} y={y(v)} dy="0.32em" text-anchor="end" class="fill-ink-2 text-caption num">{num(v, 1)}</text>
    {/each}
    <path d={bandPath} class="fill-track" data-testid="chart-band" />
    {#each points as p (p.day)}<circle cx={x(p.day)} cy={y(p.value)} r="3" class="fill-ink-3" data-testid="chart-dot" />{/each}
    <path d={trend} fill="none" class="stroke-progress draw-in" pathLength="1" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
    <text x={M.left} y={H - 6} class="fill-ink-2 text-caption">{from}</text>
    <text x={w - M.right} y={H - 6} text-anchor="end" class="fill-ink-2 text-caption">{to}</text>
  </svg>
</div>
