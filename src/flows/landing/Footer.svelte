<!-- L3, the owner's footer in two states (DESIGN.md section 13, SCREENS.md section 3). The page ends on a teaser: the top
     of the giant wordmark with its glow rising from below and the back to top tile, cut by the bottom of the screen.
     Scrolling on past the end meets resistance (the teaser follows at a third, the glow strengthens); past OPEN_AT it
     gives way and the full footer opens, OneFin's glass-01: the wordmark behind, one glass panel over its lower part
     holding violet panels with concentric corners, and a bottom bar. Once it has left the screen it closes again, below
     the screen where nothing visible moves. A button, focus moving in, and reduced motion (no rubber band) open it too. -->
<script lang="ts">
  import { tick } from 'svelte';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import Wordmark from '$lib/components/Wordmark.svelte';
  import { reducedMotion } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import { lens } from './glass';
  import { onscreen } from './inview';

  let { onstart, onsignin }: { onstart: () => void; onsignin: () => void } = $props();
  const L = t.landing;
  // the address public/privacy.html and terms.html give: data, not words, so not in the catalog
  const CONTACT = 'team.ontrackapp@gmail.com';
  const LEARN = [[L.log.tag, 'logging'], [L.train.tag, 'training'], [L.checkin.tag, 'check-in'], [L.friends.tag, 'friends'], [L.sources.tag, 'sources']];

  // px of scroll past the end that opens it, and how much less the teaser moves than the pull
  const OPEN_AT = 120, RESIST = 3;
  let pull = $state(0); // wheel and keys: the teaser follows
  let hint = $state(0); // touch: iOS bounces the page itself, so only the glow answers
  let open = $state(false);
  let springing = $state(false);
  let foot: HTMLElement, panel: HTMLElement;

  const atEnd = () => innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
  // a sheet over the page (Sign in) takes the input: nothing behind it pulls
  const free = () => !open && !document.querySelector('[data-vaul-drawer]');
  const behavior = (): ScrollBehavior => (reducedMotion() ? 'auto' : 'smooth');
  // the window only, never scrollIntoView (it pans iOS's visual viewport too: tests/unit/invariants.test.ts)
  const reveal = (el: Element | null) => el && scrollTo({ top: el.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(el).scrollMarginTop), behavior: behavior() });
  const link = 'tap text-body active:bg-on-night/15 -mx-2 inline-flex min-h-11 items-center rounded-xs px-2';

  async function openUp(focusFirst = false) {
    if (open) return;
    seen = false;
    const lifted = pull / RESIST;
    pull = hint = 0;
    springing = false;
    open = true;
    await tick();
    // the lift becomes scroll, so nothing jumps, then the page scrolls to show the footer while its panel springs up
    scrollBy({ top: lifted });
    if (focusFirst) panel.querySelector<HTMLElement>('button, a')?.focus({ preventScroll: true });
    reveal(foot);
  }
  function release() {
    if (pull) springing = true;
    pull = 0;
  }

  // a fling that reaches the end keeps sending wheel events (trackpad momentum, a second or more): only a burst of
  // wheel events that started at the end pulls, so the user has to stop and scroll again
  let last = 0, startedAtEnd = false, idle: ReturnType<typeof setTimeout>;
  function onwheel(e: WheelEvent) {
    const now = performance.now();
    if (now - last > 160) startedAtEnd = atEnd();
    last = now;
    if (!free()) return;
    if (e.deltaY < 0) return release();
    if (!e.deltaY || !startedAtEnd || !atEnd()) return;
    if (reducedMotion()) return void openUp();
    springing = false;
    pull += e.deltaY * (e.deltaMode ? 16 : 1);
    clearTimeout(idle);
    if (pull >= OPEN_AT) return void openUp();
    idle = setTimeout(release, 160);
  }
  let y0: number | null = null;
  function ontouchmove(e: TouchEvent) {
    if (!free()) return;
    const y = e.touches[0].clientY;
    if (y0 === null) { if (atEnd()) y0 = y; return; }
    hint = Math.max(0, y0 - y);
    if (reducedMotion() && hint > 24) openUp();
  }
  function ontouchend() {
    if (y0 !== null && hint >= OPEN_AT) openUp();
    y0 = null;
    hint = 0;
  }
  function onkeydown(e: KeyboardEvent) {
    if (!free() || !['PageDown', 'End', ' '].includes(e.key) || !atEnd()) return;
    const t = e.target as Element;
    if (t.closest('input, textarea, select') || (e.key === ' ' && t.closest('button, a'))) return;
    openUp();
  }

  // closes once it has been on screen and then left it, which it can only do downwards: it is the end of the page
  let seen = false;
  const shown = (on: boolean) => {
    if (on && open) seen = true;
    else if (!on && seen) open = seen = false;
  };

  const top = () => scrollTo({ top: 0, behavior: behavior() });
  // a Learn link takes focus to its section, so a Tab after it carries on from there, not inside the closed footer
  function go(id: string) {
    const el = document.getElementById(id);
    reveal(el);
    el?.focus({ preventScroll: true });
  }
</script>

<svelte:window {onwheel} ontouchstart={() => (y0 = null)} {ontouchmove} {ontouchend} {onkeydown} />

<footer class="px-4 pt-16">
  <div
    bind:this={foot}
    class="foot glow-lens relative isolate mx-auto max-w-[1200px]"
    data-testid="landing-footer"
    style:translate={pull ? `0 ${-pull / RESIST}px` : undefined}
    style:--k={Math.min(1, Math.max(pull, hint) / OPEN_AT)}
    data-open={open || undefined}
    data-pulling={pull || hint ? '' : undefined}
    data-springing={springing || undefined}
    ontransitionend={(e) => e.target === foot && (springing = false)}
  >
    <!-- the glow sits on the wordmark's foot: below the end of the page while closed, rising from there -->
    <!-- the back to top tile, half shown while closed: then a tap on it opens the footer (More about Ontrack is the way
         in for keyboards and screen readers), and once open it goes back to the top -->
    <div class="glow glow-at absolute -inset-x-4 -z-10" data-lens data-testid="landing-glow" aria-hidden="true"></div>
    <button type="button" class="more glass tap active:bg-surface-2 text-ink text-callout sr-only min-h-11 rounded-full px-4 font-semibold focus-visible:not-sr-only" onclick={() => openUp(true)} data-testid="landing-more-open">{L.footer.more}</button>
    <div class="text-accent-ink opacity-40" aria-hidden="true"><Wordmark class="aspect-[61/10] w-full" /></div>
    <button type="button" class="handle glass tap text-ink active:bg-surface-2 absolute top-0 z-10 grid size-12 place-items-center rounded-sm" onclick={() => (open ? top() : openUp())} aria-label={L.footer.top} aria-hidden={!open} tabindex={open ? 0 : -1}><ArrowUp size={22} /></button>

    <div class="ext" id="landing-more" onfocusin={() => openUp()}>
      <div bind:this={panel} use:onscreen={shown} class="panel liquid relative isolate -mx-2 rounded-t-xl p-2 pb-0 sm:mx-0" data-testid="landing-panels">
        <span class="lens" use:lens></span>
        <div class="grid gap-2 md:grid-cols-2">
          <nav class="liquid-violet text-on-night relative isolate grid grid-cols-2 gap-6 rounded-sheet p-6 sm:p-8" aria-label={L.footer.start}>
            <span class="lens" use:lens></span>
            <div>
              <h2 class="text-heading">{L.footer.start}</h2>
              <ul class="mt-4 flex flex-col items-start">
                <li><button type="button" class={link} onclick={onstart}>{L.start}</button></li>
                <li><button type="button" class={link} onclick={onsignin}>{L.signin}</button></li>
              </ul>
            </div>
            <div>
              <h2 class="text-heading">{L.footer.learn}</h2>
              <ul class="mt-4 flex flex-col items-start">
                {#each LEARN as [label, id] (id)}<li><button type="button" class={link} onclick={() => go(id)}>{label}</button></li>{/each}
              </ul>
            </div>
          </nav>
          <div class="liquid-violet text-on-night relative isolate grid gap-6 rounded-sheet p-6 sm:p-8 xl:grid-cols-2">
            <span class="lens" use:lens></span>
            <div>
              <h2 class="text-heading">{L.footer.know}</h2>
              <p class="text-body mt-4">{t.screening.disclaimer}</p>
              <p class="text-body mt-2">{L.footer.concept}</p>
            </div>
            <div>
              <h2 class="text-heading">{L.footer.contact}</h2>
              <ul class="mt-4 flex flex-col items-start">
                <li><a class={link} href="mailto:{CONTACT}">{CONTACT}</a></li>
                <li><a class={link} href="/privacy.html" target="_blank" rel="noopener">{t.settings.privacy}</a></li>
                <li><a class={link} href="/terms.html" target="_blank" rel="noopener">{t.settings.terms}</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="bg-lavender text-night text-callout mt-2 flex flex-wrap justify-between gap-x-6 gap-y-1 rounded-t-sheet px-6 pt-5 pb-[max(20px,env(safe-area-inset-bottom))] sm:px-8">
          <span>{L.footer.year}</span>
          <span>{t.settings.version} {__APP_VERSION__}</span>
        </div>
      </div>
    </div>
  </div>
</footer>

<style>
  /* the wordmark is 61 wide to 10 high and spans the box, and a margin in % follows the box's width, so these place
     things on its height: the page (closed) and the panel (open) begin 65 percent down it, the back to top tile sits
     centred on that line, and the glow's middle on the wordmark's foot */
  .ext { margin-top: calc(100% * -0.35 / 6.1); }
  /* opened, the wordmark comes to rest under the bar (8 + 52) with 24 to spare */
  .foot { scroll-margin-top: calc(env(safe-area-inset-top) + var(--spacing) * 21); }
  .foot:not([data-open]) .ext { height: 0; overflow: clip; }
  .handle { left: calc(50% - var(--spacing) * 6); margin-top: calc(100% * 0.65 / 6.1 - var(--spacing) * 6); }
  .glow-at {
    top: calc(clamp(18rem, 40vw, 36rem) / -2);
    margin-top: calc(100% / 6.1);
    height: clamp(18rem, 40vw, 36rem);
    /* the hint: stronger as the pull goes on */
    opacity: calc(0.8 + 0.2 * var(--k));
    scale: calc(1 + 0.2 * var(--k));
  }
  /* shown when a keyboard reaches it, over the wordmark */
  .more:focus-visible { position: absolute; top: calc(-1 * var(--spacing) * 14); left: 50%; translate: -50% 0; z-index: 20; }

  @media (prefers-reduced-motion: no-preference) {
    .foot[data-springing] { transition: translate 0.6s var(--spring-default); }
    .foot:not([data-pulling]) .glow-at { transition: opacity 0.4s var(--ease-out), scale 0.6s var(--spring-default); }
    .panel { transition: translate 1.15s var(--spring-reveal), opacity 0.6s var(--ease-out); }
    .foot:not([data-open]) .panel { translate: 0 64px; opacity: 0; }
  }
</style>
