<!-- SCREENS.md section 3, the landing page (L1, PRD F18): what a signed-out visitor with no onboarding draft sees, in
     OneFin's landing style from the owner's picks (DESIGN.md section 13). The bar, the hero with Today in a phone, the
     statement with inline pills, then Logging, Training (dark), Check-in, Friends and Sources (dark), the closing call and the
     footer. Every feature shows a real screen of the app (tests/e2e/landing-shots.spec.ts). Build your plan starts
     onboarding, Sign in opens the sign in sheet. A lazy chunk; motion follows MOTION.md and stops for reduced motion. -->
<script lang="ts">
  import BookOpen from '@lucide/svelte/icons/book-open';
  import Camera from '@lucide/svelte/icons/camera';
  import Check from '@lucide/svelte/icons/check';
  import Lock from '@lucide/svelte/icons/lock';
  import MapPin from '@lucide/svelte/icons/map-pin';
  import Scale from '@lucide/svelte/icons/scale';
  import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import UserPlus from '@lucide/svelte/icons/user-plus';
  import Button from '$lib/components/Button.svelte';
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import Wordmark from '$lib/components/Wordmark.svelte';
  import { C } from '$lib/model/engine';
  import { SOURCES } from '$lib/data/sources';
  import { today, yearOf } from '$lib/model/dates';
  import { prefs, topColour } from '$lib/prefs.svelte';
  import { bend, lens } from './glass';
  import { sheets } from '$lib/sheets.svelte';
  import { t } from '$lib/i18n';
  import { fresh, step } from '../onboarding/draft';
  import Footer from './Footer.svelte';
  import Phone from './Phone.svelte';
  import { inview, onscreen } from './inview';
  import todayShot from './shots/today.webp';
  import photoShot from './shots/photo.webp';
  import scanShot from './shots/scan.webp';
  import thaiShot from './shots/thai.webp';
  import supplementShot from './shots/supplement.webp';
  import trainShot from './shots/train.webp';
  import progressShot from './shots/progress.webp';
  import checkinShot from './shots/checkin.webp';
  import mapShot from './shots/map.webp';
  import mark from '../../../design/brand/mark.svg?raw';

  const L = t.landing;

  /** Onboarding's first question, keeping any answers from an earlier visit (the step after 'welcome', as onboarding counts). */
  function start() {
    const d = { ...(prefs.draft ?? fresh()), at: 'welcome' as const };
    prefs.draft = { ...d, at: step(d, yearOf(today()), 1) };
    scrollTo({ top: 0 });
  }
  const signin = () => (sheets.signin = true);

  /** The headline's words in order, marked violet when they sat between asterisks. */
  const hero = L.promise.split('*').flatMap((part, p) => part.trim().split(' ').filter(Boolean).map((w) => ({ w, violet: p % 2 === 1 })));
  // the statement: words that fill in one by one, and whole pills between asterisks; the last pill is the dark one (pick 08)
  type Part = { pill: string; tail: string } | { word: string; i: number };
  function partsOf(s: string) {
    const out: Part[] = [];
    let i = 0;
    s.split('*').forEach((chunk, p) => {
      if (p % 2) out.push({ pill: chunk.trim(), tail: '' });
      else for (const word of chunk.split(' ').filter(Boolean)) {
        const last = out.at(-1);
        // a comma or full stop right after a pill stays on its line
        if (last && 'pill' in last && /^[,.]$/.test(word)) last.tail = word;
        else out.push({ word, i: i++ });
      }
    });
    return out;
  }
  const parts = partsOf(L.statement);
  const n = parts.filter((x) => 'word' in x).length;
  const darkPill = parts.reduce((last, x, k) => ('pill' in x ? k : last), -1);
  const TILES = [
    { icon: Camera, at: 'top-8 left-[6%]', look: '-rotate-12 size-14', speed: -0.1 },
    { icon: ScanBarcode, at: 'top-14 right-[7%]', look: 'rotate-[10deg] size-12', speed: -0.18 },
    { icon: TrainIcon, at: 'bottom-10 left-[10%]', look: 'rotate-[14deg] size-12', speed: -0.06 },
    { icon: Scale, at: 'right-[6%] bottom-16', look: '-rotate-6 size-16', speed: -0.14 },
  ];

  const LOG = [
    { shot: photoShot, alt: L.alt.photo },
    { shot: scanShot, alt: L.alt.scan },
    { shot: thaiShot, alt: L.alt.thai },
    { shot: supplementShot, alt: L.alt.supplement },
  ].map((x, i) => ({ ...x, ...L.log.cards[i] }));
  const TRAIN = [
    { shot: trainShot, alt: L.alt.train, icon: TrainIcon, panel: 'bg-mist' },
    { shot: progressShot, alt: L.alt.progress, icon: TrendingUp, panel: 'bg-peach' },
  ].map((x, i) => ({ ...x, ...L.train.cards[i] }));
  const FRIENDS = [UserPlus, MapPin, Lock].map((icon, i) => ({ icon, ...L.friends.points[i] }));
  // each number on the page cites the constant's own source, so the cards cannot drift from the engine
  const SOURCED = [
    { label: L.sources.resting, source: SOURCES[C.mifflin.source]?.short, wash: '[--lens:var(--wash-ink)] text-on-night' },
    { label: L.sources.training, source: SOURCES[C.metStrength.source]?.short, wash: '[--lens:var(--wash-steel)] text-on-night' },
    { label: L.sources.gain, source: SOURCES[C.gainPace.source]?.short, wash: '[--lens:var(--wash-clay)] text-on-night' },
    { label: L.sources.thai, source: L.sources.thaiSource, wash: '[--lens:var(--wash-sand)] text-night' },
  ];

  // the floating Build your plan: once the hero's action has scrolled away, until the closing call is on screen
  let heroAction = $state(true);
  let closing = $state(false);
  const floating = $derived(!heroAction && !closing);
  // the status bar continues the hero's sky while the landing page shows (U1b)
  $effect(() => {
    topColour('--sky-top');
    return () => topColour();
  });
</script>

{#snippet head(n: string, tag: string, title: string, lead: string)}
  <div class="mx-auto flex max-w-[52rem] flex-col items-center text-center">
    <!-- the tilted sticker eyebrow, "01 BENEFITS" in pick 01 -->
    <p class="sticker flex items-end" use:inview data-reveal>
      <span class="bg-surface-2 text-ink-2 text-eyebrow -rotate-12 rounded-xs px-2 py-1.5">{n}</span>
      <span class="bg-ink-2 text-surface text-eyebrow -ml-1 rotate-6 rounded-xs px-3 py-1.5">{tag}</span>
    </p>
    <h2 class="words text-section mt-6 text-balance" use:inview data-reveal>
      {#each title.split(' ') as w, i (i)}<span class="w inline-block" style:--i={i}>{w}</span>{' '}{/each}
    </h2>
    <p class="text-lead text-ink-2 mt-5 max-w-[40rem] text-pretty">{lead}</p>
  </div>
{/snippet}

<div class="bg-surface text-ink relative min-h-svh overflow-x-clip" data-testid="landing" use:bend>
  <!-- the bar: OneFin's floating bar in Liquid Glass (L2), with the wordmark and the way back in. L3: it starts below the
       status bar rather than padding under it, so nothing fixed touches the top edge and Safari 26 shows the page there
       (the hero's sky) instead of filling the bar with a colour sampled from a fixed header -->
  <header class="bar fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-30 px-4">
    <!-- U1b: Sign in (sm, 36) sits 8 inside the 52 high bar on three sides, so its 16 corners nest in the bar's 24. L3,
         the owner: the ink pill -->
    <nav class="liquid-bar mx-auto flex h-13 max-w-[1200px] items-center justify-between rounded-md pr-2 pl-5" aria-label={t.app.name}>
      <Wordmark class="h-5 w-fit" />
      <Button variant="primary" size="sm" onclick={signin} data-testid="landing-signin">{L.signin}</Button>
    </nav>
  </header>

  <main>
    <!-- the hero: OneFin's sky as a photo gradient with grain (L2), the promise word by word, the action popping in, Today
         rising in an iPhone 16 with two glass chips -->
    <section class="relative isolate px-4 pt-[calc(env(safe-area-inset-top)+120px)] lg:pt-44" data-testid="landing-hero">
      <div class="absolute inset-0 -z-10 [background:var(--grad-sky)]" aria-hidden="true"></div>
      <div class="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        <div class="text-center lg:pb-24 lg:text-left">
          <h1 class="text-poster text-balance">
            {#each hero as x, i (i)}<span class="hero-word inline-block {x.violet ? 'text-accent-ink' : ''}" style:--i={i}>{x.w}</span>{' '}{/each}
          </h1>
          <p class="text-lead hero-lead mx-auto mt-6 max-w-[34rem] text-pretty lg:mx-0">{L.lead}</p>
          <div class="mt-8 flex flex-col items-center gap-1 lg:items-start" use:onscreen={(v) => (heroAction = v)}>
            <div class="pop"><Button variant="primary" size="lg" onclick={start} data-testid="landing-start">{L.start}</Button></div>
            <p class="text-caption pop" style:--d="0.75s">{L.noAccount}</p>
          </div>
        </div>
        <div class="relative mx-auto w-[min(70vw,300px)] lg:w-[min(100%,340px)]">
          <div class="rise"><Phone src={todayShot} alt={L.alt.today} eager crop={0.62} /></div>
          <!-- the chips float over the sky and the phone, as OneFin's "Direct pay" and "Paid" (glass-03): white Liquid Glass,
               tilted, flying in -->
          <div class="drift absolute top-[18%] -left-[12%] z-10" style:--speed="0.12" aria-hidden="true">
            <span class="liquid-white text-night fly text-callout flex -rotate-6 items-center gap-2 rounded-full py-1 pr-4 pl-1 font-semibold" style:--fx="-120px" style:--fy="-60px" style:--fr="-30deg" style:--d="0.5s">
              <i class="bg-accent text-on-accent grid size-8 place-items-center rounded-full"><TrainIcon size={18} /></i>{t.today.trainingDay}
            </span>
          </div>
          <div class="drift absolute top-[48%] -right-[10%] z-10" style:--speed="0.24" aria-hidden="true">
            <span class="liquid-white text-night fly text-callout flex rotate-[9deg] items-center gap-2 rounded-full py-1 pr-4 pl-1 font-semibold" style:--fx="120px" style:--fy="-80px" style:--fr="30deg" style:--d="0.7s">
              <i class="bg-success text-night grid size-8 place-items-center rounded-full"><Check size={16} strokeWidth={3} /></i>{t.today.onTrack}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- the statement: big words with inline pills (pick 08), filling in as they scroll by, tilted violet tiles around -->
    <section class="bg-surface relative z-10 -mt-14 rounded-t-xl px-6 py-28 lg:py-40">
      {#each TILES as tile, i (i)}
        {@const Icon = tile.icon}
        <div class="drift absolute {tile.at}" style:--speed={tile.speed} aria-hidden="true">
          <span class="bob bg-accent text-on-accent shadow-float grid place-items-center rounded-sm {tile.look}" style:--d="{i * 0.8}s"><Icon size={24} /></span>
        </div>
      {/each}
      <p class="text-statement statement relative mx-auto max-w-[58rem] text-center text-balance" data-testid="landing-statement" style:--n={n}>
        {#each parts as x, k (k)}{#if k}{' '}{/if}{#if 'pill' in x}<span class="whitespace-nowrap"><span class="text-pill mx-1 inline-flex -translate-y-[0.12em] items-center rounded-full px-[0.9em] py-[0.35em] align-middle leading-none font-medium {k === darkPill ? 'bg-ink text-surface' : 'bg-surface-2 text-ink shadow-card'}">{x.pill}</span>{x.tail}</span>{:else}<span class="fill" style:--i={x.i}>{x.word}</span>{/if}{/each}
      </p>
    </section>

    <!-- 01 Logging: light grey cards (pick 01), the first the one featured card on the feature photo gradient (pick 02, L2),
         each a real screen -->
    <section class="px-4 pt-8 pb-24" id="logging" tabindex="-1" data-testid="landing-log">
      {@render head('01', L.log.tag, L.log.title, L.log.lead)}
      <div class="mx-auto mt-12 grid max-w-[1200px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {#each LOG as c, i (i)}
          <article class="card flex flex-col items-center overflow-clip rounded-xl px-6 pt-8 text-center {i === 0 ? 'feature text-on-accent' : 'bg-surface-2'}" use:inview data-reveal style:--i={i % 2}>
            <h3 class="text-lead">{c.title}</h3>
            <p class="text-callout mt-2 mb-6 max-w-[18rem] {i === 0 ? 'text-on-accent' : 'text-ink-2'}">{c.line}</p>
            <!-- one crop for all four, so the phones start level: enough to reach each sheet's main controls -->
            <Phone src={c.shot} alt={c.alt} crop={0.8} class="mt-auto w-[min(100%,240px)]" />
          </article>
        {/each}
      </div>
    </section>

    <!-- 02 Training: a dark section with a glow (pick 06, 12); dark cards hold flat palette panels (P1) and settle as they come -->
    <section class="px-2 sm:px-4" id="training" tabindex="-1" data-testid="landing-train">
      <div data-theme="dark" class="bg-canvas text-ink relative isolate overflow-clip rounded-xl px-4 pt-20 pb-24">
        <div class="glow absolute inset-x-0 bottom-0 -z-10 h-3/4 translate-y-1/2" aria-hidden="true"></div>
        {@render head('02', L.train.tag, L.train.title, L.train.lead)}
        <div class="mx-auto mt-12 grid max-w-[1000px] gap-4 md:grid-cols-2 md:gap-6">
          {#each TRAIN as c, i (i)}
            {@const Icon = c.icon}
            <article class="settle bg-surface rounded-xl p-2 pb-8" style:--tilt="{i ? 5 : -5}deg">
              <div class="{c.panel} flex justify-center overflow-clip rounded-sheet px-8 pt-8">
                <Phone src={c.shot} alt={c.alt} crop={0.55} class="w-[min(100%,240px)]" />
              </div>
              <div class="mt-6 flex items-center justify-between px-4">
                <span class="bg-accent text-on-accent grid size-12 place-items-center rounded-sm" aria-hidden="true"><Icon size={24} /></span>
                <span class="bg-ink text-surface num text-callout grid size-8 place-items-center rounded-xs font-semibold" aria-hidden="true">{i + 1}</span>
              </div>
              <h3 class="text-lead mt-4 px-4">{c.title}</h3>
              <p class="text-body text-ink-2 mt-2 px-4">{c.line}</p>
            </article>
          {/each}
        </div>
      </div>
    </section>

    <!-- 03 Check-in: a lavender led photo gradient with rings and tilted glass cards (pick 07, glass-02), and its 1-2-3 stepper -->
    <section class="px-4 pt-24 pb-28" id="check-in" tabindex="-1" data-testid="landing-checkin">
      {@render head('03', L.checkin.tag, L.checkin.title, L.checkin.lead)}
      <div class="mx-auto mt-12 grid max-w-[1100px] items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div class="text-night relative isolate flex justify-center overflow-clip rounded-xl px-6 pt-12 [background:var(--grad-lavender)]">
          {#each [1, 0.72, 0.44] as r (r)}
            <span class="border-on-night/60 absolute top-[38%] left-1/2 -z-10 aspect-square -translate-1/2 rounded-full border" style:width="{r * 100}%" aria-hidden="true"></span>
          {/each}
          <Phone src={checkinShot} alt={L.alt.checkin} crop={0.8} class="w-[min(100%,250px)]" />
          <!-- decoration in the check-in's own words: its first step and what vector F's account hears -->
          <span class="liquid-white text-night text-callout absolute top-[14%] left-3 max-w-[11rem] -rotate-6 rounded-md px-4 py-3 text-left" aria-hidden="true">
            <i class="bg-accent mb-1 block size-2 rounded-full"></i>{t.checkin.steps[0]}
          </span>
          <span class="liquid-white text-night text-callout absolute right-3 bottom-[18%] max-w-[12rem] rotate-6 rounded-md px-4 py-3 text-left" aria-hidden="true">
            <i class="bg-accent mb-1 block size-2 rounded-full"></i>{t.checkin.pace.gain.raise}
          </span>
        </div>
        <ol class="flex flex-col">
          {#each L.checkin.steps as s, i (i)}
            <li class="step relative flex gap-5 pb-10 last:pb-0" use:inview={0.6} data-reveal>
              {#if i < L.checkin.steps.length - 1}<span class="bg-line-strong absolute top-10 bottom-1 left-[19px] w-0.5" aria-hidden="true"></span>{/if}
              <span class="dot num bg-surface-2 text-ink-2 grid size-10 flex-none place-items-center rounded-sm text-body font-semibold">{i + 1}</span>
              <div class="pt-1.5">
                <h3 class="text-lead">{s.title}</h3>
                <p class="text-body text-ink-2 mt-1">{s.line}</p>
              </div>
            </li>
          {/each}
        </ol>
      </div>
    </section>

    <!-- 04 Friends (S1b): the food map in a phone, uncropped so its friends panel shows, beside what is shared and what never is -->
    <section class="px-4 pb-28" id="friends" tabindex="-1" data-testid="landing-friends">
      {@render head('04', L.friends.tag, L.friends.title, L.friends.lead)}
      <div class="mx-auto mt-12 grid max-w-[1100px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Phone src={mapShot} alt={L.alt.map} class="mx-auto w-[min(100%,260px)]" />
        <ul class="flex flex-col gap-8">
          {#each FRIENDS as p, i (i)}
            {@const Icon = p.icon}
            <li class="step flex gap-5" use:inview={0.6} data-reveal>
              <span class="bg-accent text-on-accent grid size-12 flex-none place-items-center rounded-sm" aria-hidden="true"><Icon size={24} /></span>
              <div class="pt-1">
                <h3 class="text-lead">{p.title}</h3>
                <p class="text-body text-ink-2 mt-1">{p.line}</p>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </section>

    <!-- the dark run to the end: 05 Sources on colour-washed cards (pick 10), the closing call, then the footer -->
    <div data-theme="dark" class="bg-canvas text-ink relative isolate overflow-clip rounded-t-xl">
      <section class="px-4 pt-24 pb-16" id="sources" tabindex="-1" data-testid="landing-sources">
        {@render head('05', L.sources.tag, L.sources.title, L.sources.lead)}
        <div class="mx-auto mt-12 grid max-w-[1200px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {#each SOURCED as c, i (i)}
            <article class="settle relative flex min-h-52 flex-col justify-between gap-8 rounded-lg p-6 [background:var(--lens)] {c.wash}" style:--tilt="{i % 2 ? 3 : -3}deg" data-lens>
              <span class="relative isolate grid size-12 place-items-center rounded-sm {i === 3 ? 'bg-accent text-on-accent' : 'liquid'}" aria-hidden="true">
                {#if i !== 3}<span class="lens" use:lens></span>{/if}<BookOpen size={22} />
              </span>
              <div>
                <p class="text-callout font-medium opacity-80">{c.label}</p>
                <p class="text-lead mt-1 text-balance">{c.source}</p>
              </div>
            </article>
          {/each}
        </div>
      </section>

      <!-- the closing call: big words sliding in (M18), the violet panel with the white pill -->
      <!-- the floating action stays away from here to the end -->
      <div use:onscreen={(v) => (closing = v)}>
      <section class="relative px-4 pt-12 pb-16 text-center" data-testid="landing-cta">
        <h2 class="text-poster flex flex-col items-center">
          {#each L.cta.words as w, i (i)}<span class="slide block {i === 1 ? 'text-on-accent-soft' : ''}" style:--from="{[-40, -70, -25][i]}vw">{w}</span>{/each}
        </h2>
        <div class="text-on-accent relative mx-auto mt-10 flex max-w-[34rem] flex-col items-center rounded-xl px-6 py-10 [--lens:var(--grad-call)] [background:var(--lens)]" data-lens>
          <span class="liquid relative isolate mb-6 grid size-16 place-items-center rounded-md [&>svg]:size-11" aria-hidden="true"><span class="lens" use:lens></span>{@html mark}</span>
          <p class="text-lead max-w-[24rem] text-pretty">{L.cta.line}</p>
          <Button variant="primary" size="lg" onclick={start} class="mt-6" data-testid="landing-start-end">{L.start}</Button>
          <p class="text-caption mt-1">{L.noAccount}</p>
        </div>
        <p class="text-body text-ink-2 mt-6">{L.cta.account} <button type="button" class="tap text-accent-ink active:bg-surface-2 min-h-11 rounded-xs px-1 font-semibold" onclick={signin}>{L.signin}</button></p>
      </section>

      <!-- the footer (pick 09, glass-01): a teaser that opens with a pull past the end (L3) -->
      <Footer onstart={start} onsignin={signin} />
      </div>
    </div>
  </main>

  <!-- Build your plan, floating once the hero's action has gone by: the ink pill on the dock's glass -->
  <div class="float-cta fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(12px,env(safe-area-inset-bottom))]" data-shown={floating || undefined} inert={!floating} data-testid="landing-float">
    <div class="liquid-bar mx-auto max-w-sm rounded-md p-1">
      <Button variant="primary" size="lg" full onclick={start}>{L.start}</Button>
    </div>
  </div>
</div>

<style>
  /* every tap has a pressed state (PRD section 8, DESIGN.md section 10): the fill steps in the markup, and the face scales
     to 0.97 over --d-press when motion is welcome */
  .tap { transition: background-color var(--d-press), scale var(--d-press); }
  @media (prefers-reduced-motion: no-preference) { .tap:active { scale: 0.97; } }
  /* L3: the footer's Learn links scroll to these and focus them; the bar (8 + 52) and 8 more stay clear */
  section[id] { scroll-margin-top: calc(env(safe-area-inset-top) + var(--spacing) * 17); outline: none; }
  /* the lead sits on the sky's photo (P1: mist, sand and peach, contrast.test.ts checks ink on all of it): full ink, not ink-2 */
  .hero-lead { color: var(--ink); }

  /* hidden until shown, in every motion setting; the slide itself only when motion is welcome */
  .float-cta:not([data-shown]) { opacity: 0; translate: 0 calc(100% + 16px); }

  /* MOTION.md: every recipe only when motion is welcome. With reduced motion the end state shows at once. */
  @media (prefers-reduced-motion: no-preference) {
    .float-cta { transition: opacity 0.3s var(--ease-out), translate 0.42s var(--spring-default); }

    /* M1: the bar drops in */
    .bar { animation: drop 1s var(--ease-framer) 0.2s both; }
    @keyframes drop { from { opacity: 0; translate: 0 -48px; } }
    /* M2: the promise blurs up word by word */
    .hero-word { animation: blur-up 0.8s var(--ease-framer) both; animation-delay: calc(0.2s + var(--i) * 0.1s); }
    @keyframes blur-up { from { opacity: 0; translate: 0 15px; filter: blur(10px); } }
    .hero-lead { animation: blur-up 0.8s var(--ease-framer) 0.9s both; }
    /* M3: the action pops on OneFin's bouncy spring */
    .pop { animation: pop 1.36s var(--spring-pop) both; animation-delay: var(--d, 0.6s); }
    @keyframes pop { from { opacity: 0; scale: 0.5; translate: 0 40px; } }
    /* M4: the phone rises; M5: its chips fly in from tilted offsets */
    .rise { animation: rise 2.35s var(--spring-fly) 0.2s both; }
    @keyframes rise { from { opacity: 0; translate: 0 108px; } }
    .fly { animation: fly 2.35s var(--spring-fly) both; animation-delay: var(--d); }
    @keyframes fly { from { opacity: 0; translate: var(--fx) var(--fy); rotate: var(--fr); } }
    /* decoration floats gently (pick 08), never the words */
    .bob { animation: bob 5s ease-in-out infinite alternate both; animation-delay: var(--d); }
    @keyframes bob { from { translate: 0 6px; } to { translate: 0 -6px; } }

    /* recipe B, triggered once in view: M10 cards scale in, M9 headline words blur in, stickers pop (the footer rises in Footer.svelte) */
    .card { transition: opacity 0.5s var(--ease-out), scale 0.98s var(--spring-appear); transition-delay: calc(var(--i) * 0.1s); }
    .card:not([data-inview]) { opacity: 0; scale: 0.5; }
    .words .w { transition: opacity 0.45s var(--ease-out), translate 0.45s var(--ease-out), filter 0.45s var(--ease-out); transition-delay: calc(var(--i) * 70ms); }
    .words:not([data-inview]) .w { opacity: 0; translate: 0 10px; filter: blur(10px); }
    .sticker > span { transition: opacity 0.3s var(--ease-out), scale 1.36s var(--spring-pop); }
    .sticker > span + span { transition-delay: 0.12s; }
    .sticker:not([data-inview]) > span { opacity: 0; scale: 0.4; }
    .step { transition: opacity 0.5s var(--ease-out), translate 0.6s var(--spring-appear); }
    .step:not([data-inview]) { opacity: 0.3; translate: 0 16px; }
    .step .dot { transition: background-color 0.42s var(--spring-default), color 0.42s var(--spring-default); }

    /* recipe C, scrubbed by the scroll where the browser can (Safari 26, Chrome): parallax, the statement filling in,
       cards settling from a tilt, the closing words sliding in. Elsewhere everything stays at rest */
    @supports (animation-timeline: view()) {
      .drift { animation: drift linear both; animation-timeline: view(); }
      @keyframes drift { from { translate: 0 calc(var(--speed) * -400px); } to { translate: 0 calc(var(--speed) * 400px); } }
      .statement { view-timeline: --statement; }
      .fill { animation: fill linear both; animation-timeline: --statement; animation-range: cover calc(20% + var(--i) / var(--n) * 35%) cover calc(20% + (var(--i) + 1) / var(--n) * 35%); }
      @keyframes fill { from { opacity: 0.2; } }
      .settle { animation: settle linear both; animation-timeline: view(); animation-range: entry 0% cover 35%; }
      @keyframes settle { from { rotate: var(--tilt); translate: 0 64px; } }
      .slide { animation: slide linear both; animation-timeline: view(); animation-range: entry 0% cover 45%; }
      @keyframes slide { from { translate: var(--from) 0; } }
    }
  }
  /* the active step reads in ink, as pick 07's white number on dark */
  .step:global([data-inview]) .dot { background: var(--action); color: var(--on-action); }
</style>
