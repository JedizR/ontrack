<!-- The Review layout's items (SCREENS.md section 7), shared by the Review and Meal sheets: one row per item with grams
     on a stepper, calories and source; open it for portions, macros, Replace, Correct and Remove. Correct sets calories
     and macros on steppers; saving remembers them for the food (F15), and Use default values forgets them. Then
     `children` (the Review sheet's oil control) and Add an item. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import Button from '$lib/components/Button.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { mealSource } from '$lib/model/day';
  import { forgetFood } from '$lib/actions';
  import { foodKey, itemFor, loadFoods } from '$lib/data/foods';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import { PORTIONS, lineOf, scaled, type Line } from './items';
  import type { MealItem } from '../../../shared/records';

  let { lines = $bindable(), empty, max = 30, children }: {
    lines: Line[];
    empty: string;
    /** the record schema takes 30 items; less when something else adds one */
    max?: number;
    children?: Snippet;
  } = $props();
  let opened = $state<number | null>(null);
  let correcting = $state<number | null>(null);
  type Nutrient = 'kcal' | 'protein' | 'carbs' | 'fat';
  /** what is corrected, its step (half grams: a decimal pad for labels like 2.5 g) and its unit; one largest value keeps
   * the four steppers the same width */
  const NUTRIENTS: [Nutrient, number, string][] = [['kcal', 10, t.after.kcal], ['protein', 0.5, t.after.g], ['carbs', 0.5, t.after.g], ['fat', 0.5, t.after.g]];
  const LABEL = { kcal: t.quick.calories, protein: t.quick.protein, carbs: t.quick.carbs, fat: t.quick.fat };
  const items = $derived(lines.map(scaled));

  function pick(at: number | null) {
    sheets.pick = (item) => {
      if (at === null) lines.push(lineOf(item));
      else lines[at] = lineOf(item);
    };
    sheets.search = true;
  }
  const grams = (l: Line) => Math.round((l.base.grams ?? 0) * l.factor);

  /** The line becomes the user's numbers at its current grams; what the table or the model said is kept to go back to. */
  function correct(i: number, key: Nutrient, v: number) {
    const l = lines[i];
    const now = scaled(l);
    if (now[key] === v) return;
    lines[i] = { base: { ...now, [key]: v, source: 'yours' }, factor: 1, original: l.original ?? (l.base.source === 'yours' ? undefined : l.base), corrected: true };
  }
  /** Puts back the table's or the model's numbers at the same grams, then forgets the food's remembered ones. Nothing is
   * forgotten when the default cannot be found (the table not loaded offline). */
  async function useDefault(i: number) {
    const l = lines[i];
    const was = scaled(l);
    let def: MealItem | undefined = l.original;
    if (!def && was.foodId) {
      const food = (await loadFoods().catch(() => [])).find((f) => f.id === was.foodId);
      if (food) def = itemFor(food, was.grams ?? food.portions[0].grams);
    }
    if (!def || lines[i] !== l) return;
    const now = scaled(l); // the grams may have moved while the table loaded
    forgetFood(foodKey(now));
    lines[i] = { base: def, factor: def.grams && now.grams ? now.grams / def.grams : 1 };
    correcting = null;
  }
</script>

<div class="mt-4" data-testid="meal-items">
  {#each lines as l, i}
    {@const it = items[i]}
    <div class="border-line border-t py-3 first:border-t-0" data-testid="meal-item">
      <button type="button" class="active:bg-surface-2 -mx-6 flex w-[calc(100%+var(--inset)*2)] items-start gap-3 px-6 py-1 text-left transition-colors duration-[var(--d-press)]" aria-expanded={opened === i} onclick={() => { opened = opened === i ? null : i; correcting = null; }}>
        <span class="min-w-0 flex-1">
          <span class="text-body line-clamp-2 block font-semibold">{it.name}</span>
          <span class="text-caption text-ink-2 block"><SourceLabel source={mealSource([it])} /></span>
        </span>
        <span class="text-body num flex-none font-semibold">{num(it.kcal)}<span class="text-caption text-ink-2 font-medium">{' '}{t.after.kcal}</span></span>
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
          {#if correcting === i}
            <div class="flex flex-col gap-3" data-testid="item-correct">
              {#each NUTRIENTS as [key, step, unit] (key)}
                <!-- at the largest text the stepper drops under its label, still on the right -->
                <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span class="text-body font-semibold">{LABEL[key]}</span>
                  <div class="ml-auto"><Stepper bind:value={() => it[key], (v) => correct(i, key, v)} {step} min={0} max={10000} {unit} label={LABEL[key]} testid="correct-{key}" column /></div>
                </div>
              {/each}
              <p class="text-caption text-ink-2">{t.meal.remembered}</p>
            </div>
          {:else}
            <p class="text-caption text-ink-2"><Facts facts={[t.after.proteinN(num(it.protein, 1)), t.after.carbsN(num(it.carbs, 1)), t.after.fatN(num(it.fat, 1))]} /></p>
          {/if}
          <div class="flex flex-wrap gap-2">
            <Button size="sm" onclick={() => pick(i)}>{t.meal.replace}</Button>
            {#if it.grams && correcting !== i}<Button size="sm" onclick={() => (correcting = i)} data-testid="item-correct-open">{t.meal.correct}</Button>{/if}
            <Button variant="danger" size="sm" onclick={() => { lines.splice(i, 1); opened = null; correcting = null; }} data-testid="item-remove">{t.meal.remove}</Button>
          </div>
          {#if it.source === 'yours' && (l.original || it.foodId)}
            <Button variant="plain" size="sm" class="-ml-4 self-start" onclick={() => useDefault(i)} data-testid="item-default">{t.meal.useDefault}</Button>
          {/if}
        </div>
      {/if}
    </div>
  {:else}
    <p class="text-callout text-ink-2" data-testid="meal-empty">{empty}</p>
  {/each}
</div>
{@render children?.()}
<Button variant="plain" class="-ml-5 mt-1" disabled={lines.length >= max} onclick={() => pick(null)} data-testid="meal-add-item">{t.meal.addItem}</Button>
