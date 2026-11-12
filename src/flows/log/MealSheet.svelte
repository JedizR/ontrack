<!-- SCREENS.md section 7, Meal sheet for a logged meal: the Review layout in edit mode. The name and time, one row per
     item (grams on a stepper, calories, source; open it for portions, macros, Replace and Remove), Add an item, and
     pinned totals with Save changes. Save as a meal and Delete at the end. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { db } from '$lib/db/store.svelte';
  import { deleteMeal, rememberFoods, saveAsMeal, saveMeal, shareMeal, undoToast, unshareMeal } from '$lib/actions';
  import type { Position } from '$lib/geo';
  import { totals } from '$lib/model/day';
  import { atTime, timeOf } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/i18n';
  import ItemList from './ItemList.svelte';
  import Thumb from './Thumb.svelte';
  import ShareToMap from './ShareToMap.svelte';
  import { lineOf, scaled, type Line } from './items';
  import type { Meal } from '../../../shared/records';

  let id = $state<string | null>(null);
  let meal = $state<Meal | null>(null);
  let title = $state('');
  let time = $state('');
  let lines = $state<Line[]>([]);

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
    });
  });

  const items = $derived(lines.map(scaled));
  const sum = $derived(totals(items));
  const edited = $derived(meal ? { ...meal, title: title.trim(), at: /^\d\d:\d\d$/.test(time) ? atTime(meal.date, time) : meal.at, items } : null);

  const close = () => { sheets.meal = null; id = null; };
  function save() {
    if (!id || !edited || !items.length) return;
    saveMeal(edited, id);
    rememberFoods(lines.filter((l) => l.corrected).map(scaled));
    close();
    toast(t.toast.changesSaved);
  }
  function keep() {
    if (!edited || !items.length) return;
    saveAsMeal(edited, edited.title || items[0].name);
    toast(t.toast.mealSaved);
  }
  // on the map or off it at once, not on Save changes; the sheet's copy follows so Save changes keeps it (S1b)
  function place(p: Position | null) {
    if (!id || !meal) return;
    if (p) {
      if (!shareMeal(id, p)) return;
      meal.share = db.get('meal', id)?.share;
      toast(t.social.shared);
    } else {
      unshareMeal(id);
      delete meal.share;
      toast(t.social.unshared);
    }
  }
  function remove() {
    if (!id) return;
    const undo = deleteMeal(id);
    close();
    undoToast(t.toast.mealDeleted, undo);
  }
</script>

{#snippet footer()}
  <div class="flex items-center gap-4">
    <p class="text-body num min-w-0 flex-1 font-semibold" data-testid="meal-total">{t.meal.total(num(Math.round(sum.kcal)), num(Math.round(sum.protein)))}</p>
    <Button variant="primary" size="lg" disabled={!items.length} onclick={save} data-testid="meal-save">{t.meal.save}</Button>
  </div>
{/snippet}

<Sheet bind:open={() => sheets.meal !== null, (v) => { if (!v) close(); }} title={title.trim() || items[0]?.name || t.meal.title} layer="base" testid="meal-sheet" {footer}>
  {#if meal}
    {#if meal.thumb && id}<Thumb {id} class="mb-4 aspect-[4/3] w-full rounded-lg" />{/if}
    <div class="grid grid-cols-[1fr_auto] gap-3">
      <div class="flex min-w-0 flex-col gap-2">
        <label for="meal-title" class="text-caption text-ink-2">{t.meal.name}</label>
        <input id="meal-title" type="text" maxlength="120" enterkeyhint="done" bind:value={title} placeholder={items[0]?.name ?? ''} class="input-field w-full min-w-0" data-testid="meal-title" />
      </div>
      <div class="flex flex-col gap-2">
        <label for="meal-time" class="text-caption text-ink-2">{t.meal.time}</label>
        <input id="meal-time" type="time" bind:value={time} class="input-field num" data-testid="meal-time" />
      </div>
    </div>

    <ItemList bind:lines empty={t.meal.empty} />

    {#if meal.thumb}
      {#key id}<ShareToMap checked={!!meal.share} title={t.social.onMap} line={t.social.loggedLine} onplace={place} testid="meal-share" />{/key}
    {/if}

    <div class="border-line mt-4 flex flex-wrap gap-2 border-t pt-4">
      <Button disabled={!items.length} onclick={keep} data-testid="meal-keep">{t.meal.saveAs}</Button>
      <Button variant="danger" onclick={remove} data-testid="meal-delete">{t.meal.delete}</Button>
    </div>
  {/if}
</Sheet>
