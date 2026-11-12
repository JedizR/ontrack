<!-- DESIGN.md section 7, Wheel: a bounded value picked on a wheel, as iOS does. Five rows, one band behind them, the unit
     once beside the band. With decimals there is a whole and a tenths column. Tapping the row on the band (or Enter)
     swaps in one text field for the whole value; a typed value is kept inside min and max and put on a row. -->
<script lang="ts">
  import { tick } from 'svelte';
  import WheelColumn from './WheelColumn.svelte';
  import { count, indexOf, join, parse, parseWhole, snap, split, valueAt } from '$lib/wheel';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';

  let {
    value = $bindable(),
    min,
    max,
    step = 1,
    decimals = 0,
    unit = '',
    label,
    testid,
    onchange,
    onclamp,
  }: {
    value: number;
    min: number;
    max: number;
    /** whole steps only; a decimal value uses `decimals` */
    step?: number;
    /** 1: a whole column and a tenths column */
    decimals?: 0 | 1;
    unit?: string;
    label: string;
    testid?: string;
    onchange?: (v: number) => void;
    /** a typed value fell outside min and max and was brought inside */
    onclamp?: (typed: number) => void;
  } = $props();

  function set(v: number) {
    if (v === value) return;
    value = v;
    onchange?.(v);
  }

  const lo = $derived(Math.floor(min));
  const parts = $derived(split(value));
  const text = (v: number) => `${decimals ? num(v, 1) : String(v)}${unit ? ` ${unit}` : ''}`;
  const rows = (from: number, n: number, by = 1) => Array.from({ length: n }, (_, i) => String(valueAt(i, from, by)));
  const single = $derived(decimals ? [] : rows(min, count(min, max, step), step));
  const wholes = $derived(decimals ? rows(lo, Math.floor(max) - lo + 1) : []);
  const TENTHS = rows(0, 10);

  // typing: one field over the band for the whole value
  let typing = $state(false);
  let field = $state<HTMLInputElement>();
  let box = $state<HTMLDivElement>();
  let cancelled = false;
  async function type() {
    typing = true;
    cancelled = false;
    await tick();
    field?.focus();
    field?.select();
  }
  function done(keep: boolean) {
    if (!typing) return;
    if (keep && !cancelled) {
      const v = (decimals ? parse : parseWhole)(field?.value ?? '');
      if (!Number.isNaN(v)) {
        set(snap(v, min, max, decimals ? 0.1 : step));
        if (v < min || v > max) onclamp?.(v);
      }
    }
    typing = false;
    // back to the column, for a keyboard user
    void tick().then(() => box?.querySelector<HTMLElement>('[role="slider"]')?.focus({ preventScroll: true }));
  }
</script>

<div bind:this={box} class="group relative w-full select-none" style="height: calc(5 * var(--wheel-row))" data-testid={testid}>
  <div class="bg-surface-2 ring-ink absolute inset-x-0 top-[calc(2*var(--wheel-row))] h-[var(--wheel-row)] rounded-sm group-has-[[role=slider]:focus-visible]:ring-2" aria-hidden="true"></div>
  <div class="relative flex h-full items-stretch justify-center">
    {#if decimals}
      <WheelColumn
        labels={wholes}
        bind:index={() => parts.whole - lo, (i) => set(join(lo + i, parts.tenth, min, max))}
        {label}
        min={lo}
        max={Math.floor(max)}
        valueOf={(i) => lo + i}
        textOf={(i) => text(join(lo + i, parts.tenth, min, max))}
        ontype={type}
      />
      <span class="num text-ink self-center font-semibold" style="font-size: var(--t-heading)" aria-hidden="true">.</span>
      <WheelColumn
        labels={TENTHS}
        bind:index={() => parts.tenth, (i) => set(join(parts.whole, i, min, max))}
        label={t.wheel.tenths(label)}
        min={0}
        max={9}
        valueOf={(i) => i}
        textOf={(i) => text(join(parts.whole, i, min, max))}
        ontype={type}
      />
    {:else}
      <WheelColumn
        labels={single}
        bind:index={() => indexOf(value, min, step), (i) => set(valueAt(i, min, step))}
        {label}
        {min}
        {max}
        valueOf={(i) => valueAt(i, min, step)}
        textOf={(i) => text(valueAt(i, min, step))}
        ontype={type}
      />
    {/if}
    {#if unit}<span class="text-ink-2 self-center pl-1 font-semibold" style="font-size: var(--t-body)" aria-hidden="true">{unit}</span>{/if}
  </div>
  {#if typing}
    <input
      bind:this={field}
      type="text"
      inputmode={decimals ? 'decimal' : 'numeric'}
      enterkeyhint="done"
      autocomplete="off"
      aria-label={label}
      value={decimals ? value.toFixed(1) : String(value)}
      class="bg-surface-2 num outline-ink absolute inset-x-0 top-[calc(2*var(--wheel-row))] h-[var(--wheel-row)] rounded-sm text-center font-semibold outline-2"
      style="font-size: max(16px, var(--t-heading))"
      data-vaul-no-drag
      onkeydown={(e) => {
        if (e.key === 'Enter') { e.preventDefault(); done(true); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cancelled = true; done(false); }
      }}
      onblur={() => done(true)}
    />
  {/if}
</div>
