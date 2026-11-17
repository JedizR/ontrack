<!-- R2, Strava's weekly goal ring: sessions done of those planned this week. It fills in the progress violet and turns
     the reached green with a check once the week is done; past the plan it stays full. Draws in on arrival. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import { pop } from '$lib/haptics';

  let { done, planned, size = 44, label }: { done: number; planned: number; size?: number; label: string } = $props();

  const reached = $derived(planned > 0 && done >= planned);
  const frac = $derived(planned > 0 ? Math.min(1, done / planned) : 0);
  let shown = $state(false);
  onMount(() => { requestAnimationFrame(() => requestAnimationFrame(() => (shown = true))); });
</script>

<span class="relative inline-grid flex-none place-items-center" style="width: {size}px; height: {size}px" role="img" aria-label={label} data-testid="week-ring">
  <svg viewBox="0 0 44 44" class="absolute inset-0 -rotate-90" aria-hidden="true">
    <circle cx="22" cy="22" r="19" fill="none" stroke="currentColor" stroke-opacity="0.14" stroke-width="5" />
    <circle
      cx="22" cy="22" r="19" fill="none" stroke-width="5" stroke-linecap="round" pathLength="1"
      stroke="var({reached ? '--success' : '--progress'})"
      stroke-dasharray="1"
      stroke-dashoffset={shown ? 1 - frac : 1}
      class="transition-[stroke-dashoffset,stroke] duration-[var(--d-move)] ease-[var(--ease-out)]"
    />
  </svg>
  {#if reached}<span class="text-success-ink inline-grid" in:pop><Check size={size * 0.42} strokeWidth={3} aria-hidden="true" /></span>{/if}
</span>
