<!-- SCREENS.md section 7, Add sheet from the plus button: the ways to log, then Recent and Saved, each with a plus that
     logs the meal again at once with an undo toast. Photo opens the camera at once; the first time, a notice comes first. -->
<script lang="ts">
  import type { Component } from 'svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import SearchIcon from '@lucide/svelte/icons/search';
  import Hash from '@lucide/svelte/icons/hash';
  import Camera from '@lucide/svelte/icons/camera';
  import TextIcon from '@lucide/svelte/icons/text';
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
  type Way = 'photo' | 'search' | 'describe' | 'quick';
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
  const WAYS: { key: Way; label: string; line: string; icon: Component<{ size?: number; strokeWidth?: number }> }[] = [
    { key: 'photo', label: t.add.photo, line: t.add.photoLine, icon: Camera },
    { key: 'search', label: t.add.search, line: t.add.searchLine, icon: SearchIcon },
    { key: 'describe', label: t.add.describe, line: t.add.describeLine, icon: TextIcon },
    { key: 'quick', label: t.add.quick, line: t.add.quickLine, icon: Hash },
  ];
</script>

{#snippet again(label: string, onclick: () => void)}
  <button type="button" class="bg-surface-2 active:bg-surface-3 grid size-11 flex-none place-items-center rounded-full transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.97]" aria-label={label} {onclick} data-testid="again">
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
    <!-- Photo is the sheet's main action: the violet 3D face. The others are quiet tiles -->
    <div class="grid grid-cols-2 gap-3">
      {#each WAYS as w (w.key)}
        {@const Icon = w.icon}
        {@const main = w.key === 'photo'}
        <button type="button" class="{main ? 'pill-accent active:pill-accent-down' : 'bg-surface-2 active:bg-surface-3 active:scale-[0.97]'} flex min-h-26 flex-col items-start justify-between gap-2 rounded-md p-4 text-left transition-[transform,background-color,box-shadow] duration-[var(--d-press)]" onclick={() => go(w.key)} data-testid="add-{w.key}">
          <span class="{main ? 'bg-on-accent/20' : 'tile'} grid size-10 place-items-center rounded-sm"><Icon size={22} strokeWidth={2} /></span>
          <span>
            <span class="text-body block font-semibold">{w.label}</span>
            <span class="text-caption {main ? '' : 'text-ink-2'} block">{w.line}</span>
          </span>
        </button>
      {/each}
    </div>

    <h3 class="text-heading mt-8">{t.add.recent}</h3>
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
      <p class="text-callout text-ink-2 mt-3" data-testid="recent-empty">{t.add.noRecent}</p>
    {/if}

    {#if saved.length}
      <h3 class="text-heading mt-8">{t.add.saved}</h3>
      <div data-testid="saved">
        {#each saved as { id, data: s } (id)}
          <Row title={s.title} value={kcalOf(s.items)}>
            {#snippet trailing()}{@render again(t.add.again(s.title), () => logged(logSaved(id, view.date, stampOn(view.date)), s.title))}{/snippet}
          </Row>
        {/each}
      </div>
    {/if}
  {/if}
</Sheet>
