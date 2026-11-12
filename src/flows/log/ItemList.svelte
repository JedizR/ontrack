<!-- The Review layout's items (SCREENS.md section 7), shared by the Review and Meal sheets: one row per item with grams
     on a stepper, calories and source; open it for portions, macros, Replace and Remove. Then `children` (the Review
     sheet's oil control) and Add an item. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { mealSource } from '$lib/model/day';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import { PORTIONS, lineOf, scaled, type Line } from './items';

  let { lines = $bindable(), empty, max = 30, children }: {
    lines: Line[];
    empty: string;
    /** the record schema takes 30 items; less when something else adds one */
    max?: number;
    children?: Snippet;
  } = $props();
  let opened = $state<number | null>(null);
  const items = $derived(lines.map(scaled));

  function pick(at: number | null) {
    sheets.pick = (item) => {
      if (at === null) lines.push(lineOf(item));
      else lines[at] = lineOf(item);
    };
    sheets.search = true;
  }
  const grams = (l: Line) => Math.round((l.base.grams ?? 0) * l.factor);
</script>

<div class="mt-4" data-testid="meal-items">
  {#each lines as l, i}
    {@const it = items[i]}
    <div class="border-line border-t py-3 first:border-t-0" data-testid="meal-item">
      <button type="button" class="active:bg-surface-2 -mx-6 flex w-[calc(100%+var(--inset)*2)] items-start gap-3 px-6 py-1 text-left transition-colors duration-[var(--d-press)]" aria-expanded={opened === i} onclick={() => (opened = opened === i ? null : i)}>
        <span class="min-w-0 flex-1">
          <span class="text-body line-clamp-2 block font-semibold">{it.name}</span>
          <span class="text-caption text-ink-2 block"><SourceLabel source={mealSource([it])} /></span>
        </span>
        <span class="text-body num flex-none font-semibold">{num(it.kcal)}</span>
      </button>
      {#if l.base.grams}
        <div class="mt-2">
          <Stepper bind:value={() => grams(l), (g) => (l.factor = g / l.base.grams!)} step={10} min={10} max={5000} unit={t.after.g} label={t.after.grams} />
        </div>
      {/if}
      {#if opened === i}
        <div class="mt-3 flex flex-col gap-3" data-testid="meal-item-open">
          <div class="flex flex-wrap gap-2" role="group">
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
    <p class="text-callout text-ink-2" data-testid="meal-empty">{empty}</p>
  {/each}
</div>
{@render children?.()}
<Button variant="plain" class="-ml-5 mt-1" disabled={lines.length >= max} onclick={() => pick(null)} data-testid="meal-add-item">{t.meal.addItem}</Button>
