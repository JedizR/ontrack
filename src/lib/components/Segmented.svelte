<!-- DESIGN.md section 7, Segmented control: a full radius track on surface-2, the selected segment on surface with a hairline.
     At most four options. Ported from watermelon: a radio group with arrow keys. -->
<script lang="ts" generics="T extends string | number">
  import { haptic } from '$lib/haptics';

  let { value = $bindable(), options, label, onchange }:
    { value: T; options: { value: T; label: string }[]; label: string; onchange?: (v: T) => void } = $props();

  function pick(v: T) {
    if (v === value) return;
    haptic();
    value = v;
    onchange?.(v);
  }
  function key(e: KeyboardEvent, i: number) {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + options.length) % options.length;
    pick(options[n].value);
    ((e.currentTarget as HTMLElement).parentElement?.children[n] as HTMLElement)?.focus();
  }
</script>

<div class="bg-surface-2 grid auto-cols-fr grid-flow-col gap-1 rounded-full p-1" role="radiogroup" aria-label={label}>
  {#each options as o, i (o.value)}
    {@const on = value === o.value}
    <button
      type="button"
      role="radio"
      aria-checked={on}
      tabindex={on ? 0 : -1}
      class="text-callout min-h-[var(--tap)] min-w-0 truncate rounded-full px-2 font-medium transition-[background-color,color] duration-[var(--d-press)] {on ? 'bg-surface text-ink ring-line ring-1' : 'text-ink-2 active:bg-surface-3'}"
      onclick={() => pick(o.value)}
      onkeydown={(e) => key(e, i)}
    >{o.label}</button>
  {/each}
</div>
