<!-- SCREENS.md section 4, Building your plan (U1a, the owner's call over O1's "no wait"): after the last question, about
     2 s in which three rows tick off, naming the work the engine does for the plan, while a ring fills with them and ends
     in a check; then Your plan counts up. The plan is already computed. Never shown with reduced motion. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import { t } from '$lib/i18n';

  let { training, ondone }: { training: boolean; ondone: () => void } = $props();

  const rows = $derived([t.onboarding.buildEnergy, training ? t.onboarding.buildDays : t.onboarding.buildEvery, t.onboarding.buildProtein]);
  // a row ticks every 450 ms, the ring's check 300 ms after the last, then Your plan 500 ms later: 2.15 s in all
  const AT = [1, 2, 3].map((i) => i * 450);
  AT.push(AT[2] + 300, AT[2] + 800);
  let done = $state(0);
  onMount(() => {
    const ids = AT.map((ms, i) => setTimeout(() => (i < AT.length - 1 ? (done = i + 1) : ondone()), ms));
    return () => ids.forEach(clearTimeout);
  });

  const R = 28;
  const LEN = 2 * Math.PI * R;
</script>

<section class="flex min-h-svh flex-col justify-center px-4 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]" aria-label={t.onboarding.building} data-testid="building">
  <div class="relative size-16" aria-hidden="true">
    <svg viewBox="0 0 64 64" class="size-16 -rotate-90">
      <circle cx="32" cy="32" r={R} fill="none" stroke-width="4" class="stroke-track" />
      <circle cx="32" cy="32" r={R} fill="none" stroke-width="4" stroke-linecap="round" class="stroke-progress transition-[stroke-dashoffset] duration-[var(--d-move)] ease-[var(--ease-out)]" stroke-dasharray={LEN} stroke-dashoffset={LEN * (1 - Math.min(done, 3) / 3)} />
    </svg>
    <span class="bg-accent text-on-accent absolute inset-0 grid place-items-center rounded-full transition-[opacity,scale] duration-[var(--d-ui)] ease-[var(--spring-default)] {done > 3 ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}" data-testid="build-mark">
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
