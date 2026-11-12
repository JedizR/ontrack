<!-- DESIGN.md section 7, Toast: top centre inside the column, 16 from the edges, dark in both themes, one line, optional Undo.
     One at a time. Top, so it never covers the dock or a sheet's main action. -->
<script lang="ts">
  import { Toaster } from 'svelte-sonner';
</script>

<Toaster
  position="top-center"
  visibleToasts={1}
  duration={3000}
  offset={{ top: 'calc(var(--header-h) + 16px + env(safe-area-inset-top))' }}
  mobileOffset={{ top: 'calc(var(--header-h) + 16px + env(safe-area-inset-top))' }}
  style="--width: min(calc(100vw - 32px), 448px)"
  toastOptions={{
    unstyled: true,
    classes: {
      toast: 'bg-toast text-toast-ink shadow-float flex w-full items-center gap-3 rounded-control py-2 pr-2 pl-5 font-sans min-h-14',
      title: 'text-callout font-semibold line-clamp-1',
      description: 'text-caption',
      actionButton: 'bg-toast-ink text-toast text-callout ml-auto min-h-[var(--tap)] flex-none rounded-sm px-4 font-semibold active:opacity-80',
      icon: 'hidden',
    },
  }}
/>
