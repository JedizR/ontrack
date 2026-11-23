<!-- SCREENS.md section 7, Add sheet from the plus button: the user's supplements first (N2), each opening its amount, then
     the camera and the ways to log (19 Nov: the weigh-in and the session live on Today only), then Recent and Saved, each with a plus that logs the meal again at once with an undo toast. R5: whey is the
     one preset; set up supplements join it in the top row. Photo opens the camera at once (R5, the owner: no notice naming the AI provider). -->
<script lang="ts">
  import type { Component } from 'svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Hash from '@lucide/svelte/icons/hash';
  import Camera from '@lucide/svelte/icons/camera';
  import TextIcon from '@lucide/svelte/icons/text';
  import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
  import ImageIcon from '@lucide/svelte/icons/image';
  import Scanner from './Scanner.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ShakerIcon from '$lib/components/ShakerIcon.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Mic from '@lucide/svelte/icons/mic';
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { deleteMeal, logAgain, logSaved, undoToast } from '$lib/actions';
  import { recentMeals, totals } from '$lib/model/day';
  import { stampOn } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import { loadFoods, thaiFirst, type Food } from '$lib/data/foods';
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
  function supplement(id: string | null, kind?: 'whey' | 'creatine') {
    sheets.add = false;
    sheets.supplement = { id, ...(kind ? { kind } : {}) };
  }
  // R2, the owner: whey and creatine pinned at the top, one line, one tap each: the user's own if set up, else its setup
  // R5, the owner: whey is the one preset (its setup until it has one); every supplement set up joins it in the row, and
  // the plus sets up another (creatine included)
  const whey = $derived(supplements.find((r) => r.data.kind === 'whey'));
  const pills = $derived([{ k: 'whey' as const, r: whey }, ...supplements.filter((r) => r.id !== whey?.id).map((r) => ({ k: r.data.kind, r }))]);
  const SHORT: Partial<Record<Supplement['kind'], string>> = t.add.pinned;
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
  // R1: Recent and Saved are one list with a switch (BitePal's clock and bookmark), Recent first
  let list = $state<'recent' | 'saved'>('recent');
  $effect(() => { if (sheets.add) list = 'recent'; });
  function speak() {
    haptic();
    sheets.listen = true;
    go('describe');
  }
  let input = $state<HTMLInputElement>();
  let typing = $state(false);
  $effect(() => { if (sheets.add) typing = false; });
  // the owner (18 Nov): the plus opens on one camera for a meal, a label or a barcode; each hands on to its own sheet
  function code(c: string) {
    sheets.add = false;
    sheets.scanFrom = { code: c };
    sheets.scan = true;
  }
  function shot(frame: Blob, as: 'meal' | 'label') {
    if (as === 'label') {
      sheets.add = false;
      sheets.scanFrom = { label: frame };
      sheets.scan = true;
      return;
    }
    sheets.add = false;
    sheets.review = { kind: 'photo', file: frame };
  }

  // the composer's example line turns every 3 seconds while the sheet is open (the global reduced motion rule makes it a cut)
  const EXAMPLES = t.add.examples;
  let ex = $state(thaiFirst() ? 1 : 0);
  let moved = $state(false);
  $effect(() => {
    if (!sheets.add) return;
    const id = setInterval(() => { moved = true; ex = (ex + 1) % EXAMPLES.length; }, 3000);
    return () => clearInterval(id);
  });

  // the file input sits outside the sheet so it is still there when the camera hands the photo back
  const camera = () => input?.click();
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
  // R5: the round actions beside the viewfinder; Describe is the field under the shutter, Photos picks one already taken
  const WAYS: { key: Way; label: string; icon: Component<{ size?: number; strokeWidth?: number }> }[] = [
    { key: 'photo', label: t.add.library, icon: ImageIcon },
    { key: 'search', label: t.add.search, icon: SearchIcon },
    { key: 'quick', label: t.add.quick, icon: Hash },
  ];
</script>

{#snippet again(label: string, onclick: () => void)}
  <button type="button" class="bg-surface-2 active:bg-surface-3 grid size-11 flex-none place-items-center rounded-sm transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.97]" aria-label={label} {onclick} data-testid="again">
    <Plus size={22} strokeWidth={2.25} />
  </button>
{/snippet}

<input bind:this={input} type="file" accept="image/*" hidden onchange={taken} data-testid="photo-input" />

<Sheet bind:open={sheets.add} title={t.add.title} layer="base" testid="add-sheet" onback={typing ? () => (typing = false) : undefined} backLabel={t.scan.back}>
    <!-- one row that scrolls sideways once it holds more than two -->
    <div class="mb-3 flex gap-2 overflow-x-auto [scrollbar-width:none]" data-testid="add-pinned">
      {#each pills as { k, r } (r?.id ?? k)}
        <button type="button" class="bg-surface-2 active:bg-surface-3 flex min-h-12 min-w-[9rem] flex-1 items-center gap-1.5 rounded-full px-3 py-1 text-left transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.98]" onclick={() => supplement(r?.id ?? null, r ? undefined : 'whey')} data-testid={r ? 'supplement' : `add-pin-${k}`}>
          <span class="text-ink-2 inline-grid flex-none"><ShakerIcon /></span>
          <span class="min-w-0 flex-1 leading-tight">
            <span class="text-callout block truncate font-semibold">{SHORT[k] ?? r?.data.name}</span>
            <!-- set up, its last amount (and Typical when its values are the label's typical ones), as its old row said -->
            {#if r}{#snippet typ()}<SourceLabel source="typical" />{/snippet}<span class="text-caption text-ink-2 block"><Facts facts={[t.supplement.amount(num(r.data.lastScoops, 1), !!r.data.lastMix && !noCalories(r.data)), r.data.typical && typ]} /></span>{/if}
          </span>
          {#if r && lastKcal(r.id, r.data)}<span class="text-caption text-ink-2 num flex-none">{lastKcal(r.id, r.data)}</span>{/if}
        </button>
      {/each}
      <!-- any other supplement: set one up -->
      <button type="button" class="bg-surface-2 active:bg-surface-3 text-ink-2 grid size-12 flex-none place-items-center rounded-full transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.97]" aria-label={t.supplement.setup} onclick={() => supplement(null)} data-testid="supplement-entry"><Plus size={22} strokeWidth={2.25} aria-hidden="true" /></button>
    </div>

    <!-- R1, rebuilt from Alma's composer, BitePal's search and Cal AI's tiles, on the landing page's sky. R5, the owner: the
         camera first in its own 3:4 field with Photos, Search and Quick add stacked on its right, Meal and Label across,
         the shutter in the middle, then the field to say what you ate, with a mic -->
    <div class="rounded-lg p-4 [background:var(--grad-sky)]" data-theme="light" data-testid="add-composer">
      {#snippet ways()}
        <div class="flex min-w-0 flex-1 flex-col items-center justify-around" data-testid="add-ways">
          {#each WAYS as w (w.key)}
            {@const Icon = w.icon}
            <button type="button" class="group flex min-w-0 flex-col items-center gap-1 text-center" onclick={() => go(w.key)} data-testid="add-{w.key}">
              <!-- on a short phone the column is shorter, so the rounds are too (still 48, over the 44 tap) -->
              <span class="liquid-clear text-night grid size-14 place-items-center [@media(max-height:620px)]:size-12 rounded-full transition-transform duration-[var(--d-press)] group-active:scale-[0.95]"><Icon size={24} strokeWidth={2} /></span>
              <span class="text-caption text-night font-semibold">{w.label}</span>
            </button>
          {/each}
        </div>
      {/snippet}
      <Scanner oncode={code} onphoto={shot} bind:typing embedded side={ways} />
      <div class="bg-surface shadow-card mt-2.5 flex items-center gap-2 rounded-full p-1.5 pl-5">
        <button type="button" class="text-body text-ink-2 active:bg-surface-2 -ml-3.5 grid h-12 min-w-0 flex-1 items-center overflow-hidden rounded-full pl-3.5 text-left transition-colors duration-[var(--d-press)]" aria-label={t.add.prompt} onclick={() => go('describe')} data-testid="add-describe">
          <!-- one line, cut with an ellipsis, so the pill never changes height; the next example rises in as the last lifts away -->
          {#key ex}
            {#if moved}<span class="swap-out col-start-1 row-start-1 truncate" data-ellipsis aria-hidden="true">{EXAMPLES[(ex + EXAMPLES.length - 1) % EXAMPLES.length]}</span>{/if}
            <span class="{moved ? 'swap-in ' : ''}col-start-1 row-start-1 truncate" data-ellipsis aria-hidden="true">{EXAMPLES[ex]}</span>
          {/key}
        </button>
        <button type="button" class="bg-surface-2 text-ink active:bg-surface-3 grid size-12 flex-none place-items-center rounded-full transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.97]" aria-label={t.describe.speak} onclick={speak} data-testid="add-mic"><Mic size={22} strokeWidth={2.25} aria-hidden="true" /></button>
      </div>
    </div>


    {#if saved.length}
      <div class="mt-6"><Segmented bind:value={list} label={t.add.listLabel} options={[{ value: 'recent', label: t.add.recent }, { value: 'saved', label: t.add.saved }]} /></div>
    {:else}
      <h3 class="text-eyebrow text-ink-2 mt-8">{t.add.recent}</h3>
    {/if}

    {#if list === 'recent' || !saved.length}
      {#if recent.length}
        <div class="mt-2" data-testid="recent">
          {#each recent as { id, data: m } (id)}
            {@const title = titleOf(m.title, m.items)}
            {@const Icon = ICON[m.method]}
            <Row {title} value={kcalOf(m.items)} unit={t.after.kcal}>
              {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Icon size={24} strokeWidth={2} /></div>{/snippet}
              {#snippet trailing()}{@render again(t.add.again(title), () => logged(relog(m), title))}{/snippet}
            </Row>
          {/each}
        </div>
      {:else}
        <p class="text-callout text-ink-2 mt-3" data-testid="recent-empty">{t.add.noRecent}</p>
      {/if}
    {:else}
      <div class="mt-2" data-testid="saved">
        {#each saved.slice(0, 5) as { id, data: s } (id)}
          <Row title={s.title} value={kcalOf(s.items)} unit={t.after.kcal}>
            {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Bookmark size={24} strokeWidth={2} /></div>{/snippet}
            {#snippet trailing()}{@render again(t.add.again(s.title), () => logged(logSaved(id, view.date, stampOn(view.date)), s.title))}{/snippet}
          </Row>
        {/each}
        {#if saved.length > 5}<Row title={t.saved.all(num(saved.length))} chevron onclick={() => (sheets.saved = true)} testid="saved-more" />{/if}
      </div>
    {/if}

</Sheet>
