<!-- SCREENS.md section 7, Scan sheet (B1, F22): the camera or the typed number, then the product from the user's products
     or Open Food Facts with live calories, portion chips and the amount, Add. A product Open Food Facts does not have, or
     has without nutrition, is read from a photo of its label (printed values only) or typed, confirmed on the Label step
     and kept for the next scan. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Button from '$lib/components/Button.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import Scanner from './Scanner.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { findProduct, logProduct, readLabel, saveProduct, undoToast, type Found, type LabelResult } from '$lib/actions';
  import { OFF_SOURCE } from '$lib/data/sources';
  import { ZERO, labelProblem, per100From, portionsOf, scaleTo, startOf, type Macros } from '$lib/model/products';
  import { stampOn, today } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import type { LabelRead } from '../../../shared/analysis';
  import type { Product } from '../../../shared/records';

  type Step = 'scan' | 'finding' | 'product' | 'new' | 'failed' | 'reading' | 'label';
  const NUTRIENTS: [keyof Macros, number, string][] = [['kcal', 10, t.quick.calories], ['protein', 0.5, t.quick.protein], ['carbs', 0.5, t.quick.carbs], ['fat', 0.5, t.quick.fat]];
  const r1 = (n: number) => Math.round(n * 10) / 10;

  let step = $state<Step>('scan');
  let scans = $state(0); // a new Scanner for each scan
  let code = $state('');
  let found = $state<Found | null>(null);
  let product = $state<Product | null>(null);
  let grams = $state(100);
  // the Label step
  let name = $state('');
  let unit = $state<'g' | 'ml'>('g');
  let servingG = $state(0);
  let values = $state<Macros>({ ...ZERO });
  let packG = $state<number | undefined>();
  /** what the photo read, to tell Label (kept as read) from Yours (changed) */
  let read = $state<string | null>(null);
  let correcting = $state(false);
  let failure = $state<Exclude<LabelResult, { ok: true }>['error'] | null>(null);
  let limit = $state(0);
  let input = $state<HTMLInputElement>();

  $effect(() => {
    if (sheets.scan) untrack(() => { step = 'scan'; scans++; product = null; found = null; });
  });

  const item = $derived(product ? scaleTo(product.per100, grams) : ZERO);
  const u = $derived(product?.unit ?? unit);
  const unitWord = (x: 'g' | 'ml') => (x === 'ml' ? t.after.ml : t.after.g);
  const problem = $derived(labelProblem(servingG, values));
  const named = $derived(name.trim().length > 0);
  const snapshot = () => JSON.stringify([servingG, values]);

  async function look(c: string) {
    code = c;
    step = 'finding';
    const r = await findProduct(c);
    if (!sheets.scan || code !== c) return; // closed or scanned again meanwhile
    found = r;
    if (r.kind === 'found') {
      product = r.product;
      grams = startOf(r.product);
      step = 'product';
    } else step = r.kind === 'empty' || r.kind === 'missing' ? 'new' : 'failed';
  }
  function again() {
    scans++;
    step = 'scan';
  }

  /** The Label step, empty or with numbers to confirm. */
  function toLabel(o: { unit?: 'g' | 'ml'; servingG?: number; values?: Macros; packG?: number; name?: string } = {}, fromPhoto = false) {
    name = o.name || (found?.kind === 'empty' ? found.name : '');
    unit = o.unit ?? 'g';
    servingG = o.servingG ?? 0;
    values = { ...(o.values ?? ZERO) };
    packG = o.packG;
    read = fromPhoto ? snapshot() : null;
    failure = null;
    step = 'label';
  }
  function typeIt() {
    correcting = false;
    toLabel();
  }
  function correct() {
    if (!product) return;
    correcting = true;
    const s = product.servingG ?? 100;
    toLabel({ name: product.name, unit: product.unit, servingG: s, values: scaleTo(product.per100, s), packG: product.packG });
  }
  /** A label as read: the serving's numbers when printed, else the 100 g column on a 100 g serving. */
  function fromRead(l: LabelRead) {
    const s = l.servingG ?? (l.perServing ? 0 : 100);
    const v = l.perServing ?? (l.per100 ? scaleTo(l.per100, s || 100) : ZERO);
    toLabel({ name: l.name, unit: l.unit, servingG: s, values: v, packG: l.servingsPerPack && s ? r1(s * l.servingsPerPack) : undefined }, true);
  }

  function photo() {
    correcting = false;
    input?.click();
  }
  async function taken() {
    const file = input?.files?.[0];
    if (input) input.value = '';
    if (!file) return;
    failure = null;
    step = 'reading';
    const at = code;
    const r = await readLabel(file, today());
    if (!sheets.scan || code !== at || step !== 'reading') return;
    if (r.ok) return fromRead(r.label);
    failure = r.error;
    limit = ('usage' in r && r.usage?.limit) || 0;
  }

  function saveLabel() {
    if (!named || problem) return;
    const keep = product && correcting ? { brand: product.brand, lastG: product.lastG } : found?.kind === 'empty' ? { brand: found.brand } : {};
    const p: Product = {
      name: name.trim(),
      ...(keep.brand ? { brand: keep.brand } : {}),
      source: read !== null && read === snapshot() ? 'label' : 'yours',
      unit,
      per100: per100From(values, servingG),
      servingG,
      ...(packG ? { packG } : {}),
      ...(keep.lastG ? { lastG: keep.lastG } : {}),
    };
    saveProduct(p, code);
    product = p;
    grams = startOf(p);
    correcting = false;
    step = 'product';
  }

  function add() {
    if (!product || !grams) return;
    haptic();
    const undo = logProduct(code, product, grams, view.date, stampOn(view.date));
    const title = product.name;
    sheets.scan = false;
    undoToast(t.add.logged(title), undo);
  }

  const readWords = $derived(
    failure === 'offline' ? t.scan.readOffline
    : failure === 'not_food' ? t.scan.notLabel
    : failure === 'daily_limit' ? t.scan.limit(num(limit))
    : t.scan.readFailed,
  );
  const title = $derived(
    step === 'product' && product ? product.name
    : step === 'new' ? t.scan.newTitle
    : step === 'label' || step === 'reading' ? (correcting ? t.scan.correct : t.scan.checkTitle)
    : t.scan.title,
  );
  const back = $derived<(() => void) | undefined>(
    step === 'product' || step === 'new' || step === 'failed' ? again
    : step === 'reading' ? () => (step = 'new')
    : step === 'label' ? () => (step = correcting ? 'product' : found?.kind === 'found' ? 'product' : 'new')
    : undefined,
  );
</script>

{#snippet footer()}
  {#if step === 'product'}
    <Button variant="primary" size="lg" full disabled={!grams} onclick={add} data-testid="product-add">{t.search.add(num(item.kcal))}</Button>
  {:else if step === 'new'}
    <Button variant="primary" size="lg" full onclick={photo} data-testid="label-photo">{t.scan.photo}</Button>
  {:else if step === 'label'}
    <Button variant="primary" size="lg" full disabled={!named || !!problem} onclick={saveLabel} data-testid="label-save">{correcting ? t.meal.save : t.scan.save}</Button>
  {/if}
{/snippet}

{#snippet pending(words: string)}
  <div class="flex flex-col gap-4" aria-busy="true">
    <p class="text-callout text-ink-2" aria-live="polite">{words}</p>
    <Skeleton class="h-12 w-40 rounded-sm" />
    <Skeleton class="h-11 rounded-sm" />
    <Skeleton class="h-11 rounded-sm" />
  </div>
{/snippet}

<!-- outside the sheet, so it is still there when the camera hands the photo back -->
<input bind:this={input} type="file" accept="image/*" capture="environment" hidden onchange={taken} data-testid="label-input" />

<Sheet
  bind:open={sheets.scan}
  {title}
  layer="base"
  testid="scan-sheet"
  footer={step === 'product' || step === 'new' || step === 'label' ? footer : undefined}
  onback={back}
  backLabel={t.scan.back}
>
  {#if step === 'scan'}
    {#key scans}<Scanner oncode={look} />{/key}
  {:else if step === 'finding'}
    {@render pending(t.scan.finding)}
  {:else if step === 'product' && product}
    <div class="flex flex-col gap-5" data-testid="product">
      <div aria-live="polite">
        {#if product.brand}<p class="text-caption text-ink-2 mb-1" data-testid="product-brand">{product.brand}</p>{/if}
        <div class="flex items-baseline gap-2">
          <span class="text-display" data-testid="product-kcal">{num(item.kcal)}</span>
          <span class="text-heading text-ink-2">{t.after.kcal}</span>
        </div>
        <p class="text-caption text-ink-2 mt-2">{t.search.macros(num(item.protein, 1), num(item.carbs, 1), num(item.fat, 1))}</p>
        <p class="text-caption text-ink-2 mt-1" data-testid="product-source"><SourceLabel source={product.source} /></p>
      </div>
      <div class="-mx-6 flex gap-2 overflow-x-auto px-6" role="group" aria-label={t.search.portion}>
        {#each portionsOf(product) as p (p.key)}
          <Chip selected={grams === p.grams} onclick={() => (grams = p.grams)}>{p.key === 'hundred' ? t.scan.portions.hundred(unitWord(u)) : t.scan.portions[p.key]}</Chip>
        {/each}
      </div>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-body font-semibold">{t.scan.amount}</span>
        <Stepper bind:value={grams} step={10} min={1} max={20000} unit={unitWord(u)} label={u === 'ml' ? t.after.millilitres : t.after.grams} testid="product-grams" />
      </div>
      <Button variant="plain" size="sm" class="-my-2 -ml-4 self-start" onclick={correct} data-testid="product-correct">{t.scan.correct}</Button>
      {#if product.source === 'off'}
        <p class="text-caption text-ink-2" data-testid="product-cite">
          {t.search.from(OFF_SOURCE.name)}
          <a href={OFF_SOURCE.terms} target="_blank" rel="noopener" class="relative underline after:absolute after:-inset-x-2 after:-inset-y-4">{t.search.terms}</a>
        </p>
      {/if}
    </div>
  {:else if step === 'new'}
    <div class="flex flex-col gap-3" data-testid="product-new">
      <p class="text-body">{found?.kind === 'empty' ? t.scan.empty : t.scan.missing}</p>
      <p class="text-caption text-ink-2 num">{t.scan.code(code)}</p>
      <Button variant="plain" class="-ml-5 self-start" onclick={typeIt} data-testid="label-type">{t.scan.typeLabel}</Button>
    </div>
  {:else if step === 'failed'}
    <div class="flex flex-col gap-3" data-testid="product-failed">
      <p class="text-body" role="alert">{found?.kind === 'offline' ? t.scan.offline : t.scan.failed}</p>
      <div class="flex flex-wrap gap-2">
        <Button onclick={() => look(code)} data-testid="product-retry">{t.scan.retry}</Button>
        <Button variant="plain" onclick={typeIt} data-testid="label-type">{t.scan.typeLabel}</Button>
      </div>
    </div>
  {:else if step === 'reading'}
    {#if failure}
      <div class="flex flex-col gap-3" data-testid="label-failed">
        <p class="text-body" role="alert">{readWords}</p>
        <div class="flex flex-wrap gap-2">
          <Button onclick={photo} data-testid="label-retry">{t.scan.retry}</Button>
          <Button variant="plain" onclick={typeIt} data-testid="label-type">{t.scan.typeLabel}</Button>
        </div>
      </div>
    {:else}
      {@render pending(t.scan.reading)}
    {/if}
  {:else if step === 'label'}
    <div class="flex flex-col gap-5" data-testid="label">
      <div class="flex flex-col gap-2">
        <label for="product-name" class="text-caption text-ink-2">{t.scan.name}</label>
        <input id="product-name" type="text" maxlength="120" enterkeyhint="done" autocomplete="off" bind:value={name} placeholder={t.scan.nameHint} class="input-field w-full min-w-0" data-testid="label-name" />
      </div>
      <!-- at the largest text a stepper drops under its label, still on the right -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="text-body font-semibold">{t.scan.serving}</span>
        <div class="ml-auto"><Stepper bind:value={servingG} step={5} min={0} max={5000} unit={unitWord(unit)} label={unit === 'ml' ? t.after.millilitres : t.after.grams} testid="label-serving" column /></div>
      </div>
      <div class="flex flex-col gap-3">
        <h3 class="text-eyebrow text-ink-2">{t.scan.perServing}</h3>
        {#each NUTRIENTS as [key, by, label] (key)}
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="text-body font-semibold">{label}</span>
            <div class="ml-auto"><Stepper bind:value={values[key]} step={by} min={0} max={key === 'kcal' ? 5000 : 1000} unit={key === 'kcal' ? t.after.kcal : t.after.g} {label} testid="label-{key}" column /></div>
          </div>
        {/each}
      </div>
      {#if problem && (problem !== 'serving' || values.kcal || values.protein || values.carbs || values.fat)}
        <p class="text-callout text-attention" role="alert" data-testid="label-problem">{problem === 'heavy' ? t.scan.heavy : problem === 'kcal' ? t.scan.tooMuch : t.scan.noServing}</p>
      {/if}
      <p class="text-caption text-ink-2">{t.scan.check}</p>
    </div>
  {/if}
</Sheet>
