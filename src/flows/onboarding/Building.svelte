<!-- SCREENS.md section 4, Building your plan (U1a, the owner's call over O1's "no fake wait"; O2 made it the show it is
     named for). After the last question, about 4 seconds: a ring fills as a percent counts up with it, five rows tick off
     one a beat naming work the engine does for the plan, then the ring becomes a violet check and Your plan counts up.
     The plan is already computed. The wait's pacing is not motion, so it plays under reduced motion too, as does the
     counter (text); what moves (the pop, the slide) is collapsed by the global rule. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Check from '@lucide/svelte/icons/check';
  import { t } from '$lib/i18n';
  import { haptic, ms } from '$lib/haptics';
  import { num } from '$lib/model/format';

  let { training, ondone }: { training: boolean; ondone: () => void } = $props();

  const rows = $derived([t.onboarding.buildEnergy, training ? t.onboarding.buildDays : t.onboarding.buildEvery, t.onboarding.buildProtein, t.onboarding.buildPace, t.onboarding.buildSources]);
  // the percent moves to the next row's share over a beat (--d-beat, 640 ms), and the row ticks when it arrives; the check
  // pops once the last has (--d-pop, 520 ms) and Your plan follows a settle later: about 4 s in all
  const BEAT = ms('--d-beat');
  const percent = new Tween(0, { duration: BEAT, easing: cubicOut });
  let done = $state(0);
  let ready = $state(false);

  onMount(() => {
    const ids: ReturnType<typeof setTimeout>[] = [];
    const at = (fn: () => void, wait: number) => ids.push(setTimeout(fn, wait));
    const n = rows.length;
    for (let i = 0; i < n; i++) {
      at(() => (percent.target = (i + 1) / n), i * BEAT);
      at(() => { done = i + 1; haptic(); }, (i + 1) * BEAT);
    }
    at(() => (ready = true), n * BEAT + ms('--d-settle'));
    at(ondone, n * BEAT + ms('--d-settle') + ms('--d-pop') + ms('--d-settle'));
    return () => ids.forEach(clearTimeout);
  });

  const R = 52;
  const C = 2 * Math.PI * R;
  const shown = $derived(Math.round(percent.current * 100));
</script>

<section class="flex min-h-svh flex-col items-center justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" aria-label={t.onboarding.building} data-testid="building">
  <!-- the ring: the percent in it, then a violet check once the rows are done (no gradient: DESIGN.md section 8) -->
  <div class="relative size-44" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={shown} aria-label={t.onboarding.buildPercent(num(shown))} data-testid="build-ring">
    <div class="bg-surface/60 absolute inset-2 rounded-full backdrop-blur-xl" aria-hidden="true"></div>
    <svg viewBox="0 0 120 120" class="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--track-bg)" stroke-width="8" />
      <circle cx="60" cy="60" r={R} fill="none" stroke="var(--progress)" stroke-width="8" stroke-linecap="round" stroke-dasharray={C} stroke-dashoffset={C * (1 - percent.current)} />
    </svg>
    <p class="absolute inset-0 grid place-items-center transition-opacity duration-[var(--d-fade)] {ready ? 'opacity-0' : 'opacity-100'}" aria-hidden="true">
      <span class="text-display num" data-testid="build-percent">{num(shown)}<span class="text-heading text-ink-2">%</span></span>
    </p>
    <span class="bg-accent text-on-accent absolute inset-5 grid place-items-center rounded-full transition-[opacity,scale] duration-[var(--d-pop)] ease-[var(--spring-pop)] {ready ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}" aria-hidden="true" data-testid="build-mark">
      <Check size={44} strokeWidth={2.75} />
    </span>
  </div>

  <h1 class="text-title rise mt-8 text-center text-balance" style="--i: 1">{ready ? t.onboarding.built : t.onboarding.building}</h1>

  <ul class="bg-surface shadow-card rise mt-8 flex w-full flex-col gap-4 rounded-md p-5" style="--i: 2">
    {#each rows as row, i (i)}
      {@const on = done > i}
      <li class="flex items-center gap-4" data-testid="build-row" data-done={on}>
        <span class="grid size-7 flex-none place-items-center rounded-full transition-[background-color,scale] duration-[var(--d-pop)] ease-[var(--spring-pop)] {on ? 'bg-accent text-on-accent scale-100' : 'ring-line-strong scale-90 ring-2 ring-inset'}" aria-hidden="true">
          {#if on}<Check size={16} strokeWidth={3} />{/if}
        </span>
        <span class="text-body transition-colors duration-[var(--d-ui)] {on ? 'text-ink' : 'text-ink-2'}">{row}</span>
      </li>
    {/each}
  </ul>
  <p class="sr-only" aria-live="polite">{ready ? t.onboarding.built : ''}</p>
</section>
