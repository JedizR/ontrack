<!-- DESIGN.md section 7, Button. The button is always at least 44 high to tap; the pill inside carries the look,
     so the compact size can be 36 high on screen. Labels are verbs: Add, Save, Done. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  let {
    variant = 'neutral',
    size = 'md',
    full = false,
    type = 'button',
    class: cls = '',
    children,
    ...rest
  }: HTMLButtonAttributes & {
    variant?: 'primary' | 'neutral' | 'plain' | 'danger';
    /** lg 52 for a screen's main action, md 44, sm 36 */
    size?: 'lg' | 'md' | 'sm';
    full?: boolean;
    children: Snippet;
  } = $props();

  const LOOK = {
    primary: 'bg-lime text-on-lime group-active:bg-lime-press',
    neutral: 'bg-surface-2 text-ink group-active:bg-surface-3',
    plain: 'text-ink group-active:bg-surface-2',
    danger: 'bg-surface-2 text-danger group-active:bg-surface-3',
  };
  // a minimum height, so a full width label at the largest text can wrap to a second line instead of spilling out
  const SIZE = { lg: 'min-h-13 px-6 py-2 text-body font-semibold', md: 'min-h-11 px-5 py-2 text-callout font-medium', sm: 'min-h-9 px-4 py-1 text-callout font-medium' };
</script>

<button
  {type}
  class="group inline-grid min-h-[var(--tap)] flex-none place-items-center disabled:pointer-events-none disabled:opacity-40 {full ? 'w-full' : ''} {cls}"
  {...rest}
>
  <span
    class="inline-flex items-center justify-center gap-2 rounded-full transition-[transform,background-color] duration-[var(--d-press)] group-active:scale-[0.97] {full ? 'w-full text-center text-balance' : 'whitespace-nowrap'} {LOOK[variant]} {SIZE[size]}"
  >
    {@render children()}
  </span>
</button>
