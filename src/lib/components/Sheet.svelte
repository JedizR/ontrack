<!-- DESIGN.md section 7, Sheet (vaul Drawer): grabber, title in Heading beside a 44 close button, a back chevron when the
     sheet has a step, content that scrolls under a hairline, the main action pinned to the bottom above the safe area.
     Opaque: no glass in the content layer. Opens to content height, at most 92 percent of the visible height. A long
     title (a scanned product's name) wraps to a second line. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Drawer from '$lib/components/ui/drawer';
  import X from '@lucide/svelte/icons/x';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import { t } from '$lib/i18n';

  let {
    open = $bindable(false),
    title,
    layer = 'nested',
    testid,
    onclose,
    onback,
    backLabel,
    children,
    footer,
  }: {
    open?: boolean;
    title: string;
    /** stacking: base sheets (Settings) < sheets opened from a sheet < the wheel sheet, which is always on top */
    layer?: 'base' | 'nested' | 'top';
    testid?: string;
    onclose?: () => void;
    /** a step back inside the sheet (Search's portion back to the results) */
    onback?: () => void;
    backLabel?: string;
    children: Snippet;
    /** the main action, pinned */
    footer?: Snippet;
  } = $props();

  const Z = { base: 'z-50', nested: 'z-[55]', top: 'z-[60]' };
  let scrolled = $state(false);
  // the content is rebuilt on every open, scrolled to the top
  $effect(() => { if (open) scrolled = false; });
  const icon = 'active:bg-surface-2 grid size-11 flex-none place-items-center rounded-full transition-colors duration-[var(--d-press)]';
</script>

<!-- repositionInputs off: on iOS it offsets the sheet by the keyboard height while iOS also pans the viewport -->
<Drawer.Root bind:open shouldScaleBackground={false} repositionInputs={false} onOpenChange={(o) => { if (!o) onclose?.(); }}>
  <Drawer.Content class={Z[layer]} overlayClass={Z[layer]} data-testid={testid}>
    <div class="flex items-center gap-1 pt-2 pr-3 pb-1 transition-shadow duration-[var(--d-ui)] {onback ? 'pl-3' : 'pl-6'} {scrolled ? 'shadow-[0_1px_0_var(--line)]' : ''}">
      {#if onback}
        <button class="{icon} text-ink" aria-label={backLabel} onclick={onback} data-testid="sheet-back"><ChevronLeft size={24} strokeWidth={2} /></button>
      {/if}
      <Drawer.Title class="text-heading line-clamp-2 min-w-0 flex-1 py-1 text-left break-words">{title}</Drawer.Title>
      <button class="{icon} text-ink-2" aria-label={t.sheet.close} onclick={() => { open = false; onclose?.(); }}>
        <X size={24} strokeWidth={2} />
      </button>
    </div>
    <!-- once the keyboard is up, bring the focused field to the middle of what is still visible -->
    <div
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-3 {footer ? 'pb-4' : 'pb-[max(24px,env(safe-area-inset-bottom))]'}"
      onscroll={(e) => (scrolled = e.currentTarget.scrollTop > 0)}
      onfocusin={(e) => { const el = e.target as HTMLElement; if (el.matches('input, textarea')) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350); }}
    >
      {@render children()}
    </div>
    {#if footer}
      <div class="border-line border-t px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        {@render footer()}
      </div>
    {/if}
  </Drawer.Content>
</Drawer.Root>
