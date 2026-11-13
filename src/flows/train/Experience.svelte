<!-- SCREENS.md section 8, item 6 (M9a): lifting experience, asked in context of someone not gaining whose week lifts.
     Onboarding asks only gaining lifters (O1); for everyone else it sets how much volume Train suggests (S11). A tap
     selects, Save keeps it (Not now leaves it as it is), and the card goes; it is asked once per phone. -->
<script lang="ts">
  import { collapse } from '$lib/haptics';
  import Card from '$lib/components/Card.svelte';
  import CardHead from '$lib/components/CardHead.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Button from '$lib/components/Button.svelte';
  import { t } from '$lib/i18n';
  import { db } from '$lib/db/store.svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { saveSettings } from '$lib/actions';
  import { STRENGTH, type Goal } from '$lib/model/engine';
  import { planFor } from '$lib/model/day';
  import { addDays } from '$lib/model/dates';
  import { view } from '$lib/view.svelte';
  import type { Profile, Session } from '../../../shared/records';

  let { sessions, goal }: { sessions: Session[]; goal: Goal } = $props();
  const profile = $derived(db.get('profile', 'profile'));
  // a gain plan from tomorrow (a Settings edit today) counts as gaining: Settings asks experience for it
  const next = $derived(planFor(db.live('plan'), addDays(view.today, 1))?.goal ?? goal);
  const shown = $derived(!prefs.liftAsked && goal !== 'gain' && next !== 'gain' && !!profile && sessions.some((s) => STRENGTH.has(s.type)));
  let picked = $state<Profile['experience'] | null>(null);
  const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;

  function save() {
    // experience changes no target for lose or maintain (SCIENCE.md section 6), so no plan is written
    if (picked && profile) saveSettings({ ...$state.snapshot(profile), experience: picked });
    prefs.liftAsked = true;
  }
</script>

{#if shown}
  <div in:collapse out:collapse={{ leave: true }}>
  <Card data-testid="train-experience">
    <CardHead title={t.experience.q} line={t.experience.trainLine} />
    <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label={t.experience.q}>
      {#each LEVELS as level (level)}
        <Chip selected={picked === level} onclick={() => (picked = level)}>{t.experience[level]}</Chip>
      {/each}
    </div>
    <div class="mt-3 -mb-2 flex flex-wrap items-center gap-x-2">
      <Button size="sm" disabled={!picked} onclick={save} data-testid="experience-save">{t.experience.save}</Button>
      <Button variant="plain" size="sm" onclick={() => (prefs.liftAsked = true)} data-testid="experience-later">{t.suggest.later}</Button>
    </div>
  </Card>
  </div>
{/if}
