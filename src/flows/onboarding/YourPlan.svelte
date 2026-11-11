<!-- SCREENS.md section 4, Your plan: the targets, the expected change, how the target was calculated (each line opens
     its source), fine tuning, any guardrail in one line, and Save my plan. -->
<script lang="ts">
  import Step from './Step.svelte';
  import Card from '$lib/components/Card.svelte';
  import Row from '$lib/components/Row.svelte';
  import Button from '$lib/components/Button.svelte';
  import Switch from '$lib/components/Switch.svelte';
  import { C, U, V, floorFor, guardrails, plan } from '$lib/model/engine';
  import { evenEee, kgPerWeek, targetParts, targetWith, trainingDayEee } from '$lib/model/day';
  import { kgToLb, lbToKg, weightText } from '$lib/model/units';
  import { num } from '$lib/model/format';
  import { keypad } from '$lib/keypad.svelte';
  import { SOURCES } from '$lib/data/sources';
  import { t } from '$lib/i18n';
  import { LIMITS, goalWeightOf, inputOf, minGoalWeightKg, type Draft } from './draft';

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

  // each line of the breakdown names the constants behind it, so it can show their sources and status
  type Basis = { source: keyof typeof SOURCES; status: string };
  const bodyFat = $derived(input.bodyFatPct != null && input.bodyFatPct >= V.bodyFatRange.min && input.bodyFatPct <= V.bodyFatRange.max);
  const lines = $derived(
    [
      { key: 'bmr', label: t.plan.bmr, value: parts.bmr, basis: [bodyFat ? C.cunningham : C.mifflin] },
      { key: 'movement', label: t.plan.movement, value: parts.movement, basis: [C.neat] },
      { key: 'training', label: t.plan.training, value: parts.training, basis: [C.metStrength] },
      { key: 'goal', label: t.plan.goal, value: parts.goal, basis: [n.goal === 'lose' ? C.losePace : C.gainPace, C.kcalPerKg] },
      { key: 'floor', label: t.plan.floorLift, value: parts.floorLift, basis: [C.floor] },
    ].filter((l, i) => i < 2 || l.value !== 0) as { key: string; label: string; value: number; basis: Basis[] }[],
  );
  let opened = $state<string | null>(null);
  const kcal = (v: string) => `${v} ${t.after.kcal}`;
  const signed = (v: number, first: boolean) => kcal(first || v < 0 ? num(v) : `+${num(v)}`);

  let tuneError = $state('');
  const round = (x: number, places: number) => Math.round(x * 10 ** places) / 10 ** places;
  async function askBodyFat() {
    tuneError = '';
    const v = await keypad.ask({ title: t.plan.bodyFat, unit: t.after.percent, decimal: true, value: d.bodyFatPct ?? null, allowZero: true, hint: t.plan.bodyFatHint });
    if (v === null) return;
    if (v === 0) return set({ bodyFatPct: undefined });
    const { min, max } = V.bodyFatRange;
    if (v < min || v > max) return void (tuneError = t.plan.bodyFatRange(num(min), num(max)));
    set({ bodyFatPct: v });
  }
  async function askGoalWeight() {
    tuneError = '';
    const metric = d.units === 'metric';
    const was = d.goalWeightKg ? round(metric ? d.goalWeightKg : kgToLb(d.goalWeightKg), 1) : null;
    const v = await keypad.ask({ title: t.plan.goalWeight, unit: metric ? t.after.kg : t.after.lb, decimal: true, value: was, allowZero: true, hint: t.plan.goalWeightHint });
    if (v === null) return;
    if (v === 0) return set({ goalWeightKg: undefined });
    const kg = metric ? v : lbToKg(v);
    const min = minGoalWeightKg(d);
    if (kg < min) return void (tuneError = t.plan.goalWeightLow(weightText(min, d.units)));
    if (kg > LIMITS.weightKg[1]) return void (tuneError = t.body.weightRange(weightText(LIMITS.weightKg[0], d.units, 0), weightText(LIMITS.weightKg[1], d.units, 0)));
    set({ goalWeightKg: round(kg, 2) });
  }
</script>

<Step title={t.plan.title} onback={back} top testid="your-plan">
  <div class="-mt-4 flex flex-col gap-3">
    {#if g.doctorCard}
      <Card class="bg-attention-soft" data-testid="plan-doctor">
        <p class="text-body font-semibold">{t.plan.doctor}</p>
        <p class="text-callout mt-1">{t.plan.doctorBody(num(V.doctorBmi))}</p>
      </Card>
    {/if}

    <Card hero data-testid="plan-hero">
      <p class="text-hero num" data-testid="plan-kcal">{num(parts.total)}</p>
      <p class="text-caption text-ink-2 mt-2">{matched ? t.after.kcalTraining : t.after.kcalDay}</p>
      {#if matched}<p class="text-callout num mt-3" data-testid="plan-rest">{t.plan.onRest(num(rest))}</p>{/if}
      <div class="border-line mt-5 border-t pt-5">
        <p class="text-display num" data-testid="plan-protein">{num(n.proteinG)}</p>
        <p class="text-caption text-ink-2 mt-1">{t.after.proteinDay}</p>
      </div>
    </Card>

    <p class="text-body mt-2" data-testid="plan-expect">{expect} {t.plan.estimate}</p>

    <h2 class="text-heading mt-5">{t.plan.how}</h2>
    <p class="text-callout text-ink-2 -mt-2">{matched ? t.plan.howTraining : t.plan.howEven}</p>
    <Card list data-testid="plan-breakdown">
      {#each lines as l, i (l.key)}
        <Row title={l.label} value={signed(l.value, i === 0)} onclick={() => (opened = opened === l.key ? null : l.key)} testid="line-{l.key}">
          <!-- one line closed (the first source), every citation and its status open -->
          {#snippet caption()}
            {#if opened === l.key}
              {#each l.basis as b (b.source)}<span class="mt-1 block">{SOURCES[b.source]?.cite}</span>{/each}
              {#if l.basis.some((b) => b.status === 'assumption')}<span class="mt-1 block">{t.plan.assumption}</span>{/if}
            {:else}
              <span class="block">{SOURCES[l.basis[0].source]?.short}</span>
            {/if}
          {/snippet}
        </Row>
      {/each}
      <Row title={t.plan.total} value={kcal(num(parts.total))} testid="line-total" />
    </Card>

    <h2 class="text-heading mt-5">{t.plan.tune}</h2>
    <Card list>
      <Row title={t.plan.bodyFat} value={d.bodyFatPct ? `${num(d.bodyFatPct, 1)} ${t.after.percent}` : t.plan.noneYet} onclick={askBodyFat} testid="tune-bodyfat" />
      <Row title={t.plan.goalWeight} value={goalWeightOf(d) ? weightText(goalWeightOf(d)!, d.units) : t.plan.noneYet} onclick={askGoalWeight} testid="tune-goalweight" />
      <Row title={t.plan.even}>
        {#snippet trailing()}<Switch checked={!!d.even} label={t.plan.even} onchange={(even) => set({ even })} testid="tune-even" />{/snippet}
      </Row>
    </Card>
    {#each flags as f (f)}<p class="text-callout text-attention" data-testid="plan-flag">{f}</p>{/each}
    <p class="text-callout text-attention min-h-5" role="alert" data-testid="tune-error">{tuneError}</p>
  </div>
  {#snippet footer()}
    <Button variant="primary" size="lg" full onclick={onsave} data-testid="plan-save">{t.plan.save}</Button>
  {/snippet}
</Step>
