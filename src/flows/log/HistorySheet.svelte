<!-- R7, the owner: every meal ever logged, over Add, newest first and each once (the same meal logged again counts once,
     as Recent does). A field finds one by name or food; a + logs it on the day in view at once, with Undo. -->
<script lang="ts">
  import type { Component } from 'svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import Camera from '@lucide/svelte/icons/camera';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Hash from '@lucide/svelte/icons/hash';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import TextIcon from '@lucide/svelte/icons/text';
  import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
  import ShakerIcon from '$lib/components/ShakerIcon.svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { deleteMeal, logAgain, undoToast } from '$lib/actions';
  import { recentMeals, totals } from '$lib/model/day';
  import { shortDate, stampOn } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import type { Meal } from '../../../shared/records';

  const all = $derived(recentMeals(db.live('meal').filter((r) => r.data.method !== 'supplement'), Infinity));
  let find = $state('');
  $effect(() => { if (sheets.history) find = ''; });
  const titleOf = (m: Meal) => m.title || m.items[0]?.name || t.source.manual;
  const shown = $derived.by(() => {
    const q = find.trim().toLowerCase();
    return q ? all.filter((r) => [titleOf(r.data), ...r.data.items.map((i) => i.name)].some((s) => s.toLowerCase().includes(q))) : all;
  });
  const ICON: Record<Meal['method'], Component<{ size?: number; strokeWidth?: number }>> = { photo: Camera, text: TextIcon, search: SearchIcon, quick: Hash, saved: Bookmark, supplement: ShakerIcon, barcode: ScanBarcode };

  function again(m: Meal) {
    const id = logAgain(m, view.date, stampOn(view.date));
    haptic();
    sheets.history = false;
    sheets.add = false;
    undoToast(t.add.logged(titleOf(m)), () => { deleteMeal(id); });
  }
</script>

<Sheet bind:open={sheets.history} title={t.meals.title} layer="nested" testid="all-meals-sheet">
  <input type="search" bind:value={find} placeholder={t.meals.find} aria-label={t.meals.find} enterkeyhint="search" class="input-field mb-2 w-full" data-testid="history-find" />
  {#if shown.length}
    <div data-testid="history-all">
      {#each shown as { id, data: m } (id)}
        {@const Icon = ICON[m.method]}
        <Row title={titleOf(m)} value={num(Math.round(totals(m.items).kcal))} unit={t.after.kcal} testid="history-row">
          {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Icon size={24} strokeWidth={2} /></div>{/snippet}
          {#snippet caption()}<Facts facts={[t.meals.last(shortDate(m.date))]} />{/snippet}
          {#snippet trailing()}
            <button type="button" class="bg-surface-2 active:bg-surface-3 grid size-11 flex-none place-items-center rounded-sm transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.97]" aria-label={t.add.again(titleOf(m))} onclick={() => again(m)} data-testid="history-log">
              <Plus size={22} strokeWidth={2.25} />
            </button>
          {/snippet}
        </Row>
      {/each}
    </div>
  {:else}
    <p class="text-callout text-ink-2 py-6" data-testid="history-empty">{t.meals.none}</p>
  {/if}
</Sheet>
