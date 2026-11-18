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
  import ImageIcon from '@lucide/svelte/icons/image';
  import Scanner from './Scanner.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ShakerIcon from '$lib/components/ShakerIcon.svelte';
  import Button from '$lib/components/Button.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Mic from '@lucide/svelte/icons/mic';
  import Scale from '@lucide/svelte/icons/scale';
  import Check from '@lucide/svelte/icons/check';
  import { prefs } from '$lib/prefs.svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { clearSessionLog, deleteMeal, logAgain, logSaved, logSession, undoToast } from '$lib/actions';
  import { recentMeals, totals } from '$lib/model/day';
  import { stampOn, weekdayOf } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import { loadFoods, thaiFirst, type Food } from '$lib/data/foods';
  import { noCalories, supplementItems } from '$lib/model/supplements';
  import { ids, type Meal, type MealItem, type Supplement } from '../../../shared/records';

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
  const PINNED = ['whey', 'creatine'] as const;
  const pinnedOf = (k: (typeof PINNED)[number]) => supplements.find((r) => r.data.kind === k);
  const pinnedIds = $derived(new Set(PINNED.map((k) => pinnedOf(k)?.id).filter(Boolean)));
  const others = $derived(supplements.filter((r) => !pinnedIds.has(r.id)));
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
  // R2: the plus logs everything a day has (Strava's one create button): a meal first, then the weigh-in and the session
  const weighed = $derived(!!db.get('weight', ids.weight(view.date)));
  const session = $derived.by(() => {
    const s = db.get('program', 'program')?.sessions.find((x) => x.weekday === weekdayOf(view.date) && !db.get('slog', ids.slog(view.date, x.key)));
    return s && !db.get('slog', ids.slog(view.date, s.key)) ? s : null;
  });
  // as on Today: a cardio session named only "Cardio" shows its machine
  const sessionName = $derived(session ? (session.name === t.train.types[session.type] && session.setup ? t.train.machines[session.setup.machine] : session.name) : '');
  function weigh() {
    sheets.add = false;
    void import('./weigh').then((m) => m.weighIn(view.date));
  }
  // the owner (19 Nov): no set-by-set workout; the plus marks the day's session done, with an undo
  function train() {
    if (!session) return;
    const { key } = session;
    const name = sessionName;
    haptic();
    sheets.add = false;
    logSession({ date: view.date, sessionKey: key, status: 'done' });
    undoToast(t.add.sessionDone(name), () => clearSessionLog(view.date, key));
  }
  let input = $state<HTMLInputElement>();
  let notice = $state(false);
  let typing = $state(false);
  /** a meal frame waiting for the photo notice's yes */
  let held: Blob | null = null;
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
    if (!prefs.photoOk) { held = frame; notice = true; return; }
    sheets.add = false;
    sheets.review = { kind: 'photo', file: frame };
  }

  // the composer's example line turns every 3 seconds while the sheet is open (the global reduced motion rule makes it a cut)
  const EXAMPLES = t.add.examples;
  let ex = $state(thaiFirst() ? 1 : 0);
  let moved = $state(false);
  $effect(() => {
    if (!sheets.add || notice) return;
    const id = setInterval(() => { moved = true; ex = (ex + 1) % EXAMPLES.length; }, 3000);
    return () => clearInterval(id);
  });
  $effect(() => { if (!sheets.add) { notice = false; held = null; } });

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
  // the round actions under the field; Describe is the field itself, the camera is above it, Photos picks one already taken
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

<Sheet bind:open={sheets.add} title={notice ? t.add.consentTitle : t.add.title} layer="base" testid="add-sheet" onback={typing ? () => (typing = false) : undefined} backLabel={t.scan.back}>
  {#if notice}
    <p class="text-body" data-testid="photo-notice">{t.add.consent}</p>
    <div class="mt-6 flex flex-col gap-2">
      <Button variant="primary" size="lg" full onclick={() => { prefs.photoOk = true; notice = false; if (held) { const f = held; held = null; shot(f, 'meal'); } else input?.click(); }} data-testid="photo-continue">{t.add.consentContinue}</Button>
      <Button variant="plain" size="lg" full onclick={() => { notice = false; held = null; }}>{t.add.consentNotNow}</Button>
    </div>
  {:else}
    <div class="mb-3 grid grid-cols-[1fr_1fr_auto] gap-2" data-testid="add-pinned">
      {#each PINNED as k (k)}
        {@const r = pinnedOf(k)}
        <button type="button" class="bg-surface-2 active:bg-surface-3 flex min-h-12 min-w-0 items-center gap-1.5 rounded-full px-3 py-1 text-left transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.98]" onclick={() => supplement(r?.id ?? null, r ? undefined : k)} data-testid={r ? 'supplement' : `add-pin-${k}`}>
          <span class="text-ink-2 inline-grid flex-none"><ShakerIcon /></span>
          <span class="min-w-0 flex-1 leading-tight">
            <span class="text-callout block truncate font-semibold">{r?.data.name ?? t.add.pinned[k]}</span>
            <!-- set up, its last amount (and Typical when its values are the label's typical ones), as its old row said -->
            {#if r}{#snippet typ()}<SourceLabel source="typical" />{/snippet}<span class="text-caption text-ink-2 block"><Facts facts={[t.supplement.amount(num(r.data.lastScoops, 1), !!r.data.lastMix && !noCalories(r.data)), r.data.typical && typ]} /></span>{/if}
          </span>
          {#if r && lastKcal(r.id, r.data)}<span class="text-caption text-ink-2 num flex-none">{lastKcal(r.id, r.data)}</span>{/if}
        </button>
      {/each}
      <!-- any other supplement: set one up -->
      <button type="button" class="bg-surface-2 active:bg-surface-3 text-ink-2 grid size-12 place-items-center rounded-full transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.97]" aria-label={t.supplement.setup} onclick={() => supplement(null)} data-testid="supplement-entry"><Plus size={22} strokeWidth={2.25} aria-hidden="true" /></button>
    </div>

    <!-- R1, rebuilt from Alma's composer, BitePal's search and Cal AI's tiles: the field to say what you ate, with a mic,
         on the landing page's sky; under it the four other ways as round glass actions. Photo is the ink one -->
    <div class="rounded-t-lg rounded-b-md p-4 [background:var(--grad-sky)]" data-theme="light" data-testid="add-composer">
      <p class="text-heading px-1 text-balance">{t.add.prompt}</p>
      <div class="mt-3"><Scanner oncode={code} onphoto={shot} bind:typing embedded /></div>
      <div class="bg-surface shadow-card mt-3 flex items-center gap-2 rounded-full p-1.5 pl-5">
        <button type="button" class="text-body text-ink-2 active:bg-surface-2 -ml-3.5 grid h-12 min-w-0 flex-1 items-center overflow-hidden rounded-full pl-3.5 text-left transition-colors duration-[var(--d-press)]" aria-label={t.add.prompt} onclick={() => go('describe')} data-testid="add-describe">
          <!-- one line, cut with an ellipsis, so the pill never changes height; the next example rises in as the last lifts away -->
          {#key ex}
            {#if moved}<span class="swap-out col-start-1 row-start-1 truncate" data-ellipsis aria-hidden="true">{EXAMPLES[(ex + EXAMPLES.length - 1) % EXAMPLES.length]}</span>{/if}
            <span class="{moved ? 'swap-in ' : ''}col-start-1 row-start-1 truncate" data-ellipsis aria-hidden="true">{EXAMPLES[ex]}</span>
          {/key}
        </button>
        <button type="button" class="bg-surface-2 text-ink active:bg-surface-3 grid size-12 flex-none place-items-center rounded-full transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.97]" aria-label={t.describe.speak} onclick={speak} data-testid="add-mic"><Mic size={22} strokeWidth={2.25} aria-hidden="true" /></button>
      </div>
      <div class="mt-4 grid grid-cols-3 gap-2">
        {#each WAYS as w (w.key)}
          {@const Icon = w.icon}
          <button type="button" class="group flex min-w-0 flex-col items-center gap-2 text-center" onclick={() => go(w.key)} data-testid="add-{w.key}">
            <span class="liquid-clear text-night grid size-14 place-items-center rounded-full transition-transform duration-[var(--d-press)] group-active:scale-[0.95]"><Icon size={24} strokeWidth={2} /></span>
            <span class="text-caption text-night font-semibold">{w.label}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- R2: also log the day's other two things, one tap each -->
    <!-- R2, one card with small boxes (the owner's pick): the sky panel, then the day's other two logs as boxes under it,
         their outer corners the card's -->
    <div class="mt-2 grid {session ? 'grid-cols-2' : 'grid-cols-1'} gap-2" data-testid="add-also">
      {#snippet box(Icon: Component<{ size?: number; strokeWidth?: number }>, label: string, onclick: () => void, testid: string, corner: string, caption?: string)}
        <button type="button" class="bg-surface-2 active:bg-surface-3 {corner} text-body flex min-h-14 min-w-0 items-center gap-2 rounded-md px-4 text-left font-semibold transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.98]" {onclick} data-testid={testid}>
          <span class="inline-grid flex-none"><Icon size={20} strokeWidth={2.25} /></span><span class="min-w-0 leading-tight"><span class="block truncate">{label}</span>{#if caption}<span class="text-caption text-ink-2 block truncate font-medium">{caption}</span>{/if}</span>
        </button>
      {/snippet}
      {@render box(Scale, weighed ? t.add.weighAgain : t.weigh.action, weigh, 'add-weigh', session ? 'rounded-bl-lg' : 'rounded-b-lg')}
      {#if session}{@render box(Check, sessionName, train, 'add-workout', 'rounded-br-lg', t.add.markDone)}{/if}
    </div>

    <!-- R2: the supplements first (the owner), whey and creatine side by side -->
    {#if others.length}
      <h3 class="text-eyebrow text-ink-2 mt-8">{t.supplement.section}</h3>
      <div data-testid="supplements">
        {#snippet typical()}<SourceLabel source="typical" />{/snippet}
        {#each others as { id, data: s } (id)}
          <Row title={s.name} value={lastKcal(id, s)} unit={t.after.kcal} onclick={() => supplement(id)} testid="supplement">
            {#snippet caption()}<Facts facts={[t.supplement.amount(num(s.lastScoops, 1), !!s.lastMix && !noCalories(s)), s.typical && typical]} />{/snippet}
            {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><ShakerIcon /></div>{/snippet}
          </Row>
        {/each}
      </div>
      <Button variant="plain" size="sm" class="-ml-4" onclick={() => supplement(null)} data-testid="supplement-new">{t.supplement.setup}</Button>
    {/if}

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

  {/if}
</Sheet>
