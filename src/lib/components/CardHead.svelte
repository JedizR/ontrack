<!-- DESIGN.md section 7, Cards (U3): a card's head, as Shop's order cards and Airbnb's trip cards. The subject in an
     Eyebrow, the title or status in Subhead, why it matters in Meta, then at most one small action under them (beside
     them it squeezed the line to three) -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let { eyebrow, title, line, action, class: cls = '' }: {
    eyebrow?: string;
    title: string;
    line?: string;
    /** one small button under the head */
    action?: Snippet;
    class?: string;
  } = $props();
</script>

<div class={cls}>
  {#if eyebrow}<p class="text-eyebrow text-ink-2 mb-1">{eyebrow}</p>{/if}
  <h2 class="text-subhead num">{title}</h2>
  {#if line}<p class="text-callout text-ink-2 mt-1">{line}</p>{/if}
  {#if action}<div class="mt-4">{@render action()}</div>{/if}
</div>
