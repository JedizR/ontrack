<!-- R5, the owner: change the goal from Progress and Profile, not only Settings (Future Pro's Change goal, MacroFactor's
     live target): the goal, its pace and goal weight, and the target it gives from tomorrow, saved together. -->
<script lang="ts">
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import PlanPage from '../../settings/PlanPage.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { t } from '$lib/i18n';

  let page = $state<PlanPage | null>(null);
</script>

{#snippet footer()}
  {#if page}<Button variant="primary" size="lg" full disabled={!page.ready()} onclick={() => page?.save()} data-testid="goal-save">{page.label()}</Button>{/if}
{/snippet}

<Sheet bind:open={sheets.goal} title={t.goalSheet.title} {footer} testid="goal-sheet">
  <p class="text-callout text-ink-2 mb-4">{t.goalSheet.lead}</p>
  <!-- a fresh copy of the plan each time it opens -->
  {#if sheets.goal}<PlanPage bind:this={page} mode="goal" done={() => (sheets.goal = false)} />{/if}
</Sheet>
