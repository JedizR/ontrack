<!-- DESIGN.md section 10: a number that counts to its value over --d-count, from `from` when it arrives, then from
     wherever it stands when the value changes. Reduced motion shows the value at once. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { untrack } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { num } from '$lib/model/format';
  import { dur } from '$lib/haptics';

  let {
    value,
    from,
    format = (v: number) => num(Math.round(v)),
    children,
  }: {
    value: number;
    /** where it counts from on arrival; none: it arrives at its value */
    from?: number;
    format?: (v: number) => string;
    /** renders the formatted text, as Figure does for a decimal */
    children?: Snippet<[string]>;
  } = $props();

  const shown = new Tween(untrack(() => from ?? value), { duration: () => dur('--d-count'), easing: cubicOut });
  $effect(() => { shown.target = value; });
  const text = $derived(format(shown.current));
</script>

{#if children}{@render children(text)}{:else}{text}{/if}
