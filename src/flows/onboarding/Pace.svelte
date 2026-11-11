<!-- Step 9: the paces the guardrails allow for the goal, each with its daily calories and weekly change.
     A pace the guardrails remove is absent, with one line saying why. -->
<script lang="ts">
  import Step from './Step.svelte';
  import Choices from './Choices.svelte';
  import Button from '$lib/components/Button.svelte';
  import { V, type PlanNumbers, type Sex } from '$lib/model/engine';
  import { kgPerWeek, targetWith, trainingDayEee, evenEee } from '$lib/model/day';
  import { weightText } from '$lib/model/units';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import { paceChoices, type Draft } from './draft';

  let { d, year, next, back, progress }: {
    d: Draft;
    year: number;
    next: (p: Partial<Draft>) => void;
    back: () => void;
    progress: { n: number; total: number } | null;
  } = $props();

  const c = $derived(paceChoices(d, year));
  const sex = $derived<Sex>(d.sex ?? 'unspecified');
  // the number Your plan leads with: a training day, or every day when there is no training or one target a day
  const training = $derived(!d.even && trainingDayEee(c.hold) > 0);
  const kcal = (p: PlanNumbers) => `${num(targetWith(p, sex, training ? trainingDayEee(p) : evenEee(p)))} ${t.after.kcal}`;
  const weekly = (p: PlanNumbers) => weightText(kgPerWeek(p, sex), d.units);

  const WHY = {
    noLose: t.pace.noLose(num(V.underweightBmi)),
    gentleOnly: t.pace.gentleOnly(num(V.gentleOnlyBmi)),
    noFaster: t.pace.noFaster(num(V.fasterPaceMinBmi)),
    leanOnly: t.pace.leanOnly,
  };
  const options = $derived(
    c.options.length
      ? c.options.map((o) => ({ value: o.rate, title: t.pace[o.name], line: (d.goal === 'lose' ? t.pace.lose : t.pace.gain)(weekly(o.plan)), figure: kcal(o.plan) }))
      : [{ value: 0, title: t.pace.hold, line: t.pace.holdLine, figure: kcal(c.hold) }],
  );
  const picked = $derived(c.options.length ? c.picked : 0);
</script>

<Step title={t.pace.q} onback={back} {progress} testid="step-pace">
  <div class="flex flex-col gap-3">
    <span class="text-callout text-ink-2 font-medium">{training ? t.pace.trainingDay : t.pace.perDay}</span>
    <Choices label={t.pace.q} {options} value={picked} onpick={(rate) => next({ rate })} />
    {#if c.why}<p class="text-callout text-ink-2" data-testid="pace-why">{WHY[c.why]}</p>{/if}
  </div>
  {#snippet footer()}
    <Button variant="primary" size="lg" full onclick={() => next({ rate: picked })} data-testid="continue">{t.onboarding.continue}</Button>
  {/snippet}
</Step>
