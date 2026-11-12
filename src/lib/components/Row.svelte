<!-- DESIGN.md section 7, Row: a 44 px leading tile or thumbnail, a title, a caption, a trailing number.
     Rows in a list card are divided by hairlines inset to the text. With onclick the row is a button. -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    title,
    caption,
    value,
    leading,
    trailing,
    onclick,
    testid,
    wrap = false,
  }: {
    title: string;
    caption?: string | Snippet;
    /** trailing number, already formatted */
    value?: string;
    /** the 44 px tile or thumbnail */
    leading?: Snippet;
    /** a trailing control instead of a number */
    trailing?: Snippet;
    onclick?: () => void;
    testid?: string;
    /** the trailing control moves under the title when they cannot share a line (large text on a small phone) */
    wrap?: boolean;
  } = $props();
</script>

{#snippet body()}
  {#if leading}<div class="size-11 flex-none overflow-hidden rounded-sm">{@render leading()}</div>{/if}
  <!-- the hairline sits on this box so it starts where the text starts -->
  <div class="border-line flex min-w-0 flex-1 items-center gap-3 self-stretch py-4 [*+*>&]:border-t {wrap ? 'flex-wrap justify-end gap-y-2' : ''}">
    <!-- wrapping: the title keeps room for a word of about eight letters before the trailing control gives way -->
    <div class="min-w-0 flex-1 text-left {wrap ? 'basis-[5.5em]' : ''}">
      <div class="text-body line-clamp-2 font-semibold">{title}</div>
      <!-- title and caption wrap rather than cut off a food name or a number ("Adds 240 kcal") -->
      {#if typeof caption === 'function'}
        <div class="text-caption text-ink-2">{@render caption()}</div>
      {:else if caption}
        <div class="text-caption text-ink-2">{caption}</div>
      {/if}
    </div>
    {#if value !== undefined}<div class="text-body num flex-none font-semibold">{value}</div>{/if}
    {@render trailing?.()}
  </div>
{/snippet}

{#if onclick}
  <button class="active:bg-surface-2 -mx-5 flex w-[calc(100%+var(--gutter)*2)] items-center gap-4 px-5 transition-colors duration-[var(--d-press)]" {onclick} data-testid={testid}>
    {@render body()}
  </button>
{:else}
  <div class="flex items-center gap-4" data-testid={testid}>{@render body()}</div>
{/if}
