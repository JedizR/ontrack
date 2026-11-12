<!-- SCREENS.md section 6: tapping the hero opens how the day's target was calculated, the same breakdown as Your plan,
     for the day on screen (training, rest or skipped, or every day in even mode). -->
<script lang="ts">
  import Sheet from '$lib/components/Sheet.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { V } from '$lib/model/engine';
  import { dayView, planFor, targetParts } from '$lib/model/day';
  import { t } from '$lib/i18n';
  import Breakdown from '../plan/Breakdown.svelte';

  const profile = $derived(db.get('profile', 'profile'));
  const plan = $derived(planFor(db.live('plan'), view.date));
  const day = $derived(
    plan && profile
      ? dayView({ plan, sex: profile.sex, mode: profile.calorieMode, date: view.date, sessions: db.get('program', 'program')?.sessions ?? [], logs: db.live('slog').map((r) => r.data), meals: [] })
      : null,
  );
  const bodyFat = $derived(profile?.bodyFatPct != null && profile.bodyFatPct >= V.bodyFatRange.min && profile.bodyFatPct <= V.bodyFatRange.max);
</script>

<Sheet bind:open={sheets.how} title={t.plan.how} layer="base" testid="how-sheet">
  {#if plan && profile && day}
    <p class="text-callout text-ink-2">{profile.calorieMode === 'even' ? t.plan.howEven : day.training ? t.plan.howTraining : t.plan.howRest}</p>
    <div class="mt-2"><Breakdown parts={targetParts(plan, profile.sex, day.eee)} goal={plan.goal} rate={plan.ratePctPerWeek} {bodyFat} /></div>
  {/if}
</Sheet>
