<!-- DESIGN.md section 7, Segmented control: a radius 20 track on surface-2, the selected segment ink (section 4 rule 2;
     U1b: a raised white segment was under 3 to 1 against its track, so the state did not show in dark).
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

<div class="bg-surface-2 rounded-control grid auto-cols-fr grid-flow-col gap-1 p-1" role="radiogroup" aria-label={label}>
  {#each options as o, i (o.value)}
    {@const on = value === o.value}
    <button
      type="button"
      role="radio"
      aria-checked={on}
      tabindex={on ? 0 : -1}
      class="text-callout min-h-[var(--tap)] min-w-0 truncate rounded-sm px-2 font-semibold transition-[background-color,color,box-shadow] duration-[var(--d-ui)] ease-[var(--spring-default)] {on ? 'bg-ink text-canvas' : 'text-ink-2 active:bg-surface-3'}"
      onclick={() => pick(o.value)}
      onkeydown={(e) => key(e, i)}
    >{o.label}</button>
  {/each}
</div>
