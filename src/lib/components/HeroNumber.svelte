<!-- DESIGN.md section 7, Hero number: the one number a screen is about in the Hero style (Geist, regular weight, as
     OneFin's "$ 4,025.08"), its caption beneath, the counterpart on the right in Geist 600 at Heading size. Digits count
     to a new value over 400 ms. -->
<script lang="ts">
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { num } from '$lib/model/format';
  import { dur } from '$lib/haptics';

  let {
    value,
    caption,
    side,
    sideCaption,
    reached = false,
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
  } = $props();

  const shown = Tween.of(() => value, { duration: () => dur(400), easing: cubicOut });
</script>

<div class="flex items-end justify-between gap-4">
  <div class="min-w-0">
    <div class="text-hero" data-testid="hero-value">{num(Math.round(shown.current))}</div>
    <div class="text-caption text-ink-2 mt-1">{caption}</div>
  </div>
  <div class="text-right">
    <div class="text-heading num font-semibold normal-case {reached ? 'text-success-ink' : ''}">{side}</div>
    {#if sideCaption}<div class="text-caption text-ink-2 mt-1">{sideCaption}</div>{/if}
  </div>
</div>
