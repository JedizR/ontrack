<!-- SCREENS.md section 7, Review sheet: the photo (or none, for a description), then skeleton rows while the meal is
     analysed. Then the editable title, the items as in the Meal sheet, "Cooked with oil?" when an item may hide fat, and
     pinned totals with Save meal and the main action. A failure replaces the skeleton with its message, Try again and
     Add by hand, which keeps the photo and builds the meal from Search. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Facts from '$lib/components/Facts.svelte';
  import Button from '$lib/components/Button.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Switch from '$lib/components/Switch.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { analyzeMeal, logReviewed, rememberFoods, saveAsMeal, undoToast, type Analyzed } from '$lib/actions';
  import { preparePhoto } from '$lib/photo';
  import { itemFor, loadFoods, type Food } from '$lib/data/foods';
  import { totals } from '$lib/model/day';
  import { atTime, stampOn, timeOf } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { fade } from 'svelte/transition';
  import { dur, haptic, ms } from '$lib/haptics';
  import { toast } from 'svelte-sonner';
  import { t } from '$lib/i18n';
  import ItemList from './ItemList.svelte';
  import ShareToMap from './ShareToMap.svelte';
  import { lineOf, lineWithMine, scaled, type Line } from './items';
  import { MAX_TEXT, type AnalysisItem, type AnalyzeRequest } from '../../../shared/analysis';
  import type { Meal, MealItem } from '../../../shared/records';

  const OIL_ID = 'oil-vegetable';
  const OIL = { none: '', tsp: '1 tsp', tbsp: '1 tbsp' } as const; // portion labels in the food table
  const RAW_MAX = 8000; // the model's reply is kept with the meal for evaluation, unless it is oddly large

  type Status = 'loading' | 'ready' | Exclude<Analyzed, { ok: true }>['error'];
  let status = $state<Status>('loading');
  // the step of the wait in words (U1c): the next every --d-step while a meal is being read, the last held
  const STEPS = t.review.steps.length; // after the first line
  let waited = $state(0);
  $effect(() => {
    if (status !== 'loading' || !sheets.review) return;
    waited = 0;
    const id = setInterval(() => { if (++waited >= STEPS) clearInterval(id); }, ms('--d-step'));
    return () => clearInterval(id);
  });
  let kind = $state<'photo' | 'text'>('photo');
  let photoUrl = $state<string | null>(null);
  let title = $state('');
  let lines = $state<Line[]>([]);
  let hidden = $state(false);
  let oil = $state<keyof typeof OIL>('none');
  let oilFood = $state<Food | null>(null);
  let keep = $state(false);
  let share = $state(false);
  let shareRow = $state<ShareToMap | null>(null);
  let original = $state.raw<Blob | null>(null); // the photo as taken: its location, if any, is read only when sharing
  let limit = $state(0);
  let thumb: Blob | null = null;
  let ai: Meal['ai'];
  let run = 0; // an answer for a sheet since closed or reopened is dropped

  $effect(() => {
    const r = sheets.review;
    untrack(() => { if (r) void start(r); });
  });

  function reset() {
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    photoUrl = null;
    thumb = null;
    ai = undefined;
    title = '';
    lines = [];
    hidden = keep = share = false;
    original = null;
    oil = 'none';
  }

  // R1, the owner: the estimate can be fixed with a sentence. The photo or the words are read again with it, and the
  // items and numbers come back new; a second sentence adds to the first
  let time = $state(''); // HH:MM the meal was eaten, from now
  let fixes = $state<string[]>([]);
  let fixText = $state('');
  const fixed = (r: NonNullable<typeof sheets.review>) => fixes.join('. ').slice(0, 300);
  function fix() {
    const said = fixText.trim();
    if (!said || !sheets.review) return;
    fixes = [...fixes, said];
    fixText = '';
    void start(sheets.review, true);
  }

  async function start(r: NonNullable<typeof sheets.review>, again = false) {
    const mine = ++run;
    reset();
    if (!again) { fixes = []; fixText = ''; }
    kind = r.kind;
    status = 'loading';
    waited = 0;
    let request: AnalyzeRequest;
    if (r.kind === 'text') request = { kind: 'text', text: fixes.length ? `${r.text}. Correction: ${fixed(r)}`.slice(0, MAX_TEXT) : r.text, localDate: view.today, locale: 'en' };
    else {
      const p = await preparePhoto(r.file).catch(() => null);
      if (mine !== run) return;
      if (!p) return void (status = 'bad_request');
      photoUrl = URL.createObjectURL(p.photo);
      thumb = p.thumb;
      original = r.file;
      request = { kind: 'photo', image: p.image, localDate: view.today, locale: 'en', ...(fixes.length ? { hint: fixed(r) } : {}) };
    }
    const res = await analyzeMeal(request);
    if (mine !== run) return;
    if (!res.ok) {
      if ('usage' in res && res.usage) limit = res.usage.limit;
      status = res.error;
      return;
    }
    const { analysis } = res;
    title = analysis.title;
    // the model named it and weighed it; numbers the user corrected for that food before come back as Yours (F15)
    lines = analysis.items.map((i) => lineWithMine(toItem(i)));
    hidden = analysis.items.some((i) => i.hiddenFat);
    // R2, the owner: most Thai cooking uses oil, so an item that may hide it starts at a teaspoon, not none
    oil = hidden ? 'tsp' : 'none';
    ai = JSON.stringify(analysis.raw).length > RAW_MAX ? { model: analysis.model } : { model: analysis.model, raw: analysis.raw };
    status = 'ready';
    time = timeOf(stampOn(view.date));
    if (hidden && !oilFood) oilFood = (await loadFoods().catch(() => [])).find((f) => f.id === OIL_ID) ?? null;
  }

  const toItem = (i: AnalysisItem): MealItem => ({
    name: i.name, grams: i.grams, kcal: i.kcal, protein: i.protein, carbs: i.carbs, fat: i.fat, source: i.source, confidence: i.confidence,
    ...(i.foodId ? { foodId: i.foodId } : {}),
  });

  const oilGrams = $derived(oilFood?.portions.find((p) => p.label === OIL[oil])?.grams ?? 0);
  const oilItem = $derived(oilFood && oilGrams ? itemFor(oilFood, oilGrams) : null);
  const items = $derived([...lines.map(scaled), ...(oilItem ? [oilItem] : [])]);
  const sum = $derived(totals(items));

  const message = $derived.by(() => {
    if (status === 'not_food') return kind === 'photo' ? t.review.notFood : t.review.notFoodText;
    if (status === 'daily_limit') return t.review.limit(num(limit));
    if (status === 'offline') return kind === 'photo' ? t.review.offline : t.review.offlineText;
    if (status === 'busy') return t.review.busy;
    return kind === 'photo' ? t.review.failed : t.review.failedText;
  });

  function close() {
    run++;
    sheets.review = null;
    reset();
  }
  function byHand() {
    status = 'ready';
    sheets.pick = (item) => lines.push(lineOf(item));
    sheets.search = true;
  }
  let saving = false;
  async function add() {
    if (!items.length || saving) return;
    const name = title.trim() || items[0].name;
    const meal: Meal = { date: view.date, at: /^\d\d:\d\d$/.test(time) ? atTime(view.date, time) : stampOn(view.date), title: title.trim(), method: kind, items, ...(ai ? { ai } : {}) };
    const mine = run;
    const row = shareRow;
    saving = true;
    try {
      // a position still being read goes with the meal (F17)
      const place = share && row ? (await row.settled(), row.position()) : null;
      if (mine !== run) return; // closed while the position was read
      // the sheet closes only once the meal is written, so a refused meal is never lost
      const undo = await logReviewed(meal, kind === 'photo' ? thumb : null, place ?? undefined).catch(() => null);
      if (!undo) return void toast(t.review.notSaved);
      rememberFoods(lines.filter((l) => l.corrected).map(scaled));
      if (keep) saveAsMeal(meal, name);
      const unplaced = share && !place;
      close();
      haptic();
      // the switch was on but no place came (the location sentence never answered): say so, never share it silently later
      undoToast(unplaced ? t.social.loggedUnplaced(name) : t.add.logged(name), undo);
    } finally {
      saving = false;
    }
  }
</script>

{#snippet footer()}
  <div class="flex items-center gap-3">
    <div class="num min-w-0 flex-1" data-testid="review-total"><p class="text-subhead">{num(Math.round(sum.kcal))}{' '}<span class="text-caption text-ink-2">{t.after.kcal}</span><span class="sr-only">{', '}</span></p><p class="text-callout text-ink-2">{t.after.proteinN(num(Math.round(sum.protein)))}</p></div>
    <span class="text-callout text-ink-2 flex-none" aria-hidden="true">{t.review.saveMeal}</span>
    <Switch bind:checked={keep} label={t.review.saveMeal} testid="review-keep" />
  </div>
  <Button variant="primary" size="lg" full class="mt-2" disabled={!items.length} onclick={add} data-testid="review-add">{t.review.add(num(Math.round(sum.kcal)))}</Button>
{/snippet}

<Sheet bind:open={() => sheets.review !== null, (v) => { if (!v) close(); }} title={t.review.title} layer="base" testid="review-sheet" footer={status === 'ready' ? footer : undefined}>
  {#if kind === 'photo'}
    {#if photoUrl}
      <!-- U1c: while it is read, a lavender line sweeps the photo, its band tinting what it has passed -->
      <div class="shadow-card relative overflow-hidden rounded-md">
        <img src={photoUrl} alt={t.review.photo} class="block aspect-[4/3] w-full object-cover" data-testid="review-photo" />
        {#if status === 'loading'}<div class="scan-sweep" aria-hidden="true" data-testid="review-sweep" out:fade={{ duration: dur('--d-fade') }}></div>{/if}
      </div>
    {:else if status === 'loading'}
      <Skeleton class="aspect-[4/3] w-full rounded-md" />
    {/if}
  {/if}

  {#if status === 'loading'}
    <!-- the wait in words: what is being done, a step every --d-step, the last held until the answer -->
    {@const said = [kind === 'photo' ? t.review.looking : t.review.reading, ...t.review.steps]}
    <p class="text-callout text-ink-2 mt-4 grid" role="status" data-testid="review-looking">
      {#key waited}<span class="[grid-area:1/1]" in:fade={{ duration: dur('--d-fade') }} out:fade={{ duration: dur('--d-fade') }}>{said[waited]}</span>{/key}
    </p>
    <!-- the shapes of the name field and three item rows, so nothing jumps when they arrive -->
    <Skeleton class="mt-4 h-14 w-full rounded-sm" />
    <div class="mt-4">
      {#each [0, 1, 2] as i (i)}
        <div class="border-line flex flex-col gap-2 border-t py-3 first:border-t-0">
          <div class="flex gap-4"><Skeleton class="h-5 flex-1 rounded-xs" /><Skeleton class="h-5 w-10 rounded-xs" /></div>
          <Skeleton class="h-4 w-20 rounded-xs" />
          <Skeleton class="mt-1 h-11 w-36 rounded-full" />
        </div>
      {/each}
    </div>
  {:else if status === 'ready'}
    <!-- R2: the name has the whole width (R1's Time beside it cut every name); the time is a small pill under it, as
         Bevel's Date row, and opens the phone's own picker -->
    <div class="mt-4 flex flex-col gap-2">
      <label for="review-title" class="text-caption text-ink-2">{t.meal.name}</label>
      <input id="review-title" type="text" maxlength="120" enterkeyhint="done" bind:value={title} placeholder={items[0]?.name ?? ''} class="input-field w-full min-w-0" data-testid="review-title" />
      <label class="text-callout text-ink-2 flex items-center gap-2 self-start">
        {t.meal.eatenAt}
        <input type="time" bind:value={time} class="num bg-surface-2 text-ink h-11 rounded-full px-4 text-[length:var(--t-body)] font-semibold" data-testid="review-time" />
      </label>
    </div>
    <!-- one item is kept free for the oil -->
    <ItemList bind:lines empty={t.review.empty} max={hidden ? 29 : 30}>
      {#if hidden && oilFood}
        <div class="border-line mt-4 border-t pt-4" data-testid="review-oil">
          <p class="text-body font-semibold">{t.review.oil}</p>
          <div class="mt-3">
            <Segmented bind:value={oil} label={t.review.oil} options={[{ value: 'none', label: t.review.oilNone }, { value: 'tsp', label: t.review.oilTsp }, { value: 'tbsp', label: t.review.oilTbsp }]} />
          </div>
          {#if oilItem}<p class="text-caption text-ink-2 mt-2" data-testid="review-oil-adds">{t.review.oilAdds(num(oilItem.kcal))}</p>{/if}
        </div>
      {/if}
    </ItemList>
    <!-- the fix: say what is wrong in a few words; the estimate is made again from the photo or the words and your note -->
    <form class="border-line mt-4 flex flex-col gap-2 border-t pt-4" onsubmit={(e) => { e.preventDefault(); fix(); }} data-testid="review-fix">
      <label for="review-fix-text" class="text-eyebrow text-ink-2">{t.review.fix}</label>
      <div class="flex items-center gap-2">
        <input id="review-fix-text" type="text" maxlength="120" enterkeyhint="send" bind:value={fixText} placeholder={t.review.fixHint} class="input-field w-full min-w-0 flex-1" data-testid="review-fix-text" />
        <Button size="md" disabled={!fixText.trim()} type="submit" data-testid="review-fix-send"><Sparkles size={20} strokeWidth={2.25} aria-hidden="true" />{t.review.fixSend}</Button>
      </div>
    </form>
    {#if kind === 'photo'}
      <ShareToMap bind:this={shareRow} bind:checked={share} file={original} title={t.social.share} line={t.social.shareLine} testid="review-share" />
    {/if}
  {:else}
    <div class="mt-4" role="alert" data-testid="review-error">
      <p class="text-body">{message}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        {#if status !== 'daily_limit'}<Button variant="primary" onclick={() => sheets.review && void start(sheets.review)} data-testid="review-retry">{t.review.retry}</Button>{/if}
        <Button onclick={byHand} data-testid="review-by-hand">{t.review.byHand}</Button>
      </div>
    </div>
  {/if}
</Sheet>
