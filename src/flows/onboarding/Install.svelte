<!-- SCREENS.md section 3, Install guide: Safari on iPhone, not yet installed. Ported from watermelon's install step;
     the steps follow Safari on iOS 26: the menu button beside the address bar, Share, View More, Add to Home Screen. -->
<script lang="ts">
  import Menu from '@lucide/svelte/icons/menu';
  import Share from '@lucide/svelte/icons/share';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import SquarePlus from '@lucide/svelte/icons/square-plus';
  import Wordmark from '$lib/components/Wordmark.svelte';
  import Button from '$lib/components/Button.svelte';
  import { t } from '$lib/i18n';

  let { oncontinue }: { oncontinue: () => void } = $props();
  const ICONS = [Menu, Share, ChevronDown, SquarePlus];
</script>

<section class="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+16px)]" aria-label={t.install.title} data-testid="install">
  <Wordmark />
  <img src="/pwa-192x192.png" alt="" class="mt-10 size-16 rounded-md" />
  <h1 class="text-title mt-5">{t.install.title}</h1>
  <p class="text-body text-ink-2 mt-2">{t.install.why}</p>

  <ol class="mt-8 flex flex-col gap-4">
    {#each t.install.steps as text, i (i)}
      {@const Icon = ICONS[i]}
      <li class="flex items-center gap-4">
        <span class="bg-surface grid size-11 flex-none place-items-center rounded-sm">
          {#if Icon}<Icon size={24} strokeWidth={1.75} aria-hidden="true" />{:else}<img src="/pwa-64x64.png" alt="" class="size-11 rounded-sm" />{/if}
        </span>
        <span class="text-body"><span class="num font-semibold">{i + 1}.</span> {text}</span>
      </li>
    {/each}
  </ol>
  <p class="text-callout text-ink-2 mt-8">{t.install.note}</p>

  <div class="flex-1"></div>
  <!-- the encouraged path is the steps above; staying in Safari is the one quiet button -->
  <div class="bg-canvas sticky bottom-0 -mx-5 px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
    <Button size="lg" full onclick={oncontinue} data-testid="install-continue">{t.install.browser}</Button>
  </div>
</section>
