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

<!-- floating pill with three tabs, and the lime plus button to its right, 14 px above the safe area.
     Unselected tabs are ink-2, not the spec's ink-3: their labels are text and need 4.5 to 1 (docs/DECISIONS.md). -->
<div class="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+14px)] z-30 mx-auto flex max-w-[480px] items-center gap-3 px-4" data-testid="dock">
  <nav class="bar-glass shadow-float grid h-[var(--dock-h)] flex-1 grid-cols-3 items-center rounded-full px-2" aria-label={t.tabs.label} use:swipe={swipeOpts}>
    {#each TABS as item, i (item.label)}
      {@const Icon = item.icon}
      {@const on = tab === i}
      <button
        class="grid h-[var(--tap)] min-w-0 place-items-center content-center gap-1 rounded-full transition-[color,transform] duration-[var(--d-press)] active:scale-[0.97] {on ? 'text-ink' : 'text-ink-2'}"
        aria-current={on ? 'page' : undefined}
        data-testid="tab-{i}"
        onclick={() => onselect(i as Tab)}
      >
        <Icon size={24} strokeWidth={1.75} />
        <span class="text-micro truncate">{item.label}</span>
      </button>
    {/each}
  </nav>
  <button
    class="bg-lime text-on-lime shadow-float active:bg-lime-press grid size-[var(--dock-h)] flex-none place-items-center rounded-full transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.97]"
    aria-label={t.shell.add}
    data-testid="add"
    onclick={onadd}
  >
    <Plus size={24} strokeWidth={1.75} />
  </button>
</div>
