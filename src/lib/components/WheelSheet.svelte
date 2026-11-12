<!-- DESIGN.md section 7, Wheel sheet: the title, a hint, the wheel, Clear when there is a value to clear, and the pinned
     Save. Mounted once in App.svelte; open it with picker.ask(). -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from './Sheet.svelte';
  import Button from './Button.svelte';
  import Wheel from './Wheel.svelte';
  import { picker } from '$lib/picker.svelte';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';

  const o = $derived(picker.opts);
  let value = $state(0);
  // the typed value that was brought inside the range, while its message shows
  let clamped = $state<number | null>(null);
  // every ask() assigns a fresh opts object: start from its value
  $effect(() => {
    const op = picker.opts;
    untrack(() => { value = op?.value ?? 0; clamped = null; });
  });

  function save() {
    haptic();
    picker.finish(value);
  }
</script>

<Sheet bind:open={() => picker.open, (v) => { if (!v) picker.finish(null); }} title={o?.title ?? ''} testid="picker" layer="top">
  {#if o}
    <p class="text-caption text-ink-2 min-h-[1lh]" role={clamped !== null ? 'alert' : undefined} data-testid="picker-hint">{clamped !== null && o.range ? o.range(clamped) : (o.hint ?? '')}</p>
    <div class="mt-2">
      <Wheel bind:value min={o.min} max={o.max} step={o.step} decimals={o.decimals} unit={o.unit} label={o.title} testid="picker-wheel" onchange={() => (clamped = null)} onclamp={(v) => (clamped = v)} />
    </div>
  {/if}
  {#snippet footer()}
    <div class="flex items-center gap-2">
      {#if o?.clearable}<Button variant="plain" onclick={() => picker.finish(0)} data-testid="picker-clear">{t.picker.clear}</Button>{/if}
      <Button variant="primary" size="lg" full class="flex-1" onclick={save} data-testid="picker-save">{o?.saveLabel ? o.saveLabel(value) : t.picker.save}</Button>
    </div>
  {/snippet}
</Sheet>
