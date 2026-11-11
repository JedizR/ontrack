<!-- One onboarding screen (SCREENS.md section 4): back top left, a thin track with the step count, the question,
     the answers in the lower half within thumb reach, and the main action pinned to the bottom. -->
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
    /** answers follow the question instead of sitting low, for screens that are read rather than tapped */
    top?: boolean;
    testid?: string;
    children: Snippet;
    footer?: Snippet;
  } = $props();
</script>

<section class="flex min-h-dvh flex-col px-5 pt-[env(safe-area-inset-top)]" aria-label={title} data-testid={testid}>
  <div class="flex h-[var(--header-h)] flex-none items-center gap-3">
    {#if onback}
      <button type="button" class="text-ink active:bg-surface-2 -ml-3 grid size-11 flex-none place-items-center rounded-full" aria-label={t.onboarding.back} onclick={onback} data-testid="back">
        <ChevronLeft size={24} strokeWidth={1.75} />
      </button>
    {/if}
    {#if progress}
      <div class="bg-surface-2 h-1.5 flex-1 overflow-hidden rounded-full" role="progressbar" aria-valuemin={1} aria-valuemax={progress.total} aria-valuenow={progress.n} aria-label={t.onboarding.progress(String(progress.n), String(progress.total))}>
        <div class="bg-ink h-full rounded-full transition-[width] duration-[var(--d-move)]" style="width: {(progress.n / progress.total) * 100}%"></div>
      </div>
      <span class="text-caption text-ink-2 num flex-none" aria-hidden="true" data-testid="step-count">{t.onboarding.progress(String(progress.n), String(progress.total))}</span>
    {/if}
  </div>

  <h1 class="text-title mt-4">{title}</h1>
  {#if caption}<p class="text-body text-ink-2 mt-2">{caption}</p>{/if}

  <div class="flex flex-1 flex-col pt-8 pb-5 {top ? '' : 'justify-end'}">
    {@render children()}
  </div>

  {#if footer}
    <div class="bg-canvas sticky bottom-0 z-10 -mx-5 flex flex-col gap-1 px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
      {@render footer()}
    </div>
  {/if}
</section>
