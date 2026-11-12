<!-- DESIGN.md section 7, Button. One height per role: lg 56 for the main action, md 48 for second actions, sm 36 on
     screen (44 to tap) for inline actions. primary is the flat ink pill of OneFin's "Withdraw" (white on dark) with a soft
     drop; neutral is the grey pill for second actions; plain is a violet text link; danger is flat red text. No gradient,
     bevel or glow on any of them (buttons.spec.ts). The button is always at least 44 high to tap; the face inside carries
     the look. Labels are verbs. -->
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
    /** lg 56 for a screen's or sheet's main action, md 48, sm 36 */
    size?: 'lg' | 'md' | 'sm';
    full?: boolean;
    children: Snippet;
  } = $props();

  // pressed: the fill steps and the face scales to 0.97; a disabled primary turns grey, as OneFin's disabled arrow does
  const LOOK = {
    primary: 'bg-action text-on-action shadow-action group-active:bg-action-press group-active:scale-[0.97] group-disabled:bg-surface-3 group-disabled:text-ink-2 group-disabled:shadow-none',
    neutral: 'bg-surface-2 text-ink group-active:bg-surface-3 group-active:scale-[0.97] group-disabled:opacity-40',
    plain: 'text-accent-ink group-active:bg-surface-2 group-active:scale-[0.97] group-disabled:opacity-40',
    danger: 'text-danger group-active:bg-danger-soft group-active:scale-[0.97] group-disabled:opacity-40',
  };
  // a minimum height, so a full width label at the largest text can wrap to a second line instead of spilling out
  const SIZE = {
    lg: 'min-h-14 px-6 py-2 text-body font-semibold rounded-control',
    md: 'min-h-12 px-5 py-2 text-callout font-semibold rounded-sm',
    sm: 'min-h-9 px-4 py-1 text-callout font-semibold rounded-sm',
  };
</script>

<button
  {type}
  class="group inline-grid min-h-[var(--tap)] flex-none place-items-center disabled:pointer-events-none {full ? 'w-full' : ''} {cls}"
  {...rest}
>
  <span
    class="inline-flex items-center justify-center gap-2 transition-[transform,background-color] duration-[var(--d-press)] {full ? 'w-full text-center text-balance' : 'whitespace-nowrap'} {LOOK[variant]} {SIZE[size]}"
  >
    {@render children()}
  </span>
</button>
