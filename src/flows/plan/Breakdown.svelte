<!-- How a day target was calculated: resting energy, daily movement, training, the goal adjustment and any lift to the
     floor, summing exactly to the target (targetParts). Each line opens its sources and their status. Rows only: the
     caller puts them on a card or a sheet. The faster gain pace (F19) cites its own source, Being checked. -->
<script lang="ts">
  import Row from '$lib/components/Row.svelte';
  import { C, V, type Goal } from '$lib/model/engine';
  import type { targetParts } from '$lib/model/day';
  import { num } from '$lib/model/format';
  import { SOURCES } from '$lib/data/sources';
  import { t } from '$lib/i18n';

  let { parts, goal, rate, bodyFat }: {
    parts: ReturnType<typeof targetParts>;
    goal: Goal;
    /** the plan's pace, percent a week */
    rate: number;
    /** resting energy from lean mass */
    bodyFat: boolean;
  } = $props();
  const pace = $derived(goal === 'lose' ? C.losePace : rate >= V.gainPaceFaster ? C.gainPaceFaster : C.gainPace);

  // each line names the constants behind it, so it can show their sources and status
  type Basis = { source: keyof typeof SOURCES; status: string };
  const lines = $derived(
    [
      { key: 'bmr', label: t.plan.bmr, value: parts.bmr, basis: [bodyFat ? C.cunningham : C.mifflin] },
      { key: 'movement', label: t.plan.movement, value: parts.movement, basis: [C.neat] },
      { key: 'training', label: t.plan.training, value: parts.training, basis: [C.metStrength] },
      { key: 'goal', label: t.plan.goal, value: parts.goal, basis: [pace, C.kcalPerKg] },
      { key: 'floor', label: t.plan.floorLift, value: parts.floorLift, basis: [C.floor] },
    ].filter((l, i) => i < 2 || l.value !== 0) as { key: string; label: string; value: number; basis: Basis[] }[],
  );
  let opened = $state<string | null>(null);
  const kcal = (v: string) => `${v} ${t.after.kcal}`;
  const signed = (v: number, first: boolean) => kcal(first || v < 0 ? num(v) : `+${num(v)}`);
</script>

{#each lines as l, i (l.key)}
  <Row title={l.label} value={signed(l.value, i === 0)} onclick={() => (opened = opened === l.key ? null : l.key)} testid="line-{l.key}">
    <!-- one line closed (the first source), every citation and its status open -->
    {#snippet caption()}
      {#if opened === l.key}
        {#each l.basis as b (b.source)}<span class="mt-1 block">{SOURCES[b.source]?.cite}</span>{/each}
        {#if l.basis.some((b) => b.status === 'assumption')}<span class="mt-1 block">{t.plan.assumption}</span>{/if}
        {#if l.basis.some((b) => b.status === 'provisional')}<span class="mt-1 block" data-testid="provisional">{t.plan.provisional}</span>{/if}
      {:else}
        <span class="block">{SOURCES[l.basis[0].source]?.short}</span>
      {/if}
    {/snippet}
  </Row>
{/each}
<Row title={t.plan.total} value={kcal(num(parts.total))} testid="line-total" />
