<!-- SCREENS.md section 4 (O1, U1a): up to nine questions with their guardrail screens, and Your plan. Before the first
     question the draft sits at 'welcome', which App shows as the landing page (L1). A tap selects an answer and enables
     Continue, which moves on (the owner's call in U1a); the number builds in the footer from the daily movement question
     on, and Building your plan plays once before Your plan.
     Answers live in the prefs draft, so a reload or the Google redirect lands on the same screen. Signed out, Save this
     plan opens sign in; signed in, it writes the plan at once. -->
<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { Component } from 'svelte';
  import Step from './Step.svelte';
  import Choices from './Choices.svelte';
  import Body from './Body.svelte';
  import YourPlan from './YourPlan.svelte';
  import SoFar from './SoFar.svelte';
  import Building from './Building.svelte';
  import Button from '$lib/components/Button.svelte';
  import Check from '@lucide/svelte/icons/check';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TrendingDown from '@lucide/svelte/icons/trending-down';
  import Equal from '@lucide/svelte/icons/equal';
  import Armchair from '@lucide/svelte/icons/armchair';
  import Footprints from '@lucide/svelte/icons/footprints';
  import PersonStanding from '@lucide/svelte/icons/person-standing';
  import HardHat from '@lucide/svelte/icons/hard-hat';
  import Dumbbell from '@lucide/svelte/icons/dumbbell';
  import HeartPulse from '@lucide/svelte/icons/heart-pulse';
  import Blend from '@lucide/svelte/icons/blend';
  import Weight from '@lucide/svelte/icons/weight';
  import ArrowDownUp from '@lucide/svelte/icons/arrow-down-up';
  import { tick as settled } from 'svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { db } from '$lib/db/store.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import Wheel from '$lib/components/Wheel.svelte';
  import { C, V, type Experience, type Goal, type Neat, type Sex } from '$lib/model/engine';
  import type { TrainKind } from '$lib/data/templates';
  import { today, yearOf } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { dur, haptic, reducedMotion } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import { AIMS, LIMITS, START, flagged, fresh, progress, soFar, step, upgrade, type Aim, type Draft, type Screen, type Screening } from './draft';
  import { settle } from './settle';

  type Icon = Component<{ size?: number; strokeWidth?: number }>;
  const year = yearOf(today());
  const d = $derived(upgrade(prefs.draft) ?? fresh());
  let dir = $state<1 | -1>(1);

  function set(patch: Partial<Draft>) {
    prefs.draft = { ...d, ...patch };
  }
  function move(at: Screen, by: 1 | -1) {
    dir = by;
    // leaving Your plan takes back "Save this plan": a changed answer must not settle before it is saved again
    prefs.draft = { ...d, at, saved: undefined };
    scrollTo({ top: 0 });
  }
  // Building your plan plays once a visit: coming back to Your plan after changing an answer is no new wait
  let building = $state(false);
  let built = false;
  /** Save this screen's answer, then go to the screen the answers lead to. */
  function next(patch: Partial<Draft> = {}) {
    const nd = { ...d, ...patch };
    const to = step(nd, year, 1);
    if (to === 'plan' && !built && !reducedMotion()) building = built = true;
    prefs.draft = nd;
    move(to, 1);
  }
  const back = () => move(step(d, year, -1), -1);
  function leave() {
    prefs.draft = null;
    dir = -1;
    ticks = { ...NONE };
  }
  const prog = $derived(progress(d, year));
  const now = $derived(soFar(d, year));

  function save() {
    haptic();
    set({ saved: true });
    // signed in: written now, or once this session's first pull lands (App settles it then)
    if (db.ready) settle();
    else sheets.signin = true;
  }

  // ----- the single choice questions: a tap selects (the answer is saved, so the number grows), Continue moves on -----
  const GOALS: { value: Goal | Aim; title: string; line: string; icon: Icon }[] = [
    { value: 'gain', title: t.goal.gain, line: t.goal.gainLine, icon: TrendingUp },
    { value: 'lose', title: t.goal.lose, line: t.goal.loseLine, icon: TrendingDown },
    { value: 'maintain', title: t.goal.maintain, line: t.goal.maintainLine, icon: Equal },
    // behind "Not what you're looking for?" (U1a)
    { value: 'weight', title: t.goal.weight, line: t.goal.weightLine, icon: Weight },
    { value: 'recomp', title: t.goal.recomp, line: t.goal.recompLine, icon: ArrowDownUp },
  ];
  const isAim = (v: Goal | Aim): v is Aim => v in AIMS;
  const chosenGoal = $derived(d.aim ?? d.goal);
  // the link opens once and stays open; a draft already on one of the two opens with them
  let more = $state(!!prefs.draft?.aim);
  async function showMore() {
    more = true;
    await settled();
    document.querySelector<HTMLElement>('[data-testid="choice-weight"]')?.focus();
  }
  function pickGoal(v: Goal | Aim) {
    if (v === chosenGoal) return;
    // a changed goal changes the paces offered, so the pace goes back to the goal's own
    set(isAim(v) ? { goal: AIMS[v].goal, aim: v, rate: undefined } : { goal: v, aim: undefined, rate: undefined });
  }
  const SEXES: { value: Sex; title: string; line?: string }[] = [
    { value: 'male', title: t.sex.male },
    { value: 'female', title: t.sex.female },
    { value: 'unspecified', title: t.sex.unspecified, line: t.sex.unspecifiedLine },
  ];
  const steps = C.neatSteps.value;
  const NEATS: { value: Neat; title: string; line: string; icon: Icon }[] = [
    { value: 'seated', title: t.move.seated, line: t.move.under(num(steps.seated)), icon: Armchair },
    { value: 'light', title: t.move.light, line: t.move.between(num(steps.seated), num(steps.light)), icon: Footprints },
    { value: 'moving', title: t.move.moving, line: t.move.between(num(steps.light), num(steps.moving)), icon: PersonStanding },
    { value: 'physical', title: t.move.physical, line: t.move.over(num(steps.moving)), icon: HardHat },
  ];
  const DAYS = [0, 1, 2, 3, 4, 5, 6, 7];
  const KINDS: { value: TrainKind; title: string; line: string; icon: Icon }[] = [
    { value: 'lifting', title: t.kind.lifting, line: t.kind.liftingLine, icon: Dumbbell },
    { value: 'cardio', title: t.kind.cardio, line: t.kind.cardioLine, icon: HeartPulse },
    { value: 'both', title: t.kind.both, line: t.kind.bothLine, icon: Blend },
  ];
  const EXPERIENCE: { value: Experience; title: string }[] = [
    { value: 'beginner', title: t.experience.beginner },
    { value: 'intermediate', title: t.experience.intermediate },
    { value: 'advanced', title: t.experience.advanced },
  ];
  // a changed experience changes the paces offered, so the pace goes back to the default
  const repace = (experience: Experience) => experience !== d.experience && set({ experience, rate: undefined });

  // ----- screening: None of these apply or a tick enables Continue; a tick leads to the advice screen -----
  const ITEMS: (keyof Screening)[] = ['pregnant', 'medical', 'eatingDisorder'];
  const NONE: Screening = { pregnant: false, medical: false, eatingDisorder: false };
  // local until answered; a draft from an earlier visit fills them in
  const was = prefs.draft?.screening;
  let ticks = $state<Screening>({ ...NONE, ...was });
  const ticked = $derived(ITEMS.some((k) => ticks[k]));
  const none = $derived(!!d.screening && !flagged(d) && !ticked);
  function tick(k: keyof Screening) {
    haptic();
    ticks[k] = !ticks[k];
    // a tick takes back the saved answer, "None of these apply" included; Continue saves the ticks
    if (d.screening) set({ screening: undefined });
  }
  function tickNone() {
    haptic();
    ticks = { ...NONE };
    // a second tap unticks it, as any checkbox
    set({ screening: none ? undefined : { ...NONE } });
  }

  // ----- birth year: a wheel from the answer, or from a 25 year old; Continue saves it -----
  let born = $state(prefs.draft?.birthYear ?? year - START.ageYears);
  let yearError = $state('');
</script>

{#snippet cta(onclick: () => void, ready = true)}
  <Button variant="primary" size="lg" full {onclick} disabled={!ready} data-testid="continue">{t.onboarding.continue}</Button>
{/snippet}
<!-- from daily movement on: the number so far, then Continue -->
{#snippet card(ready: boolean)}{#if now}<div class="mb-2"><SoFar {now} /></div>{/if}{@render cta(() => next(), ready)}{/snippet}

{#snippet checkbox(label: string, on: boolean, onclick: () => void, testid: string)}
  <button type="button" role="checkbox" aria-checked={on} class="bg-surface shadow-card active:bg-surface-2 flex min-h-18 w-full items-center gap-4 rounded-md px-5 py-4 text-left transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.98]" {onclick} data-testid={testid}>
    <span class="grid size-6 flex-none place-items-center rounded-xs transition-colors duration-[var(--d-ui)] ease-[var(--spring-default)] {on ? 'bg-ink text-canvas' : 'ring-ink-3 ring-2 ring-inset'}" aria-hidden="true">
      {#if on}<Check size={18} strokeWidth={2.5} />{/if}
    </span>
    <span class="text-body flex-1">{label}</span>
  </button>
{/snippet}

<div class="bg-canvas relative mx-auto min-h-svh w-full max-w-[480px] overflow-x-clip" data-onboarding data-testid="onboarding">
    {#key d.at}
      <div in:fly={{ x: 32 * dir, duration: dur('--d-settle') }}>
        {#if d.at === 'goal'}
          <Step title={t.goal.q} onback={back} progress={prog} testid="step-goal">
            <Choices label={t.goal.q} options={more ? GOALS : GOALS.slice(0, 3)} value={chosenGoal} onpick={pickGoal} />
            {#if !more}
              <button type="button" class="text-callout text-accent-ink mt-2 min-h-[var(--tap)] self-center px-2 underline underline-offset-4" onclick={showMore} data-testid="goal-more">{t.goal.more}</button>
            {/if}
            {#snippet footer()}{@render cta(() => next(), !!d.goal)}{/snippet}
          </Step>
        {:else if d.at === 'screening'}
          <Step title={t.screening.q} caption={t.screening.lead} onback={back} progress={prog} testid="step-screening">
            <div class="flex flex-col gap-3" role="group" aria-label={t.screening.q}>
              {#each ITEMS as k (k)}{@render checkbox(t.screening[k], ticks[k], () => tick(k), `screen-${k}`)}{/each}
              {@render checkbox(t.screening.none, none, tickNone, 'screen-none')}
              <p class="text-caption text-ink-2 mt-2">{t.screening.disclaimer}</p>
            </div>
            {#snippet footer()}{@render cta(() => next({ screening: { ...ticks } }), ticked || none)}{/snippet}
          </Step>
        {:else if d.at === 'advice'}
          {@const ed = !!d.screening?.eatingDisorder}
          <Step title={ed ? t.advice.edTitle : t.advice.title} onback={back} top testid="step-advice">
            <p class="text-lead">{t.advice.thanks}</p>
            <p class="text-lead mt-4">{ed ? t.advice.edBody : t.advice.body}</p>
            <p class="text-lead mt-4">{ed ? t.advice.edOffer : t.advice.offer}</p>
            {#snippet footer()}
              <!-- with an eating disorder, leaving is the advised path, so it is the main action -->
              {#if ed}
                <Button variant="primary" size="lg" full onclick={leave} data-testid="advice-leave">{t.onboarding.leave}</Button>
                <Button variant="plain" size="lg" full onclick={() => next()} data-testid="advice-continue">{t.advice.maintain}</Button>
              {:else}
                <Button variant="primary" size="lg" full onclick={() => next()} data-testid="advice-continue">{t.advice.maintain}</Button>
                <Button variant="plain" size="lg" full onclick={leave} data-testid="advice-leave">{t.onboarding.leave}</Button>
              {/if}
            {/snippet}
          </Step>
        {:else if d.at === 'sex'}
          <Step title={t.sex.q} caption={t.sex.caption} onback={back} progress={prog} testid="step-sex">
            <Choices label={t.sex.q} options={SEXES} value={d.sex} onpick={(sex) => set({ sex })} />
            {#snippet footer()}{@render cta(() => next(), !!d.sex)}{/snippet}
          </Step>
        {:else if d.at === 'born'}
          <Step title={t.born.q} onback={back} progress={prog} testid="step-born">
            <div class="flex flex-col gap-3">
              <Wheel
                bind:value={born}
                min={year - LIMITS.oldestAge}
                max={year}
                label={t.born.field}
                testid="wheel-year"
                onchange={() => (yearError = '')}
                onclamp={() => (yearError = t.born.invalid(String(year - LIMITS.oldestAge), String(year)))}
              />
              <p class="text-callout text-attention min-h-[1lh]" role="alert">{yearError}</p>
            </div>
            {#snippet footer()}{@render cta(() => next({ birthYear: born }))}{/snippet}
          </Step>
        {:else if d.at === 'young'}
          <Step title={t.young.title} onback={back} top testid="step-young">
            <p class="text-lead">{t.young.body(num(V.minAge))}</p>
            {#snippet footer()}
              <Button variant="primary" size="lg" full onclick={leave} data-testid="young-leave">{t.onboarding.leave}</Button>
            {/snippet}
          </Step>
        {:else if d.at === 'body'}
          <Body {d} {set} {next} {back} progress={prog} />
        {:else if d.at === 'move'}
          <Step title={t.move.q} onback={back} progress={prog} testid="step-move">
            <Choices label={t.move.q} options={NEATS} value={d.neat} onpick={(neat) => set({ neat })} />
            {#snippet footer()}{@render card(!!d.neat)}{/snippet}
          </Step>
        {:else if d.at === 'days'}
          <Step title={t.days.q} caption={t.days.caption} onback={back} progress={prog} testid="step-days">
            <div class="grid grid-cols-4 gap-3" role="radiogroup" aria-label={t.days.q}>
              {#each DAYS as n (n)}
                {@const on = d.days === n}
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  class="shadow-card text-callout num min-h-16 rounded-sm px-1 font-semibold transition-[transform,background-color,color] duration-[var(--d-ui)] ease-[var(--spring-default)] active:scale-[0.97] {on ? 'bg-ink text-canvas' : 'bg-surface text-ink active:bg-surface-2'}"
                  onclick={() => { haptic(); set({ days: n }); }}
                  data-testid="days-{n}"
                >{n ? num(n) : t.days.none}</button>
              {/each}
            </div>
            {#snippet footer()}{@render card(d.days !== undefined)}{/snippet}
          </Step>
        {:else if d.at === 'kind'}
          <Step title={t.kind.q} caption={t.kind.caption} onback={back} progress={prog} testid="step-kind">
            <Choices label={t.kind.q} options={KINDS} value={d.kind} onpick={(kind) => set({ kind })} />
            {#snippet footer()}{@render card(!!d.kind)}{/snippet}
          </Step>
        {:else if d.at === 'experience'}
          <Step title={t.experience.q} onback={back} progress={prog} testid="step-experience">
            <Choices label={t.experience.q} options={EXPERIENCE} value={d.experience} onpick={repace} />
            {#snippet footer()}{@render card(!!d.experience)}{/snippet}
          </Step>
        {:else if d.at === 'plan'}
          {#if building}
            <Building training={!!d.days} ondone={() => (building = false)} />
          {:else}
            <div in:fly={{ y: 16, duration: dur('--d-settle') }}><YourPlan {d} {year} {set} {back} onsave={save} /></div>
          {/if}
        {/if}
      </div>
    {/key}
</div>
