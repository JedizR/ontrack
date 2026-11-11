<!-- DESIGN.md section 7, Stepper: minus and plus as 44 px circles around a rounded number. Holding repeats. -->
<script lang="ts">
  import Minus from '@lucide/svelte/icons/minus';
  import Plus from '@lucide/svelte/icons/plus';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';

  let {
    value = $bindable(),
    step = 1,
    min = 0,
    max = Infinity,
    unit = '',
    label,
  }: { value: number; step?: number; min?: number; max?: number; unit?: string; /** what is counted, "grams" */ label: string } = $props();

  /** one step, kept inside min and max; false when already at the edge */
  function nudge(d: 1 | -1) {
    const next = Math.min(max, Math.max(min, Math.round((value + d * step) * 100) / 100));
    if (next === value) return false;
    value = next;
    return true;
  }

  // a press steps once; holding repeats after 400 ms, every 80 ms, until the edge
  let timer: ReturnType<typeof setTimeout> | undefined;
  function hold(d: 1 | -1) {
    if (!nudge(d)) return;
    const again = (ms: number) => (timer = setTimeout(() => { if (nudge(d)) again(80); }, ms));
    again(400);
  }
  const stop = () => clearTimeout(timer);
  $effect(() => stop);
</script>

{#snippet key(d: 1 | -1)}
  {@const Icon = d === 1 ? Plus : Minus}
  <button
    type="button"
    class="bg-surface-2 active:bg-surface-3 grid size-11 flex-none place-items-center rounded-full transition-[transform,background-color] duration-[var(--d-press)] select-none active:scale-[0.97] disabled:opacity-40"
    aria-label={d === 1 ? t.stepper.more(label) : t.stepper.less(label)}
    disabled={d === 1 ? value >= max : value <= min}
    onpointerdown={(e) => { if (e.button === 0) hold(d); }}
    onpointerup={stop}
    onpointerleave={stop}
    onpointercancel={stop}
    oncontextmenu={(e) => e.preventDefault()}
    onclick={(e) => { if (e.detail === 0) nudge(d); /* keyboard; pointer presses step on pointerdown */ }}
  >
    <Icon size={24} strokeWidth={1.75} />
  </button>
{/snippet}

<div class="flex items-center gap-3">
  {@render key(-1)}
  <output class="text-heading num min-w-16 text-center" aria-live="polite">{num(value)}{unit ? ` ${unit}` : ''}</output>
  {@render key(1)}
</div>
