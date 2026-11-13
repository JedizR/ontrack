<!-- DESIGN.md section 7, Sheet (vaul Drawer): grabber, title in Heading beside a 44 close button, a back chevron when the
     sheet has a step, content that fades out under the header and above the footer (U1b), the main action pinned to the bottom above the safe area.
     Opaque: no glass in the content layer. Opens to content height, at most 92 percent of the visible height. A long
     title (a scanned product's name) wraps to a second line. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Drawer from '$lib/components/ui/drawer';
  import X from '@lucide/svelte/icons/x';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import { fly } from 'svelte/transition';
  import { t } from '$lib/i18n';
  import { dur } from '$lib/haptics';

  let {
    open = $bindable(false),
    title,
    layer = 'nested',
    testid,
    onclose,
    onback,
    backLabel,
    step,
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
    /** U2: the sheet's step (Search's results or portion): a new one slides in, from the left after Back */
    step?: unknown;
    children: Snippet;
    /** the main action, pinned */
    footer?: Snippet;
  } = $props();

  const Z = { base: 'z-50', nested: 'z-[55]', top: 'z-[60]' };
  let scrolled = $state(false);
  // the content is rebuilt on every open, scrolled to the top
  $effect(() => { if (open) scrolled = false; });
  // read once as the new step's content slides in, then reset
  let backing = false;
  const enter = () => { const x = backing ? -24 : 24; backing = false; return { x, opacity: 0, duration: dur('--d-settle') }; };
  const icon = 'active:bg-surface-2 grid size-11 flex-none place-items-center rounded-sm transition-colors duration-[var(--d-press)]';
</script>

<!-- repositionInputs off: on iOS it offsets the sheet by the keyboard height while iOS also pans the viewport -->
<Drawer.Root bind:open shouldScaleBackground={false} repositionInputs={false} onOpenChange={(o) => { if (!o) onclose?.(); }}>
  <Drawer.Content class={Z[layer]} overlayClass={Z[layer]} data-testid={testid}>
    <div class="fade-under relative z-10 flex items-center gap-1 pt-2 pr-3 pb-1 [--fade:var(--surface)] {onback ? 'pl-3' : 'pl-6'}" data-scrolled={scrolled || undefined}>
      {#if onback}
        <button class="{icon} text-ink" aria-label={backLabel} onclick={() => { backing = true; onback?.(); }} data-testid="sheet-back"><ChevronLeft size={24} strokeWidth={2} /></button>
      {/if}
      <Drawer.Title class="text-heading line-clamp-2 min-w-0 flex-1 py-1 text-left break-words">{title}</Drawer.Title>
      <button class="{icon} text-ink-2" aria-label={t.sheet.close} onclick={() => { open = false; onclose?.(); }}>
        <X size={24} strokeWidth={2} />
      </button>
    </div>
    <!-- once the keyboard is up, scroll this list (never the page: scrollIntoView pans iOS's whole viewport and pushes the
         sheet's header off screen) so a field the keyboard covers sits in the middle of what is still visible -->
    <div
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-3 {footer ? 'pb-4' : 'pb-[max(24px,env(safe-area-inset-bottom))]'}"
      onscroll={(e) => (scrolled = e.currentTarget.scrollTop > 0)}
      onfocusin={(e) => {
        const el = e.target as HTMLElement;
        const list = e.currentTarget;
        if (!el.matches('input, textarea')) return;
        setTimeout(() => {
          const visible = window.visualViewport?.height ?? innerHeight;
          const { bottom } = el.getBoundingClientRect();
          if (bottom > visible - 16) list.scrollBy({ top: bottom - visible / 2, behavior: 'smooth' });
        }, 350);
      }}
    >
      {#key step}<div in:fly={enter()}>{@render children()}</div>{/key}
    </div>
    {#if footer}
      <div class="fade-over relative px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] [--fade:var(--surface)]">
        {@render footer()}
      </div>
    {/if}
  </Drawer.Content>
</Drawer.Root>
