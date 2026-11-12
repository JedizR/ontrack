<!-- SCREENS.md section 7, Meal sheet for a logged meal: the Review layout in edit mode. The name and time, one row per
     item (grams on a stepper, calories, source; open it for portions, macros, Replace and Remove), Add an item, and
     pinned totals with Save changes. Save as a meal and Delete at the end. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { db } from '$lib/db/store.svelte';
  import { deleteMeal, saveAsMeal, saveMeal, undoToast } from '$lib/actions';
  import { mealSource, totals } from '$lib/model/day';
  import { atTime, timeOf } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/i18n';
  import { PORTIONS, lineOf, scaled, type Line } from './items';
  import type { Meal } from '../../../shared/records';

  let id = $state<string | null>(null);
  let meal = $state<Meal | null>(null);
  let title = $state('');
  let time = $state('');
  let lines = $state<Line[]>([]);
  let opened = $state<number | null>(null);

  // the sheet edits a copy; nothing is written until Save changes
  $effect(() => {
    const open = sheets.meal;
    untrack(() => {
      if (!open || open === id) return;
      const m = db.get('meal', open);
      if (!m) return void (sheets.meal = null);
      id = open;
      meal = $state.snapshot(m) as Meal;
      title = m.title;
      time = timeOf(m.at);
      lines = meal.items.map(lineOf);
      opened = null;
    });
  });

  const items = $derived(lines.map(scaled));
  const sum = $derived(totals(items));
  const edited = $derived(meal ? { ...meal, title: title.trim(), at: /^\d\d:\d\d$/.test(time) ? atTime(meal.date, time) : meal.at, items } : null);

  const close = () => { sheets.meal = null; id = null; };
  function save() {
    if (!id || !edited || !items.length) return;
    saveMeal(edited, id);
    close();
    toast(t.toast.changesSaved);
  }
  function keep() {
    if (!edited || !items.length) return;
    saveAsMeal(edited, edited.title || items[0].name);
    toast(t.toast.mealSaved);
  }
  function remove() {
    if (!id) return;
    const undo = deleteMeal(id);
    close();
    undoToast(t.toast.mealDeleted, undo);
  }
  function pick(at: number | null) {
    sheets.pick = (item) => {
      if (at === null) lines.push(lineOf(item));
      else lines[at] = lineOf(item);
    };
    sheets.search = true;
  }
  const grams = (l: Line) => Math.round((l.base.grams ?? 0) * l.factor);
</script>

{#snippet footer()}
  <div class="flex items-center gap-4">
    <p class="text-callout text-ink-2 min-w-0 flex-1 num" data-testid="meal-total">{t.meal.total(num(Math.round(sum.kcal)), num(Math.round(sum.protein)))}</p>
    <Button variant="primary" size="lg" disabled={!items.length} onclick={save} data-testid="meal-save">{t.meal.save}</Button>
  </div>
{/snippet}

<Sheet bind:open={() => sheets.meal !== null, (v) => { if (!v) close(); }} title={title.trim() || items[0]?.name || t.meal.title} layer="base" testid="meal-sheet" {footer}>
  {#if meal}
    <div class="grid grid-cols-[1fr_auto] gap-3">
      <div class="flex min-w-0 flex-col gap-2">
        <label for="meal-title" class="text-caption text-ink-2">{t.meal.name}</label>
        <input id="meal-title" type="text" maxlength="120" enterkeyhint="done" bind:value={title} placeholder={items[0]?.name ?? ''} class="bg-surface-2 placeholder:text-ink-3 h-13 w-full min-w-0 rounded-sm px-4 outline-none focus-visible:outline-2 focus-visible:outline-ink" data-testid="meal-title" />
      </div>
      <div class="flex flex-col gap-2">
        <label for="meal-time" class="text-caption text-ink-2">{t.meal.time}</label>
        <input id="meal-time" type="time" bind:value={time} class="bg-surface-2 num h-13 rounded-sm px-4 outline-none focus-visible:outline-2 focus-visible:outline-ink" data-testid="meal-time" />
      </div>
    </div>

    <div class="mt-4" data-testid="meal-items">
      {#each lines as l, i}
        {@const it = items[i]}
        <div class="border-line border-t py-3 first:border-t-0" data-testid="meal-item">
          <button type="button" class="active:bg-surface-2 -mx-5 flex w-[calc(100%+var(--gutter)*2)] items-start gap-3 px-5 py-1 text-left transition-colors duration-[var(--d-press)]" aria-expanded={opened === i} onclick={() => (opened = opened === i ? null : i)}>
            <span class="min-w-0 flex-1">
              <span class="text-body line-clamp-2 block font-semibold">{it.name}</span>
              <span class="text-caption text-ink-2 block"><SourceLabel source={mealSource([it])} /></span>
            </span>
            <span class="text-body num flex-none font-semibold">{num(it.kcal)}</span>
          </button>
          {#if l.base.grams}
            <div class="mt-2">
              <Stepper bind:value={() => grams(l), (g) => (l.factor = g / l.base.grams!)} step={10} min={10} max={5000} unit={t.after.g} label={t.meal.grams} />
            </div>
          {/if}
          {#if opened === i}
            <div class="mt-3 flex flex-col gap-3" data-testid="meal-item-open">
              <div class="-mx-5 flex gap-2 overflow-x-auto px-5" role="group">
                {#each PORTIONS as [key, factor] (key)}
                  <Chip selected={l.factor === factor} onclick={() => (l.factor = factor)}>{t.meal.portions[key]}</Chip>
                {/each}
              </div>
              <p class="text-caption text-ink-2">{t.search.macros(num(it.protein, 1), num(it.carbs, 1), num(it.fat, 1))}</p>
              <div class="flex gap-2">
                <Button size="sm" onclick={() => pick(i)}>{t.meal.replace}</Button>
                <Button variant="danger" size="sm" onclick={() => { lines.splice(i, 1); opened = null; }} data-testid="item-remove">{t.meal.remove}</Button>
              </div>
            </div>
          {/if}
        </div>
      {:else}
        <p class="text-callout text-ink-2" data-testid="meal-empty">{t.meal.empty}</p>
      {/each}
    </div>
    <Button variant="plain" class="-ml-5 mt-1" onclick={() => pick(null)} data-testid="meal-add-item">{t.meal.addItem}</Button>

    <div class="border-line mt-4 flex flex-wrap gap-2 border-t pt-4">
      <Button disabled={!items.length} onclick={keep} data-testid="meal-keep">{t.meal.saveAs}</Button>
      <Button variant="danger" onclick={remove} data-testid="meal-delete">{t.meal.delete}</Button>
    </div>
  {/if}
</Sheet>
