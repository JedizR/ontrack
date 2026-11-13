<!-- DESIGN.md section 7, Cards (U3): a card's head, as Shop's order cards and Airbnb's trip cards. The subject in an
     Eyebrow, the title or status in Subhead, why it matters in Meta, then at most one small action under them (beside
     them it squeezed the line to three) -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { eyebrow, title, line, action, level = 2, class: cls = '' }: {
    eyebrow?: string;
    title: string;
    line?: string;
    /** one small button under the head */
    action?: Snippet;
    /** 3 for a card under a section's heading (Train's analysis) or in a sheet */
    level?: 2 | 3;
    class?: string;
  } = $props();
</script>

<div class={cls}>
  <!-- the eyebrow is part of the heading, so moving by heading says "Weigh-in, Time for a new one", never the half -->
  <svelte:element this={`h${level}`}>
    {#if eyebrow}<span class="text-eyebrow text-ink-2 mb-1 block">{eyebrow}<span class="sr-only">{', '}</span></span>{/if}
    <span class="text-subhead num block">{title}</span>
  </svelte:element>
  {#if line}<p class="text-callout text-ink-2 mt-1">{line}</p>{/if}
  {#if action}<div class="mt-4">{@render action()}</div>{/if}
</div>
