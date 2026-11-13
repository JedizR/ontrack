<!-- SCREENS.md section 11, Settings' Profile and Goal and pace pages: the edits, then the target they give from tomorrow,
     before anything is saved. The sheet pins `label()` as its action and calls `save()`. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import Row from '$lib/components/Row.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Options from './Options.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';
  import { db } from '$lib/db/store.svelte';
  import { view } from '$lib/view.svelte';
  import { picker } from '$lib/picker.svelte';
  import { saveSettings } from '$lib/actions';
  import { bmi, defaultPace, V, type Goal } from '$lib/model/engine';
  import { kgPerWeek, planFor } from '$lib/model/day';
  import { addDays, yearOf } from '$lib/model/dates';
  import { ftInToCm, heightText, weightText } from '$lib/model/units';
  import { goalsFor, moves, nextPlan, pacesFor, targetsOf } from '$lib/model/replan';
  import { LIMITS } from '../flows/onboarding/draft';
  import type { Profile } from '../../shared/records';

  let { mode, done }: { mode: 'profile' | 'goal'; done: () => void } = $props();

  // the page edits a copy taken when it opens
  const was = untrack(() => JSON.parse(JSON.stringify(db.get('profile', 'profile'))) as Profile);
  const from = addDays(view.today, 1);
  const base = untrack(() => planFor(db.live('plan'), from)!);
  const year = yearOf(view.today);
  const latest = untrack(() => db.live('weight').map((r) => r.data).filter((w) => w.date <= view.today).sort((a, b) => a.date.localeCompare(b.date)).at(-1)?.kg ?? base.weightKg);
  const sessions = untrack(() => db.get('program', 'program')?.sessions ?? []);

  let draft = $state<Profile>(JSON.parse(JSON.stringify(was)));
  let goal = $state<Goal>(base.goal);
  let rate = $state(base.ratePctPerWeek);

  const next = $derived(nextPlan(base, was, { profile: draft, goal, rate }, { weightKg: latest, sessions, year, from }));
  // only what the user changed counts: a plan from an older engine version is not news on its own
  const changed = $derived(goal !== base.goal || rate !== base.ratePctPerWeek || JSON.stringify(draft) !== JSON.stringify(was));
  const moved = $derived(changed && moves(base, next));
  const targets = $derived(targetsOf(next, draft.sex, draft.calorieMode));
  const maintainOnly = base.flags.includes('maintainOnly');
  // goal and pace are judged at the plan's weight, the weight the plan's own pace was offered at
  const goals = goalsFor(was.heightCm, base.weightKg);
  const paces = $derived(pacesFor(goal, draft, base.weightKg, { goal: base.goal, rate: base.ratePctPerWeek }));
  const kg = $derived(kgPerWeek(next, draft.sex, draft.calorieMode));

  function pickGoal(g: Goal) {
    goal = g;
    rate = g === base.goal ? base.ratePctPerWeek : (defaultPace(g, bmi(base.weightKg, draft.heightCm), draft.experience)?.rate ?? 0);
  }
  const edit = (c: Partial<Profile>) => { draft = { ...draft, ...c }; };

  export const label = () => (!changed || moved ? t.settings.useTarget : t.settings.saveChanges);
  export const ready = () => changed;
  export function save() {
    if (!changed) return;
    const { bodyFatPct, ...rest } = draft;
    saveSettings({ ...rest, ...(bodyFatPct ? { bodyFatPct } : {}) }, moved ? next : undefined);
    toast(moved ? t.settings.saved : t.settings.savedOnly);
    done();
  }

  async function askYear() {
    const v = await picker.ask({ title: t.settings.birthYear, value: draft.birthYear, min: year - LIMITS.oldestAge, max: year - V.minAge, unit: '' });
    if (v && v !== draft.birthYear) edit({ birthYear: v });
  }
  async function askHeight() {
    const metric = draft.units === 'metric';
    // shortcut: imperial height is one wheel of inches here, not onboarding's feet and inches pair; good enough to correct a height
    const inch = ftInToCm(0, 1);
    const [lo, hi] = LIMITS.heightCm;
    const start = metric ? Math.round(draft.heightCm) : Math.round(draft.heightCm / inch);
    const v = await picker.ask({
      title: t.settings.height,
      value: start,
      min: metric ? lo : Math.ceil(lo / inch),
      max: metric ? hi : Math.floor(hi / inch),
      unit: metric ? t.after.cm : t.after.in,
      hint: metric ? undefined : heightText(draft.heightCm, 'imperial'),
    });
    if (v && v !== start) edit({ heightCm: metric ? v : Math.round(v * inch * 10) / 10 }); // Save on an unchanged wheel keeps the exact height
  }
  async function askBodyFat() {
    const r = V.bodyFatRange;
    const v = await picker.ask({ title: t.plan.bodyFat, value: draft.bodyFatPct ?? 20, min: r.min, max: r.max, unit: t.after.percent, hint: t.plan.bodyFatHint, clearable: true });
    if (v !== null) edit({ bodyFatPct: v || undefined });
  }

  const steps = V.neatSteps;
  const MOVES = [
    { value: 'seated', label: t.move.seated, caption: t.move.under(num(steps.seated)) },
    { value: 'light', label: t.move.light, caption: t.move.between(num(steps.seated), num(steps.light)) },
    { value: 'moving', label: t.move.moving, caption: t.move.between(num(steps.light), num(steps.moving)) },
    { value: 'physical', label: t.move.physical, caption: t.move.over(num(steps.moving)) },
  ] as const;
  const GOALS = { lose: [t.goal.lose, t.goal.loseLine], maintain: [t.goal.maintain, t.goal.maintainLine], gain: [t.goal.gain, t.goal.gainLine] } as const;
</script>

{#snippet heading(text: string)}
  <h3 class="text-eyebrow text-ink-2 mt-6 mb-1 first:mt-0">{text}</h3>
{/snippet}

<div class="flex flex-col" data-testid="plan-page">
  {#if mode === 'profile'}
    {@render heading(t.settings.sex)}
    <Options label={t.settings.sex} value={draft.sex} onchange={(v) => edit({ sex: v })} testid="set-sex"
      options={[{ value: 'male', label: t.sex.male }, { value: 'female', label: t.sex.female }, { value: 'unspecified', label: t.sex.unspecified, caption: t.sex.unspecifiedLine }]} />
    <div class="mt-4">
      <Row title={t.settings.birthYear} value={String(draft.birthYear)} onclick={askYear} testid="set-born" />
      <Row title={t.settings.height} value={heightText(draft.heightCm, draft.units)} onclick={askHeight} testid="set-height" />
      <Row title={t.plan.bodyFat} caption={t.plan.bodyFatHint} value={draft.bodyFatPct ? `${num(draft.bodyFatPct)}${t.after.percent}` : t.plan.noneYet} onclick={askBodyFat} testid="set-bodyfat" />
    </div>
    {@render heading(t.settings.movement)}
    <Options label={t.settings.movement} value={draft.neat} onchange={(v) => edit({ neat: v })} options={[...MOVES]} testid="set-move" />
    {@render heading(t.settings.experience)}
    <Options label={t.settings.experience} value={draft.experience} onchange={(v) => edit({ experience: v })} testid="set-experience"
      options={[{ value: 'beginner', label: t.experience.beginner }, { value: 'intermediate', label: t.experience.intermediate }, { value: 'advanced', label: t.experience.advanced }]} />
  {:else if maintainOnly}
    <p class="text-body" data-testid="set-maintain-only">{t.settings.maintainOnly}</p>
  {:else}
    {@render heading(t.settings.goal)}
    <Options label={t.settings.goal} value={goal} onchange={pickGoal} testid="set-goal"
      options={goals.map((g) => ({ value: g, label: GOALS[g][0], caption: GOALS[g][1] }))} />
    {#if paces.length}
      {@render heading(t.pace.q)}
      <div data-testid="set-pace">
        <Segmented label={t.pace.q} value={rate} onchange={(v) => (rate = v)} options={paces.map((p) => ({ value: p.rate, label: t.pace[p.name] }))} />
      </div>
      <p class="text-callout text-ink-2 mt-2" data-testid="set-pace-line">{t.settings.paceLine(weightText(kg, draft.units))}</p>
      {#if goal === 'gain' && rate >= V.gainPaceFaster}
        <p class="text-callout text-ink-2 mt-1">{t.pace.fasterGain}</p>
        <p class="text-caption text-ink-2 mt-1" data-testid="set-provisional">{t.plan.provisional}</p>
      {/if}
    {/if}
  {/if}

  <!-- the payoff before saving: the target this gives, from tomorrow -->
  <div class="bg-surface-2 mt-6 rounded-md px-4 py-3" data-testid="set-target" aria-live="polite">
    {#if moved}
      <p class="text-caption text-ink-2">{t.settings.newTarget}</p>
      {#if targets.every !== undefined}
        <p class="text-body num font-semibold">{t.settings.targetEvery(num(targets.every))}</p>
      {:else}
        <p class="text-body num font-semibold">{t.settings.targetTraining(num(targets.training))}</p>
        <p class="text-callout num text-ink-2">{t.plan.onRest(num(targets.rest))}</p>
      {/if}
    {:else}
      <p class="text-callout text-ink-2">{t.settings.targetSame}</p>
    {/if}
  </div>
</div>
