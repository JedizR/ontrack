<script lang="ts">
  import type { Component } from 'svelte';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import Plus from '@lucide/svelte/icons/plus';
  import TrackIcon from './TrackIcon.svelte';
  import TrainIcon from './TrainIcon.svelte';
  import { t } from '$lib/i18n';
  import { prefs, type Tab } from '$lib/prefs.svelte';
  import { swipe, type SwipeOpts } from '$lib/swipe';
  const tray = $derived(prefs.tray);

  let {
    tab,
    onselect,
    onadd,
    swipeOpts,
    dots = [],
  }: { tab: Tab; onselect: (i: Tab) => void; onadd?: () => void; swipeOpts: SwipeOpts; dots?: boolean[] } = $props();

  const TABS: { label: string; icon: Component<{ size?: number; strokeWidth?: number }> }[] = [
    { label: t.tabs.today, icon: TrackIcon },
    { label: t.tabs.train, icon: TrainIcon },
    { label: t.tabs.progress, icon: TrendingUp },
  ];
</script>

<!-- DESIGN.md section 7, Dock: a floating glass pill with three tabs (OneFin's dark nav pill, in the theme's colours), and
     the plus to its right as the ink circle of the action family, white on dark. 12 px above the safe area so it clears
     Safari's bar. ui-flat: no glass, a solid surface with a hairline, since rows scroll under it. The selected tab sits on a solid ink pill with its icon and label in the page colour, as the picked day: white on black in light, black on white in dark (ui-flat, the owner); the pill is 8 inside the
     dock on every side, so the two full radii nest. Unselected tabs are ink-2: their labels are text and need 4.5 to 1. -->
<div class="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-30 mx-auto flex max-w-[480px] items-center gap-3 px-4" data-testid="dock">
  <nav class="{tray ? 'liquid-clear [--liquid-clear:blur(14px)_saturate(160%)_brightness(1.08)] [--liquid-tint:var(--surface)] [--liquid-tint-share:30%]' : 'liquid'} relative grid h-[var(--dock-h)] flex-1 grid-cols-3 items-center rounded-full px-2" aria-label={t.tabs.label} use:swipe={swipeOpts}>
    <!-- U1c: one grey pill that slides to the tab picked, rather than one per tab switching on and off -->
    <span
      class="{tray ? 'bg-ink/12' : 'bg-ink'} absolute inset-y-2 left-2 w-[calc((100%-var(--s-4))/3)] rounded-full transition-transform duration-[var(--d-ui)] ease-[var(--spring-default)]"
      style="transform: translateX({tab * 100}%)"
      aria-hidden="true"
      data-testid="dock-pill"
    ></span>
    {#each TABS as item, i (item.label)}
      {@const Icon = item.icon}
      {@const on = tab === i}
      <button
        class="relative grid min-h-12 min-w-0 place-items-center content-center gap-0.5 rounded-full transition-[color,transform] duration-[var(--d-press)] active:scale-[0.97] {on ? (tray ? 'text-accent-ink' : 'text-canvas') : 'text-ink-2'}"
        aria-current={on ? 'page' : undefined}
        data-testid="tab-{i}"
        onclick={() => onselect(i as Tab)}
      >
        <span class="relative inline-grid"><Icon size={24} strokeWidth={2} />
          <!-- R2: a tab with something waiting (Strava's 8 pt dot, no count, no inbox): Progress when the check-in is ready -->
          {#if dots[i]}<span class="bg-accent ring-surface absolute -top-0.5 -right-1 size-2.5 rounded-full ring-2" aria-hidden="true" data-testid="tab-dot-{i}"></span>{/if}
        </span>
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
