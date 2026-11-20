<!-- SCREENS.md section 4, Your plan (O1, O2): the target counting up from nothing, protein, carbs and fat counting in behind it, the pace as a
     live control with what to expect, the training the answers set and where to change it, how the target was
     calculated (each line opens its source), fine tuning, any guardrail in one line, and Save this plan. Computed before
     it renders: no loading screen. -->
<script lang="ts">
  import { prefs } from '$lib/prefs.svelte';
  import { untrack } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Step from './Step.svelte';
  import Card from '$lib/components/Card.svelte';
  import Row from '$lib/components/Row.svelte';
  import Button from '$lib/components/Button.svelte';
  import Switch from '$lib/components/Switch.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Disclosure from '$lib/components/Disclosure.svelte';
  import { inview } from '../landing/inview';
  import { U, V, dayMacros, floorFor, guardrails, plan } from '$lib/model/engine';
  import { evenEee, kgPerWeek, targetParts, targetWith, trainingDayEee } from '$lib/model/day';
  import { kgToLb, lbToKg, weightText } from '$lib/model/units';
  import { num } from '$lib/model/format';
  import { picker } from '$lib/picker.svelte';
  import { db } from '$lib/db/store.svelte';
  import { ms } from '$lib/haptics';
  import Breakdown from '../plan/Breakdown.svelte';
    import { t } from '$lib/i18n';
  import { LIMITS, START, goalWeightOf, inputOf, minGoalWeightKg, paceChoices, programOf, weightWheel, type Draft } from './draft';
  const curvy = $derived(prefs.look === 'curvy');

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

  // the payoff of the wait: the target counts up from nothing over --d-reveal, then follows each pace tapped (--d-count);
  // protein, carbs and fat count in behind it, one after another. A number changing is text, not motion, so these play
  // under reduced motion too: the owner asked to see the count (O2)
  function counter(value: () => number, delay = 0) {
    const tween = new Tween(0, { duration: ms('--d-reveal'), easing: cubicOut });
    let arrived = false;
    $effect(() => {
      const v = value();
      untrack(() => {
        tween.set(v, arrived ? { duration: ms('--d-count'), delay: 0 } : { delay });
        arrived = true;
      });
    });
    return tween;
  }
  const hero = counter(() => parts.total);
  const macros = $derived(dayMacros(n, parts.total));
  const tiles = $derived([
    { key: 'protein', label: t.today.protein, g: macros.proteinG },
    { key: 'carbs', label: t.today.carbs, g: macros.carbsG },
    { key: 'fat', label: t.today.fat, g: macros.fatG },
  ]);
  const counts = [counter(() => tiles[0].g, 250), counter(() => tiles[1].g, 400), counter(() => tiles[2].g, 550)];

  // the pace, live (replaces the Pace screen): only the paces the guardrails allow, with why one is missing
  const c = $derived(paceChoices(d, year));
  const faster = $derived(n.goal === 'gain' && n.ratePctPerWeek >= V.gainPaceFaster);
  const WHY = {
    noLose: t.pace.noLose(num(V.underweightBmi)),
    gentleOnly: t.pace.gentleOnly(num(V.gentleOnlyBmi)),
    noFaster: t.pace.noFaster(num(V.fasterPaceMinBmi)),
    leanOnly: t.pace.leanOnly,
    noFasterGain: t.pace.noFasterGain(num(V.fasterGainMaxBmi)),
  };

  // the training the answers set, in the open (SCREENS.md section 4)
  const sessions = $derived(programOf(d).sessions);
  const training = $derived.by(() => {
    const lift = sessions.filter((s) => s.type === 'strength');
    const cardio = sessions.filter((s) => s.type === 'cardio');
    if (!sessions.length) return t.plan.noTraining;
    const line = !cardio.length ? t.plan.lifting(num(lift.length), num(lift[0].minutes))
      : !lift.length ? t.plan.cardio(num(cardio.length), num(cardio[0].minutes))
      : t.plan.both(num(lift.length), num(cardio.length));
    return `${line} ${t.plan.change}`;
  });

  const trainingLine = $derived(sessions.length ? t.plan.trainingShort(num(sessions.length)) : t.plan.noTrainingShort);

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
    const shownKg = (kg: number) => round(metric ? kg : kgToLb(kg), 1);
    // from the lowest goal weight offered (BMI 18.5) to the field's top
    const { min, max } = weightWheel(d.units, minGoalWeightKg(d));
    const goal = goalWeightOf(d);
    const start = Math.min(max, Math.max(min, shownKg(goal ?? d.weightKg ?? START.weightKg)));
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
    <Card hero data-testid="plan-hero" class="rise" style="--i: 0">
      <!-- Default: onboarding's page is the gradient, so its cards are white, as the choices. Curvy: the haze panel in the
           white shell, its corners 40 (48 less the 8 gap), corners facing each other 24 (U1b) -->
      <div class="p-6 {curvy ? 'haze rounded-t-sheet rounded-b-md' : 'bg-surface shadow-card rounded-md'}">
        <p class="text-hero" aria-hidden="true">{num(Math.round(hero.current))}</p>
        <p class="sr-only" data-testid="plan-kcal">{num(parts.total)}</p>
        <p class="text-caption text-ink-2 mt-1">{matched ? t.after.kcalTraining : t.after.kcalDay}</p>
        {#if matched}<p class="text-lead num mt-3" data-testid="plan-rest">{t.plan.onRest(num(rest))}</p>{/if}
      </div>
      <div class="mt-2 grid grid-cols-3 gap-2">
        {#each tiles as m, i (m.key)}
          <div class="flex min-h-20 min-w-0 flex-col justify-between rounded-md px-4 pt-3 pb-4 {curvy ? 'bg-surface-2 first:rounded-bl-sheet last:rounded-br-sheet' : 'bg-surface shadow-card'}" data-testid="plan-tile-{m.key}">
            <p class="text-caption text-ink-2">{m.label}</p>
            <p class="text-subhead num" aria-hidden="true">{num(Math.round(counts[i].current))}<span class="text-caption text-ink-2 font-medium">{' '}{t.after.g}</span></p>
            <p class="sr-only" data-testid="plan-{m.key}">{num(m.g)}</p>
          </div>
        {/each}
      </div>
    </Card>

    <!-- the goal weight, its own section (O2) -->
    <div class="reveal" use:inview>
      <Card list class="bg-surface shadow-card mx-0! rounded-lg" aria-label={t.plan.goalWeight}>
        <Row title={t.plan.goalWeight} caption={t.plan.goalWeightHint} value={goalWeightOf(d) ? weightText(goalWeightOf(d)!, d.units) : t.plan.noneYet} chevron onclick={askGoalWeight} testid="tune-goalweight" />
      </Card>
    </div>

    {#if c.options.length}
      <div class="reveal flex flex-col gap-3" use:inview>
        <h2 class="text-heading mt-2">{t.pace.q}</h2>
        <div data-testid="plan-pace">
          <Segmented label={t.pace.q} value={c.picked} options={c.options.map((o) => ({ value: o.rate, label: t.pace[o.name] }))} onchange={(rate) => set({ rate })} />
        </div>
      </div>
    {/if}
    <div class="reveal flex flex-col gap-2" use:inview>
      <p class="text-lead" data-testid="plan-expect">{expect} {t.plan.estimate}</p>
      {#if d.aim === 'recomp' && n.goal === 'lose'}<p class="text-callout text-ink-2" data-testid="plan-recomp">{t.plan.recomp}</p>{/if}
      {#if faster}
        <p class="text-callout" data-testid="pace-faster">{t.pace.fasterGain} <span class="text-ink-2">{t.plan.provisional}</span></p>
      {/if}
      {#if c.why}<p class="text-callout text-ink-2" data-testid="pace-why">{WHY[c.why]}</p>{/if}
    </div>

    <!-- what is behind the number, closed until asked for (O2) -->
    <div class="reveal" use:inview>
      <Card list class="bg-surface shadow-card mx-0! rounded-lg">
        <Disclosure title={t.plan.yourTraining} line={trainingLine} testid="plan-training-box">
          <p class="text-body" data-testid="plan-training">{training}</p>
        </Disclosure>
        <div class="border-line border-t">
          <Disclosure title={t.plan.how} line={matched ? t.plan.howTraining : t.plan.howEven} testid="plan-how">
            <div class="-mx-6 px-6" data-testid="plan-breakdown"><Breakdown {parts} goal={n.goal} rate={n.ratePctPerWeek} {bodyFat} /></div>
          </Disclosure>
        </div>
        <div class="border-line border-t">
          <Disclosure title={t.plan.tune} testid="plan-tune">
            <Row title={t.plan.bodyFat} value={d.bodyFatPct ? `${num(d.bodyFatPct, 1)} ${t.after.percent}` : t.plan.noneYet} onclick={askBodyFat} testid="tune-bodyfat" />
            <Row title={t.plan.even}>
              {#snippet trailing()}<Switch checked={!!d.even} label={t.plan.even} onchange={(even) => set({ even })} testid="tune-even" />{/snippet}
            </Row>
          </Disclosure>
        </div>
      </Card>
    </div>
    {#each flags as f (f)}<p class="text-callout text-attention" data-testid="plan-flag">{f}</p>{/each}
    {#if !db.ready}<p class="text-caption text-ink-2 mt-2 text-center" data-testid="plan-save-line">{t.plan.saveLine}</p>{/if}
  </div>
  {#snippet footer()}
    <Button variant="primary" size="lg" full onclick={onsave} data-testid="plan-save">{t.plan.save}</Button>
  {/snippet}
</Step>
