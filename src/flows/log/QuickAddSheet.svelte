<!-- SCREENS.md section 7, Quick add: calories in Display on the keypad, which opens by itself; optional protein, carbs
     and fat as three small fields on the keypad; an optional name; Add. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { keypad } from '$lib/keypad.svelte';
  import { deleteMeal, saveMeal, undoToast } from '$lib/actions';
  import { stampOn } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';

  // one entry at a time: more than this is a typo, not a meal
  const MAX_KCAL = 10000;
  const MAX_GRAMS = 1000;
  type Macro = 'protein' | 'carbs' | 'fat';
  const MACROS: Macro[] = ['protein', 'carbs', 'fat'];

  let kcal = $state(0);
  let macros = $state<Record<Macro, number | null>>({ protein: null, carbs: null, fat: null });
  let name = $state('');
  let error = $state('');

  async function askKcal() {
    const v = await keypad.ask({ title: t.quick.calories, unit: t.after.kcal, value: kcal || null });
    if (v === null) return;
    if (v > MAX_KCAL) return void (error = t.quick.tooMuch(num(MAX_KCAL)));
    error = '';
    kcal = v;
  }
  async function askMacro(m: Macro) {
    const v = await keypad.ask({ title: t.quick[m], unit: t.after.g, decimal: true, allowZero: true, value: macros[m], hint: t.quick.optional });
    if (v === null) return;
    if (v > MAX_GRAMS) return void (error = t.quick.tooMuchGrams(num(MAX_GRAMS)));
    error = '';
    macros[m] = v;
  }

  $effect(() => {
    if (sheets.quick) untrack(() => {
      kcal = 0;
      macros = { protein: null, carbs: null, fat: null };
      name = '';
      error = '';
      void askKcal();
    });
  });

  function add() {
    if (kcal <= 0) return;
    const title = name.trim() || t.quick.title;
    const id = saveMeal({
      date: view.date,
      at: stampOn(view.date),
      title,
      method: 'quick',
      items: [{ name: title, kcal, protein: macros.protein ?? 0, carbs: macros.carbs ?? 0, fat: macros.fat ?? 0, source: 'manual' }],
    });
    haptic();
    sheets.quick = false;
    undoToast(t.add.logged(title), () => { deleteMeal(id); });
  }
</script>

{#snippet footer()}
  <Button variant="primary" size="lg" full disabled={kcal <= 0} onclick={add} data-testid="quick-add">{t.search.add(num(kcal))}</Button>
{/snippet}

<Sheet bind:open={sheets.quick} title={t.quick.title} layer="base" testid="quick-sheet" {footer}>
  <div class="flex flex-col gap-4">
    <button type="button" class="active:bg-surface-2 -mx-2 rounded-sm px-2 py-1 text-left transition-colors duration-[var(--d-press)]" onclick={askKcal} data-testid="quick-kcal">
      <span class="text-caption text-ink-2 block">{t.quick.calories}</span>
      <span class="flex items-baseline gap-2">
        <span class="text-display num">{num(kcal)}</span>
        <span class="text-heading text-ink-2">{t.after.kcal}</span>
      </span>
    </button>

    <div class="grid grid-cols-3 gap-2">
      {#each MACROS as m (m)}
        <button type="button" class="bg-surface-2 active:bg-surface-3 flex min-h-16 min-w-0 flex-col items-start justify-center rounded-sm px-3 py-2 text-left transition-colors duration-[var(--d-press)]" onclick={() => askMacro(m)} data-testid="quick-{m}">
          <span class="text-caption text-ink-2">{t.quick[m]}</span>
          {#if macros[m] === null}
            <span class="text-body text-ink-2">{t.quick.optional}</span>
          {:else}
            <span class="text-body num font-semibold">{num(macros[m]!, 1)} {t.after.g}</span>
          {/if}
        </button>
      {/each}
    </div>

    <div class="flex flex-col gap-2">
      <label for="quick-name" class="text-caption text-ink-2">{t.quick.name}</label>
      <input id="quick-name" type="text" maxlength="120" enterkeyhint="done" placeholder={t.quick.optional} bind:value={name} class="bg-surface-2 placeholder:text-ink-3 h-13 w-full rounded-sm px-4 outline-none focus-visible:outline-2 focus-visible:outline-ink" data-testid="quick-name" />
    </div>
    <p class="text-callout text-attention min-h-5" role="alert" data-testid="quick-error">{error}</p>
  </div>
</Sheet>
