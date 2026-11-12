<!-- SCREENS.md section 7, Supplement sheet (N2, F21): three steps in one sheet. Kind, from Add a supplement: six presets.
     Label: the name, the scoop and the values in one scoop on typed steppers, starting from the food table where USDA has
     the preset and following the scoop until a value is changed. Amount: live calories and macros, scoops in half steps
     from the last amount, water or a milk from the table, Add; with no calories it logs as taken. Opened from Today it
     edits the entry: Save changes and Delete. Ontrack never suggests a supplement or an amount. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Button from '$lib/components/Button.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { deleteMeal, logSupplement, removeSupplement, saveSupplement, undoToast } from '$lib/actions';
  import { loadFoods, type Food } from '$lib/data/foods';
  import { FOOD_SOURCES } from '$lib/data/sources';
  import { KINDS, MAX_SCOOPS, MILKS, PRESET_FOOD, noCalories, perScoopOf, scoopOf, supplementItems, type Kind } from '$lib/model/supplements';
  import { totals } from '$lib/model/day';
  import { stampOn } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import type { Meal, Supplement } from '../../../shared/records';

  type Values = Supplement['perScoop'];
  /** each value, its step (half grams, for labels like 1.5 g), its unit and its label; one largest value (four digits)
   * keeps the steppers the same width, so the rows form columns */
  const NUTRIENTS: [keyof Values, number, string, string][] = [
    ['kcal', 10, t.after.kcal, t.quick.calories],
    ['protein', 0.5, t.after.g, t.quick.protein],
    ['carbs', 0.5, t.after.g, t.quick.carbs],
    ['fat', 0.5, t.after.g, t.quick.fat],
  ];

  let step = $state<'kind' | 'label' | 'amount'>('kind');
  let id = $state<string | null>(null);
  let mealId = $state<string | undefined>();
  // the label step
  let kind = $state<Kind>('whey');
  let name = $state('');
  let scoopG = $state(0);
  let preset = $state<Food | undefined>();
  /** the user's values; null while a preset's follow the scoop */
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
      mix = null; // no milk values: water
    }
    return foods ?? [];
  }
  const byId = $derived(new Map((foods ?? []).map((f) => [f.id, f])));
  const milks = $derived(MILKS.flatMap((m) => byId.get(m) ?? []));

  const s = $derived(id ? db.get('supplement', id) : undefined);
  const values = $derived(own ?? perScoopOf(preset, scoopG));
  const heavy = $derived(scoopG > 0 && values.protein + values.carbs + values.fat > scoopG);
  const named = $derived(name.trim().length > 0);

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
      if (!o) return;
      if (!foods) void load();
      id = o.id;
      mealId = o.meal;
      if (!o.id) return void (step = 'kind');
      const sup = db.get('supplement', o.id);
      const logged = o.meal ? db.get('meal', o.meal) : undefined;
      if (!sup || (o.meal && !logged)) return close();
      toAmount(sup, logged);
    });
  });
  // removed on another device while open
  $effect(() => { if (sheets.supplement && id && !s) untrack(close); });

  async function pick(k: Kind) {
    kind = k;
    name = k === 'other' ? '' : t.supplement.kinds[k];
    own = null;
    usual = 1;
    const list = PRESET_FOOD[k] ? (foods ?? (await load())) : [];
    preset = list.find((f) => f.id === PRESET_FOOD[k]);
    scoopG = scoopOf(preset);
    step = 'label';
  }
  function editLabel() {
    if (!s) return;
    kind = s.kind;
    name = s.name;
    scoopG = s.scoopG;
    own = { ...s.perScoop };
    usual = s.lastScoops;
    preset = undefined;
    step = 'label';
  }
  const setValue = (key: keyof Values, v: number) => { own = { ...values, [key]: v }; };

  function save() {
    if (!named || heavy) return;
    const lastMix = s?.lastMix;
    const data: Supplement = { name: name.trim(), kind, scoopG, perScoop: { ...values }, lastScoops: usual, ...(lastMix ? { lastMix: { foodId: lastMix.foodId, grams: lastMix.grams } } : {}) };
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

  function choose(f: Food) {
    mix = f.id;
    if (!milkG) milkG = s?.lastMix?.grams ?? f.portions[0].grams;
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

  const title = $derived(step === 'kind' ? t.supplement.setup : step === 'label' && !id ? t.supplement.kinds[kind] : (s?.name ?? ''));
</script>

{#snippet footer()}
  {#if step === 'label'}
    <Button variant="primary" size="lg" full disabled={!named || heavy} onclick={save} data-testid="supplement-save">{id ? t.meal.save : t.supplement.save}</Button>
  {:else}
    <Button variant="primary" size="lg" full disabled={!ready} onclick={add} data-testid="supplement-add">{mealId ? t.meal.save : zero ? t.supplement.take : t.search.add(num(sum.kcal))}</Button>
  {/if}
{/snippet}

<Sheet
  bind:open={() => sheets.supplement !== null, (v) => { if (!v) close(); }}
  {title}
  layer="base"
  testid="supplement-sheet"
  footer={step === 'kind' ? undefined : footer}
  onback={step === 'label' ? () => (step = id ? 'amount' : 'kind') : undefined}
  backLabel={t.supplement.back}
>
  {#if step === 'kind'}
    <div data-testid="supplement-kinds">
      {#each KINDS as k (k)}
        <Row title={t.supplement.kinds[k]} caption={PRESET_FOOD[k] ? t.supplement.fromTable : t.supplement.fromLabel} onclick={() => pick(k)} testid="kind-{k}">
          {#snippet trailing()}<ChevronRight class="text-ink-2 flex-none" size={24} strokeWidth={2} aria-hidden="true" />{/snippet}
        </Row>
      {/each}
    </div>
    <p class="text-caption text-ink-2 mt-3">{t.supplement.noAdvice}</p>
  {:else if step === 'label'}
    <div class="flex flex-col gap-5" data-testid="supplement-label">
      <div class="flex flex-col gap-2">
        <label for="supplement-name" class="text-caption text-ink-2">{t.supplement.name}</label>
        <input id="supplement-name" type="text" maxlength="60" enterkeyhint="done" autocomplete="off" bind:value={name} placeholder={t.supplement.nameHint} class="input-field w-full min-w-0" data-testid="supplement-name" />
      </div>
      <!-- at the largest text a stepper drops under its label, still on the right -->
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="text-body font-semibold">{t.supplement.scoop}</span>
        <div class="ml-auto"><Stepper bind:value={scoopG} min={0} max={1000} unit={t.after.g} label={t.after.grams} testid="supplement-scoop" column /></div>
      </div>
      <div class="flex flex-col gap-3">
        <h3 class="text-eyebrow text-ink-2">{t.supplement.perScoop}</h3>
        {#each NUTRIENTS as [key, by, unit, label] (key)}
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span class="text-body font-semibold">{label}</span>
            <div class="ml-auto"><Stepper bind:value={() => values[key], (v) => setValue(key, v)} step={by} min={0} max={key === 'kcal' ? 2000 : 1000} {unit} {label} testid="supplement-{key}" column /></div>
          </div>
        {/each}
      </div>
      <p class="text-caption text-ink-2" data-testid="supplement-why">{preset ? t.supplement.why(FOOD_SOURCES[preset.source.set].name) : t.supplement.copy}</p>
      {#if heavy}
        <p class="text-callout text-attention" role="alert" data-testid="supplement-heavy">{t.supplement.heavy}</p>
      {:else if noCalories({ perScoop: values })}
        <p class="text-callout text-ink-2" data-testid="supplement-zero">{t.supplement.zero}</p>
      {/if}
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span class="text-body font-semibold">{t.supplement.usual}</span>
        <div class="ml-auto"><Stepper bind:value={usual} step={0.5} min={0.5} max={MAX_SCOOPS} label={t.supplement.scoops} testid="supplement-usual" column /></div>
      </div>
      {#if id}
        <Button variant="danger" class="self-start" onclick={removeIt} data-testid="supplement-remove">{t.supplement.remove}</Button>
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
      {/if}
      <div class="flex items-center justify-between gap-3">
        <span class="text-body font-semibold">{t.supplement.scoops}</span>
        <Stepper bind:value={scoops} step={0.5} min={0.5} max={MAX_SCOOPS} label={t.supplement.scoops} testid="supplement-scoops" />
      </div>
      {#if !zero}
        <div class="flex flex-col gap-2">
          <h3 class="text-eyebrow text-ink-2">{t.supplement.mix}</h3>
          <div class="-mx-6 flex gap-2 overflow-x-auto px-6" role="group" aria-label={t.supplement.mix} data-testid="supplement-mix">
            <Chip selected={!mix} onclick={() => (mix = null)}>{t.supplement.water}</Chip>
            {#each milks as f (f.id)}
              <Chip selected={mix === f.id} onclick={() => choose(f)}>{f.name}</Chip>
            {/each}
          </div>
          {#if failed}<p class="text-caption text-ink-2" role="alert">{t.supplement.milkFailed}</p>{/if}
        </div>
        {#if milk}
          <div class="flex items-center justify-between gap-3">
            <span class="text-body font-semibold">{t.supplement.milk}</span>
            <Stepper bind:value={milkG} step={50} min={50} max={1000} unit={t.after.g} label={t.after.grams} testid="supplement-milk" />
          </div>
        {/if}
      {/if}
      {#if mealId}
        <Button variant="danger" class="self-start" onclick={deleteEntry} data-testid="supplement-delete">{t.supplement.delete}</Button>
      {:else}
        <Button variant="plain" size="sm" class="-my-2 -ml-4 self-start" onclick={editLabel} data-testid="supplement-edit">{t.supplement.edit}</Button>
      {/if}
    </div>
  {/if}
</Sheet>
