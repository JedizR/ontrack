<!-- SCREENS.md section 3, Welcome: the mark, the promise, three lines, Get started and the way back in. -->
<script lang="ts">
  import Camera from '@lucide/svelte/icons/camera';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import Wordmark from '$lib/components/Wordmark.svelte';
  import Button from '$lib/components/Button.svelte';
  import { t } from '$lib/i18n';

  let { onstart, onsignin }: { onstart: () => void; onsignin: () => void } = $props();
</script>

<section class="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+16px)]" aria-label={t.app.name} data-testid="welcome">
  <Wordmark />
  <div class="flex flex-1 flex-col justify-center py-10">
    <h1 class="text-title">{t.welcome.promise}</h1>
    <ul class="mt-8 flex flex-col gap-5">
      {#each t.welcome.lines as line, i (i)}
        <li class="flex items-start gap-4">
          <span class="text-ink-2 flex-none pt-px" aria-hidden="true">
            {#if i === 0}<TrainIcon size={24} />{:else if i === 1}<Camera size={24} strokeWidth={1.75} />{:else}<TrendingUp size={24} strokeWidth={1.75} />{/if}
          </span>
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
