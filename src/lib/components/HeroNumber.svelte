<!-- DESIGN.md section 7, Hero number: the one number a screen is about in the Hero style (Geist 500, medium, not bold, as
     OneFin's "$ 4,025.08"), its caption beneath, the counterpart on the right in Geist 600 at Heading size. Digits count
     to a new value over 400 ms. -->
<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import Count from './Count.svelte';
  import { pop } from '$lib/haptics';

  let {
    value,
    caption,
    side,
    sideCaption,
    reached = false,
    scope,
  }: {
    value: number;
    /** "of 2,460 kcal" */
    caption: string;
    /** the counterpart: a number ("620") or words ("On track") */
    side: string;
    /** "to go", "left", "over"; none when side is words */
    sideCaption?: string;
    /** side reads in the reached green: the target is reached */
    reached?: boolean;
    /** what the value belongs to (the day in view): a new scope shows its check without the pop */
    scope?: unknown;
  } = $props();
</script>

<div class="flex items-end justify-between gap-4">
  <div class="min-w-0">
    <div class="text-hero" data-testid="hero-value"><Count {value} /></div>
    <div class="text-callout text-ink-2 mt-1">{caption}</div>
  </div>
  <div class="text-right">
    <!-- reaching the zone: the words turn green and a check pops in beside them (U1c) -->
    <div class="text-heading num flex items-center justify-end gap-1 font-semibold normal-case {reached ? 'text-success-ink' : ''}">
      {#key scope}{#if reached}<span class="inline-grid" in:pop data-testid="hero-reached"><Check size={24} strokeWidth={2.75} aria-hidden="true" /></span>{/if}{/key}{side}
    </div>
    {#if sideCaption}<div class="text-callout text-ink-2 mt-1">{sideCaption}</div>{/if}
  </div>
</div>
