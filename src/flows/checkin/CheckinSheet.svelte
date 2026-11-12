<!-- SCREENS.md section 10, Check-in: three steps in one sheet, each with one Next. The last three weeks in plain
     numbers, what they mean in one sentence (with the measured maintenance when there is one), then the proposal: a
     raise or a lower offers Use the new target and Keep my current target; any other outcome ends on Done. A stored
     check-in opens the same steps and ends on what was decided. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Row from '$lib/components/Row.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { db } from '$lib/db/store.svelte';
  import { decideCheckin } from '$lib/actions';
  import { accountOf } from '$lib/model/progress';
  import { checkin, effectiveRate, roundTarget, type CheckinResult, type PlanNumbers } from '$lib/model/engine';
  import { evenEee, planFor, targetWith, trainingDayEee } from '$lib/model/day';
  import { addDays } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import { ids, type Checkin } from '../../../shared/records';

  // what the sheet shows is read once as it opens, so a sync arriving mid-way cannot change the numbers under the user
  let shown = $state<{ date: string; result: CheckinResult; stored?: Checkin } | null>(null);
  let step = $state(0);
  $effect(() => {
    const date = sheets.checkin;
    if (!date) return;
    untrack(() => {
      const stored = db.get('checkin', ids.checkin(date));
      const input = stored ? null : accountOf(db)?.checkinInput(date);
      const result = stored ? { stats: stored.stats, proposal: stored.proposal } : input ? checkin(input) : null;
      if (!result) return void (sheets.checkin = null);
      shown = { date, result, stored: stored ? $state.snapshot(stored) : undefined };
      step = 0;
    });
  });

  const profile = $derived(db.get('profile', 'profile'));
  const plans = $derived(db.live('plan'));
  // the plan the check-in would replace: the one in effect the next day
  const current = $derived(shown ? planFor(plans, addDays(shown.date, 1)) : null);
  const goal = $derived(current?.goal ?? 'gain');
  const s = $derived(shown?.result.stats);
  const reason = $derived(shown?.result.proposal.reason);
  const change = $derived(shown?.result.proposal.kcalChange ?? 0);
  const proposed = $derived(shown?.result.plan ?? (shown?.stored?.planId ? db.get('plan', shown.stored.planId) : undefined));
  const deciding = $derived(!!shown && !shown.stored && (reason === 'raise' || reason === 'lower'));

  const targetRate = $derived(current && profile ? (goal === 'maintain' ? 0 : effectiveRate(current, profile.sex) * (goal === 'lose' ? -1 : 1)) : 0);
  const sentence = $derived.by(() => {
    if (!s || !reason) return '';
    if (reason === 'need_data') return t.checkin.needData;
    if (reason === 'on_track') return t.checkin.onTrack[goal];
    if (reason === 'adherence') {
      const gap = num(roundTarget(Math.abs(s.meanTarget - (s.meanIntake ?? 0))));
      return goal === 'lose' ? t.checkin.adherenceOver(gap) : t.checkin.adherenceUnder(gap);
    }
    const pace = t.checkin.pace[goal][reason];
    return s.tdeeObserved == null ? `${pace}. ${t.checkin.rateOnly}` : `${pace} ${t.checkin.cause[reason]}`;
  });

  /** A plan's targets as Your plan shows them: training and rest days in matched mode with training, else one. */
  function figures(p: PlanNumbers) {
    const sex = profile?.sex ?? 'unspecified';
    const train = trainingDayEee(p);
    const matched = profile?.calorieMode !== 'even' && train > 0;
    return matched ? { main: targetWith(p, sex, train), caption: t.after.kcalTraining, rest: targetWith(p, sex, 0) } : { main: targetWith(p, sex, evenEee(p)), caption: t.after.kcalDay, rest: null };
  }
  const shownPlan = $derived(shown?.stored?.decision === 'kept' ? current : (proposed ?? current));
  const f = $derived(shownPlan ? figures(shownPlan) : null);
  const lead = $derived(
    !shown ? ''
    : shown.stored?.decision === 'accepted' ? t.checkin.tookIt
    : shown.stored?.decision === 'kept' ? t.checkin.keptIt
    : reason === 'raise' ? t.checkin.raiseTo
    : reason === 'lower' ? t.checkin.lowerTo
    : t.checkin.stays,
  );

  const close = () => (sheets.checkin = null);
  function decide(decision?: 'accepted' | 'kept') {
    if (shown && !shown.stored) {
      decideCheckin(shown.date, shown.result, decision);
      if (decision === 'accepted') toast(t.checkin.accepted);
    }
    close();
  }
</script>

<Sheet
  bind:open={() => sheets.checkin !== null, (v) => { if (!v) close(); }}
  title={t.checkin.title}
  layer="base"
  testid="checkin-sheet"
  onback={step > 0 ? () => step-- : undefined}
  backLabel={t.checkin.steps[step - 1]}
>
  {#if shown && s}
    <p class="text-callout text-ink-2" data-testid="checkin-step">{t.checkin.steps[step]}</p>
    {#if step === 0}
      <div class="mt-3 flex items-end gap-10">
        <div>
          {#if s.ratePctPerWeek != null}
            <p class="text-display" data-testid="checkin-rate">{num(s.ratePctPerWeek, 1)}</p>
            <p class="text-caption text-ink-2 mt-1">{t.after.percentWeek}</p>
          {:else}
            <p class="text-lead" data-testid="checkin-rate">{t.checkin.noRate}</p>
          {/if}
        </div>
        <p class="text-body text-ink-2 pb-0.5" data-testid="checkin-target-rate">{t.checkin.target(num(targetRate, 1))}</p>
      </div>
      <div class="mt-4">
        <Row title={t.checkin.intake} caption={t.checkin.target(num(Math.round(s.meanTarget)))} value={s.meanIntake == null ? t.plan.noneYet : `${num(Math.round(s.meanIntake))} ${t.after.kcal}`} testid="checkin-intake" />
        <Row title={t.checkin.days} value={t.checkin.of(num(s.completeDays), num(s.days))} testid="checkin-days" />
        <Row title={t.checkin.weighIns} value={num(s.weighIns)} testid="checkin-weighins" />
      </div>
    {:else if step === 1}
      <p class="text-lead mt-3" data-testid="checkin-sentence">{sentence}</p>
      {#if s.tdeeObserved != null}
        <div class="border-line mt-5 border-t pt-5">
          <p class="text-display" data-testid="checkin-maintenance">{num(roundTarget(s.tdeeObserved))}</p>
          <p class="text-caption text-ink-2 mt-1">{t.after.measured}</p>
        </div>
      {/if}
    {:else if f}
      <p class="text-lead mt-3">{lead}</p>
      <p class="text-display mt-2" data-testid="checkin-proposal">{num(f.main)}</p>
      <p class="text-caption text-ink-2 mt-1">{f.caption}</p>
      {#if f.rest != null}<p class="text-lead num mt-3" data-testid="checkin-rest">{t.plan.onRest(num(f.rest))}</p>{/if}
      {#if deciding}
        <p class="text-callout text-ink-2 mt-4" data-testid="checkin-change">{change > 0 ? t.checkin.up(num(change)) : t.checkin.down(num(-change))}</p>
      {/if}
    {/if}
  {/if}

  {#snippet footer()}
    {#if step < 2}
      <Button variant="primary" size="lg" full onclick={() => step++} data-testid="checkin-next">{t.checkin.next}</Button>
    {:else if deciding}
      <div class="flex flex-col gap-1">
        <Button variant="primary" size="lg" full onclick={() => decide('accepted')} data-testid="checkin-use">{t.checkin.use}</Button>
        <Button variant="plain" size="md" full onclick={() => decide('kept')} data-testid="checkin-keep">{t.checkin.keep}</Button>
      </div>
    {:else}
      <Button variant="primary" size="lg" full onclick={() => decide()} data-testid="checkin-done">{t.checkin.done}</Button>
    {/if}
  {/snippet}
</Sheet>
