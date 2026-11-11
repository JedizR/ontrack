<script lang="ts">
  import { onMount, type Component } from 'svelte';
  import { fly } from 'svelte/transition';
  import { Toaster, toast } from 'svelte-sonner';
  import { prefs, applyTheme, applyFontSize, type Tab } from '$lib/prefs.svelte';
  import { dur } from '$lib/haptics';
  import { swipe } from '$lib/swipe';
  import { t } from '$lib/i18n';
  import Header from '$lib/components/Header.svelte';
  import Dock from '$lib/components/Dock.svelte';
  import Today from './tabs/Today.svelte';

  const TITLES = [t.tabs.today, t.tabs.train, t.tabs.progress];

  // Today ships in the first bundle; the other tabs load once, early, so switching never shows an empty frame
  let Train = $state<Component | null>(null);
  let Progress = $state<Component | null>(null);
  async function loadTab(i: number) {
    if (i === 1 && !Train) Train = (await import('./tabs/Train.svelte')).default;
    if (i === 2 && !Progress) Progress = (await import('./tabs/Progress.svelte')).default;
  }
  $effect(() => { void loadTab(prefs.tab); });

  // tab changes slide in from the side the finger came from; swiping wraps around
  let dir = $state(1);
  async function go(i: Tab, d?: 1 | -1) {
    if (i === prefs.tab) return;
    await loadTab(i);
    dir = d ?? (i > prefs.tab ? 1 : -1);
    prefs.tab = i;
    scrollTo({ top: 0 });
  }
  let dragX = $state(0);
  let dragging = $state(false);
  const swipeOpts = {
    onDrag: (dx: number) => { dragging = true; dragX = dx * 0.4; },
    onSwipe: (d: 1 | -1) => { dragging = false; dragX = 0; void go(((prefs.tab + d + 3) % 3) as Tab, d); },
    onCancel: () => { dragging = false; dragX = 0; },
  };

  onMount(() => {
    applyTheme();
    applyFontSize();
    const preload = setTimeout(() => { void loadTab(1); void loadTab(2); }, 800);

    if (import.meta.env.PROD) {
      import('virtual:pwa-register').then(({ registerSW }) => {
        const update = registerSW({
          onNeedRefresh() {
            toast(t.update.ready, { duration: Infinity, action: { label: t.update.action, onClick: () => update(true) } });
          },
        });
      });
    }
    return () => clearTimeout(preload);
  });
</script>

<div class="bg-canvas relative mx-auto min-h-dvh w-full max-w-[480px] overflow-x-clip">
  <Header title={TITLES[prefs.tab]} />

  <main class="px-5 pb-[calc(env(safe-area-inset-bottom)+var(--dock-h)+40px)]" use:swipe={swipeOpts}>
    <div style="transform: translateX({dragX}px); transition: {dragging ? 'none' : 'transform 240ms var(--ease-out)'}">
      {#key prefs.tab}
        <div in:fly={{ x: 40 * dir, duration: dur(220), opacity: 0.2 }}>
          {#if prefs.tab === 0}
            <Today />
          {:else if prefs.tab === 1}
            {#if Train}<Train />{/if}
          {:else if Progress}
            <Progress />
          {/if}
        </div>
      {/key}
    </div>
  </main>

  <Dock tab={prefs.tab} onselect={(i) => void go(i)} {swipeOpts} />
</div>

<!-- top centre so it never covers the dock or a sheet's main action; dark in both themes -->
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
      toast: 'bg-toast text-toast-ink shadow-float flex w-full items-center gap-3 rounded-lg py-3 pr-2 pl-5 font-sans',
      title: 'text-callout font-medium',
      description: 'text-caption',
      actionButton: 'bg-toast-ink text-toast text-callout ml-auto min-h-[var(--tap)] rounded-full px-4 font-medium',
      icon: 'hidden',
    },
  }}
/>
