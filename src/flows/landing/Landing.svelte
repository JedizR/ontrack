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
  import { prefs } from '$lib/prefs.svelte';
  import { interactive, lean } from './glass';
  import { followEdges } from './edge';
  import { sheets } from '$lib/sheets.svelte';
  import { t } from '$lib/i18n';
  import { fresh, step } from '../onboarding/draft';
  import Footer from './Footer.svelte';
  import Phone from './Phone.svelte';
  import { inview, live, onscreen } from './inview';
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
  import './landing.css';

  const L = t.landing;

  /** Onboarding's first question, keeping any answers from an earlier visit (the step after 'welcome', as onboarding counts). */
  function start() {
    const d = { ...(prefs.draft ?? fresh()), at: 'welcome' as const };
    prefs.draft = { ...d, at: step(d, yearOf(today()), 1) };
    scrollTo({ top: 0 });
  }
  const signin = () => (sheets.signin = true);

  // L4: each chapter's sticker colour, from the owner's palette (decoration only)
  const CHAPTER = ['bg-coral', 'bg-steel', 'bg-peach', 'bg-mist', 'bg-sand'];
  // L4: playful, never in step: each word, card and tile gets its own tilt and offset from these, by its place
  const TILT = [-7, 5, -4, 8, -6, 3, -8, 6];
  const tilt = (i: number, k = 1) => `${TILT[i % TILT.length] * k}deg`;

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
    { icon: Camera, at: 'top-6 left-[6%] sm:top-8', look: '-rotate-12 size-14', speed: -0.1 },
    { icon: ScanBarcode, at: 'top-8 right-[7%] sm:top-14', look: 'rotate-[10deg] size-12', speed: -0.18 },
    { icon: TrainIcon, at: 'bottom-4 left-[10%] sm:bottom-10', look: 'rotate-[14deg] size-12', speed: -0.06 },
    { icon: Scale, at: 'right-[6%] bottom-6 sm:bottom-16', look: '-rotate-6 size-16', speed: -0.14 },
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
    { label: L.sources.resting, source: SOURCES[C.mifflin.source]?.short, wash: '[background:var(--wash-1)] text-night' },
    { label: L.sources.training, source: SOURCES[C.metStrength.source]?.short, wash: '[background:var(--wash-2)] text-night' },
    { label: L.sources.gain, source: SOURCES[C.gainPace.source]?.short, wash: '[background:var(--wash-3)] text-night' },
    { label: L.sources.thai, source: L.sources.thaiSource, wash: '[background:var(--wash-4)] text-night' },
  ];

  // the floating Build your plan: once the hero's action has scrolled away, until the closing call is on screen
  let heroAction = $state(true);
  let closing = $state(false);
  const floating = $derived(!heroAction && !closing);

  // L4: the bar's glass is "none" over the hero's sky, where its words read, and grows out of Sign in once anything
  // scrolls under it; over a dark section it turns dark, as iOS glass follows what is behind it
  let y = $state(0);
  let barDark = $state(false);
  let floatDark = $state(false);
  let root: HTMLElement;
  let bar: HTMLElement;
  let float: HTMLElement;
  // Safari's bars: the page's background follows the section at the top of the screen (edge.ts, DECISIONS L4); the bar
  // and the floating action take the scheme of what is under them (ink on light, white on dark)
  $effect(() => followEdges(root, [[() => bar, (d) => (barDark = d)], [() => float, (d) => (floatDark = d)]]));
</script>

<svelte:window bind:scrollY={y} />

{#snippet head(n: string, tag: string, title: string, lead: string)}
  <div class="mx-auto flex max-w-[52rem] flex-col items-center text-center">
    <!-- the tilted sticker eyebrow, "01 BENEFITS" in pick 01: it pops in, then wiggles now and then. L4: each chapter's
         tag in its own palette colour with night words (DESIGN.md section 4, rule 8: a chapter's colour) -->
    <p class="sticker wiggle flex items-end" use:inview data-reveal style:--t="7s" style:--d="{Number(n) * 0.9}s">
      <span class="bg-surface-2 text-ink-2 text-eyebrow -rotate-12 rounded-xs px-2 py-1.5">{n}</span>
      <span class="{CHAPTER[Number(n) - 1]} text-night text-eyebrow -ml-1 rotate-6 rounded-xs px-3 py-1.5">{tag}</span>
    </p>
    <h2 class="words text-section mt-6 text-balance" use:inview data-reveal>
      {#each title.split(' ') as w, i (i)}<span class="w inline-block" style:--i={i} style:--r={tilt(i + Number(n), 2)}>{w}</span>{' '}{/each}
    </h2>
    <p class="rise-in text-lead text-ink-2 mt-5 max-w-[40rem] text-pretty">{lead}</p>
  </div>
{/snippet}

<div bind:this={root} class="bg-surface text-ink relative min-h-svh overflow-x-clip" data-testid="landing" data-edge="--surface">
  <!-- the bar: Liquid Glass (L4), the page's width less a 36 gutter (the owner took the 430 cap back). It starts below the status bar, so
       nothing fixed touches the top edge, where Safari 26 would fill its bar from it (L3, DECISIONS L4) -->
  <header bind:this={bar} class="bar fixed inset-x-0 top-[calc(env(safe-area-inset-top)+8px)] z-30 px-9" data-over data-theme={barDark ? 'dark' : 'light'}>
    <!-- Sign in (sm, 36) sits 8 inside the 52 high capsule, so its round ends nest in the bar's (26 less 8) -->
    <!-- the light follows a mouse over the bar and a finger on it; it is drawn in the glass, not over the bar, since a
         rounded clip on the bar would cut the glass off from what is behind it -->
    <nav class="text-ink relative isolate mx-auto flex h-13 items-center justify-between rounded-full pr-2 pl-5" aria-label={t.app.name} use:interactive data-testid="landing-bar">
      <span class="bar-glass liquid liquid-touch absolute! inset-0 -z-10 rounded-full" data-on={y > 8 || undefined} aria-hidden="true"></span>
      <Wordmark class="h-5 w-fit" />
      <Button variant="primary" size="sm" onclick={signin} class="[&>span]:rounded-full" data-testid="landing-signin">{L.signin}</Button>
    </nav>
  </header>

  <main>
    <!-- the hero: OneFin's sky as a photo gradient with grain (L2), the promise, the action, Today rising in an iPhone 16
         with two clear glass chips. L4: the words are drawn from the first frame and tumble into line -->
    <section class="relative isolate px-4 pt-[calc(env(safe-area-inset-top)+120px)] pb-28 lg:pt-36" data-testid="landing-hero" data-edge="--sky-top" data-theme="light" use:live>
      <div class="absolute inset-0 -z-10 [background:var(--grad-sky)]" aria-hidden="true"></div>
      <div class="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
        <div class="exit text-center lg:pb-24 lg:text-left" style:--up="-40px">
          <h1 class="exit text-poster text-balance" style:--up="-60px" style:--fade="1">
            {#each hero as x, i (i)}<span class="hero-word inline-block {x.violet ? 'text-accent-ink' : ''}" style:--i={i} style:--r={tilt(i, 2)}>{x.w}</span>{' '}{/each}
          </h1>
          <p class="text-lead hero-lead mx-auto mt-6 max-w-[34rem] text-pretty lg:mx-0">{L.lead}</p>
          <div class="mt-8 flex flex-col items-center gap-1 lg:items-start" use:onscreen={(v) => (heroAction = v)}>
            <div class="pop"><Button variant="primary" size="lg" onclick={start} data-testid="landing-start">{L.start}</Button></div>
            <p class="text-caption pop" style:--d="0.75s">{L.noAccount}</p>
          </div>
        </div>
        <div class="exit-tilt relative mx-auto w-[min(70vw,300px)] lg:w-[min(100%,300px)]">
          <div class="rise"><div class="float" style:--t="8s"><Phone src={todayShot} alt={L.alt.today} eager /></div></div>
          <!-- the chips float over the sky and the phone, as OneFin's "Direct pay" and "Paid" (glass-03): clear glass with
               their words over the phone's light screen, where they read in both themes (the first's icon over the
               bezel); they answer a touch -->
          <div class="drift absolute top-[18%] -left-[6%] z-10" style:--speed="0.12" aria-hidden="true">
            <div class="bob" style:--t="4.6s" style:--bob="5px">
              <span class="liquid-clear liquid-touch liquid-grow text-night fly text-callout flex -rotate-6 items-center gap-2 rounded-full py-1 pr-4 pl-1 font-semibold" style:--fx="-120px" style:--fy="-60px" style:--fr="-30deg" style:--d="0.5s" use:interactive>
                <i class="bg-accent text-on-accent grid size-8 place-items-center rounded-full"><TrainIcon size={18} /></i>{t.today.trainingDay}
              </span>
            </div>
          </div>
          <div class="drift absolute top-[60%] -right-[0.5%] z-10" style:--speed="0.24" aria-hidden="true">
            <div class="bob" style:--t="5.8s" style:--d="-2s" style:--spin="-2deg">
              <span class="liquid-clear liquid-touch liquid-grow text-night fly text-callout flex rotate-[9deg] items-center gap-2 rounded-full py-1 pr-4 pl-1 font-semibold" style:--fx="120px" style:--fy="-80px" style:--fr="30deg" style:--d="0.7s" use:interactive>
                <i class="bg-success text-night grid size-8 place-items-center rounded-full"><Check size={16} strokeWidth={3} /></i>{t.today.onTrack}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- the statement: big words with inline pills (pick 08), filling in as they scroll by, tilted violet tiles around that
         bob on their own and spin when touched -->
    <section class="bg-surface relative z-10 -mt-14 rounded-t-xl px-6 py-32 lg:py-40" data-testid="landing-statement-section" use:live>
      {#each TILES as tile, i (i)}
        {@const Icon = tile.icon}
        <div class="drift absolute {tile.at}" style:--speed={tile.speed} aria-hidden="true">
          <div class="bob" style:--t="{4.4 + i * 0.9}s" style:--d="{-i * 1.3}s" style:--bob="{5 + i}px" style:--spin="{3 + i}deg">
            <span class="toy bg-accent text-on-accent shadow-float grid place-items-center rounded-sm {tile.look}" use:interactive><Icon size={24} /></span>
          </div>
        </div>
      {/each}
      <p class="text-statement statement relative mx-auto max-w-[58rem] text-center text-balance" data-testid="landing-statement" style:--n={n}>
        {#each parts as x, k (k)}{#if k}{' '}{/if}{#if 'pill' in x}<span class="whitespace-nowrap"><span class="text-pill pill mx-1 inline-flex -translate-y-[0.12em] items-center rounded-full px-[0.9em] py-[0.35em] align-middle leading-none font-medium {k === darkPill ? 'bg-ink text-surface' : 'bg-surface-2 text-ink shadow-card'}" style:--r={tilt(k, 1.5)}>{x.pill}</span>{x.tail}</span>{:else}<span class="fill" style:--i={x.i}>{x.word}</span>{/if}{/each}
      </p>
    </section>

    <!-- 01 Logging: light grey cards (pick 01), the first the one featured card on the feature photo gradient (pick 02, L2),
         each a real screen. L4: each comes in on the scroll from its own side and tilt, as the Training cards do -->
    <section class="px-4 pt-8 pb-24" id="logging" tabindex="-1" data-testid="landing-log" use:live>
      {@render head('01', L.log.tag, L.log.title, L.log.lead)}
      <div class="mx-auto mt-12 grid max-w-[1200px] gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {#each LOG as c, i (i)}
          <article class="settle lean flex flex-col items-center overflow-clip rounded-xl px-6 pt-8 pb-8 text-center {i === 0 ? 'feature text-ink' : 'bg-surface-2'}" style:--tilt={tilt(i + 1, 1.2)} style:--dx="{[-48, 56, -36, 64][i]}px" style:--dy="{120 + i * 10}px" use:lean>
            <h3 class="text-lead">{c.title}</h3>
            <p class="text-callout mt-2 mb-6 max-w-[18rem] text-ink-2">{c.line}</p>
            <!-- every phone is the whole iPhone 16, so they all stand level -->
            <div class="counter mt-auto w-[min(100%,240px)]" style:--tilt={tilt(i + 1, -0.8)}><Phone src={c.shot} alt={c.alt} /></div>
          </article>
        {/each}
      </div>
    </section>

    <!-- 02 Training: a dark section (pick 06, 12), no glow (the owner); its cards, a step lighter than the page, hold flat palette panels (P1) and settle as they come -->
    <section class="px-2 sm:px-4" id="training" tabindex="-1" data-testid="landing-train" use:live>
      <div data-theme="dark" data-edge="--canvas" class="bg-canvas text-ink relative isolate overflow-clip rounded-xl px-4 pt-20 pb-24">
        {@render head('02', L.train.tag, L.train.title, L.train.lead)}
        <div class="mx-auto mt-12 grid max-w-[1000px] gap-4 md:grid-cols-2 md:gap-6">
          {#each TRAIN as c, i (i)}
            {@const Icon = c.icon}
            <article class="settle lean rounded-xl bg-[color-mix(in_srgb,var(--surface)_65%,var(--surface-2))] p-2 pb-8" style:--tilt="{i ? 9 : -9}deg" style:--dx="{i ? 64 : -64}px" style:--dy="110px" use:lean>
              <div class="{c.panel} flex justify-center overflow-clip rounded-sheet px-8 pt-8 pb-8">
                <div class="counter w-[min(100%,240px)]" style:--tilt="{i ? -6 : 6}deg"><Phone src={c.shot} alt={c.alt} /></div>
              </div>
              <div class="mt-6 flex items-center justify-between px-4">
                <span class="bg-accent text-on-accent wiggle grid size-12 place-items-center rounded-sm" style:--t="6.5s" style:--d="{-i * 3}s" aria-hidden="true"><Icon size={24} /></span>
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
    <section class="px-4 pt-24 pb-28" id="check-in" tabindex="-1" data-testid="landing-checkin" use:live>
      {@render head('03', L.checkin.tag, L.checkin.title, L.checkin.lead)}
      <div class="mx-auto mt-12 grid max-w-[1100px] items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div class="settle text-night relative isolate flex justify-center overflow-clip rounded-xl px-6 pt-12 pb-8 [background:var(--grad-lavender)]" style:--tilt="-5deg" style:--dx="-24px" style:--dy="90px">
          {#each [1, 0.72, 0.44] as r, i (r)}
            <span class="absolute top-[38%] left-1/2 -z-10 aspect-square -translate-1/2" style:width="{r * 100}%" aria-hidden="true"><span class="breathe border-on-night/60 block size-full rounded-full border" style:--t="{5 + i * 1.4}s" style:--d="{-i * 1.7}s"></span></span>
          {/each}
          <Phone src={checkinShot} alt={L.alt.checkin} class="w-[min(100%,250px)]" />
          <!-- decoration in the check-in's own words: its first step and what vector F's account hears -->
          <div class="bob absolute top-[27%] left-2" style:--t="5.2s" style:--d="-1s" aria-hidden="true">
            <span class="liquid-clear liquid-touch liquid-grow text-night text-callout block max-w-[11rem] -rotate-6 rounded-md px-4 py-3 text-left" use:interactive>
              <i class="bg-accent mb-1 block size-2 rounded-full"></i>{t.checkin.steps[0]}
            </span>
          </div>
          <div class="bob absolute right-2 bottom-[17%]" style:--t="6.1s" style:--d="-3s" style:--spin="-2deg" aria-hidden="true">
            <span class="liquid-clear liquid-touch liquid-grow text-night text-callout block max-w-[12rem] rotate-6 rounded-md px-4 py-3 text-left" use:interactive>
              <i class="bg-accent mb-1 block size-2 rounded-full"></i>{t.checkin.pace.gain.raise}
            </span>
          </div>
        </div>
        <ol class="flex flex-col">
          {#each L.checkin.steps as s, i (i)}
            <li class="step relative flex gap-5 pb-10 last:pb-0" use:inview={0.6} data-reveal style:--sx="{i % 2 ? -32 : 40}px" style:--r={tilt(i, 0.5)}>
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
    <section class="px-4 pb-28" id="friends" tabindex="-1" data-testid="landing-friends" use:live>
      {@render head('04', L.friends.tag, L.friends.title, L.friends.lead)}
      <div class="mx-auto mt-12 grid max-w-[1100px] items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div class="settle mx-auto w-[min(100%,260px)]" style:--tilt="-8deg" style:--dx="-56px" style:--dy="80px"><Phone src={mapShot} alt={L.alt.map} /></div>
        <ul class="flex flex-col gap-8">
          {#each FRIENDS as p, i (i)}
            {@const Icon = p.icon}
            <li class="step flex gap-5" use:inview={0.6} data-reveal style:--sx="{48 + i * 16}px" style:--r={tilt(i + 3, 0.5)}>
              <span class="toy wiggle bg-accent text-on-accent grid size-12 flex-none place-items-center rounded-sm" style:--t="{6 + i}s" style:--d="{-i * 2.2}s" aria-hidden="true" use:interactive><Icon size={24} /></span>
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
    <div data-theme="dark" data-edge="--canvas" class="bg-canvas text-ink relative isolate overflow-clip rounded-t-xl">
      <section class="px-4 pt-24 pb-16" id="sources" tabindex="-1" data-testid="landing-sources" use:live>
        {@render head('05', L.sources.tag, L.sources.title, L.sources.lead)}
        <div class="mx-auto mt-12 grid max-w-[1200px] gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {#each SOURCED as c, i (i)}
            <article class="settle lean relative flex min-h-52 flex-col justify-between gap-8 rounded-lg p-4 {c.wash}" style:--tilt={tilt(i + 2, 1)} style:--dx="{[-40, 48, -32, 56][i]}px" style:--dy="90px" use:lean>
              <span class="grid size-12 place-items-center rounded-sm {i === 3 ? 'bg-accent text-on-accent' : 'liquid-clear'}" aria-hidden="true"><BookOpen size={22} /></span>
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
      <section class="relative px-4 pt-12 pb-16 text-center" data-testid="landing-cta" use:live>
        <h2 class="text-poster flex flex-col items-center">
          {#each L.cta.words as w, i (i)}<span class="slide block {i === 1 ? 'text-on-accent-soft' : ''}" style:--from="{[-40, 70, -25][i]}vw" style:--r={tilt(i + 2, 1.5)}>{w}</span>{/each}
        </h2>
        <div class="settle text-ink relative mx-auto mt-10 flex max-w-[34rem] flex-col items-center rounded-xl px-6 py-10 [background:var(--grad-call)]" data-theme="light" style:--tilt="4deg" style:--dy="100px" style:--s="0.86">
          <span class="spin" use:inview data-reveal aria-hidden="true">
            <span class="liquid-clear liquid-touch liquid-grow float mb-6 grid size-16 place-items-center rounded-md [--liquid-tint:var(--accent)] [--liquid-tint-share:30%] [&>svg]:size-11" style:--t="6s" use:interactive>{@html mark}</span>
          </span>
          <p class="text-lead max-w-[24rem] text-pretty">{L.cta.line}</p>
          <Button variant="primary" size="lg" onclick={start} class="mt-6" data-testid="landing-start-end">{L.start}</Button>
          <p class="text-caption mt-1">{L.noAccount}</p>
        </div>
        <p class="text-body text-ink-2 mt-6">{L.cta.account} <button type="button" class="tap link-line text-accent-ink active:bg-surface-2 min-h-11 rounded-xs px-1 font-semibold" onclick={signin}>{L.signin}</button></p>
      </section>

      <!-- the footer (L5): a quote, the line with the wordmark, the essentials -->
      <Footer />
      </div>
    </div>
  </main>

  <!-- Build your plan, floating once the hero's action has gone by: the ink pill on the bar's glass, 8 inside it as Sign in is.
       L4: held 16 above the bottom and shown and hidden in place, so it never touches the bottom edge, where Safari 26 would
       fill its bar from it -->
  <div bind:this={float} class="float-cta fixed bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] left-1/2 z-30 w-[min(calc(100%-2rem),24rem)] -translate-x-1/2" data-over data-theme={floatDark ? 'dark' : 'light'} data-shown={floating || undefined} inert={!floating} data-testid="landing-float">
    <div class="relative isolate rounded-[calc(var(--r-control)+0.5rem)] p-2" use:interactive>
      <span class="liquid liquid-touch absolute! inset-0 -z-10 rounded-[calc(var(--r-control)+0.5rem)]" aria-hidden="true"></span>
      <Button variant="primary" size="lg" full onclick={start}>{L.start}</Button>
    </div>
  </div>
</div>

<style>
  /* L3: the footer's Learn links scroll to these and focus them; the bar (8 + 52) and 8 more stay clear */
  section[id] { scroll-margin-top: calc(env(safe-area-inset-top) + var(--spacing) * 17); outline: none; }
  /* the lead sits on the sky's photo (P1: mist, sand and peach, contrast.test.ts checks ink on all of it): full ink, not ink-2 */
  .hero-lead { color: var(--ink); }

  /* the bar's glass: "none" at the top of the hero, "regular" once anything scrolls under it */
  .bar-glass:not([data-on]) { opacity: 0; scale: 0.24 1; }
  .bar-glass { transform-origin: right center; }
  /* the floating action: hidden until shown, in every motion setting, without leaving its place */
  .float-cta:not([data-shown]) { opacity: 0; scale: 0.9; translate: -50% 8px; }
  .float-cta { transform-origin: 50% 100%; }

  /* MOTION.md: every recipe only when motion is welcome. With reduced motion the end state shows at once. */
  @media (prefers-reduced-motion: no-preference) {
    .float-cta { transition: opacity 0.25s var(--ease-out), scale 0.5s var(--spring-pop), translate 0.5s var(--spring-pop); }
    /* the glass flows out of Sign in across the bar and back (callstack's materialize, and its container's merge) */
    .bar-glass { transition: opacity 0.2s var(--ease-out), scale 0.7s var(--spring-pop); }

    /* M1, L4: the bar settles in from just below its place, never passing the top edge, where Safari 26 would take
       its colour for the status bar and keep it. No opacity in it: a fading ancestor is a backdrop root in Chromium, and the
       bar's glass would blur nothing */
    .bar { animation: drop 0.9s var(--spring-appear) 0.15s backwards; }
    @keyframes drop { from { translate: 0 12px; scale: 0.94; } }
    /* M2, L4: the promise is drawn from the first frame (it is the largest paint) and each word tumbles into line from
       its own tilt, on OneFin's bouncy spring */
    .hero-word { animation: tumble 1.1s var(--spring-pop) backwards; animation-delay: calc(var(--i) * 45ms); }
    @keyframes tumble { from { translate: 0 0.32em; rotate: var(--r); scale: 0.9; filter: blur(14px); } }
    .hero-lead { animation: up 0.8s var(--ease-out) 0.35s backwards; }
    @keyframes up { from { opacity: 0; translate: 0 16px; filter: blur(10px); } }
    /* M3: the action pops on OneFin's bouncy spring */
    .pop { animation: pop 1.36s var(--spring-pop) backwards; animation-delay: var(--d, 0.45s); }
    @keyframes pop { from { opacity: 0; scale: 0.5; translate: 0 40px; filter: blur(10px); } }
    /* M4: the phone rises with a tilt, drawn from the first frame; M5: its chips fly in from tilted offsets */
    .rise { animation: rise 2.2s var(--spring-fly) 0.1s backwards; }
    @keyframes rise { from { translate: 0 120px; rotate: 7deg; } }
    .fly { animation: fly 2.35s var(--spring-fly) backwards; animation-delay: var(--d); }
    @keyframes fly { from { opacity: 0; translate: var(--fx) var(--fy); rotate: var(--fr); } }

    /* recipe B, once in view: headline words drop in from their own tilts, stickers pop, steps and points swing in from
       alternate sides, the closing call's mark spins in */
    .words .w { transition: opacity 0.4s var(--ease-out), translate 0.9s var(--spring-pop), rotate 0.9s var(--spring-pop); transition-delay: calc(var(--i) * 60ms); }
    .words:not([data-inview]) .w { opacity: 0; translate: 0 0.5em; rotate: var(--r); }
    .sticker > span { transition: opacity 0.3s var(--ease-out), scale 1.36s var(--spring-pop), rotate 1.36s var(--spring-pop); }
    .sticker > span + span { transition-delay: 0.12s; }
    .sticker:not([data-inview]) > span { opacity: 0; scale: 0.4; rotate: -40deg; }
    .sticker:not([data-inview]) > span + span { rotate: 30deg; }
    .step { transition: opacity 0.5s var(--ease-out), translate 0.9s var(--spring-pop), rotate 0.9s var(--spring-pop); }
    .step:not([data-inview]) { opacity: 0; translate: var(--sx) 12px; rotate: var(--r); }
    .step .dot { transition: background-color 0.42s var(--spring-default), color 0.42s var(--spring-default), scale 0.6s var(--spring-pop); }
    .step:global([data-inview]) .dot { scale: 1.08; }
    .spin { display: inline-block; transition: opacity 0.3s var(--ease-out), scale 1.2s var(--spring-pop), rotate 1.2s var(--spring-pop); }
    .spin:not([data-inview]) { opacity: 0; scale: 0.3; rotate: -160deg; }

    /* micro-interactions: a tile spins a little and grows under a finger or a mouse, the statement's pills lean */
    .toy { transition: rotate 0.6s var(--spring-pop), scale 0.6s var(--spring-pop); }
    .toy:global([data-pressed]) { rotate: 18deg; scale: 1.12; }
    @media (hover: hover) { .toy:hover { scale: 1.08; } .pill { transition: rotate 0.5s var(--spring-pop); } .pill:hover { rotate: var(--r); } }

    /* recipe C, scrubbed by the scroll where the browser can (Safari 26, Chrome): parallax, the statement filling in,
       blocks settling from their own tilt and side (the 02 Training card's motion, everywhere), what they hold turning the
       other way, the closing words sliding in. Elsewhere everything stays at rest */
    @supports (animation-timeline: view()) {
      .drift { animation: drift linear both; animation-timeline: view(); }
      @keyframes drift { from { translate: 0 calc(var(--speed) * -400px); } to { translate: 0 calc(var(--speed) * 400px); } }
      .statement { view-timeline: --statement; }
      .fill { animation: fill linear both; animation-timeline: --statement; animation-range: cover calc(20% + var(--i) / var(--n) * 35%) cover calc(20% + (var(--i) + 1) / var(--n) * 35%); }
      @keyframes fill { from { opacity: 0.2; } }
      .settle { animation: settle linear both; animation-timeline: view(); animation-range: entry 0% cover 38%; }
      @keyframes settle { from { rotate: var(--tilt); translate: var(--dx, 0px) var(--dy, 64px); scale: var(--s, 1); } }
      .counter { animation: counter linear both; animation-timeline: view(); animation-range: entry 10% cover 45%; }
      @keyframes counter { from { rotate: var(--tilt); translate: 0 40px; } }
      .slide { animation: slide linear both; animation-timeline: view(); animation-range: entry 0% cover 45%; }
      @keyframes slide { from { translate: var(--from) 0; rotate: var(--r); } }
      /* the hero leaves at three paces: the words faster than the rest of the column (which fades), the phone tipping back */
      .exit { animation: exit linear both; animation-timeline: view(); animation-range: exit 0% exit 100%; }
      @keyframes exit { to { translate: 0 var(--up); opacity: var(--fade, 0.3); } }
      .exit-tilt { animation: exit-tilt linear both; animation-timeline: view(); animation-range: exit 0% exit 90%; }
      @keyframes exit-tilt { to { rotate: -6deg; scale: 0.92; translate: 0 -40px; } }
      /* each lead rises a beat after its headline; the statement's pills pop as the words around them fill */
      .rise-in { animation: rise-in linear both; animation-timeline: view(); animation-range: entry 0% cover 28%; }
      @keyframes rise-in { from { translate: 0 32px; opacity: 0.3; } }
      .pill { animation: pill linear both; animation-timeline: view(); animation-range: entry 20% cover 42%; }
      @keyframes pill { from { scale: 0.5; rotate: var(--r); opacity: 0.4; } }
    }
  }
  /* the active step reads in ink, as pick 07's white number on dark */
  .step:global([data-inview]) .dot { background: var(--action); color: var(--on-action); }
</style>
