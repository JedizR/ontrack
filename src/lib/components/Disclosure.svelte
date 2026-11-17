<!-- O2, the owner: not everything has to be read at once. A title (and one short line) that opens what is behind it, with
     a chevron that turns over. Closed by default; the height and the opacity move over --d-move (collapse), and a
     reduced motion shows it at once. The head is the button: one 44 high tap across the width. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import { collapse } from '$lib/haptics';

  let { title, line, open = $bindable(false), eyebrow, testid, class: cls = '', children }: {
    title: string;
    /** one short line under the title while it is closed or open */
    line?: string;
    open?: boolean;
    eyebrow?: string;
    testid?: string;
    class?: string;
    children: Snippet;
  } = $props();
  const id = `d${Math.random().toString(36).slice(2, 8)}`;
</script>

<div class={cls} data-testid={testid} data-open={open}>
  <button type="button" class="active:bg-surface-2 -mx-2 flex min-h-[var(--tap)] w-[calc(100%+1rem)] items-center gap-3 rounded-sm px-2 py-3 text-left transition-colors duration-[var(--d-press)]" aria-expanded={open} aria-controls={id} onclick={() => (open = !open)}>
    <span class="min-w-0 flex-1">
      {#if eyebrow}<span class="text-eyebrow text-ink-2 mb-1 block">{eyebrow}</span>{/if}
      <span class="text-subhead block">{title}</span>
      {#if line}<span class="text-callout text-ink-2 mt-0.5 block">{line}</span>{/if}
    </span>
    <ChevronDown class="text-ink-2 flex-none transition-transform duration-[var(--d-move)] ease-[var(--ease-out)] {open ? 'rotate-180' : ''}" size={22} strokeWidth={2.25} aria-hidden="true" />
  </button>
  {#if open}
    <div {id} in:collapse out:collapse={{ leave: true }}>
      <div class="pt-2 pb-1">{@render children()}</div>
    </div>
  {/if}
</div>
