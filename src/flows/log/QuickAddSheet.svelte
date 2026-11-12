<!-- SCREENS.md section 7, Quick add: calories typed on the number pad in Display, focused on open; optional protein, carbs
     and fat on the decimal pad; an optional name; Add. Native fields, not type="number" (no spinners, no locale parsing). -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { deleteMeal, saveMeal, undoToast } from '$lib/actions';
  import { stampOn } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { parse } from '$lib/wheel';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';

  // one entry at a time: more than this is a typo, not a meal
  const MAX_KCAL = 10000;
  const MAX_GRAMS = 1000;
  type Macro = 'protein' | 'carbs' | 'fat';
  const MACROS: Macro[] = ['protein', 'carbs', 'fat'];

  let kcalText = $state('');
  let macroText = $state<Record<Macro, string>>({ protein: '', carbs: '', fat: '' });
  let name = $state('');

  $effect(() => {
    if (sheets.quick) untrack(() => { kcalText = ''; macroText = { protein: '', carbs: '', fat: '' }; name = ''; });
  });

  const kcal = $derived(Math.round(parse(kcalText)) || 0);
  const grams = (m: Macro) => (macroText[m].trim() ? parse(macroText[m]) : 0);
  const error = $derived(
    kcal > MAX_KCAL ? t.quick.tooMuch(num(MAX_KCAL))
    : MACROS.some((m) => !(grams(m) >= 0 && grams(m) <= MAX_GRAMS)) ? t.quick.tooMuchGrams(num(MAX_GRAMS))
    : '',
  );
  const ready = $derived(kcal > 0 && !error);

  function add() {
    if (!ready) return;
    const title = name.trim() || t.quick.title;
    const r1 = (g: number) => Math.round(g * 10) / 10;
    const id = saveMeal({
      date: view.date,
      at: stampOn(view.date),
      title,
      method: 'quick',
      items: [{ name: title, kcal, protein: r1(grams('protein')), carbs: r1(grams('carbs')), fat: r1(grams('fat')), source: 'manual' }],
    });
    haptic();
    sheets.quick = false;
    undoToast(t.add.logged(title), () => { deleteMeal(id); });
  }
  /** Enter moves to the next field, as the keyboard's Next key says */
  const onward = (id: string) => (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    document.getElementById(id)?.focus();
  };
  const field = 'input-field w-full min-w-0';
</script>

{#snippet footer()}
  <Button variant="primary" size="lg" full disabled={!ready} onclick={add} data-testid="quick-add">{t.search.add(num(kcal))}</Button>
{/snippet}

<Sheet bind:open={sheets.quick} title={t.quick.title} layer="base" testid="quick-sheet" {footer}>
  <div class="flex flex-col gap-5">
    <div>
      <label for="quick-kcal" class="text-eyebrow text-ink-2 block">{t.quick.calories}</label>
      <div class="mt-2 flex items-baseline gap-2">
        <input
          id="quick-kcal"
          type="text"
          inputmode="numeric"
          pattern="[0-9]*"
          autocomplete="off"
          enterkeyhint="next"
          placeholder="0"
          bind:value={kcalText}
          {@attach (el) => el.focus({ preventScroll: true })}
          onkeydown={onward('quick-protein')}
          class="text-display placeholder:text-ink-3 min-w-[2ch] bg-transparent outline-none"
          style="width: {Math.max(kcalText.length, 1) + 0.6}ch"
          data-testid="quick-kcal"
        />
        <span class="text-heading text-ink-2">{t.after.kcal}</span>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-2">
      {#each MACROS as m, i (m)}
        <div class="flex min-w-0 flex-col gap-2">
          <label for="quick-{m}" class="text-caption text-ink-2">{t.quick[m]}</label>
          <div class="relative">
            <input
              id="quick-{m}"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              enterkeyhint="next"
              placeholder={t.quick.optional}
              bind:value={macroText[m]}
              onkeydown={onward(i < 2 ? `quick-${MACROS[i + 1]}` : 'quick-name')}
              class="{field} num pr-7! pl-3!"
              data-testid="quick-{m}"
            />
            <span class="text-callout text-ink-2 pointer-events-none absolute top-1/2 right-3 -translate-y-1/2" aria-hidden="true">{t.after.g}</span>
          </div>
        </div>
      {/each}
    </div>

    <div class="flex flex-col gap-2">
      <label for="quick-name" class="text-caption text-ink-2">{t.quick.name}</label>
      <input id="quick-name" type="text" maxlength="120" enterkeyhint="done" placeholder={t.quick.optional} bind:value={name} class="{field}" data-testid="quick-name" />
    </div>
    <p class="text-callout text-attention min-h-[1lh]" role="alert" data-testid="quick-error">{error}</p>
  </div>
</Sheet>
