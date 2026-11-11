<!-- SCREENS.md sections 3 and 4: the install guide (Safari on iPhone), welcome, the nine questions with their guardrail
     screens, and Your plan. Answers live in the prefs draft, so a reload or the Google redirect lands on the same screen.
     Signed out, Save my plan opens sign in; signed in, it writes the plan at once. -->
<script lang="ts">
  import { fly } from 'svelte/transition';
  import Step from './Step.svelte';
  import Choices from './Choices.svelte';
  import Field from './Field.svelte';
  import Install from './Install.svelte';
  import Welcome from './Welcome.svelte';
  import Body from './Body.svelte';
  import Training from './Training.svelte';
  import Pace from './Pace.svelte';
  import YourPlan from './YourPlan.svelte';
  import Button from '$lib/components/Button.svelte';
  import Check from '@lucide/svelte/icons/check';
  import { prefs } from '$lib/prefs.svelte';
  import { db } from '$lib/db/store.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { keypad } from '$lib/keypad.svelte';
  import { C, V, type Experience, type Goal, type Neat, type Sex } from '$lib/model/engine';
  import { today, yearOf } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { isIOS, isStandalone } from '$lib/platform';
  import { dur, haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import { LIMITS, fresh, progress, step, type Draft, type Screen, type Screening } from './draft';
  import { pulled, settle } from './settle';

  const year = yearOf(today());
  const d = $derived(prefs.draft ?? fresh());
  const signedIn = $derived(db.ready);
  // Safari on iPhone: the home screen app has its own storage, so the guide comes first on every visit until set up
  let install = $state(isIOS() && !isStandalone() && !db.ready);
  let dir = $state<1 | -1>(1);

  function set(patch: Partial<Draft>) {
    prefs.draft = { ...d, ...patch };
  }
  function move(at: Screen, by: 1 | -1) {
    dir = by;
    prefs.draft = { ...(prefs.draft ?? fresh()), at };
    scrollTo({ top: 0 });
  }
  /** Save this screen's answer, then go to the screen the answers lead to. */
  function next(patch: Partial<Draft> = {}) {
    const nd = { ...d, ...patch };
    prefs.draft = nd;
    move(step(nd, year, 1), 1);
  }
  const back = () => move(step(d, year, -1), -1);
  function leave() {
    prefs.draft = null;
    dir = -1;
    ticks = { ...NONE };
    none = false;
  }
  const prog = $derived(progress(d, year));

  function save() {
    haptic();
    set({ saved: true });
    if (pulled()) settle();
    else sheets.signin = true;
  }

  // ----- the single choice questions -----
  const GOALS: { value: Goal; title: string; line: string }[] = [
    { value: 'gain', title: t.goal.gain, line: t.goal.gainLine },
    { value: 'lose', title: t.goal.lose, line: t.goal.loseLine },
    { value: 'maintain', title: t.goal.maintain, line: t.goal.maintainLine },
  ];
  const SEXES: { value: Sex; title: string }[] = [
    { value: 'male', title: t.sex.male },
    { value: 'female', title: t.sex.female },
    { value: 'unspecified', title: t.sex.unspecified },
  ];
  const steps = C.neatSteps.value;
  const NEATS: { value: Neat; title: string; line: string }[] = [
    { value: 'seated', title: t.move.seated, line: t.move.under(num(steps.seated)) },
    { value: 'light', title: t.move.light, line: t.move.between(num(steps.seated), num(steps.light)) },
    { value: 'moving', title: t.move.moving, line: t.move.between(num(steps.light), num(steps.moving)) },
    { value: 'physical', title: t.move.physical, line: t.move.over(num(steps.moving)) },
  ];
  const EXPERIENCE: { value: Experience; title: string }[] = [
    { value: 'beginner', title: t.experience.beginner },
    { value: 'intermediate', title: t.experience.intermediate },
    { value: 'advanced', title: t.experience.advanced },
  ];

  // ----- screening: any tick leads to the advice screen; None of these clears the ticks -----
  const ITEMS: (keyof Screening)[] = ['pregnant', 'medical', 'eatingDisorder'];
  const NONE: Screening = { pregnant: false, medical: false, eatingDisorder: false };
  // local until Continue; a draft from an earlier visit fills them in
  const was = prefs.draft?.screening;
  let ticks = $state<Screening>({ ...NONE, ...was });
  let none = $state(!!was && !ITEMS.some((k) => was[k]));
  const answered = $derived(none || ITEMS.some((k) => ticks[k]));
  function tick(k: keyof Screening) {
    haptic();
    ticks[k] = !ticks[k];
    if (ticks[k]) none = false;
  }
  function tickNone() {
    haptic();
    none = !none;
    if (none) ticks = { ...NONE };
  }

  // ----- birth year -----
  let yearError = $state('');
  async function askYear() {
    yearError = '';
    const v = await keypad.ask({ title: t.born.q, unit: '', value: d.birthYear ?? null });
    if (v === null) return;
    const from = year - LIMITS.oldestAge;
    if (!Number.isInteger(v) || v < from || v > year) return void (yearError = t.born.invalid(String(from), String(year)));
    next({ birthYear: v });
  }
  // a first visit opens the keypad at once
  $effect(() => { if (d.at === 'born' && !d.birthYear) void askYear(); });
</script>

{#snippet cta(disabled: boolean, onclick: () => void)}
  <Button variant="primary" size="lg" full {disabled} {onclick} data-testid="continue">{t.onboarding.continue}</Button>
{/snippet}

{#snippet checkbox(label: string, on: boolean, onclick: () => void, testid: string)}
  <button type="button" role="checkbox" aria-checked={on} class="bg-surface active:bg-surface-2 flex min-h-16 w-full items-center gap-4 rounded-md px-5 py-4 text-left transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.98]" {onclick} data-testid={testid}>
    <span class="grid size-6 flex-none place-items-center rounded-xs transition-colors {on ? 'bg-ink text-canvas' : 'ring-line-strong ring-2 ring-inset'}" aria-hidden="true">
      {#if on}<Check size={18} strokeWidth={2.5} />{/if}
    </span>
    <span class="text-body flex-1">{label}</span>
  </button>
{/snippet}

<div class="bg-canvas relative mx-auto min-h-dvh w-full max-w-[480px] overflow-x-clip" data-onboarding data-testid="onboarding">
  {#if install}
    <Install oncontinue={() => (install = false)} />
  {:else}
    {#key d.at}
      <div in:fly={{ x: 32 * dir, duration: dur(240) }}>
        {#if d.at === 'welcome'}
          <Welcome onstart={() => next()} onsignin={signedIn ? undefined : () => (sheets.signin = true)} />
        {:else if d.at === 'goal'}
          <Step title={t.goal.q} onback={back} progress={prog} testid="step-goal">
            <Choices label={t.goal.q} options={GOALS} value={d.goal} onpick={(goal) => next(goal === d.goal ? {} : { goal, rate: undefined })} />
            {#snippet footer()}{@render cta(!d.goal, () => next())}{/snippet}
          </Step>
        {:else if d.at === 'screening'}
          <Step title={t.screening.q} caption={t.screening.lead} onback={back} progress={prog} testid="step-screening">
            <div class="flex flex-col gap-3" role="group" aria-label={t.screening.q}>
              {#each ITEMS as k (k)}{@render checkbox(t.screening[k], ticks[k], () => tick(k), `screen-${k}`)}{/each}
              {@render checkbox(t.screening.none, none, tickNone, 'screen-none')}
              <p class="text-callout text-ink-2 mt-2">{t.screening.disclaimer}</p>
            </div>
            {#snippet footer()}{@render cta(!answered, () => next({ screening: { ...ticks } }))}{/snippet}
          </Step>
        {:else if d.at === 'advice'}
          {@const ed = !!d.screening?.eatingDisorder}
          <Step title={ed ? t.advice.edTitle : t.advice.title} onback={back} top testid="step-advice">
            <p class="text-body">{ed ? t.advice.edBody : t.advice.body}</p>
            <p class="text-body mt-4">{ed ? t.advice.edOffer : t.advice.offer}</p>
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
            <Choices label={t.sex.q} options={SEXES} value={d.sex} onpick={(sex) => next({ sex })} />
            {#snippet footer()}{@render cta(!d.sex, () => next())}{/snippet}
          </Step>
        {:else if d.at === 'born'}
          <Step title={t.born.q} onback={back} progress={prog} testid="step-born">
            <div class="flex flex-col gap-3">
              <Field label={t.born.field} value={d.birthYear ? String(d.birthYear) : null} onclick={askYear} testid="field-year" />
              <p class="text-callout text-danger min-h-5" role="alert">{yearError}</p>
            </div>
            {#snippet footer()}{@render cta(!d.birthYear, () => next())}{/snippet}
          </Step>
        {:else if d.at === 'young'}
          <Step title={t.young.title} onback={back} top testid="step-young">
            <p class="text-body">{t.young.body(num(V.minAge))}</p>
            {#snippet footer()}
              <Button size="lg" full onclick={leave} data-testid="young-leave">{t.onboarding.leave}</Button>
            {/snippet}
          </Step>
        {:else if d.at === 'body'}
          <Body {d} {set} next={() => next()} {back} progress={prog} />
        {:else if d.at === 'move'}
          <Step title={t.move.q} onback={back} progress={prog} testid="step-move">
            <Choices label={t.move.q} options={NEATS} value={d.neat} onpick={(neat) => next({ neat })} />
            {#snippet footer()}{@render cta(!d.neat, () => next())}{/snippet}
          </Step>
        {:else if d.at === 'train'}
          <Training {d} {next} {back} progress={prog} />
        {:else if d.at === 'experience'}
          <Step title={t.experience.q} onback={back} progress={prog} testid="step-experience">
            <Choices label={t.experience.q} options={EXPERIENCE} value={d.experience} onpick={(experience) => next(experience === d.experience ? {} : { experience, rate: undefined })} />
            {#snippet footer()}{@render cta(!d.experience, () => next())}{/snippet}
          </Step>
        {:else if d.at === 'pace'}
          <Pace {d} {year} {next} {back} progress={prog} />
        {:else if d.at === 'plan'}
          <YourPlan {d} {year} {set} {back} onsave={save} />
        {/if}
      </div>
    {/key}
  {/if}
</div>
