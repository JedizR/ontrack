<!-- SCREENS.md section 9, the intake bars: each week's average calories as a bar, ink until it is on track and then
     green (DESIGN.md section 4, rule 3), with that week's average target as a line across its slot. -->
<script lang="ts">
  import { scaleLinear } from 'd3-scale';

  let { weeks, from, to, label }: { weeks: { avg: number | null; target: number; reached: boolean }[]; from: string; to: string; label: string } = $props();

  let w = $state(300);
  const H = 128;
  const M = { top: 8, bottom: 28 };
  const HEADROOM = 1.1;
  const slot = $derived(w / Math.max(1, weeks.length));
  const y = $derived(scaleLinear().domain([0, Math.max(1, ...weeks.flatMap((k) => [k.avg ?? 0, k.target])) * HEADROOM]).range([H - M.bottom, M.top]));
  const bar = $derived(Math.min(32, slot * 0.6));
</script>

<div bind:clientWidth={w} data-testid="intake-bars">
  <svg width={w} height={H} role="img" aria-label={label} class="block">
    <line x1="0" x2={w} y1={y(0)} y2={y(0)} class="stroke-line" />
    {#each weeks as k, i (i)}
      {@const mid = (i + 0.5) * slot}
      {#if k.avg != null}
        <rect x={mid - bar / 2} width={bar} y={y(k.avg)} height={y(0) - y(k.avg)} rx={Math.min(6, bar / 3)} class={k.reached ? 'fill-success' : 'fill-ink'} data-testid="bar" />
      {/if}
      <!-- the target: an ink line edged in the card's colour, so it shows across an ink bar too -->
      <line x1={i * slot + 2} x2={(i + 1) * slot - 2} y1={y(k.target)} y2={y(k.target)} class="stroke-surface" stroke-width="5" stroke-linecap="round" />
      <line x1={i * slot + 2} x2={(i + 1) * slot - 2} y1={y(k.target)} y2={y(k.target)} class="stroke-ink" stroke-width="2" stroke-linecap="round" />
    {/each}
    <text x="0" y={H - 6} class="fill-ink-2 text-caption">{from}</text>
    <text x={w} y={H - 6} text-anchor="end" class="fill-ink-2 text-caption">{to}</text>
  </svg>
</div>
