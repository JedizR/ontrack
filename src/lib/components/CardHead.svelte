<!-- DESIGN.md section 7, Cards (U3): a card's head, as Shop's order cards and Airbnb's trip cards. The subject in an
     Eyebrow, the title or status in Subhead, why it matters in Meta, and at most one small action on the right. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { eyebrow, title, line, action, class: cls = '' }: {
    eyebrow?: string;
    title: string;
    line?: string;
    /** one small button beside the head */
    action?: Snippet;
    class?: string;
  } = $props();
</script>

<div class="flex items-center gap-3 {cls}">
  <div class="min-w-0 flex-1">
    {#if eyebrow}<p class="text-eyebrow text-ink-2 mb-1">{eyebrow}</p>{/if}
    <h2 class="text-subhead num">{title}</h2>
    {#if line}<p class="text-callout text-ink-2 mt-1">{line}</p>{/if}
  </div>
  {@render action?.()}
</div>
