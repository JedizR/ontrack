<!-- SCREENS.md section 8, Templates: each program with its days a week, who it suits and the muscle balance it
     produces. "Use this program" replaces the current one after a confirm; the targets follow from tomorrow. -->
<script lang="ts">
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import { changeProgram, undoToast } from '$lib/actions';
  import { TEMPLATES, type Template } from '$lib/data/templates';
  import { LIBRARY } from '$lib/data/exercises';
  import { MUSCLES, V, analyseProgram, type Experience, type Goal } from '$lib/model/engine';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';

  let { open = $bindable(), goal, experience }: { open: boolean; goal: Goal; experience: Experience } = $props();
  let confirm = $state<Template | null>(null);

  const inRange = (tpl: Template) => {
    const a = analyseProgram(tpl.sessions, { goal, experience, library: LIBRARY });
    return MUSCLES.filter((m) => a.muscles[m].band === 'inRange').length;
  };
  function use() {
    if (!confirm) return;
    undoToast(t.train.saved, changeProgram({ name: confirm.name, sessions: $state.snapshot(confirm.sessions) }));
    confirm = null;
    open = false;
  }
</script>

<Sheet bind:open title={t.train.templates} layer="base" testid="templates-sheet">
  <div class="flex flex-col gap-3">
  {#each TEMPLATES as tpl (tpl.id)}
    <div class="bg-surface-2 rounded-lg p-6" data-testid="template-{tpl.id}">
      <h3 class="text-body font-semibold">{tpl.name}</h3>
      <p class="text-caption text-ink-2">{t.train.perWeek(num(tpl.daysPerWeek))}</p>
      <p class="text-caption text-ink-2">{t.train.suits[tpl.id]}</p>
      <p class="text-caption text-ink-2">{t.train.balanceOf(num(inRange(tpl)), num(MUSCLES.length), num(V.setsRange), num(V.setsHigh))}</p>
      <Button variant="plain" size="sm" class="mt-1 -ml-4" onclick={() => (confirm = tpl)} data-testid="template-use">{t.train.use}</Button>
    </div>
  {/each}
  </div>
</Sheet>

{#snippet footer()}
  <Button variant="primary" size="lg" full onclick={use} data-testid="template-confirm">{t.train.use}</Button>
{/snippet}
<Sheet bind:open={() => confirm !== null, (v) => { if (!v) confirm = null; }} title={t.train.useTitle} layer="nested" testid="template-confirm-sheet" {footer}>
  <p class="text-body">{t.train.useBody(confirm?.name ?? '')}</p>
</Sheet>
