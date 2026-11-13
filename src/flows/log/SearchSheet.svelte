<!-- SCREENS.md section 7, Search: a field with focus, results with kcal for the default portion, Recent foods while the
     field is empty. A result opens the portion step, with a back chevron to the results: live calories, the source and
     its citation, portion chips, grams on a stepper that can be typed, Add. A food the user corrected before uses their
     numbers, labelled Yours, with Use default values (F15). Opened from a meal (Replace, Add an item), Add hands the
     item back instead of logging a meal. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import Row from '$lib/components/Row.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Button from '$lib/components/Button.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import SearchIcon from '@lucide/svelte/icons/search';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import { db } from '$lib/db/store.svelte';
  import { deleteMeal, forgetFood, saveMeal, undoToast } from '$lib/actions';
  import { FOOD_SOURCES } from '$lib/data/sources';
  import { itemFor, loadFoods, searchFoods, thaiFirst, type Food } from '$lib/data/foods';
  import { recentFoods } from '$lib/model/day';
  import { stampOn } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';

  const MAX_GRAMS = 5000;

  let foods = $state<Food[] | null>(null);
  let failed = $state(false);
  let q = $state('');
  let picked = $state<{ food: Food; grams: number } | null>(null);

  async function load() {
    failed = false;
    try { foods = await loadFoods(); } catch { failed = true; }
  }
  $effect(() => {
    if (sheets.search) untrack(() => { q = ''; picked = null; if (!foods) void load(); });
  });

  const byId = $derived(new Map((foods ?? []).map((f) => [f.id, f])));
  const thai = thaiFirst();
  const results = $derived(foods ? searchFoods(foods, q, undefined, thai) : []);
  const recent = $derived(
    recentFoods(db.live('meal').map((r) => r.data)).flatMap((r) => {
      const food = byId.get(r.foodId);
      return food ? [{ food, grams: r.grams ?? food.portions[0].grams }] : [];
    }),
  );
  /** the user's own numbers for a food, per 100 g, when they corrected it before */
  const mine = (f: Food) => db.get('food', f.id)?.per100;
  const kcalFor = (f: Food, grams: number) => num(Math.round(((mine(f) ?? f.per100).kcal * grams) / 100));
  const item = $derived(picked ? itemFor(picked.food, picked.grams, mine(picked.food)) : null);
  const cite = $derived(picked ? FOOD_SOURCES[picked.food.source.set] : null);
  /** a food read from a page (the Thai FCD) links to that page, otherwise the table's terms */
  const citeLink = $derived(picked?.food.source.url ? { href: picked.food.source.url, text: t.search.page } : cite?.terms ? { href: cite.terms, text: t.search.terms } : null);


  function add() {
    if (!picked || !item) return;
    haptic();
    if (sheets.pick) {
      sheets.pick(item);
      sheets.pick = null;
      sheets.search = false;
      return;
    }
    const name = picked.food.name;
    const id = saveMeal({ date: view.date, at: stampOn(view.date), title: name, method: 'search', items: [item] });
    sheets.search = false;
    undoToast(t.add.logged(name), () => { deleteMeal(id); });
  }
  function quickInstead() {
    sheets.search = false;
    sheets.quick = true;
  }
</script>

{#snippet footer()}
  <Button variant="primary" size="lg" full disabled={!item || item.grams === 0} onclick={add} data-testid="search-add">{t.search.add(num(item?.kcal ?? 0))}</Button>
{/snippet}

<Sheet
  bind:open={sheets.search}
  title={picked ? picked.food.name : t.search.title}
  layer={sheets.pick ? 'nested' : 'base'}
  testid="search-sheet"
  onclose={() => (sheets.pick = null)}
  footer={picked ? footer : undefined}
  onback={picked ? () => (picked = null) : undefined}
  backLabel={t.search.back}
>
  {#if picked}
    <div class="flex flex-col gap-5" data-testid="portion">
      <div aria-live="polite">
        <div class="flex items-baseline gap-2">
          <span class="text-display" data-testid="portion-kcal">{num(item?.kcal ?? 0)}</span>
          <span class="text-heading text-ink-2">{t.after.kcal}</span>
        </div>
        {#if item}<p class="text-caption text-ink-2 mt-2"><Facts facts={[t.after.proteinN(num(item.protein, 1)), t.after.carbsN(num(item.carbs, 1)), t.after.fatN(num(item.fat, 1))]} /></p>{/if}
        <p class="text-caption text-ink-2 mt-1" data-testid="portion-source"><SourceLabel source={item?.source === 'yours' ? 'yours' : 'database'} /></p>
      </div>
      {#if item?.source === 'yours'}
        <Button variant="plain" size="sm" class="-my-2 -ml-4 self-start" onclick={() => picked && forgetFood(picked.food.id)} data-testid="portion-default">{t.meal.useDefault}</Button>
      {/if}
      <div class="-mx-6 flex gap-2 overflow-x-auto px-6" role="group" aria-label={t.search.portion}>
        {#each picked.food.portions as p (p.label)}
          <Chip selected={picked.grams === p.grams} onclick={() => { if (picked) picked.grams = p.grams; }}>{p.label}</Chip>
        {/each}
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-body font-semibold">{t.search.grams}</span>
        <Stepper bind:value={picked.grams} step={10} min={1} max={MAX_GRAMS} unit={t.after.g} label={t.after.grams} testid="portion-grams" />
      </div>
      <!-- the citation is the table's; the user's own numbers are not its -->
      {#if cite && item?.source !== 'yours'}
        <p class="text-caption text-ink-2" data-testid="portion-cite">
          {t.search.from(cite.name)}
          {#if citeLink}<a href={citeLink.href} target="_blank" rel="noopener" class="relative underline after:absolute after:-inset-x-2 after:-inset-y-4">{citeLink.text}</a>{/if}
        </p>
      {/if}
    </div>
  {:else}
    <div class="relative">
    <SearchIcon class="text-ink-2 pointer-events-none absolute top-1/2 left-4 -translate-y-1/2" size={22} strokeWidth={2} aria-hidden="true" />
    <input
      aria-label={t.search.field}
      type="search"
      enterkeyhint="search"
      autocomplete="off"
      spellcheck="false"
      placeholder={t.search.field}
      bind:value={q}
      {@attach (el) => el.focus()}
      class="input-field w-full appearance-none pl-12! [&::-webkit-search-cancel-button]:appearance-none"
      data-testid="search-field"
    />
    </div>
    {#if failed}
      <p class="text-callout text-ink-2 mt-4" role="alert">{t.search.failed}</p>
      <Button class="mt-2" onclick={load}>{t.search.retry}</Button>
    {:else if !foods}
      <div class="mt-4 flex flex-col gap-3" aria-busy="true" aria-label={t.loading}>
        {#each [0, 1, 2] as i (i)}<Skeleton class="h-11 rounded-sm" />{/each}
      </div>
    {:else if q.trim()}
      <div class="mt-2" data-testid="results">
        {#each results as f (f.id)}
          <Row title={f.name} caption={f.portions[0].label} value={kcalFor(f, f.portions[0].grams)} unit={t.after.kcal} onclick={() => (picked = { food: f, grams: f.portions[0].grams })} testid="result" />
        {:else}
          <p class="text-callout text-ink-2 mt-3" data-testid="no-results">{t.search.none}</p>
          {#if !sheets.pick}<Button class="mt-2" onclick={quickInstead}>{t.quick.title}</Button>{/if}
        {/each}
      </div>
    {:else if recent.length}
      <h3 class="text-heading mt-5">{t.search.recent}</h3>
      <div data-testid="recent-foods">
        {#each recent as r (r.food.id)}
          <Row title={r.food.name} caption="{num(r.grams)} {t.after.g}" value={kcalFor(r.food, r.grams)} unit={t.after.kcal} onclick={() => (picked = { ...r })} testid="result" />
        {/each}
      </div>
    {:else}
      <p class="text-callout text-ink-2 mt-4">{t.search.hint(num(foods.length))}</p>
    {/if}
  {/if}
</Sheet>
