<!-- SCREENS.md section 7, Supplement sheet (N2, F21): three steps in one sheet. Kind, from Add a supplement: six presets.
     Label: the name, the scoop and the values in one scoop on typed steppers, starting from the food table where USDA has
     the preset and following the scoop until a value is changed. Amount: live calories and macros, scoops in half steps
     from the last amount, water or a milk from the table, Add; with no calories it logs as taken. Opened from Today it
     edits the entry: Save changes and Delete. Ontrack never suggests a supplement or an amount.
     B1 (owner): setting up leads with the user's own tub, From your tub: scan its barcode or photograph its label, which
     fill the Label step from the serving and the scoops in it; typical values come second, and a supplement still on them
     says Typical, with one quiet way to set it from the tub.
     O1 (owner, after N2): the Label step follows the label: the serving as printed, the scoops in it and the values per
     serving; Ontrack keeps one scoop. Milk is set in millilitres and kept in grams through the milk's cup in the table. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
  import Camera from '@lucide/svelte/icons/camera';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import Scanner from './Scanner.svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Button from '$lib/components/Button.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { deleteMeal, findProduct, logSupplement, readLabel, removeSupplement, saveSupplement, undoToast, type Found, type LabelResult } from '$lib/actions';
  import { loadFoods, type Food } from '$lib/data/foods';
  import { FOOD_SOURCES } from '$lib/data/sources';
  import { GLASS_ML, MAX_MILK_G, MAX_SCOOPS, MILKS, PRESET_FOOD, fromServing, kindsFor, mlOf, gramsOf, noCalories, oneScoop, perScoopOf, scoopOf, scoopsIn, supplementItems, type Kind } from '$lib/model/supplements';
  import { per100From } from '$lib/model/products';
  import { planFor, totals } from '$lib/model/day';
  import { stampOn, today } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import { supplementSchema, type Meal, type Supplement } from '../../../shared/records';

  type Values = Supplement['perScoop'];
  /** each value, its step (half grams, for labels like 1.5 g), its unit and its label; one largest value (four digits)
   * keeps the steppers the same width, so the rows form columns */
  const NUTRIENTS: [keyof Values, number, string, string][] = [
    ['kcal', 10, t.after.kcal, t.quick.calories],
    ['protein', 0.5, t.after.g, t.quick.protein],
    ['carbs', 0.5, t.after.g, t.quick.carbs],
    ['fat', 0.5, t.after.g, t.quick.fat],
  ];

  type Step = 'kind' | 'source' | 'scan' | 'finding' | 'new' | 'reading' | 'label' | 'amount';
  let step = $state<Step>('kind');
  /** where the Label step's back chevron goes */
  let labelBack = $state<Step>('source');
  let scans = $state(0);
  let typing = $state(false);
  let found = $state<Found | null>(null);
  let failure = $state<Exclude<LabelResult, { ok: true }>['error'] | null>(null);
  let limit = $state(0);
  let input = $state<HTMLInputElement>();
  let code = $state('');
  /** the photo notice, before the first photo sent to Gemini (shared with the Photo tile) */
  let notice = $state(false);
  /** each lookup or label read gets a number; one that is no longer the latest is dropped (back, closed, retaken) */
  let ask = 0;
  let id = $state<string | null>(null);
  let mealId = $state<string | undefined>();
  // the label step, in the label's terms: a serving, the scoops in it, the values in it
  let kind = $state<Kind>('whey');
  let name = $state('');
  let servingG = $state(0);
  let per = $state(1);
  let preset = $state<Food | undefined>();
  /** values per 100 g from the tub (scanned or read) that the values per scoop follow, like a preset's */
  let base = $state<Values | undefined>();
  /** where the Label step's numbers came from, for its line on why */
  let origin = $state<'typical' | 'off' | 'label' | 'typed'>('typed');
  /** the user's values for a serving; null while a preset's follow the serving */
  let own = $state<Values | null>(null);
  /** the scoops the user takes, the first amount logged */
  let usual = $state(1);
  // the amount step
  let scoops = $state(1);
  let mix = $state<string | null>(null);
  let milkG = $state(0);

  let foods = $state<Food[] | null>(null);
  let failed = $state(false);
  async function load() {
    try {
      foods = await loadFoods();
      failed = false;
    } catch {
      failed = true;
      // no milk values: water, except on a logged entry, which must not lose its milk (Save waits for a choice)
      if (!mealId) mix = null;
    }
    return foods ?? [];
  }
  const byId = $derived(new Map((foods ?? []).map((f) => [f.id, f])));
  const milks = $derived(MILKS.flatMap((m) => byId.get(m) ?? []));

  const s = $derived(id ? db.get('supplement', id) : undefined);
  const values = $derived(own ?? perScoopOf(preset ?? (base && { per100: base }), servingG));
  /** what the supplement keeps: one scoop */
  const kept = $derived(oneScoop(servingG, per, values));
  /** still the table's typical values, untouched (B1) */
  const typical = $derived(origin === 'typical' && own === null && !!(preset || base));
  const heavy = $derived(servingG > 0 && values.protein + values.carbs + values.fat > servingG);
  const named = $derived(name.trim().length > 0);
  /** a scanned or read serving can give a scoop or values the record cannot hold; Save waits for them to be fixed */
  const savable = $derived(named && !heavy && supplementSchema.safeParse({ name: name.trim(), kind, ...kept, lastScoops: usual }).success);
  // gain puts whey and mass gainer first (O1); the list never recommends one
  const kinds = $derived(kindsFor(planFor(db.live('plan'), today())?.goal));

  const zero = $derived(!!s && noCalories(s));
  const milk = $derived(mix && !zero ? byId.get(mix) : undefined);
  const items = $derived(s && id ? supplementItems(id, s, scoops, milk ? { food: milk, grams: milkG, mine: db.get('food', milk.id)?.per100 } : undefined) : []);
  const sum = $derived(totals(items));
  // a milk still loading is not logged as water
  const ready = $derived(!mix || zero || !!milk);

  const close = () => { sheets.supplement = null; };
  function toAmount(sup: Supplement, logged?: Meal) {
    const mixed = logged ? logged.items.find((i) => i.foodId) : undefined;
    scoops = logged?.items[0]?.scoops ?? sup.lastScoops;
    mix = logged ? (mixed?.foodId ?? null) : (sup.lastMix?.foodId ?? null);
    milkG = (logged ? mixed?.grams : sup.lastMix?.grams) ?? 0;
    step = 'amount';
  }

  $effect(() => {
    const o = sheets.supplement;
    untrack(() => {
      ask++;
      notice = false;
      if (!o) return;
      if (!foods) void load();
      id = o.id;
      mealId = o.meal;
      if (!o.id) return void (step = 'kind');
      labelBack = 'amount';
      const sup = db.get('supplement', o.id);
      const logged = o.meal ? db.get('meal', o.meal) : undefined;
      if (!sup || (o.meal && !logged)) return close();
      toAmount(sup, logged);
    });
  });
  // removed on another device while open
  $effect(() => { if (sheets.supplement && id && !s) untrack(close); });

  /** A kind picked: From your tub. */
  function pick(k: Kind) {
    kind = k;
    name = k === 'other' ? '' : t.supplement.kinds[k];
    usual = 1;
    if (PRESET_FOOD[k] && !foods) void load();
    step = 'source';
  }
  /** The Label step with these numbers; `from` says where they came from. */
  function toLabel(o: { servingG: number; scoops?: number; base?: Values; own: Values | null; preset?: Food }, from: typeof origin) {
    servingG = o.servingG;
    per = o.scoops ?? 1;
    base = o.base;
    own = o.own;
    preset = o.preset;
    origin = from;
    labelBack = 'source';
    step = 'label';
  }
  async function useTypical() {
    const opened = sheets.supplement;
    const list = foods ?? (await load());
    if (sheets.supplement !== opened) return; // closed or opened elsewhere while the table loaded
    const food = list.find((f) => f.id === PRESET_FOOD[kind]);
    toLabel({ servingG: scoopOf(food), own: null, preset: food }, 'typical');
  }
  /** Typed from the label: empty when setting up, the current numbers when setting an existing one from its tub. */
  const typeIt = () => toLabel(s ? { servingG: s.scoopG, own: { ...s.perScoop } } : { servingG: 0, own: null }, 'typed');

  function scanTub() {
    scans++;
    typing = false;
    step = 'scan';
  }
  async function look(c: string) {
    const me = ++ask;
    code = c;
    step = 'finding';
    const r = await findProduct(c);
    if (me !== ask) return; // closed, gone back or scanned again meanwhile
    found = r;
    if (r.kind !== 'found') return void (step = 'new');
    const p = r.product;
    if (!id) name = p.name.slice(0, 60);
    toLabel(fromServing({ per100: p.per100, servingG: p.servingG, scoops: scoopsIn(p.serving) }), p.source === 'off' ? 'off' : p.source === 'label' ? 'label' : 'typed');
  }
  function photoTub() {
    if (!prefs.photoOk) return void (notice = true);
    input?.click();
  }
  async function taken() {
    const file = input?.files?.[0];
    if (input) input.value = '';
    if (!file || !sheets.supplement) return;
    const me = ++ask;
    failure = null;
    step = 'reading';
    const r = await readLabel(file, today());
    if (me !== ask) return;
    if (!r.ok) {
      limit = ('usage' in r && r.usage?.limit) || 0;
      return void (failure = r.error);
    }
    const l = r.label;
    toLabel(fromServing({ per100: l.per100, perServing: l.perServing, servingG: l.servingG, scoops: l.scoops }), 'label');
  }
  function editLabel() {
    if (!s) return;
    kind = s.kind;
    name = s.name;
    usual = s.lastScoops;
    // typical values keep following the scoop, so they stay typical until one is changed
    const follow = s.typical && s.scoopG > 0;
    // kept as one scoop, so it shows as a serving of one scoop
    toLabel(follow ? { servingG: s.scoopG, own: null, base: per100From(s.perScoop, s.scoopG) } : { servingG: s.scoopG, own: { ...s.perScoop } }, s.typical ? 'typical' : 'typed');
    labelBack = 'amount';
  }
  /** Set an existing supplement from its tub: the From your tub step, then back to its amount. */
  function define() {
    if (!s) return;
    kind = s.kind;
    name = s.name;
    usual = s.lastScoops;
    step = 'source';
  }
  // a field the user only touched (the stepper sets on blur) leaves a preset following the scoop
  const setValue = (key: keyof Values, v: number) => { if (values[key] !== v) own = { ...values, [key]: v }; };

  function save() {
    if (!savable) return;
    const lastMix = s?.lastMix;
    const data: Supplement = { name: name.trim(), kind, scoopG: kept.scoopG, perScoop: { ...kept.perScoop }, lastScoops: usual, ...(lastMix ? { lastMix: { foodId: lastMix.foodId, grams: lastMix.grams } } : {}), ...(typical ? { typical: true as const } : {}) };
    const isNew = !id;
    id = saveSupplement(data, id ?? undefined);
    if (isNew) toAmount(data);
    else {
      scoops = usual;
      step = 'amount';
    }
  }
  function removeIt() {
    if (!id || !s) return;
    const n = s.name;
    const undo = removeSupplement(id);
    close();
    undoToast(t.supplement.removed(n), undo);
  }

  /** A milk picked: the millilitres shown stay as they were (a glass the first time), its grams follow its own cup. */
  function choose(f: Food) {
    const was = milk ?? (s?.lastMix ? byId.get(s.lastMix.foodId) : undefined);
    const ml = was && milkG ? mlOf(was, milkG) : GLASS_ML;
    mix = f.id;
    milkG = Math.min(MAX_MILK_G, gramsOf(f, ml));
  }
  function add() {
    if (!s || !id || !ready) return;
    const m = milk ? { food: milk, grams: milkG } : null;
    if (mealId) {
      const logged = db.get('meal', mealId);
      if (logged) logSupplement(id, scoops, m, logged.date, logged.at, mealId);
      close();
      return void toast(t.toast.changesSaved);
    }
    const undo = logSupplement(id, scoops, m, view.date, stampOn(view.date));
    if (!undo) return;
    haptic();
    const said = zero ? t.supplement.tookToast(s.name) : t.add.logged(s.name);
    close();
    undoToast(said, undo);
  }
  function deleteEntry() {
    if (!mealId || !s) return;
    const n = s.name;
    const undo = deleteMeal(mealId);
    close();
    undoToast(t.supplement.deleted(n), undo);
  }

  const title = $derived(notice ? t.add.consentTitle : step === 'kind' ? t.supplement.setup : step !== 'amount' && !id ? t.supplement.kinds[kind] : (s?.name ?? ''));
  const back = $derived<(() => void) | undefined>(
    step === 'source' ? () => (step = id ? 'amount' : 'kind')
    : step === 'scan' && typing ? () => (typing = false)
    : step === 'scan' || step === 'new' || step === 'reading' ? () => { ask++; step = 'source'; }
    : step === 'label' ? () => (step = labelBack)
    : undefined,
  );
  const readWords = $derived(failure === 'offline' ? t.scan.readOffline : failure === 'not_food' ? t.scan.notLabel : failure === 'daily_limit' ? t.scan.limit(num(limit)) : t.scan.readFailed);
  const tiles = 'flex min-h-26 flex-col items-start gap-3 rounded-md p-4 text-left transition-[transform,background-color] duration-[var(--d-press)]';
</script>

{#snippet footer()}
  {#if step === 'new'}
    <Button variant="primary" size="lg" full onclick={photoTub} data-testid="tub-photo-new">{t.supplement.photoTub}</Button>
  {:else if step === 'label'}
    <Button variant="primary" size="lg" full disabled={!savable} onclick={save} data-testid="supplement-save">{id ? t.meal.save : t.supplement.save}</Button>
  {:else}
    <Button variant="primary" size="lg" full disabled={!ready} onclick={add} data-testid="supplement-add">{mealId ? t.meal.save : zero ? t.supplement.take : t.search.add(num(sum.kcal))}</Button>
  {/if}
{/snippet}

<!-- outside the sheet, so it is still there when the camera hands the photo back -->
<input bind:this={input} type="file" accept="image/*" capture="environment" hidden onchange={taken} data-testid="tub-input" />

<Sheet
  bind:open={() => sheets.supplement !== null, (v) => { if (!v) close(); }}
  {title}
  layer="base"
  testid="supplement-sheet"
  footer={!notice && (step === 'label' || step === 'amount' || step === 'new') ? footer : undefined}
  onback={notice ? undefined : back}
  backLabel={t.supplement.back}
>
  {#if step === 'kind'}
    <div data-testid="supplement-kinds">
      {#each kinds as k (k)}
        <Row title={t.supplement.kinds[k]} caption={t.supplement.fromTub} onclick={() => pick(k)} testid="kind-{k}">
          {#snippet trailing()}<ChevronRight class="text-ink-2 flex-none" size={24} strokeWidth={2} aria-hidden="true" />{/snippet}
        </Row>
      {/each}
    </div>
    <p class="text-caption text-ink-2 mt-3">{t.supplement.noAdvice}</p>
  {:else if notice}
    <p class="text-body" data-testid="photo-notice">{t.scan.consent}</p>
    <div class="mt-6 flex flex-col gap-2">
      <Button variant="primary" size="lg" full onclick={() => { prefs.photoOk = true; notice = false; input?.click(); }} data-testid="photo-continue">{t.add.consentContinue}</Button>
      <Button variant="plain" size="lg" full onclick={() => (notice = false)}>{t.add.consentNotNow}</Button>
    </div>
  {:else if step === 'source'}
    <div class="flex flex-col gap-4" data-testid="supplement-source">
      <p class="text-body">{t.supplement.tubLine}</p>
      <!-- the tub first: Scan is the step's featured way, the one solid violet card, as on the Add sheet -->
      <div class="grid grid-cols-2 gap-3">
        <button type="button" class="bg-accent text-on-accent active:bg-accent-press active:scale-[0.97] {tiles}" onclick={scanTub} data-testid="tub-scan">
          <span class="bg-on-accent/20 grid size-10 place-items-center rounded-sm"><ScanBarcode size={22} strokeWidth={2} /></span>
          <span><span class="text-body block font-semibold">{t.supplement.scanTub}</span><span class="text-caption block">{t.supplement.scanTubLine}</span></span>
        </button>
        <button type="button" class="bg-surface-2 active:bg-surface-3 active:scale-[0.97] {tiles}" onclick={photoTub} data-testid="tub-photo">
          <span class="bg-surface text-accent-ink ring-accent-soft grid size-10 place-items-center rounded-sm ring-1"><Camera size={22} strokeWidth={2} /></span>
          <span><span class="text-body block font-semibold">{t.supplement.photoTub}</span><span class="text-caption text-ink-2 block">{t.supplement.photoTubLine}</span></span>
        </button>
      </div>
      {#if !id && PRESET_FOOD[kind]}
        <Button variant="plain" size="sm" class="-ml-4 self-start" onclick={useTypical} data-testid="tub-typical">{t.supplement.typical}</Button>
      {:else}
        <Button variant="plain" size="sm" class="-ml-4 self-start" onclick={typeIt} data-testid="tub-type">{t.supplement.typeNumbers}</Button>
      {/if}
    </div>
  {:else if step === 'scan'}
    {#key scans}<Scanner oncode={look} bind:typing />{/key}
  {:else if step === 'finding' || (step === 'reading' && !failure)}
    <div class="flex flex-col gap-4" aria-busy="true">
      <p class="text-callout text-ink-2" aria-live="polite">{step === 'finding' ? t.scan.finding : t.scan.reading}</p>
      <!-- the Label step's sizes, which replaces it -->
      <Skeleton class="h-14 rounded-sm" />
      {#each [0, 1, 2, 3, 4] as i (i)}<Skeleton class="h-11 rounded-sm" />{/each}
    </div>
  {:else if step === 'new' || step === 'reading'}
    <div class="flex flex-col gap-3" data-testid="supplement-tub-failed">
      <p class="text-body" role="alert">{step === 'reading' ? readWords : found?.kind === 'offline' ? t.supplement.tubOffline : found?.kind === 'failed' ? t.scan.failed : t.supplement.tubMissing}</p>
      <div class="flex flex-wrap gap-2">
        {#if step === 'reading'}<Button onclick={photoTub} data-testid="tub-retry">{t.scan.retry}</Button>
        {:else if found?.kind === 'offline' || found?.kind === 'failed'}<Button onclick={() => look(code)} data-testid="tub-retry">{t.scan.retry}</Button>{/if}
        <Button variant="plain" onclick={typeIt} data-testid="tub-type">{t.supplement.typeNumbers}</Button>
        {#if !id && PRESET_FOOD[kind]}<Button variant="plain" onclick={useTypical} data-testid="tub-typical">{t.supplement.typical}</Button>{/if}
      </div>
    </div>
  {:else if step === 'label'}
    <div class="flex flex-col gap-5" data-testid="supplement-label">
      <div class="flex flex-col gap-2">
        <label for="supplement-name" class="text-caption text-ink-2">{t.supplement.name}</label>
        <input id="supplement-name" type="text" maxlength="60" enterkeyhint="done" autocomplete="off" bind:value={name} placeholder={t.supplement.nameHint} class="input-field w-full min-w-0" data-testid="supplement-name" />
      </div>
      <!-- at the largest text a stepper drops under its label, still on the right -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="text-body font-semibold">{t.supplement.serving}</span>
        <div class="ml-auto"><Stepper bind:value={servingG} min={0} max={1000} unit={t.after.g} label={t.after.grams} testid="supplement-serving" column /></div>
      </div>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="text-body font-semibold">{t.supplement.scoopsPer}</span>
        <div class="ml-auto"><Stepper bind:value={per} step={0.5} min={0.5} max={MAX_SCOOPS} label={t.supplement.scoopsPer} testid="supplement-per" column /></div>
      </div>
      <div class="flex flex-col gap-3">
        <h3 class="text-eyebrow text-ink-2">{t.supplement.perServing}</h3>
        {#each NUTRIENTS as [key, by, unit, label] (key)}
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="text-body font-semibold">{label}</span>
            <div class="ml-auto"><Stepper bind:value={() => values[key], (v) => setValue(key, v)} step={by} min={0} max={key === 'kcal' ? 2000 : 1000} {unit} {label} testid="supplement-{key}" column /></div>
          </div>
        {/each}
      </div>
      {#if heavy}
        <p class="text-callout text-attention" role="alert" data-testid="supplement-heavy">{t.supplement.heavy}</p>
      {:else if noCalories({ perScoop: values })}
        <p class="text-callout text-ink-2" data-testid="supplement-zero">{t.supplement.zero}</p>
      {/if}
      <p class="text-caption text-ink-2" data-testid="supplement-why">{origin === 'typical' ? t.supplement.why(FOOD_SOURCES['usda-sr-legacy'].name) : origin === 'off' ? t.supplement.fromOff : origin === 'label' ? t.supplement.fromPhoto : t.supplement.copy}</p>
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="text-body font-semibold">{t.supplement.usual}</span>
        <div class="ml-auto"><Stepper bind:value={usual} step={0.5} min={0.5} max={MAX_SCOOPS} label={t.supplement.scoops} testid="supplement-usual" column /></div>
      </div>
      {#if id}
        <Button variant="danger" class="-ml-5 self-start" onclick={removeIt} data-testid="supplement-remove">{t.supplement.remove}</Button>
      {/if}
    </div>
  {:else if s}
    <div class="flex flex-col gap-5" data-testid="supplement-amount">
      {#if zero}
        <p class="text-body text-ink-2" data-testid="supplement-zero">{t.supplement.zero}</p>
      {:else}
        <div aria-live="polite">
          <div class="flex items-baseline gap-2">
            <span class="text-display" data-testid="supplement-kcal">{num(sum.kcal)}</span>
            <span class="text-heading text-ink-2">{t.after.kcal}</span>
          </div>
          <p class="text-caption text-ink-2 mt-2" data-testid="supplement-macros">{t.search.macros(num(sum.protein, 1), num(sum.carbs, 1), num(sum.fat, 1))}</p>
        </div>
        {#if s.typical && !mealId}
          <!-- the one quiet nudge (B1): gone once it is set from the tub -->
          <div class="-my-3 flex flex-wrap items-center gap-x-2" data-testid="supplement-typical">
            <span class="text-caption text-ink-2"><SourceLabel source="typical" /></span>
            <Button variant="plain" size="sm" onclick={define} data-testid="supplement-define">{t.supplement.define}</Button>
          </div>
        {/if}
      {/if}
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="text-body font-semibold">{t.supplement.scoops}</span>
        <div class="ml-auto"><Stepper bind:value={scoops} step={0.5} min={0.5} max={MAX_SCOOPS} label={t.supplement.scoops} testid="supplement-scoops" column /></div>
      </div>
      {#if !zero}
        <div class="flex flex-col gap-2">
          <h3 class="text-eyebrow text-ink-2">{t.supplement.mix}</h3>
          <div class="-mx-6 flex gap-2 overflow-x-auto px-6" role="group" aria-label={t.supplement.mix} data-testid="supplement-mix">
            <Chip selected={!mix} onclick={() => (mix = null)}>{t.supplement.water}</Chip>
            {#each milks as f (f.id)}
              <Chip selected={mix === f.id} onclick={() => choose(f)}>{t.supplement.milks[f.id as keyof typeof t.supplement.milks] ?? f.name}</Chip>
            {/each}
          </div>
          {#if failed}<p class="text-caption text-ink-2" role="alert">{t.supplement.milkFailed}</p>{/if}
        </div>
        {#if milk}
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="text-body font-semibold">{t.supplement.milk}</span>
            <div class="ml-auto"><Stepper bind:value={() => mlOf(milk, milkG), (ml) => (milkG = Math.min(MAX_MILK_G, gramsOf(milk, ml)))} step={50} min={50} max={mlOf(milk, MAX_MILK_G)} unit={t.after.ml} label={t.after.millilitres} testid="supplement-milk" column /></div>
          </div>
        {/if}
      {/if}
      {#if mealId}
        <Button variant="danger" class="-ml-5 self-start" onclick={deleteEntry} data-testid="supplement-delete">{t.supplement.delete}</Button>
      {:else}
        <Button variant="plain" size="sm" class="-my-2 -ml-4 self-start" onclick={editLabel} data-testid="supplement-edit">{t.supplement.edit}</Button>
      {/if}
    </div>
  {/if}
</Sheet>
