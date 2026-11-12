<!-- DESIGN.md section 7, Stepper: minus and plus as 44 px ink rounded squares (grey at a bound) around a number that can also be typed. Holding repeats.
     A typed number is kept inside min and max but not rounded to the step (125 g stays 125); the buttons go on from it. -->
<script lang="ts">
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import { parse, parseWhole } from '$lib/wheel';
  import { t } from '$lib/i18n';

  let {
    value = $bindable(),
    step = 1,
    min = 0,
    max = Infinity,
    unit = '',
    label,
    testid,
    column = false,
  }: {
    value: number;
    step?: number;
    min?: number;
    max?: number;
    unit?: string;
    /** what is counted, "grams" */
    label: string;
    testid?: string;
    /** steppers stacked in rows: the number right aligned in at least four digits and the unit in a fixed slot, kept
     * without a unit too, so rows form columns */
    column?: boolean;
  } = $props();

  const fit = (v: number) => Math.min(max, Math.max(min, v));
  /** one step, kept inside min and max; false when already at the edge */
  function nudge(d: 1 | -1) {
    const next = fit(Math.round((value + d * step) * 100) / 100);
    if (next === value) return false;
    value = next;
    return true;
  }

  // A tap steps once, on click, so a scroll or sheet drag that starts on a button changes nothing.
  // Holding repeats after 400 ms, every 80 ms, until the edge; the click that ends a repeating hold is skipped.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let repeated = false;
  const stop = () => clearTimeout(timer);
  function hold(d: 1 | -1) {
    stop();
    repeated = false;
    const again = (ms: number) => (timer = setTimeout(() => { repeated = true; if (nudge(d)) again(80); }, ms));
    again(400);
  }
  function tap(d: 1 | -1) {
    if (repeated) repeated = false;
    else nudge(d);
  }
  $effect(() => stop);

  // a whole number counter (days, sets, minutes) keeps whole numbers; grams keep what was typed
  const whole = $derived(step % 1 === 0 && min % 1 === 0);
  function typed(el: HTMLInputElement) {
    const v = whole ? Math.round(parseWhole(el.value)) : parse(el.value);
    if (!Number.isNaN(v)) value = fit(v);
    el.value = String(value);
  }
  // the field is as wide as its number, so the unit follows it; the label keeps room for the longest
  const longest = $derived(Math.max(String(Number.isFinite(max) ? max : value).length, column ? 4 : 2));
  let editing = $state(false);
</script>

{#snippet key(d: 1 | -1)}
  {@const Icon = d === 1 ? Plus : Minus}
  <button
    type="button"
    class="bg-action text-on-action active:bg-action-press disabled:bg-surface-2 disabled:text-ink-3 grid size-11 flex-none place-items-center rounded-sm transition-[transform,background-color] duration-[var(--d-press)] select-none active:scale-[0.97]"
    aria-label={d === 1 ? t.stepper.more(label) : t.stepper.less(label)}
    disabled={d === 1 ? value >= max : value <= min}
    onpointerdown={(e) => { if (e.button === 0) hold(d); }}
    onpointerup={stop}
    onpointerleave={stop}
    onpointercancel={stop}
    oncontextmenu={(e) => e.preventDefault()}
    onclick={() => tap(d)}
  >
    <Icon size={24} strokeWidth={2} />
  </button>
{/snippet}

<div class="flex items-center gap-2" data-testid={testid}>
  {@render key(-1)}
  <label class="active:bg-surface-2 flex h-11 items-baseline {column ? 'justify-end' : 'justify-center'} gap-1 rounded-sm px-1 transition-colors duration-[var(--d-press)]" style="min-width: calc({longest + 1}ch + {column ? 2.7 : unit ? 2 : 0}em)">
    <input
      type="text"
      inputmode={step % 1 ? 'decimal' : 'numeric'}
      enterkeyhint="done"
      autocomplete="off"
      aria-label={label}
      value={String(value)}
      class="num h-11 min-w-11 bg-transparent {column || unit ? 'text-right' : 'text-center'} font-semibold outline-none focus-visible:underline"
      style="width: {(editing || column ? longest : Math.max(String(value).length, 1)) + 0.5}ch; font-size: max(16px, var(--t-heading))"
      data-vaul-no-drag
      onfocus={(e) => { editing = true; e.currentTarget.select(); }}
      onkeydown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      onchange={(e) => typed(e.currentTarget)}
      onblur={(e) => { editing = false; typed(e.currentTarget); }}
    />
    {#if unit || column}<span class="text-ink-2 text-callout font-semibold {column ? 'w-[2.4em]' : ''}" aria-hidden="true">{unit}</span>{/if}
  </label>
  {@render key(1)}
</div>
