<!-- SCREENS.md section 3, Welcome: on the brand gradient, the mark and wordmark, the promise in Title, three lines beside
     lavender tiles, Get started and the way back in. The gradient layer is 100lvh so its colour reaches under Safari's
     toolbars; the words sit on its light end. The drawn track and tilted chip are decoration in OneFin's manner. -->
<script lang="ts">
  import Camera from '@lucide/svelte/icons/camera';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import Wordmark from '$lib/components/Wordmark.svelte';
  import Button from '$lib/components/Button.svelte';
  import { t } from '$lib/i18n';

  let { onstart, onsignin }: { onstart: () => void; onsignin: () => void } = $props();
  const ICONS = [TrainIcon, Camera, TrendingUp];
</script>

<section class="relative isolate flex min-h-svh flex-col px-4 pt-[calc(env(safe-area-inset-top)+16px)]" aria-label={t.app.name} data-testid="welcome">
  <div class="fixed inset-x-0 top-0 -z-10 mx-auto h-lvh max-w-[480px] bg-(image:--grad-brand)" aria-hidden="true"></div>
  <div class="text-on-accent"><Wordmark /></div>

  <!-- decoration: the brand track, large, on a glass tile, with a tilted chip as OneFin floats its cards -->
  <div class="relative mx-auto mt-8 grid size-36 flex-none place-items-center" aria-hidden="true">
    <div class="appear absolute inset-0 rotate-[-8deg] rounded-xl border-on-accent/40 bg-on-accent/20 border shadow-[inset_0_2px_2px_var(--on-accent),var(--shadow-card)]"></div>
    <svg viewBox="0 0 64 64" fill="none" class="text-on-accent relative size-24">
      <rect x="9" y="20" width="46" height="24" rx="12" stroke="currentColor" stroke-width="5" />
      <circle cx="42" cy="20" r="7" fill="currentColor" />
    </svg>
    <span class="appear bg-surface text-ink shadow-card text-eyebrow absolute -right-10 bottom-2 flex rotate-[9deg] items-center gap-1.5 rounded-xs px-2 py-1.5" style="--i: 2">
      <i class="bg-success size-2 rounded-full"></i>{t.today.onTrack}
    </span>
  </div>

  <div class="flex flex-1 flex-col justify-end py-8">
    <h1 class="text-title appear text-balance" style="--i: 3">{t.welcome.promise}</h1>
    <ul class="appear mt-6 flex flex-col gap-3" style="--i: 5">
      {#each t.welcome.lines as line, i (i)}
        {@const Icon = ICONS[i]}
        <li class="flex items-center gap-4">
          <span class="tile grid size-12 flex-none place-items-center rounded-sm" aria-hidden="true"><Icon size={24} strokeWidth={2} /></span>
          <span class="text-body">{line}</span>
        </li>
      {/each}
    </ul>
  </div>
  <div class="flex flex-col gap-1 pb-[max(16px,env(safe-area-inset-bottom))]">
    <Button variant="primary" size="lg" full onclick={onstart} data-testid="welcome-start">{t.welcome.start}</Button>
    <Button variant="plain" size="lg" full onclick={onsignin} data-testid="welcome-signin">{t.welcome.account}</Button>
  </div>
</section>
