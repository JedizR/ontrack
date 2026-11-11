<!-- Step 5: height and weight through the keypad, in the units picked here. Stored in cm and kg. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Step from './Step.svelte';
  import Field from './Field.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Button from '$lib/components/Button.svelte';
  import { keypad } from '$lib/keypad.svelte';
  import { cmToFtIn, ftInToCm, heightText, kgToLb, lbToKg, weightText, type Units } from '$lib/model/units';
  import { t } from '$lib/i18n';
  import { LIMITS, type Draft } from './draft';

  let { d, set, next, back, progress }: {
    d: Draft;
    set: (p: Partial<Draft>) => void;
    next: () => void;
    back: () => void;
    progress: { n: number; total: number } | null;
  } = $props();

  let error = $state('');
  const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;

  async function askHeight() {
    error = '';
    let cm: number;
    if (d.units === 'metric') {
      const v = await keypad.ask({ title: t.body.height, unit: t.units.cm, decimal: true, value: d.heightCm ? round(d.heightCm, 0) : null });
      if (v === null) return false;
      cm = v;
    } else {
      const was = d.heightCm ? cmToFtIn(d.heightCm) : null;
      const ft = await keypad.ask({ title: t.body.feet, unit: t.units.ft, value: was?.ft });
      if (ft === null) return false;
      const inches = await keypad.ask({ title: t.body.inches, unit: t.units.in, value: was?.inches, allowZero: true });
      if (inches === null) return false;
      cm = ftInToCm(ft, inches);
    }
    const [lo, hi] = LIMITS.heightCm;
    if (cm < lo || cm > hi) {
      error = t.body.heightRange(heightText(lo, d.units), heightText(hi, d.units));
      return false;
    }
    set({ heightCm: round(cm, 1) });
    return true;
  }

  async function askWeight() {
    error = '';
    const metric = d.units === 'metric';
    const shown = d.weightKg ? round(metric ? d.weightKg : kgToLb(d.weightKg), 1) : null;
    const v = await keypad.ask({ title: t.body.weight, unit: metric ? t.units.kg : t.units.lb, decimal: true, value: shown });
    if (v === null) return false;
    const kg = metric ? v : lbToKg(v);
    const [lo, hi] = LIMITS.weightKg;
    if (kg < lo || kg > hi) {
      error = t.body.weightRange(weightText(lo, d.units, 0), weightText(hi, d.units, 0));
      return false;
    }
    set({ weightKg: round(kg, 2) });
    return true;
  }

  // on a first visit the keypad opens at once: height, then weight
  onMount(() => {
    if (!d.heightCm) void askHeight().then((ok) => { if (ok && !d.weightKg) void askWeight(); });
  });
</script>

<Step title={t.body.q} caption={t.body.caption} onback={back} {progress} testid="step-body">
  <div class="flex flex-col gap-3">
    <Segmented
      label={t.body.units}
      value={d.units}
      options={[{ value: 'metric' as Units, label: t.body.metric }, { value: 'imperial' as Units, label: t.body.imperial }]}
      onchange={(units) => { error = ''; set({ units }); }}
    />
    <Field label={t.body.height} value={d.heightCm ? heightText(d.heightCm, d.units) : null} onclick={askHeight} testid="field-height" />
    <Field label={t.body.weight} value={d.weightKg ? weightText(d.weightKg, d.units) : null} onclick={askWeight} testid="field-weight" />
    <p class="text-callout text-danger min-h-5" role="alert">{error}</p>
  </div>
  {#snippet footer()}
    <Button variant="primary" size="lg" full disabled={!d.heightCm || !d.weightKg} onclick={next} data-testid="continue">{t.onboarding.continue}</Button>
  {/snippet}
</Step>
