<!-- DESIGN.md section 7, Track: the signature. The scale runs 0 to 110 percent of the target. The on track zone is a darker
     segment; the fill is the brand violet, green inside the zone, violet again past it. Reaching the zone plays one light haptic. -->
<script lang="ts">
  import { haptic } from '$lib/haptics';

  let {
    value,
    target,
    zone,
    hero = false,
    label,
  }: {
    value: number;
    target: number;
    /** on track band in the same unit as value, [from, to]; to may be Infinity */
    zone?: [number, number];
    /** 14 high in the hero card, 6 elsewhere */
    hero?: boolean;
    /** the value as words for assistive tech, e.g. "1,840 of 2,460 kcal" */
    label: string;
  } = $props();

  const max = $derived(target * 1.1);
  const pct = (v: number) => Math.min(100, Math.max(0, (v / max) * 100));
  const reached = $derived(!!zone && value >= zone[0] && value <= zone[1]);

  let was: boolean | undefined;
  $effect(() => {
    if (reached && was === false) haptic();
    was = reached;
  });
</script>

<div
  class="bg-track relative overflow-hidden rounded-full {hero ? 'h-3.5' : 'h-1.5'}"
  role="progressbar"
  aria-valuemin={0}
  aria-valuemax={Math.round(max)}
  aria-valuenow={Math.round(Math.min(value, max))}
  aria-label={label}
  aria-valuetext={label}
  data-reached={reached}
>
  {#if zone}
    <div class="bg-line-strong absolute inset-y-0" style="left: {pct(zone[0])}%; right: {100 - pct(zone[1])}%"></div>
  {/if}
  <div
    class="absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-[var(--d-move)] ease-[var(--ease-out)] {reached ? 'bg-success' : 'bg-progress'}"
    style="width: {pct(value)}%"
  ></div>
</div>
