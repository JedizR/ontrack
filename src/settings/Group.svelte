<!-- One group of settings: an eyebrow (and a line when the group needs one) over its grey boxes. Bento: the boxes sit
     on the sheet. Tray: they sit in a white card, radius 32 with 8 inside, so a box at its corner is 24 (U1b). -->
<script lang="ts">
  import { prefs } from '$lib/prefs.svelte';
  import type { Snippet } from 'svelte';
  const tray = $derived(prefs.tray);

  let { id, title, line, children }: { id: string; title: string; line?: string; children: Snippet } = $props();
</script>

<div role="group" aria-labelledby={id} class="flex flex-col gap-2">
  <div class={tray ? 'px-6' : 'px-4'}>
    <h3 {id} class="text-eyebrow text-ink-2">{title}</h3>
    {#if line}<p class="text-callout text-ink-2 mt-1">{line}</p>{/if}
  </div>
  <div class="flex flex-col gap-2 {tray ? 'bg-surface shadow-card rounded-lg p-2' : ''}">{@render children()}</div>
</div>
