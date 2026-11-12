<!-- Step 5: height and weight on two wheels side by side, in the units picked here (first set from the phone's region).
     Stored in cm and kg. The wheels start at the answer, or at the median adult of the sex just answered; Continue saves
     what they show. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Step from './Step.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Button from '$lib/components/Button.svelte';
  import Wheel from '$lib/components/Wheel.svelte';
  import { cmToFtIn, ftInToCm, heightText, kgToLb, lbToKg, weightText, type Units } from '$lib/model/units';
  import { t } from '$lib/i18n';
  import { LIMITS, START, weightWheel, type Draft } from './draft';

  let { d, set, next, back, progress }: {
    d: Draft;
    set: (p: Partial<Draft>) => void;
    next: (p: Partial<Draft>) => void;
    back: () => void;
    progress: { n: number; total: number } | null;
  } = $props();

  const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;
  // what the wheels show, in cm and kg; this screen is created fresh on each visit
  const start = START.body[untrack(() => d.sex) ?? 'unspecified'];
  let cm = $state(untrack(() => d.heightCm ?? start.cm));
  let kg = $state(untrack(() => d.weightKg ?? start.kg));
  let error = $state('');

  const metric = $derived(d.units === 'metric');
  const kgBounds = $derived(weightWheel(d.units));
  const [lo, hi] = LIMITS.heightCm;
  const heightError = () => t.body.heightRange(heightText(lo, d.units), heightText(hi, d.units));
  const weightError = () => t.body.weightRange(weightText(LIMITS.weightKg[0], d.units, 0), weightText(LIMITS.weightKg[1], d.units, 0));
  const ftIn = $derived(cmToFtIn(cm));

  function save() {
    // feet and inches can reach below or above what the field takes
    if (cm < lo || cm > hi) return void (error = heightError());
    next({ heightCm: round(cm, 1), weightKg: round(kg, 2) });
  }
</script>

<Step title={t.body.q} caption={t.body.caption} onback={back} {progress} testid="step-body">
  <div class="flex flex-col gap-6 [@media(max-height:620px)]:gap-3">
    <Segmented
      label={t.body.units}
      value={d.units}
      options={[{ value: 'metric' as Units, label: t.body.metric }, { value: 'imperial' as Units, label: t.body.imperial }]}
      onchange={(units) => { error = ''; set({ units }); }}
    />
    <!-- one full width band behind height and weight, as one picker with two halves -->
    <div class="grid grid-cols-2 gap-3">
      <span class="text-eyebrow text-ink-2 text-center">{t.body.height}</span>
      <span class="text-eyebrow text-ink-2 text-center">{t.body.weight}</span>
      <div class="group relative col-span-2 grid grid-cols-2 gap-3">
        <div class="bg-surface-2 ring-ink absolute inset-x-0 top-[calc(2*var(--wheel-row))] h-[var(--wheel-row)] rounded-sm group-has-[[role=slider]:focus-visible]:ring-2" aria-hidden="true"></div>
        {#if metric}
          <Wheel bind:value={() => Math.round(cm), (v) => (cm = v)} min={lo} max={hi} unit={t.after.cm} band={false} label={t.body.height} testid="wheel-height" onchange={() => (error = '')} onclamp={() => (error = heightError())} />
        {:else}
          <div class="flex min-w-0">
            <Wheel bind:value={() => ftIn.ft, (ft) => (cm = ftInToCm(ft, ftIn.inches))} min={3} max={8} unit={t.after.ft} band={false} label={t.body.feet} testid="wheel-height-ft" onchange={() => (error = '')} />
            <Wheel bind:value={() => ftIn.inches, (inches) => (cm = ftInToCm(ftIn.ft, inches))} min={0} max={11} unit={t.after.in} band={false} label={t.body.inches} testid="wheel-height-in" onchange={() => (error = '')} />
          </div>
        {/if}
        <Wheel
          bind:value={() => round(metric ? kg : kgToLb(kg), 1), (v) => (kg = metric ? v : lbToKg(v))}
          min={kgBounds.min}
          max={kgBounds.max}
          decimals={1}
          unit={metric ? t.after.kg : t.after.lb}
          band={false}
          label={t.body.weight}
          testid="wheel-weight"
          onchange={() => (error = '')}
          onclamp={() => (error = weightError())}
        />
      </div>
    </div>
    <p class="text-callout text-attention min-h-[1lh]" role="alert">{error}</p>
  </div>
  {#snippet footer()}
    <Button variant="primary" size="lg" full onclick={save} data-testid="continue">{t.onboarding.continue}</Button>
  {/snippet}
</Step>
