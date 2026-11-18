<!-- A setting as a grey box inside a white card: what it is, what it is now, one control. 56 high at least, and the whole
     box is the tap: a switch row turns on a tap anywhere on it (`on`), a row that opens something is a button. `wrap`: the
     control moves under the words when they cannot share a line (largest text on a small phone). -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { haptic } from '$lib/haptics';

  let { title, caption, value, trailing, onclick, on, onchange, chevron = false, wrap = false, disabled = false, labelFor, testid }: {
    title: string;
    caption?: string;
    /** what it is now, in the box's own words */
    value?: string;
    trailing?: Snippet;
    onclick?: () => void;
    /** a switch row: the box is the switch */
    on?: boolean;
    onchange?: (v: boolean) => void;
    chevron?: boolean;
    wrap?: boolean;
    disabled?: boolean;
    /** the title labels the input with this id */
    labelFor?: string;
    testid?: string;
  } = $props();
  const look = 'bg-surface-2 flex min-h-14 w-full items-center gap-3 rounded-md px-4 py-2 text-left';
</script>

{#snippet body()}
  <div class="min-w-0 flex-1 {wrap ? 'basis-[5.5em]' : ''}">
    {#if labelFor}<label for={labelFor} class="text-body block font-semibold">{title}</label>{:else}<div class="text-body font-semibold">{title}</div>{/if}
    {#if caption}<div class="text-callout text-ink-2">{caption}</div>{/if}
  </div>
  {#if value !== undefined}<div class="text-body num flex-none font-semibold">{value}</div>{/if}
  {@render trailing?.()}
  {#if on !== undefined}
    <!-- the track and knob of Switch, drawn here: the box is the button, and a button may not hold one -->
    <span class="relative block h-[30px] w-[50px] flex-none rounded-full transition-[background-color] duration-[var(--d-ui)] {on ? 'bg-ink' : 'bg-control-edge'}" aria-hidden="true">
      <span class="bg-surface shadow-card absolute top-[3px] left-[3px] size-6 rounded-full transition-transform duration-[var(--d-ui)] ease-[var(--spring-default)] {on ? 'translate-x-5' : ''}"></span>
    </span>
  {/if}
  {#if chevron}<ChevronRight class="text-ink-2 -mr-1 flex-none" size={20} strokeWidth={2.25} aria-hidden="true" />{/if}
{/snippet}

{#if on !== undefined}
  <button type="button" role="switch" aria-checked={on} class="{look} active:bg-surface-3 transition-colors duration-[var(--d-press)] {wrap ? 'flex-wrap' : ''}" onclick={() => { haptic(); onchange?.(!on); }} data-testid={testid}>{@render body()}</button>
{:else if onclick}
  <button type="button" class="{look} active:bg-surface-3 transition-colors duration-[var(--d-press)] {wrap ? 'flex-wrap' : ''} disabled:opacity-40" {onclick} {disabled} data-testid={testid}>{@render body()}</button>
{:else}
  <div class="{look} {wrap ? 'flex-wrap justify-end' : ''}" data-testid={testid}>{@render body()}</div>
{/if}
