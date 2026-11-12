<!-- SCREENS.md section 7, Add sheet from the plus button: the ways to log, then Recent and Saved, each with a plus that
     logs the meal again at once with an undo toast. Photo and Describe arrive with photo logging (M6). -->
<script lang="ts">
  import type { Component } from 'svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Hash from '@lucide/svelte/icons/hash';
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { deleteMeal, logAgain, logSaved, undoToast } from '$lib/actions';
  import { recentMeals, totals } from '$lib/model/day';
  import { stampOn } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import type { Meal, MealItem } from '../../../shared/records';

  const recent = $derived(recentMeals(db.live('meal')));
  const saved = $derived(db.live('saved').sort((a, b) => b.data.uses - a.data.uses || b.data.lastUsedAt.localeCompare(a.data.lastUsedAt)));
  const kcalOf = (items: MealItem[]) => num(Math.round(totals(items).kcal));
  const titleOf = (title: string, items: MealItem[]) => title || items[0]?.name || t.source.manual;

  function logged(undo: (() => void) | null, title: string) {
    if (!undo) return;
    haptic();
    sheets.add = false;
    undoToast(t.add.logged(title), undo);
  }
  function relog(m: Meal) {
    const id = logAgain(m, view.date, stampOn(view.date));
    return () => { deleteMeal(id); };
  }
  const go = (to: 'search' | 'quick') => {
    sheets.add = false;
    sheets[to] = true;
  };
  const WAYS: { key: 'search' | 'quick'; label: string; line: string; icon: Component<{ size?: number; strokeWidth?: number }> }[] = [
    { key: 'search', label: t.add.search, line: t.add.searchLine, icon: SearchIcon },
    { key: 'quick', label: t.add.quick, line: t.add.quickLine, icon: Hash },
  ];
</script>

{#snippet again(label: string, onclick: () => void)}
  <button type="button" class="group -mr-1 grid size-11 flex-none place-items-center" aria-label={label} {onclick} data-testid="again">
    <span class="bg-surface-2 group-active:bg-surface-3 grid size-9 place-items-center rounded-full transition-[transform,background-color] duration-[var(--d-press)] group-active:scale-[0.97]">
      <Plus size={24} strokeWidth={1.75} />
    </span>
  </button>
{/snippet}

<Sheet bind:open={sheets.add} title={t.add.title} layer="base" testid="add-sheet">
  <div class="grid grid-cols-2 gap-3">
    {#each WAYS as w (w.key)}
      {@const Icon = w.icon}
      <button type="button" class="bg-surface-2 active:bg-surface-3 flex min-h-24 flex-col items-start gap-2 rounded-md p-4 text-left transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.97]" onclick={() => go(w.key)} data-testid="add-{w.key}">
        <Icon size={24} strokeWidth={1.75} />
        <span>
          <span class="text-body block font-semibold">{w.label}</span>
          <span class="text-caption text-ink-2 block">{w.line}</span>
        </span>
      </button>
    {/each}
  </div>

  <h3 class="text-heading mt-6">{t.add.recent}</h3>
  {#if recent.length}
    <div data-testid="recent">
      {#each recent as { id, data: m } (id)}
        {@const title = titleOf(m.title, m.items)}
        <Row {title} value={kcalOf(m.items)}>
          {#snippet trailing()}{@render again(t.add.again(title), () => logged(relog(m), title))}{/snippet}
        </Row>
      {/each}
    </div>
  {:else}
    <p class="text-callout text-ink-2 mt-2" data-testid="recent-empty">{t.add.noRecent}</p>
  {/if}

  {#if saved.length}
    <h3 class="text-heading mt-6">{t.add.saved}</h3>
    <div data-testid="saved">
      {#each saved as { id, data: s } (id)}
        <Row title={s.title} value={kcalOf(s.items)}>
          {#snippet trailing()}{@render again(t.add.again(s.title), () => logged(logSaved(id, view.date, stampOn(view.date)), s.title))}{/snippet}
        </Row>
      {/each}
    </div>
  {/if}
</Sheet>
