<script lang="ts">
  import type { Component } from 'svelte';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import Plus from '@lucide/svelte/icons/plus';
  import TrackIcon from './TrackIcon.svelte';
  import TrainIcon from './TrainIcon.svelte';
  import { t } from '$lib/i18n';
  import type { Tab } from '$lib/prefs.svelte';
  import { swipe, type SwipeOpts } from '$lib/swipe';

  let {
    tab,
    onselect,
    onadd,
    swipeOpts,
  }: { tab: Tab; onselect: (i: Tab) => void; onadd?: () => void; swipeOpts: SwipeOpts } = $props();

  const TABS: { label: string; icon: Component<{ size?: number; strokeWidth?: number }> }[] = [
    { label: t.tabs.today, icon: TrackIcon },
    { label: t.tabs.train, icon: TrainIcon },
    { label: t.tabs.progress, icon: TrendingUp },
  ];
</script>

<!-- DESIGN.md section 7, Dock: a floating glass pill with three tabs (OneFin's dark nav pill, in the theme's colours), and
     the plus to its right as the ink circle of the action family, white on dark. 12 px above the safe area so it clears
     Safari's bar. The selected tab sits on a grey pill, its icon and label violet (U1b, the owner); the pill is 8 inside the
     dock on every side, so the two full radii nest. Unselected tabs are ink-2: their labels are text and need 4.5 to 1. -->
<div class="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-30 mx-auto flex max-w-[480px] items-center gap-3 px-4" data-testid="dock">
  <nav class="glass-bar shadow-float grid h-[var(--dock-h)] flex-1 grid-cols-3 items-center rounded-full px-2" aria-label={t.tabs.label} use:swipe={swipeOpts}>
    {#each TABS as item, i (item.label)}
      {@const Icon = item.icon}
      {@const on = tab === i}
      <button
        class="grid h-12 min-w-0 place-items-center content-center gap-0.5 rounded-full transition-[color,background-color,transform] duration-[var(--d-press)] active:scale-[0.97] {on ? 'bg-surface-2 text-accent-ink' : 'text-ink-2'}"
        aria-current={on ? 'page' : undefined}
        data-testid="tab-{i}"
        onclick={() => onselect(i as Tab)}
      >
        <Icon size={24} strokeWidth={2} />
        <span class="text-caption truncate {on ? 'font-semibold' : ''}">{item.label}</span>
      </button>
    {/each}
  </nav>
  <button
    class="bg-action text-on-action shadow-pill active:bg-action-press grid size-[var(--dock-h)] flex-none place-items-center rounded-full transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.97]"
    aria-label={t.shell.add}
    data-testid="add"
    onclick={onadd}
  >
    <Plus size={28} strokeWidth={2.25} />
  </button>
</div>
