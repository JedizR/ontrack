<!-- SCREENS.md section 4, Your plan: the targets, the expected change, how the target was calculated (each line opens
     its source), fine tuning, any guardrail in one line, and Save my plan. -->
<script lang="ts">
  import Step from './Step.svelte';
  import Card from '$lib/components/Card.svelte';
  import Row from '$lib/components/Row.svelte';
  import Button from '$lib/components/Button.svelte';
  import Switch from '$lib/components/Switch.svelte';
  import { U, V, floorFor, guardrails, plan } from '$lib/model/engine';
  import { evenEee, kgPerWeek, targetParts, targetWith, trainingDayEee } from '$lib/model/day';
  import { kgToLb, lbToKg, weightText } from '$lib/model/units';
  import { num } from '$lib/model/format';
  import { picker } from '$lib/picker.svelte';
  import Breakdown from '../plan/Breakdown.svelte';
  import { t } from '$lib/i18n';
  import { LIMITS, START, goalWeightOf, inputOf, minGoalWeightKg, weightWheel, type Draft } from './draft';

  let { d, year, set, back, onsave }: {
    d: Draft;
    year: number;
    set: (p: Partial<Draft>) => void;
    back: () => void;
    onsave: () => void;
  } = $props();

  const input = $derived(inputOf(d, year));
  const n = $derived(plan(input));
  const g = $derived(guardrails(input));
  const sex = $derived(input.sex);
  // matched mode with training: the hero is a training day and rest days get their own line; otherwise one number
  const trainEee = $derived(trainingDayEee(n));
  const matched = $derived(!d.even && trainEee > 0);
  const parts = $derived(targetParts(n, sex, matched ? trainEee : evenEee(n)));
  const rest = $derived(targetWith(n, sex, 0));
  const kg = $derived(kgPerWeek(n, sex, d.even ? 'even' : 'matched'));
  const expect = $derived(
    n.goal === 'maintain' || Math.round(kg * 10) === 0 ? t.plan.expectHold : (n.goal === 'lose' ? t.plan.expectLose : t.plan.expectGain)(weightText(kg, d.units)),
  );

  const pct = (share: number) => num(share * U.percent);
  const flags = $derived(
    n.flags.map((f) =>
      f === 'floor' ? t.plan.flags.floor(num(floorFor(sex)))
      : f === 'deficitCap' ? t.plan.flags.deficitCap(pct(V.deficitCap))
      : f === 'surplusCap' ? t.plan.flags.surplusCap(pct(input.experience === 'advanced' ? V.surplusCapAdvanced : V.surplusCap))
      : t.plan.flags.maintainOnly,
    ),
  );

  const bodyFat = $derived(input.bodyFatPct != null && input.bodyFatPct >= V.bodyFatRange.min && input.bodyFatPct <= V.bodyFatRange.max);

  // the wheel sheets answer a number, 0 for Clear, or null when dismissed
  const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;
  async function askBodyFat() {
    const { min, max } = V.bodyFatRange;
    // whole percent on the wheel: a stored 18.5 shows as 19 and stays 18.5 unless the wheel moves
    const was = d.bodyFatPct ? Math.round(d.bodyFatPct) : undefined;
    const v = await picker.ask({ title: t.plan.bodyFat, value: was ?? START.bodyFatPct, min, max, unit: t.after.percent, hint: t.plan.bodyFatHint, clearable: was !== undefined, range: () => t.plan.bodyFatRange(num(min), num(max)) });
    if (v === null || v === was) return;
    set({ bodyFatPct: v === 0 ? undefined : v });
  }
  async function askGoalWeight() {
    const metric = d.units === 'metric';
    const shown = (kg: number) => round(metric ? kg : kgToLb(kg), 1);
    // from the lowest goal weight offered (BMI 18.5) to the field's top
    const { min, max } = weightWheel(d.units, minGoalWeightKg(d));
    const goal = goalWeightOf(d);
    const start = Math.min(max, Math.max(min, shown(goal ?? d.weightKg ?? START.weightKg)));
    const v = await picker.ask({
      title: t.plan.goalWeight, value: start, min, max, decimals: 1, unit: metric ? t.after.kg : t.after.lb,
      hint: t.plan.goalWeightHint, clearable: !!goal,
      range: (typed) => (typed < min ? t.plan.goalWeightLow(weightText(minGoalWeightKg(d), d.units)) : t.body.weightRange(weightText(LIMITS.weightKg[0], d.units, 0), weightText(LIMITS.weightKg[1], d.units, 0))),
    });
    if (v === null) return;
    // rounding a lb value to 0.01 kg must not drop it under the floor it was picked at
    set({ goalWeightKg: v === 0 ? undefined : Math.max(minGoalWeightKg(d), round(metric ? v : lbToKg(v), 2)) });
  }
</script>

<Step title={t.plan.title} onback={back} top testid="your-plan">
  <div class="-mt-4 flex flex-col gap-4">
    {#if g.doctorCard}
      <Card class="bg-attention-soft!" data-testid="plan-doctor">
        <p class="text-body font-semibold">{t.plan.doctor}</p>
        <p class="text-callout mt-1">{t.plan.doctorBody(num(V.doctorBmi))}</p>
      </Card>
    {/if}

    <!-- the screen's hero: the target on the haze panel, protein on a grey stat tile beneath, as the "Withdraw" card -->
    <Card hero data-testid="plan-hero">
      <div class="haze rounded-sheet p-4">
        <p class="text-hero" data-testid="plan-kcal">{num(parts.total)}</p>
        <p class="text-caption text-ink-2 mt-1">{matched ? t.after.kcalTraining : t.after.kcalDay}</p>
        {#if matched}<p class="text-lead num mt-3" data-testid="plan-rest">{t.plan.onRest(num(rest))}</p>{/if}
      </div>
      <div class="bg-surface-2 mt-2 rounded-lg p-4">
        <p class="text-display" data-testid="plan-protein">{num(n.proteinG)}</p>
        <p class="text-caption text-ink-2 mt-1">{t.after.proteinDay}</p>
      </div>
    </Card>

    <p class="text-lead mt-2" data-testid="plan-expect">{expect} {t.plan.estimate}</p>

    <h2 class="text-heading mt-4">{t.plan.how}</h2>
    <p class="text-callout text-ink-2 -mt-2">{matched ? t.plan.howTraining : t.plan.howEven}</p>
    <Card list data-testid="plan-breakdown"><Breakdown {parts} goal={n.goal} {bodyFat} /></Card>

    <h2 class="text-heading mt-4">{t.plan.tune}</h2>
    <Card list>
      <Row title={t.plan.bodyFat} value={d.bodyFatPct ? `${num(d.bodyFatPct, 1)} ${t.after.percent}` : t.plan.noneYet} onclick={askBodyFat} testid="tune-bodyfat" />
      <Row title={t.plan.goalWeight} value={goalWeightOf(d) ? weightText(goalWeightOf(d)!, d.units) : t.plan.noneYet} onclick={askGoalWeight} testid="tune-goalweight" />
      <Row title={t.plan.even}>
        {#snippet trailing()}<Switch checked={!!d.even} label={t.plan.even} onchange={(even) => set({ even })} testid="tune-even" />{/snippet}
      </Row>
    </Card>
    {#each flags as f (f)}<p class="text-callout text-attention" data-testid="plan-flag">{f}</p>{/each}
  </div>
  {#snippet footer()}
    <Button variant="primary" size="lg" full onclick={onsave} data-testid="plan-save">{t.plan.save}</Button>
  {/snippet}
</Step>
