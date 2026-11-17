<!-- R2, the finished workout's moment, after Strava's "Nice work!" (research/r2/strava-activity): a full dark screen with
     two ribbons in the brand's lavender, peach and coral that draw themselves in, one icon, one headline, then what the
     session added up to. The session and this week's ring, time, sets and kg lifted counting up, each new best with what
     it beat, and the muscles worked on the body. It stays until Continue (the owner: nothing moves on by itself). -->
<script lang="ts">
  import { onMount } from 'svelte';
  import Dumbbell from '@lucide/svelte/icons/dumbbell';
  import Trophy from '@lucide/svelte/icons/trophy';
  import Button from '$lib/components/Button.svelte';
  import Count from '$lib/components/Count.svelte';
  import WeekRing from '$lib/components/WeekRing.svelte';
  import MuscleMap from '$lib/components/MuscleMap.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { db } from '$lib/db/store.svelte';
  import { haptic, pop } from '$lib/haptics';
  import { num } from '$lib/model/format';
  import { kgToLb } from '$lib/model/units';
  import { t } from '$lib/i18n';
  import type { Muscle } from '$lib/model/engine';
  import CoachCard from '$lib/components/CoachCard.svelte';
  import { sessionFacts } from '$lib/model/coach';
  import type { CoachRequest } from '../../../shared/coach';

  const d = $derived(sheets.done);
  const profile = $derived(db.get('profile', 'profile'));
  const metric = $derived(profile?.units !== 'imperial');
  const clock = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = Math.round(s % 60);
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
  };
  const worked = $derived(d ? (Object.keys(d.levels) as Muscle[]).map((m) => t.train.muscles[m]).join(', ') : '');

  // R2: one line on what the session meant (Strava's Athlete Intelligence, plain): the engine's numbers, AI's words
  const coachReq = $derived.by((): CoachRequest | null => {
    if (!d) return null;
    const before = db.live('slog').map((r) => r.data).filter((l) => !(l.date === d.date && l.sessionKey === d.key));
    return { kind: 'session', facts: sessionFacts({ workout: d.workout, before, units: profile?.units ?? 'metric' }), localDate: d.date };
  });
  let button = $state<HTMLElement>();
  onMount(() => {
    haptic();
    setTimeout(() => button?.querySelector('button')?.focus(), 50);
  });
  const close = () => (sheets.done = null);
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') close(); }} />

{#if d}
  <div class="bg-canvas text-ink fixed inset-0 z-[60] overflow-hidden" data-theme="dark" role="dialog" aria-modal="true" aria-labelledby="done-title" data-testid="workout-done-screen">
    <!-- the ribbons: decoration in the brand's colours, drawn from end to end -->
    <svg class="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 393 852" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="ribbon-a" x1="0" y1="1" x2="1" y2="0"><stop offset="0" style="stop-color: var(--lavender)" /><stop offset="0.55" style="stop-color: var(--peach)" /><stop offset="1" style="stop-color: var(--coral)" /></linearGradient>
        <linearGradient id="ribbon-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" style="stop-color: var(--coral)" /><stop offset="1" style="stop-color: var(--lavender)" /></linearGradient>
      </defs>
      <path class="ribbon" d="M -60 300 C 60 250 140 210 220 130 S 360 -10 470 -40" stroke="url(#ribbon-a)" />
      <path class="ribbon ribbon-2" d="M -60 760 C 80 690 210 700 300 760 S 430 880 480 820" stroke="url(#ribbon-b)" />
    </svg>

    <div class="relative mx-auto flex h-full max-w-[480px] flex-col overflow-y-auto px-6 pt-[calc(env(safe-area-inset-top)+56px)] pb-[calc(max(24px,env(safe-area-inset-bottom))+88px)]">
      <span class="liquid grid size-16 place-items-center rounded-full" in:pop><Dumbbell size={30} strokeWidth={2} aria-hidden="true" /></span>
      <h1 id="done-title" class="text-display rise mt-5 uppercase" style="--i: 1">{t.workout.niceWork}</h1>

      <div class="rise mt-4 flex items-center gap-3" style="--i: 2">
        <WeekRing done={d.week.done} planned={d.week.planned} size={44} label={t.workout.weekOf(num(d.week.done), num(d.week.planned))} />
        <div class="min-w-0">
          <p class="text-subhead truncate">{d.name}</p>
          <p class="text-callout text-ink-2">{d.week.planned && d.week.done >= d.week.planned ? t.workout.weekDone : t.workout.weekOf(num(d.week.done), num(d.week.planned))}</p>
        </div>
      </div>

      <div class="rise mt-8 grid grid-cols-3 gap-3" style="--i: 3" data-testid="workout-summary">
        <div><p class="text-title num font-semibold"><Count value={d.seconds} from={0} format={clock} /></p><p class="text-caption text-ink-2 mt-1">{t.workout.time}</p></div>
        <div><p class="text-title num font-semibold"><Count value={d.sets} from={0} /></p><p class="text-caption text-ink-2 mt-1">{t.workout.sets}</p></div>
        <div><p class="text-title num font-semibold whitespace-nowrap"><Count value={d.volumeKg} from={0} format={(v) => num(Math.round(metric ? v : kgToLb(v)))} /><span class="text-callout font-medium normal-case">{' '}{metric ? t.after.kg : t.after.lb}</span></p><p class="text-caption text-ink-2 mt-1">{t.workout.volume}</p></div>
      </div>

      <div class="rise mt-5" style="--i: 3"><CoachCard req={coachReq} plain testid="workout-coach" /></div>

      {#if d.bests.length}
        <ul class="mt-6 flex flex-col gap-2" data-testid="workout-bests">
          {#each d.bests as b, i (b.name)}
            <li class="rise bg-surface flex items-center gap-3 rounded-md p-3 pr-4" style="--i: {4 + i}">
              <span class="bg-lavender text-night grid size-11 flex-none place-items-center rounded-sm"><Trophy size={22} strokeWidth={2} aria-hidden="true" /></span>
              <span class="min-w-0 flex-1">
                <span class="text-caption text-ink-2 block">{t.workout.newBest}</span>
                <span class="text-body block truncate font-semibold">{b.name}</span>
              </span>
              <span class="flex flex-none flex-col items-end">
                <span class="text-callout num font-semibold">{b.text}</span>
                {#if b.gain}<span class="text-caption text-success-ink num font-semibold">{t.workout.gain(b.gain)}</span>{/if}
              </span>
            </li>
          {/each}
        </ul>
      {/if}

      {#if worked}
        <div class="rise mt-6" style="--i: {4 + d.bests.length}">
          <p class="text-eyebrow text-ink-2">{t.workout.worked}</p>
          <MuscleMap level={d.levels} sex={profile?.sex} label={t.workout.workedLabel(worked)} class="mt-3 h-44" />
        </div>
      {/if}

      <div class="min-h-6 flex-1"></div>
    </div>
    <!-- Continue stays in reach while the summary scrolls above it -->
    <div class="fade-over absolute inset-x-0 bottom-0 mx-auto max-w-[480px] px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))] [--fade:var(--canvas)]" bind:this={button}>
      <div class="rise" style="--i: {5 + d.bests.length}"><Button variant="primary" size="lg" full onclick={close} data-testid="workout-done">{t.workout.continue}</Button></div>
    </div>
  </div>
{/if}

<style>
  .ribbon {
    fill: none;
    stroke-width: 58;
    stroke-linecap: round;
    /* the dash is in the path's own units: longer than either ribbon, so each draws from end to end */
    stroke-dasharray: 900;
    stroke-dashoffset: 900;
    animation: draw 1.1s var(--ease-out) forwards;
  }
  .ribbon-2 { animation-delay: 160ms; }
  @keyframes draw { to { stroke-dashoffset: 0; } }
</style>
