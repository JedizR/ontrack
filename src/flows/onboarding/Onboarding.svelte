<!-- SCREENS.md section 4 (O1): up to nine questions with their guardrail screens, and Your plan. Before the first
     question the draft sits at 'welcome', which App shows as the landing page (L1). Single answers advance on tap, 240 ms
     after the pick fills ink, with no button; the number builds in the footer from the daily movement question on.
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
  import { prefs } from '$lib/prefs.svelte';
  import { db } from '$lib/db/store.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import Wheel from '$lib/components/Wheel.svelte';
  import { C, V, type Experience, type Goal, type Neat, type Sex } from '$lib/model/engine';
  import type { TrainKind } from '$lib/data/templates';
  import { today, yearOf } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { dur, haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import { LIMITS, START, fresh, progress, soFar, step, upgrade, type Draft, type Screen, type Screening } from './draft';
  import { settle } from './settle';

  type Icon = Component<{ size?: number; strokeWidth?: number }>;
  const year = yearOf(today());
  const d = $derived(upgrade(prefs.draft) ?? fresh());
  let dir = $state<1 | -1>(1);

  function set(patch: Partial<Draft>) {
    prefs.draft = { ...d, ...patch };
  }
  let timer: ReturnType<typeof setTimeout> | undefined;
  function move(at: Screen, by: 1 | -1) {
    clearTimeout(timer);
    dir = by;
    // leaving Your plan takes back "Save this plan": a changed answer must not settle before it is saved again
    prefs.draft = { ...d, at, saved: undefined };
    scrollTo({ top: 0 });
  }
  /** Save this screen's answer, then go to the screen the answers lead to. */
  function next(patch: Partial<Draft> = {}) {
    const nd = { ...d, ...patch };
    prefs.draft = nd;
    move(step(nd, year, 1), 1);
  }
  /** A single answer: the pick fills ink and the number grows, then the screen slides on (SCREENS.md section 4). */
  function pick(patch: Partial<Draft>) {
    clearTimeout(timer);
    set(patch);
    timer = setTimeout(() => next(), dur(240));
  }
  const back = () => move(step(d, year, -1), -1);
  function leave() {
    clearTimeout(timer);
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

  // ----- the single choice questions -----
  const GOALS: { value: Goal; title: string; line: string; icon: Icon }[] = [
    { value: 'gain', title: t.goal.gain, line: t.goal.gainLine, icon: TrendingUp },
    { value: 'lose', title: t.goal.lose, line: t.goal.loseLine, icon: TrendingDown },
    { value: 'maintain', title: t.goal.maintain, line: t.goal.maintainLine, icon: Equal },
  ];
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
  // a changed goal or experience changes the paces offered, so the pace goes back to the default
  const repace = (patch: Partial<Draft>, same: boolean) => pick(same ? {} : { ...patch, rate: undefined });

  // ----- screening: None of these apply answers in one tap; a tick shows Continue, which leads to the advice screen -----
  const ITEMS: (keyof Screening)[] = ['pregnant', 'medical', 'eatingDisorder'];
  const NONE: Screening = { pregnant: false, medical: false, eatingDisorder: false };
  // local until answered; a draft from an earlier visit fills them in
  const was = prefs.draft?.screening;
  let ticks = $state<Screening>({ ...NONE, ...was });
  const ticked = $derived(ITEMS.some((k) => ticks[k]));
  const none = $derived(!!d.screening && !ITEMS.some((k) => d.screening![k]) && !ticked);
  function tick(k: keyof Screening) {
    // a tick right after "None of these apply" wins over its pending advance
    clearTimeout(timer);
    haptic();
    ticks[k] = !ticks[k];
  }
  function tickNone() {
    haptic();
    ticks = { ...NONE };
    pick({ screening: { ...NONE } });
  }

  // ----- birth year: a wheel from the answer, or from a 25 year old; Continue saves it -----
  let born = $state(prefs.draft?.birthYear ?? year - START.ageYears);
  let yearError = $state('');
</script>

{#snippet cta(onclick: () => void)}
  <Button variant="primary" size="lg" full {onclick} data-testid="continue">{t.onboarding.continue}</Button>
{/snippet}
{#snippet card()}{#if now}<SoFar {now} />{/if}{/snippet}

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
      <div in:fly={{ x: 32 * dir, duration: dur(240) }}>
        {#if d.at === 'goal'}
          <Step title={t.goal.q} onback={back} progress={prog} testid="step-goal">
            <Choices label={t.goal.q} options={GOALS} value={d.goal} onpick={(goal) => repace({ goal }, goal === d.goal)} />
          </Step>
        {:else if d.at === 'screening'}
          <Step title={t.screening.q} caption={t.screening.lead} onback={back} progress={prog} testid="step-screening">
            <div class="flex flex-col gap-3" role="group" aria-label={t.screening.q}>
              {#each ITEMS as k (k)}{@render checkbox(t.screening[k], ticks[k], () => tick(k), `screen-${k}`)}{/each}
              {@render checkbox(t.screening.none, none, tickNone, 'screen-none')}
              <p class="text-caption text-ink-2 mt-2">{t.screening.disclaimer}</p>
            </div>
            {#snippet footer()}{#if ticked}{@render cta(() => next({ screening: { ...ticks } }))}{/if}{/snippet}
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
            <Choices label={t.sex.q} options={SEXES} value={d.sex} onpick={(sex) => pick({ sex })} />
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
            <Choices label={t.move.q} options={NEATS} value={d.neat} onpick={(neat) => pick({ neat })} />
            {#snippet footer()}{@render card()}{/snippet}
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
                  onclick={() => { haptic(); pick({ days: n }); }}
                  data-testid="days-{n}"
                >{n ? num(n) : t.days.none}</button>
              {/each}
            </div>
            {#snippet footer()}{@render card()}{/snippet}
          </Step>
        {:else if d.at === 'kind'}
          <Step title={t.kind.q} caption={t.kind.caption} onback={back} progress={prog} testid="step-kind">
            <Choices label={t.kind.q} options={KINDS} value={d.kind} onpick={(kind) => pick({ kind })} />
            {#snippet footer()}{@render card()}{/snippet}
          </Step>
        {:else if d.at === 'experience'}
          <Step title={t.experience.q} onback={back} progress={prog} testid="step-experience">
            <Choices label={t.experience.q} options={EXPERIENCE} value={d.experience} onpick={(experience) => repace({ experience }, experience === d.experience)} />
            {#snippet footer()}{@render card()}{/snippet}
          </Step>
        {:else if d.at === 'plan'}
          <YourPlan {d} {year} {set} {back} onsave={save} />
        {/if}
      </div>
    {/key}
</div>
