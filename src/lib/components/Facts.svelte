<!-- DESIGN.md section 7, Facts (U1b): two or more facts on one line ("12:30 | Database"), apart by a short hairline, never
     a comma or a middle dot. The first keeps the line's colour; the rest are one step lighter (`rest`: ink-3 in a caption,
     ink-2 after ink). Screen readers hear a comma. A fact is text, or a snippet for one with a mark (the estimate circle). -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { facts, rest = 'text-ink-3', class: cls = '' }: {
    /** empty, false and null facts are skipped, so a caller can write `cond && fact` */
    facts: (string | Snippet | false | null | undefined)[];
    rest?: string;
    class?: string;
  } = $props();
  const shown = $derived(facts.filter((f): f is string | Snippet => !!f));
</script>

<!-- U3: every fact carries its divider on its left, and the row is pulled 16 past a clipping edge, so when the facts wrap
     (Meta is 14 now) the divider that would start a line is cut off and none is left hanging at a line's end -->
<span class="{cls} inline-flex overflow-hidden">
  <span class="-ml-4 inline-flex flex-wrap items-center">
    {#each shown as f, i (i)}<span class="before:bg-line-strong relative ml-2 pl-2 before:absolute before:top-1/2 before:left-0 before:h-[1em] before:w-px before:-translate-y-1/2 {i ? rest : ''}">{#if i}<span class="sr-only">{', '}</span>{/if}{#if typeof f === 'function'}{@render f()}{:else}{f}{/if}</span>{/each}
  </span>
</span>
