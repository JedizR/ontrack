<!-- SCREENS.md section 7, Add sheet from the plus button: the user's supplements first (N2), each opening its amount, then
     the ways to log, then Recent and Saved, each with a plus that logs the meal again at once with an undo toast. With no
     supplements, one row under the ways sets one up. Photo opens the camera at once; the first time, a notice comes first. -->
<script lang="ts">
  import type { Component } from 'svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Hash from '@lucide/svelte/icons/hash';
  import Camera from '@lucide/svelte/icons/camera';
  import TextIcon from '@lucide/svelte/icons/text';
  import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ShakerIcon from '$lib/components/ShakerIcon.svelte';
  import Button from '$lib/components/Button.svelte';
  import { prefs } from '$lib/prefs.svelte';
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
  import { loadFoods, type Food } from '$lib/data/foods';
  import { noCalories, supplementItems } from '$lib/model/supplements';
  import type { Meal, MealItem, Supplement } from '../../../shared/records';

  // logged supplements are not repeated here: they sit at the top
  const recent = $derived(recentMeals(db.live('meal').filter((r) => r.data.method !== 'supplement')));
  const supplements = $derived(db.live('supplement').sort((a, b) => a.data.name.localeCompare(b.data.name)));
  // a milk's values come from the food table, loaded when a supplement was last mixed with one
  let foods = $state<Food[] | null>(null);
  $effect(() => { if (sheets.add && !foods && supplements.some((r) => r.data.lastMix)) loadFoods().then((f) => (foods = f), () => {}); });
  /** the calories of the last amount and mix; none while the milk's values load, or with no calories at all */
  function lastKcal(id: string, s: Supplement) {
    if (noCalories(s)) return undefined; // no mix either: it logs as taken
    const milk = s.lastMix && foods?.find((f) => f.id === s.lastMix?.foodId);
    if (s.lastMix && !milk) return undefined;
    const kcal = totals(supplementItems(id, s, s.lastScoops, milk ? { food: milk, grams: s.lastMix!.grams, mine: db.get('food', milk.id)?.per100 } : undefined)).kcal;
    return kcal ? num(Math.round(kcal)) : undefined;
  }
  function supplement(id: string | null) {
    sheets.add = false;
    sheets.supplement = { id };
  }
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
  type Way = 'photo' | 'scan' | 'search' | 'describe' | 'quick';
  let input = $state<HTMLInputElement>();
  let notice = $state(false);
  $effect(() => { if (!sheets.add) notice = false; });

  // the file input sits outside the sheet so it is still there when the camera hands the photo back
  function camera() {
    if (!prefs.photoOk) return void (notice = true);
    input?.click();
  }
  function taken() {
    const file = input?.files?.[0];
    if (input) input.value = '';
    if (!file) return;
    sheets.add = false;
    sheets.review = { kind: 'photo', file };
  }
  const go = (to: Way) => {
    if (to === 'photo') return camera();
    sheets.add = false;
    sheets[to] = true;
  };
  // a meal's tile shows how it was logged, as on Today
  const ICON: Record<Meal['method'], Component<{ size?: number; strokeWidth?: number }>> = { photo: Camera, text: TextIcon, search: SearchIcon, quick: Hash, saved: Bookmark, supplement: ShakerIcon, barcode: ScanBarcode };
  const WAYS: { key: Way; label: string; line: string; icon: Component<{ size?: number; strokeWidth?: number }> }[] = [
    { key: 'photo', label: t.add.photo, line: t.add.photoLine, icon: Camera },
    { key: 'scan', label: t.add.scan, line: t.add.scanLine, icon: ScanBarcode },
    { key: 'search', label: t.add.search, line: t.add.searchLine, icon: SearchIcon },
    { key: 'describe', label: t.add.describe, line: t.add.describeLine, icon: TextIcon },
    { key: 'quick', label: t.add.quick, line: t.add.quickLine, icon: Hash },
  ];
</script>

{#snippet again(label: string, onclick: () => void)}
  <button type="button" class="bg-surface-2 active:bg-surface-3 grid size-11 flex-none place-items-center rounded-sm transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.97]" aria-label={label} {onclick} data-testid="again">
    <Plus size={22} strokeWidth={2.25} />
  </button>
{/snippet}

<input bind:this={input} type="file" accept="image/*" capture="environment" hidden onchange={taken} data-testid="photo-input" />

<Sheet bind:open={sheets.add} title={notice ? t.add.consentTitle : t.add.title} layer="base" testid="add-sheet">
  {#if notice}
    <p class="text-body" data-testid="photo-notice">{t.add.consent}</p>
    <div class="mt-6 flex flex-col gap-2">
      <Button variant="primary" size="lg" full onclick={() => { prefs.photoOk = true; notice = false; input?.click(); }} data-testid="photo-continue">{t.add.consentContinue}</Button>
      <Button variant="plain" size="lg" full onclick={() => (notice = false)}>{t.add.consentNotNow}</Button>
    </div>
  {:else}
    {#if supplements.length}
      <h3 class="text-heading">{t.supplement.section}</h3>
      <div data-testid="supplements">
        {#each supplements as { id, data: s } (id)}
          <Row title={s.name} value={lastKcal(id, s)} onclick={() => supplement(id)} testid="supplement">
            {#snippet caption()}{t.supplement.amount(num(s.lastScoops, 1), !!s.lastMix && !noCalories(s))}{#if s.typical}, <SourceLabel source="typical" />{/if}{/snippet}
            {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><ShakerIcon /></div>{/snippet}
          </Row>
        {/each}
      </div>
      <Button variant="plain" size="sm" class="-ml-4 mb-6" onclick={() => supplement(null)} data-testid="supplement-new">{t.supplement.setup}</Button>
    {/if}
    <!-- Photo is the sheet's featured way: one solid violet card, as OneFin's featured blog card, flat. The others are grey
         cards holding white icon tiles with a lavender edge (the integrations tiles), Scan first (B1) -->
    <div class="grid grid-cols-2 gap-3">
      {#each WAYS as w (w.key)}
        {@const Icon = w.icon}
        {@const main = w.key === 'photo'}
        <button type="button" class="{main ? 'bg-accent text-on-accent active:bg-accent-press col-span-2 min-h-20 flex-row items-center' : 'bg-surface-2 active:bg-surface-3 min-h-26 flex-col items-start justify-between'} flex gap-3 rounded-md p-4 text-left transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.97]" onclick={() => go(w.key)} data-testid="add-{w.key}">
          <span class="{main ? 'bg-on-accent/20' : 'bg-surface text-accent-ink ring-accent-soft ring-1'} grid size-10 place-items-center rounded-sm"><Icon size={22} strokeWidth={2} /></span>
          <span>
            <span class="text-body block font-semibold">{w.label}</span>
            <span class="text-caption {main ? '' : 'text-ink-2'} block">{w.line}</span>
          </span>
        </button>
      {/each}
    </div>

    {#if !supplements.length}
      <div class="mt-4">
        <Row title={t.supplement.section} caption={t.supplement.entryLine} onclick={() => supplement(null)} testid="supplement-entry">
          {#snippet leading()}<div class="tile grid size-full place-items-center"><ShakerIcon /></div>{/snippet}
          {#snippet trailing()}<ChevronRight class="text-ink-2 flex-none" size={24} strokeWidth={2} aria-hidden="true" />{/snippet}
        </Row>
      </div>
    {/if}

    <h3 class="text-heading mt-8">{t.add.recent}</h3>
    {#if recent.length}
      <div data-testid="recent">
        {#each recent as { id, data: m } (id)}
          {@const title = titleOf(m.title, m.items)}
          {@const Icon = ICON[m.method]}
          <Row {title} value={kcalOf(m.items)}>
            {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Icon size={24} strokeWidth={2} /></div>{/snippet}
            {#snippet trailing()}{@render again(t.add.again(title), () => logged(relog(m), title))}{/snippet}
          </Row>
        {/each}
      </div>
    {:else}
      <p class="text-callout text-ink-2 mt-3" data-testid="recent-empty">{t.add.noRecent}</p>
    {/if}

    {#if saved.length}
      <h3 class="text-heading mt-8">{t.add.saved}</h3>
      <div data-testid="saved">
        {#each saved as { id, data: s } (id)}
          <Row title={s.title} value={kcalOf(s.items)}>
            {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Bookmark size={24} strokeWidth={2} /></div>{/snippet}
            {#snippet trailing()}{@render again(t.add.again(s.title), () => logged(logSaved(id, view.date, stampOn(view.date)), s.title))}{/snippet}
          </Row>
        {/each}
      </div>
    {/if}
  {/if}
</Sheet>
