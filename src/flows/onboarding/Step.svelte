<!-- One onboarding screen (SCREENS.md section 4): back top left, a thin track with the step count, the question in Title,
     its caption in Lead, the answers in the middle of the screen, and the main action pinned to the bottom. At least the
     height Safari gives with its toolbars showing (svh), so Continue is on screen at first paint. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import { t } from '$lib/i18n';

  let {
    title,
    caption,
    onback,
    progress = null,
    top = false,
    testid,
    children,
    footer,
  }: {
    title: string;
    caption?: string;
    onback?: () => void;
    progress?: { n: number; total: number } | null;
    /** answers follow the question instead of sitting in the middle, for screens that are read rather than tapped */
    top?: boolean;
    testid?: string;
    children: Snippet;
    footer?: Snippet;
  } = $props();
</script>

<section class="flex min-h-svh flex-col px-4 pt-[env(safe-area-inset-top)]" aria-label={title} data-testid={testid}>
  <div class="flex h-[var(--header-h)] flex-none items-center gap-3">
    {#if onback}
      <button type="button" class="group -ml-1 grid size-11 flex-none place-items-center" aria-label={t.onboarding.back} onclick={onback} data-testid="back">
        <span class="text-ink group-active:bg-surface-2 grid size-11 place-items-center rounded-sm transition-[background-color,transform] duration-[var(--d-press)] group-active:scale-[0.97]">
          <ChevronLeft size={22} strokeWidth={2.25} />
        </span>
      </button>
    {/if}
    {#if progress}
      <div class="bg-track h-1 flex-1 overflow-hidden rounded-full" role="progressbar" aria-valuemin={1} aria-valuemax={progress.total} aria-valuenow={progress.n} aria-label={t.onboarding.progress(String(progress.n), String(progress.total))}>
        <div class="bg-progress h-full rounded-full transition-[width] duration-[var(--d-move)] ease-[var(--ease-out)]" style="width: {(progress.n / progress.total) * 100}%"></div>
      </div>
      <span class="text-caption text-ink-2 num flex-none" aria-hidden="true" data-testid="step-count">{t.onboarding.progress(String(progress.n), String(progress.total))}</span>
    {/if}
  </div>

  <h1 class="text-title mt-6 text-balance">{title}</h1>
  {#if caption}<p class="text-lead text-ink-2 mt-3">{caption}</p>{/if}

  <!-- less air on a short screen (the SE in Safari), so a wheel and its pinned Continue both fit -->
  <div class="flex flex-1 flex-col py-8 [@media(max-height:620px)]:py-4 {top ? '' : 'justify-center'}">
    {@render children()}
  </div>

  {#if footer}
    <div class="bg-canvas sticky bottom-0 z-10 -mx-4 flex flex-col gap-1 px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] shadow-[0_-1px_0_var(--line)]">
      {@render footer()}
    </div>
  {/if}
</section>
