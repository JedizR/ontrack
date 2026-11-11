<!-- DESIGN.md section 7, Keypad (ported from watermelon): the amount in Display with its unit above the keys.
     "+" adds amounts up. Mounted once; open it with keypad.ask(). -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Delete from '@lucide/svelte/icons/delete';
  import Sheet from './Sheet.svelte';
  import Button from './Button.svelte';
  import Chip from './Chip.svelte';
  import { keypad } from '$lib/keypad.svelte';
  import { evalSum, exprFrom, pressKey } from '$lib/model/expr';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';

  let expr = $state('');

  const o = $derived(keypad.opts);
  const value = $derived(evalSum(expr));
  const canSave = $derived(value > 0 || (!!o?.allowZero && expr !== ''));
  // while one amount is being typed, show its fraction as typed ("72." and "72.0"), so "." and "0" visibly land
  const shown = $derived(!expr.includes('+') && expr.includes('.') ? num(Math.trunc(value)) + expr.slice(expr.indexOf('.')) : num(value));

  // every ask() assigns a fresh opts object: reset the amount for it
  $effect(() => {
    const op = keypad.opts;
    untrack(() => (expr = exprFrom(op?.value)));
  });

  const press = (k: string) => (expr = pressKey(expr, k, { decimal: !!o?.decimal, plus: true }));
  function save() {
    if (!canSave) return;
    haptic();
    keypad.finish(Math.round(value * 100) / 100);
  }

  function onKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement)?.tagName;
    if (!keypad.open || tag === 'TEXTAREA' || tag === 'INPUT') return;
    if (/^[0-9]$/.test(e.key) || e.key === '.' || e.key === '+') press(e.key);
    else if (e.key === 'Backspace') press('back');
    else if (e.key === 'Enter') save();
    else return;
    e.preventDefault();
  }

  const KEYS = ['1', '2', '3', 'back', '4', '5', '6', 'clear', '7', '8', '9', '+', '00', '0', '.'];
  const LABEL: Record<string, string> = { back: t.keypad.back, clear: t.keypad.clear, '+': t.keypad.plus };
</script>

<svelte:window onkeydown={onKey} />

<Sheet bind:open={() => keypad.open, (v) => { if (!v) keypad.finish(null); }} title={o?.title ?? ''} testid="keypad" layer="top">
  <div class="flex flex-col gap-3">
    <div aria-live="polite">
      <div class="text-caption text-ink-2 h-[1lh] truncate" data-testid="keypad-expr">{expr.includes('+') ? expr.split('+').join(' + ') : (o?.hint ?? '')}</div>
      <div class="flex items-baseline gap-2" data-testid="keypad-value">
        <span class="text-display num truncate">{shown}</span>
        <span class="text-heading text-ink-2">{o?.unit}</span>
      </div>
    </div>

    {#if o?.chips?.length}
      <div class="-mx-5 flex gap-2 overflow-x-auto px-5" role="group">
        {#each o.chips as c (c.label + c.value)}
          <Chip onclick={() => { expr = exprFrom(c.value); haptic(); }}>{c.label}</Chip>
        {/each}
      </div>
    {/if}

    <div class="grid grid-cols-4 gap-2" role="group" aria-label={t.keypad.keys}>
      {#each KEYS as k (k)}
        <button
          type="button"
          class="bg-surface-2 active:bg-surface-3 text-key num grid h-[clamp(46px,6.4dvh,60px)] place-items-center rounded-sm transition-[transform,background-color] duration-[var(--d-press)] select-none active:scale-[0.97] disabled:opacity-40
            {k === '+' ? 'row-span-2 h-auto' : ''}"
          disabled={k === '.' && !o?.decimal}
          aria-label={LABEL[k] ?? k}
          data-key={k}
          onclick={() => press(k)}
        >
          {#if k === 'back'}<Delete size={24} strokeWidth={1.75} />{:else if k === 'clear'}{t.keypad.clearShort}{:else}{k}{/if}
        </button>
      {/each}
    </div>
  </div>

  {#snippet footer()}
    <Button variant="primary" size="lg" full disabled={!canSave} onclick={save} data-testid="keypad-save">
      {o?.saveLabel ? o.saveLabel(value) : t.keypad.save}
    </Button>
  {/snippet}
</Sheet>
