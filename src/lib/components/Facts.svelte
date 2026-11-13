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

<span class="{cls} inline-flex flex-wrap items-center gap-x-2">
  {#each shown as f, i (i)}{#if i}<span class="bg-line-strong h-[1em] w-px flex-none" aria-hidden="true"></span><span class="sr-only">{', '}</span>{/if}<span class={i ? rest : ''}>{#if typeof f === 'function'}{@render f()}{:else}{f}{/if}</span>{/each}
</span>
