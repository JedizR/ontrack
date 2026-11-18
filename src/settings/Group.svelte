<!-- One group of settings: an eyebrow (and a line when the group needs one) over a white card of grey boxes. The card is
     radius 32 with 8 inside, so a box at its corner is 24 (U1b). -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { id, title, line, children }: { id: string; title: string; line?: string; children: Snippet } = $props();
</script>

<div role="group" aria-labelledby={id} class="flex flex-col gap-2">
  <div class="px-6">
    <h3 {id} class="text-eyebrow text-ink-2">{title}</h3>
    {#if line}<p class="text-callout text-ink-2 mt-1">{line}</p>{/if}
  </div>
  <div class="bg-surface shadow-card flex flex-col gap-2 rounded-lg p-2">{@render children()}</div>
</div>
