<!-- R2, the owner: goal weight as its own step, after height and weight, for a lose or gain goal. One wheel, starting a
     safe way from today in the goal's direction; under it the healthy range for this height (V.underweightBmi up to the overweight line, S15)
     as a band, with today's weight and the goal marked. The wheel stops at the underweight line. Skip leaves it unset. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import Step from './Step.svelte';
  import Button from '$lib/components/Button.svelte';
  import Wheel from '$lib/components/Wheel.svelte';
  import { kgToLb, lbToKg, weightText } from '$lib/model/units';
  import { V, weightAtBmi } from '$lib/model/engine';
  import { t } from '$lib/i18n';
  import { LIMITS, minGoalWeightKg, weightWheel, type Draft } from './draft';

  let { d, next, back, progress }: {
    d: Draft;
    next: (p: Partial<Draft>) => void;
    back: () => void;
    progress: { n: number; total: number } | null;
  } = $props();

  const now = untrack(() => d.weightKg ?? 70);
  const h = untrack(() => d.heightCm ?? 170);
  const lo = weightAtBmi(V.underweightBmi, h);
  const hi = weightAtBmi(V.fasterPaceMinBmi, h);
  const floor = untrack(() => minGoalWeightKg(d));
  const losing = untrack(() => d.goal === 'lose');
  // a first value a safe way from today in the goal's direction (an interface default, not a recommendation of pace)
  const suggested = losing ? Math.max(floor, Math.min(now * 0.92, Math.max(hi - 1, now - 1))) : Math.min(LIMITS.weightKg[1], Math.max(now * 1.06, now + 1));
  let kg = $state(untrack(() => d.goalWeightKg ?? Math.round(suggested)));

  const metric = $derived(d.units === 'metric');
  const bounds = $derived(weightWheel(d.units, floor));
  const round1 = (x: number) => Math.round(x * 10) / 10;
  const inRange = $derived(kg >= lo && kg < hi);
  // the band's scale: a little either side of the range, today and the goal
  const min = $derived(Math.min(lo, now, kg) * 0.94);
  const max = $derived(Math.max(hi, now, kg) * 1.04);
  const at = (x: number) => `${((x - min) / (max - min)) * 100}%`;
  const units = $derived(d.units);
</script>

<Step title={losing ? t.goalStep.qLose : t.goalStep.qGain} caption={t.goalStep.caption} onback={back} {progress} testid="step-goal-weight">
  <div class="rise" style="--i: 2">
    <Wheel
      bind:value={() => round1(metric ? kg : kgToLb(kg)), (v) => (kg = metric ? v : lbToKg(v))}
      min={bounds.min}
      max={bounds.max}
      decimals={1}
      unit={metric ? t.after.kg : t.after.lb}
      band={false}
      label={t.plan.goalWeight}
      testid="wheel-goal-weight"
    />
  </div>
  {#snippet above()}
    <!-- over the capsule, as the So far card: the healthy range for this height, today and the goal on one band -->
    <div class="bg-surface shadow-card rounded-lg px-4 pt-3 pb-2" data-testid="goal-range">
      <div class="flex items-baseline justify-between gap-3">
        <p class="text-callout font-semibold">{t.goalStep.range(weightText(lo, units, 0), weightText(hi, units, 0))}</p>
        <p class="text-caption flex flex-none items-center gap-0.5 {inRange ? 'text-success-ink font-semibold' : 'text-ink-2'}" data-testid="goal-verdict">
          {#if inRange}<Check size={14} strokeWidth={3} aria-hidden="true" />{t.goalStep.inRange}{:else}{kg < lo ? t.goalStep.below : t.goalStep.above}{/if}
        </p>
      </div>
      <div class="relative mt-3 h-3" aria-hidden="true">
        <div class="bg-track absolute inset-x-0 top-1 h-1 rounded-full"></div>
        <div class="bg-success absolute top-1 h-1 rounded-full opacity-60" style="left: {at(lo)}; width: calc({at(hi)} - {at(lo)})"></div>
        <span class="bg-ink-2 ring-surface absolute top-0 size-3 -translate-x-1/2 rounded-full ring-2" style="left: {at(now)}"></span>
        <span class="bg-progress ring-surface absolute -top-0.5 size-4 -translate-x-1/2 rounded-full ring-2 transition-[left] duration-[var(--d-ui)]" style="left: {at(kg)}"></span>
      </div>
      <div class="text-caption text-ink-2 mt-1 flex items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1"><i class="bg-ink-2 size-2 rounded-full"></i>{t.goalStep.today(weightText(now, units))}</span>
        <Button variant="plain" size="sm" class="-mr-3" onclick={() => next({ goalWeightKg: undefined })} data-testid="goal-skip">{t.goalStep.skip}</Button>
      </div>
    </div>
  {/snippet}
  {#snippet footer()}
    <Button variant="primary" size="lg" full onclick={() => next({ goalWeightKg: Math.round(kg * 10) / 10 })} data-testid="continue">{t.onboarding.continue}</Button>
  {/snippet}
</Step>
