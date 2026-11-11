<!-- DESIGN.md section 7, Sheet (vaul Drawer, ported from watermelon): grabber, title in Heading, content that scrolls under a
     hairline, the main action pinned to the bottom above the safe area. Opens to content height, at most 92 percent. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import * as Drawer from '$lib/components/ui/drawer';
  import X from '@lucide/svelte/icons/x';
  import { t } from '$lib/i18n';

  let {
    open = $bindable(false),
    title,
    layer = 'nested',
    testid,
    onclose,
    children,
    footer,
  }: {
    open?: boolean;
    title: string;
    /** stacking: base sheets (Settings) < sheets opened from a sheet < the keypad, which is always on top */
    layer?: 'base' | 'nested' | 'top';
    testid?: string;
    onclose?: () => void;
    children: Snippet;
    /** the main action, pinned */
    footer?: Snippet;
  } = $props();

  const Z = { base: 'z-50', nested: 'z-[55]', top: 'z-[60]' };
  let scrolled = $state(false);
</script>

<!-- repositionInputs off: on iOS it offsets the sheet by the keyboard height while iOS also pans the viewport -->
<Drawer.Root bind:open shouldScaleBackground={false} repositionInputs={false} onOpenChange={(o) => { if (!o) onclose?.(); }}>
  <Drawer.Content class={Z[layer]} overlayClass={Z[layer]} data-testid={testid}>
    <div class="flex items-center gap-2 pt-1 pr-2 pl-5 transition-shadow duration-[var(--d-ui)] {scrolled ? 'shadow-[0_1px_0_var(--line)]' : ''}">
      <Drawer.Title class="text-heading min-w-0 flex-1 truncate text-left">{title}</Drawer.Title>
      <button class="text-ink-2 active:bg-surface-2 grid size-11 flex-none place-items-center rounded-full" aria-label={t.sheet.close} onclick={() => (open = false)}>
        <X size={24} strokeWidth={1.75} />
      </button>
    </div>
    <!-- once the keyboard is up, bring the focused field to the middle of what is still visible -->
    <div
      class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-3 {footer ? 'pb-4' : 'pb-[max(20px,env(safe-area-inset-bottom))]'}"
      onscroll={(e) => (scrolled = e.currentTarget.scrollTop > 0)}
      onfocusin={(e) => { const el = e.target as HTMLElement; if (el.matches('input, textarea')) setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350); }}
    >
      {@render children()}
    </div>
    {#if footer}
      <div class="border-line border-t px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        {@render footer()}
      </div>
    {/if}
  </Drawer.Content>
</Drawer.Root>
