<!-- L4, the owner: a normal footer again, no pull to open, not OneFin's and not violet panels, something that fits the
     page (DESIGN.md section 13, SCREENS.md section 3). The page is about training, so the footer is a running track's
     straight: the dark run carries on, the hero's promise comes back as the sign-off, and the links sit in four numbered
     lanes, the numbers painted big in outline as on a track, a runner of light pacing each lane line on its own loop. The
     bottom line keeps the year and the version. -->
<script lang="ts">
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import Wordmark from '$lib/components/Wordmark.svelte';
  import { reducedMotion } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import { live } from './inview';

  let { onstart, onsignin }: { onstart: () => void; onsignin: () => void } = $props();
  const L = t.landing;
  // the address public/privacy.html and terms.html give: data, not words, so not in the catalog
  const CONTACT = 'team.ontrackapp@gmail.com';
  const LEARN = [[L.log.tag, 'logging'], [L.train.tag, 'training'], [L.checkin.tag, 'check-in'], [L.friends.tag, 'friends'], [L.sources.tag, 'sources']];
  const LANES = [L.footer.start, L.footer.learn, L.footer.know, L.footer.contact];

  const behavior = (): ScrollBehavior => (reducedMotion() ? 'auto' : 'smooth');
  // the window only, never scrollIntoView (it pans iOS's visual viewport too: tests/unit/invariants.test.ts)
  const reveal = (el: Element | null) => el && scrollTo({ top: el.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(el).scrollMarginTop), behavior: behavior() });
  // a Learn link takes focus to its section, so a Tab after it carries on from there
  function go(id: string) {
    const el = document.getElementById(id);
    reveal(el);
    el?.focus({ preventScroll: true });
  }
  const link = 'tap link-line text-body text-ink active:bg-surface-2 -mx-2 inline-flex min-h-11 items-center rounded-xs px-2';
</script>

<footer class="relative isolate px-4 pt-20 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6" data-testid="landing-footer" use:live>
  <!-- the glow rises behind the sign-off, from above the footer's top -->
  <div class="glow absolute inset-x-0 top-0 -z-10 h-96 -translate-y-1/2" aria-hidden="true"></div>
  <div class="mx-auto max-w-[1200px]">
    <div class="flex flex-wrap items-end justify-between gap-x-8 gap-y-6">
      <div>
        <Wordmark class="text-ink h-6 w-fit" />
        <p class="text-section mt-5 max-w-[14ch] text-balance">{L.promise.replaceAll('*', '')}</p>
      </div>
      <button type="button" class="back-top tap text-ink border-line-strong active:bg-surface-2 grid size-14 flex-none place-items-center rounded-full border" onclick={() => scrollTo({ top: 0, behavior: behavior() })} aria-label={L.footer.top} data-testid="landing-top">
        <ArrowUp size={24} />
      </button>
    </div>

    <!-- the lanes: number, name, what is in it; on a phone the name sits over its links -->
    <ol class="border-line-strong mt-14 border-t">
      {#each LANES as lane, i (i)}
        <li class="lane border-line-strong relative grid overflow-x-clip grid-cols-[3.5rem_1fr] gap-x-4 border-b py-6 sm:grid-cols-[5rem_11rem_1fr] sm:items-baseline sm:gap-x-6" style:--i={i}>
          <span class="lane-no text-section leading-none" aria-hidden="true">{i + 1}</span>
          <h2 class="text-eyebrow text-ink-2 self-center sm:self-auto">{lane}</h2>
          <div class="col-start-2 mt-2 sm:col-start-3 sm:mt-0">
            {#if i === 0}
              <div class="flex flex-wrap gap-x-6">
                <button type="button" class={link} onclick={onstart}>{L.start}</button>
                <button type="button" class={link} onclick={onsignin}>{L.signin}</button>
              </div>
            {:else if i === 1}
              <div class="flex flex-wrap gap-x-6">
                {#each LEARN as [label, id] (id)}<button type="button" class={link} onclick={() => go(id)}>{label}</button>{/each}
              </div>
            {:else if i === 2}
              <!-- the same air as the 44 high link rows -->
              <p class="text-body text-ink-2 max-w-[40rem] py-2.5">{t.screening.disclaimer} {L.footer.concept}</p>
            {:else}
              <div class="flex flex-wrap gap-x-6">
                <a class={link} href="mailto:{CONTACT}">{CONTACT}</a>
                <a class={link} href="/privacy.html" target="_blank" rel="noopener">{t.settings.privacy}</a>
                <a class={link} href="/terms.html" target="_blank" rel="noopener">{t.settings.terms}</a>
              </div>
            {/if}
          </div>
          <!-- a runner of light paces the lane line, each lane at its own speed -->
          <span class="runner" style:--t="{[7.2, 9.6, 8.4, 11][i]}s" style:--d="{[-1.5, -6, -3.2, -8.5][i]}s" aria-hidden="true"></span>
        </li>
      {/each}
    </ol>

    <div class="text-caption text-ink-2 mt-6 flex flex-wrap justify-between gap-x-6 gap-y-1">
      <span>{L.footer.year}</span>
      <span>{t.settings.version} {__APP_VERSION__}</span>
    </div>
  </div>
</footer>

<style>
  /* the lane numbers, painted in outline as on a track; the lane under a mouse fills its number in violet */
  .lane-no {
    color: transparent;
    -webkit-text-stroke: 1.5px var(--ink-3);
    transition: color 0.3s var(--ease-out), -webkit-text-stroke-color 0.3s var(--ease-out);
  }
  @media (hover: hover) { .lane:hover .lane-no { color: var(--accent-ink); -webkit-text-stroke-color: var(--accent-ink); } }
  /* the runner: a short bright dash on the lane's bottom line, from its start to its end, then again */
  .runner {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 3rem;
    height: 2px;
    border-radius: var(--r-full);
    background: var(--accent-ink);
    opacity: 0;
    pointer-events: none;
  }
  .lane { container-type: inline-size; }
  @media (prefers-reduced-motion: no-preference) {
    .runner { opacity: 1; animation: run var(--t) linear var(--d) infinite both; animation-play-state: var(--play, paused); }
    @keyframes run { from { transform: translateX(-3rem); } to { transform: translateX(100cqw); } }
    .back-top :global(svg) { transition: translate 0.4s var(--spring-pop); }
    @media (hover: hover) { .back-top:hover :global(svg) { translate: 0 -4px; } }
    .back-top:active :global(svg) { translate: 0 -6px; }
    /* the lanes come in from the right one after another, each a little tilted, as the footer reaches the screen */
    @supports (animation-timeline: view()) {
      /* within its entry, so the last lane has settled by the end of the page */
      .lane { animation: lane linear both; animation-timeline: view(); animation-range: entry calc(var(--i) * 12%) entry 100%; }
      @keyframes lane { from { opacity: 0; translate: calc(24px + var(--i) * 12px) 0; rotate: calc(1.5deg - var(--i) * 0.8deg); } }
    }
  }
</style>
