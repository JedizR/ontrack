<!-- One onboarding screen (SCREENS.md section 4, O2): a thin track with the step count at the top, the question in Title,
     its caption in Lead, the answers in the middle of the screen, and at the bottom, in the landing page's glass capsule,
     a small white Back beside the main action (Back is a thumb's reach from Continue). `above` is what sits over the capsule
     (the number so far). At least the height Safari gives with its toolbars showing (svh), so Continue is on screen at
     first paint. Everything arrives in order with the landing page's blur settle. -->
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
    above,
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
    /** over the capsule: the card that shows the number so far */
    above?: Snippet;
    /** the main action (and a second one under it), beside Back */
    footer?: Snippet;
  } = $props();
</script>

<section class="relative flex min-h-svh flex-col px-4 pt-[env(safe-area-inset-top)]" aria-label={title} data-testid={testid}>
  <div class="flex h-[var(--header-h)] flex-none items-center gap-3">
    {#if progress}
      <div class="bg-track h-1.5 flex-1 overflow-hidden rounded-full" role="progressbar" aria-valuemin={1} aria-valuemax={progress.total} aria-valuenow={progress.n} aria-label={t.onboarding.progress(String(progress.n), String(progress.total))}>
        <div class="bg-progress h-full rounded-full transition-[width] duration-[var(--d-move)] ease-[var(--ease-out)]" style="width: {(progress.n / progress.total) * 100}%"></div>
      </div>
      <span class="text-caption text-ink-2 num flex-none" aria-hidden="true" data-testid="step-count">{t.onboarding.progress(String(progress.n), String(progress.total))}</span>
    {/if}
  </div>

  <h1 class="text-title rise mt-6 text-balance" style="--i: 0">{title}</h1>
  {#if caption}<p class="text-lead text-ink-2 rise mt-3" style="--i: 1">{caption}</p>{/if}

  <!-- less air on a short screen (the SE in Safari), so a wheel and its pinned Continue both fit -->
  <div class="flex flex-1 flex-col py-8 [@media(max-height:620px)]:py-4 {top ? '' : 'justify-center'}" data-answers>
    {@render children()}
  </div>

  {#if footer || onback}
    <!-- L4: WebKit tints a bar under a fixed or sticky element at least 90 percent of the width wide at its edge, so this is inset 12 each side -->
    <div class="sticky bottom-[var(--kb,0px)] z-10 mx-3 flex flex-col gap-2 pt-3 pb-[max(16px,var(--kb-safe,env(safe-area-inset-bottom)))]">
      {#if above}{@render above()}{/if}
      <!-- the landing page's floating action, as it is built there: Liquid Glass behind, the action inside, its corners the button's plus the gap (U1b) -->
      <div class="liquid-clear rounded-[calc(var(--r-control)+0.5rem)] p-2">
        <div class="flex items-start gap-2">
          {#if onback}
            <!-- white, so Continue (ink) is the one main action; O2 -->
            <button type="button" class="group grid min-h-14 w-14 flex-none" aria-label={t.onboarding.back} onclick={onback} data-testid="back">
              <span class="bg-surface text-ink shadow-pill group-active:bg-surface-2 rounded-control grid place-items-center transition-[background-color,transform] duration-[var(--d-press)] group-active:scale-[0.97]">
                <ChevronLeft size={22} strokeWidth={2.25} />
              </span>
            </button>
          {/if}
          <div class="flex min-w-0 flex-1 flex-col gap-1">{@render footer?.()}</div>
        </div>
      </div>
    </div>
  {/if}
</section>
