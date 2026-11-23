<!-- DESIGN.md section 7, Toast: top centre inside the column, under the header, one line, optional Undo. One at a time.
     Top, so it never covers the dock or a sheet's main action. R5, the owner: smaller and in the theme's own colours, a
     pill that hugs its words, Undo as violet words. In Tray it is the dock's glass; Bento's no-glass rule makes the same
     class its plain surface with the float shadow. -->
<script lang="ts">
  import { Toaster } from 'svelte-sonner';
</script>

<Toaster
  position="top-center"
  visibleToasts={1}
  duration={3000}
  offset={{ top: 'calc(var(--header-h) + 12px + env(safe-area-inset-top))' }}
  mobileOffset={{ top: 'calc(var(--header-h) + 12px + env(safe-area-inset-top))' }}
  style="--width: min(calc(100vw - 32px), 448px)"
  toastOptions={{
    unstyled: true,
    classes: {
      // a 44 pill, so Undo can fill its height as a full tap target
      toast: 'liquid-clear [--liquid-clear:blur(14px)_saturate(160%)_brightness(1.08)] [--liquid-tint:var(--surface)] [--liquid-tint-share:30%] text-ink shadow-float flex min-h-11 max-w-full items-center gap-1 rounded-full py-0 pr-4 pl-4 font-sans has-[button]:pr-1',
      title: 'text-callout font-semibold truncate',
      description: 'text-caption',
      actionButton: 'text-accent-ink text-callout min-h-11 flex-none rounded-full px-3 font-semibold transition-opacity duration-[var(--d-press)] active:opacity-60',
      icon: 'hidden',
    },
  }}
/>
