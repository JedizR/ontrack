<!-- SCREENS.md section 4, Building your plan (U1a, the owner's call over O1's "no wait"): after the last question, about
     2 s in which three rows tick off, naming the work the engine does for the plan, then a violet check; then Your plan
     counts up. The plan is already computed. Never shown with reduced motion. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import { t } from '$lib/i18n';
  import { ms } from '$lib/haptics';

  let { training, ondone }: { training: boolean; ondone: () => void } = $props();

  const rows = $derived([t.onboarding.buildEnergy, training ? t.onboarding.buildDays : t.onboarding.buildEvery, t.onboarding.buildProtein]);
  // a row ticks every beat (--d-beat, 450 ms), the mark pops in a settle (240 ms) after the last, and Your plan follows
  // once it has popped (--d-pop, 520 ms): 2.11 s in all
  const AT = [1, 2, 3].map((i) => i * ms('--d-beat'));
  AT.push(AT[2] + ms('--d-settle'), AT[2] + ms('--d-settle') + ms('--d-pop'));
  let done = $state(0);
  onMount(() => {
    const ids = AT.map((ms, i) => setTimeout(() => (i < AT.length - 1 ? (done = i + 1) : ondone()), ms));
    return () => ids.forEach(clearTimeout);
  });
</script>

<section class="flex min-h-svh flex-col justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" aria-label={t.onboarding.building} data-testid="building">
  <!-- the success mark: an empty disc that fills violet with its check once the rows are done (no ring: D2 keeps the track) -->
  <div class="bg-track relative size-16 rounded-full" aria-hidden="true">
    <span class="bg-accent text-on-accent absolute inset-0 grid place-items-center rounded-full transition-[opacity,scale] duration-[var(--d-pop)] ease-[var(--spring-pop)] {done > 3 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}" data-testid="build-mark">
      <Check size={30} strokeWidth={2.75} />
    </span>
  </div>

  <h1 class="text-title mt-8 text-balance">{t.onboarding.building}</h1>
  <ul class="mt-8 flex flex-col gap-5">
    {#each rows as row, i (i)}
      {@const on = done > i}
      <li class="flex items-center gap-4" data-testid="build-row" data-done={on}>
        <span class="grid size-7 flex-none place-items-center rounded-full transition-[background-color,scale] duration-[var(--d-ui)] ease-[var(--spring-default)] {on ? 'bg-accent text-on-accent scale-100' : 'ring-line-strong scale-90 ring-2 ring-inset'}" aria-hidden="true">
          {#if on}<Check size={16} strokeWidth={3} />{/if}
        </span>
        <span class="text-body transition-colors duration-[var(--d-ui)] {on ? 'text-ink' : 'text-ink-2'}">{row}</span>
      </li>
    {/each}
  </ul>
  <p class="sr-only" aria-live="polite">{done > 3 ? t.onboarding.built : ''}</p>
</section>
