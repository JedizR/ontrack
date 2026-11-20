<!-- A choice of more than three as grey boxes, two to a line, the picked one ink (a radio group). Wraps at any text size,
     where four segments would cut their words. A tap picks and saves; nothing moves on by itself. -->
<script lang="ts" generics="T extends string | number">
  import { prefs } from '$lib/prefs.svelte';
  import { haptic } from '$lib/haptics';
  const tray = $derived(prefs.tray);

  let { value, options, label, onchange, testid }: {
    value: T;
    options: { value: T; label: string }[];
    label: string;
    onchange: (v: T) => void;
    testid?: string;
  } = $props();
</script>

<div class="grid grid-cols-2 gap-2" role="radiogroup" aria-label={label} data-testid={testid}>
  {#each options as o (o.value)}
    {@const on = o.value === value}
    <button
      type="button"
      role="radio"
      aria-checked={on}
      class="text-callout min-h-12 min-w-0 {tray ? 'rounded-md' : 'rounded-sm'} px-3 py-2 text-center font-semibold transition-[background-color,color] duration-[var(--d-ui)] {on ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink active:bg-surface-3'}"
      onclick={() => { if (!on) { haptic(); onchange(o.value); } }}
    >{o.label}</button>
  {/each}
</div>
