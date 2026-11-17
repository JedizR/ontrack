<!-- R1: every saved meal in one place, over Add. Most used first. A + logs it on the day in view at once (with Undo), a
     swipe to the left deletes it as iOS Mail does (Undo too). Saving happens in the Meal sheet's bookmark or the Review
     sheet's switch; this is where they are kept. -->
<script lang="ts">
  import Plus from '@lucide/svelte/icons/plus';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import SwipeRow from '$lib/components/SwipeRow.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { deleteSaved, logSaved, undoToast } from '$lib/actions';
  import { totals } from '$lib/model/day';
  import { stampOn } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import type { MealItem } from '../../../shared/records';

  const saved = $derived(db.live('saved').sort((a, b) => b.data.uses - a.data.uses || b.data.lastUsedAt.localeCompare(a.data.lastUsedAt)));
  const kcalOf = (items: MealItem[]) => num(Math.round(totals(items).kcal));
  const nameOf = (title: string, items: MealItem[]) => title || items[0]?.name || t.source.manual;

  function log(id: string, title: string) {
    const undo = logSaved(id, view.date, stampOn(view.date));
    if (!undo) return;
    haptic();
    sheets.saved = false;
    sheets.add = false;
    undoToast(t.add.logged(title), undo);
  }
</script>

<Sheet bind:open={sheets.saved} title={t.saved.title} layer="nested" testid="saved-sheet">
  {#if saved.length}
    <div data-testid="saved-all">
      {#each saved as { id, data: s } (id)}
        {@const title = nameOf(s.title, s.items)}
        <SwipeRow ondelete={() => undoToast(t.saved.deleted(title), deleteSaved(id))} testid="saved-row">
          <Row {title} caption={t.saved.items(num(s.items.length))} value={kcalOf(s.items)} unit={t.after.kcal}>
            {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Bookmark size={24} strokeWidth={2} /></div>{/snippet}
            {#snippet trailing()}
              <button type="button" class="bg-surface-2 active:bg-surface-3 grid size-11 flex-none place-items-center rounded-sm transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.97]" aria-label={t.add.again(title)} onclick={() => log(id, title)} data-testid="saved-log">
                <Plus size={22} strokeWidth={2.25} />
              </button>
            {/snippet}
          </Row>
        </SwipeRow>
      {/each}
    </div>
  {:else}
    <p class="text-callout text-ink-2 py-6" data-testid="saved-empty">{t.saved.empty}</p>
  {/if}
</Sheet>
