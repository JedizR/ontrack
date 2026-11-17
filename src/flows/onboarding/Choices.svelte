<!-- Large single choice answers: an optional icon tile, a title, an optional line, an optional number, and on the right a
     ring that fills with a white check when the card is picked (O2: the pick reads at a glance in both themes).
     Cards at radius 24 with the soft card shadow; the picked one is ink filled, as OneFin's selected option is black, its tile light lavender; the others' tiles are dark violet.
     They arrive one after another with the landing page's settle. A tap selects and never moves on: the step's Continue
     does (U1a). -->
<script lang="ts" generics="T extends string | number">
  import type { Component } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import { haptic } from '$lib/haptics';

  let { options, value, label, onpick }: {
    options: { value: T; title: string; line?: string; figure?: string; icon?: Component<{ size?: number; strokeWidth?: number }> }[];
    value: T | undefined;
    label: string;
    onpick: (v: T) => void;
  } = $props();
</script>

<div class="flex flex-col gap-3" role="radiogroup" aria-label={label}>
  {#each options as o, i (o.value)}
    {@const on = o.value === value}
    <button
      type="button"
      role="radio"
      aria-checked={on}
      class="shadow-card rise flex min-h-18 w-full items-center gap-4 rounded-md px-5 py-4 text-left transition-[transform,background-color,color] duration-[var(--d-ui)] ease-[var(--spring-default)] active:scale-[0.98] {on ? 'bg-ink text-canvas' : 'bg-surface text-ink active:bg-surface-2'}"
      style="--i: {i + 2}"
      onclick={() => { haptic(); onpick(o.value); }}
      data-testid="choice-{o.value}"
    >
      {#if o.icon}
        {@const Icon = o.icon}
        <!-- O2, the owner: a light lavender tile on the black picked card, a dark violet one on the white cards -->
        <span class="grid size-10 flex-none place-items-center rounded-sm transition-colors duration-[var(--d-ui)] {on ? 'tile' : 'bg-accent text-on-accent'}" aria-hidden="true"><Icon size={22} strokeWidth={2} /></span>
      {/if}
      <span class="min-w-0 flex-1">
        <span class="text-body block font-semibold">{o.title}</span>
        {#if o.line}<span class="text-callout block {on ? 'text-canvas' : 'text-ink-2'}">{o.line}</span>{/if}
      </span>
      {#if o.figure}<span class="text-body num flex-none font-semibold">{o.figure}</span>{/if}
      <span class="grid size-6 flex-none place-items-center rounded-full transition-[background-color,box-shadow,scale] duration-[var(--d-pop)] ease-[var(--spring-pop)] {on ? 'bg-canvas text-ink scale-100' : 'ring-ink-3 scale-90 ring-2 ring-inset'}" aria-hidden="true">
        {#if on}<Check size={14} strokeWidth={3.25} />{/if}
      </span>
    </button>
  {/each}
</div>
