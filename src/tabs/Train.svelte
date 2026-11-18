<!-- SCREENS.md section 8, Train: the summary with Change program, the week Monday to Sunday (a session opens the
     Session sheet; its handle drags it to another day), then the analysis: muscle balance, up to three
     recommendations with their sources, cardio minutes against the guideline, and how to arrange days with both
     lifting and cardio. -->
<script lang="ts">
  import type { Component } from 'svelte';
  import Repeat from '@lucide/svelte/icons/repeat';
  import HeartPulse from '@lucide/svelte/icons/heart-pulse';
  import Volleyball from '@lucide/svelte/icons/volleyball';
  import PersonStanding from '@lucide/svelte/icons/person-standing';
  import Footprints from '@lucide/svelte/icons/footprints';
  import Plus from '@lucide/svelte/icons/plus';
  import Check from '@lucide/svelte/icons/check';
  import { clearSessionLog, logSession } from '$lib/actions';
  import { dur, haptic, pop } from '$lib/haptics';
  import { fly } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import Burst from '$lib/components/Burst.svelte';
  import { t } from '$lib/i18n';
  import { collapse } from '$lib/haptics';
  import Card from '$lib/components/Card.svelte';
  import CardHead from '$lib/components/CardHead.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import Button from '$lib/components/Button.svelte';
  import Disclosure from '$lib/components/Disclosure.svelte';
  import Track from '$lib/components/Track.svelte';
  import WeekRing from '$lib/components/WeekRing.svelte';
  import MuscleMap from '$lib/components/MuscleMap.svelte';
  import { MUSCLE_STEPS } from '$lib/data/body';
  import Count from '$lib/components/Count.svelte';
  import Dumbbell from '@lucide/svelte/icons/dumbbell';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { db } from '$lib/db/store.svelte';
  import { view } from '$lib/view.svelte';
  import { changeProgram, undoToast } from '$lib/actions';
  import { planFor } from '$lib/model/day';
  import { addDays, weekdayOf } from '$lib/model/dates';
  import { weekLevels } from '$lib/model/workout';
  import { num } from '$lib/model/format';
  import { analyseProgram, eeeByWeekday, MUSCLES, sessionKcal, U, V, type Finding, type HybridPoint, type SourceId } from '$lib/model/engine';
  import { LIBRARY } from '$lib/data/exercises';
  import { SOURCES } from '$lib/data/sources';
  import SessionSheet from '../flows/train/SessionSheet.svelte';
  import TemplatesSheet from '../flows/train/TemplatesSheet.svelte';
  import ProgramAiSheet from '../flows/train/ProgramAiSheet.svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Suggestion from '../flows/train/Suggestion.svelte';
  import Experience from '../flows/train/Experience.svelte';
  import { ids, type Program, type Session } from '../../shared/records';

  const profile = $derived(db.get('profile', 'profile'));
  const plans = $derived(db.live('plan'));
  const plan = $derived(planFor(plans, view.today));
  // a change made today reaches the targets tomorrow (BUILD-PLAN M7)
  const pending = $derived(plans.some((p) => p.data.source === 'edit' && p.data.effectiveFrom > view.today));
  const program: Program = $derived(db.get('program', 'program') ?? { name: '', sessions: [] });
  const sessions = $derived(program.sessions);
  const todayIs = $derived(weekdayOf(view.today));
  const minutes = $derived(sessions.reduce((a, s) => a + s.minutes, 0));
  const perDay = $derived(plan ? eeeByWeekday(sessions, plan.weightKg).reduce((a, b) => a + b, 0) / U.daysPerWeek : 0);
  const analysis = $derived(plan && profile ? analyseProgram(sessions, { goal: plan.goal, experience: profile.experience, library: LIBRARY }) : null);
  // rows under the range first (section 8), each group in the usual order
  const groups = $derived(
    analysis
      ? [
          { key: 'below', title: t.train.below, rows: MUSCLES.filter((m) => analysis.muscles[m].sets < V.setsRange) },
          { key: 'within', title: t.train.within, rows: MUSCLES.filter((m) => analysis.muscles[m].sets >= V.setsRange) },
        ].filter((g) => g.rows.length)
      : [],
  );
  const recs = $derived(analysis?.recommendations.slice(0, 3) ?? []);

  // R1: this week as the program has it, and what is up next (Fitbit's weekly goal, Nike Training Club's next workout)
  const monday = $derived(addDays(view.today, -todayIs));
  const statusOf = (s: Session) => db.get('slog', ids.slog(addDays(monday, s.weekday), s.key))?.status;
  // R3, the owner: no set by set logging. A session is marked Done, as cardio is, and the week adds up what was marked
  const doneSessions = $derived(sessions.filter((s) => statusOf(s) === 'done'));
  const weekDone = $derived(doneSessions.length);
  const next = $derived.by(() => {
    const sorted = [...sessions].sort((a, b) => a.weekday - b.weekday);
    const upcoming = sorted.find((s) => s.weekday >= todayIs && !statusOf(s));
    // today's session stays up with its tick once done, unless another is still due today
    const finished = upcoming?.weekday === todayIs ? undefined : sorted.filter((s) => s.weekday === todayIs && statusOf(s) === 'done').at(-1);
    const s = finished ?? upcoming ?? sorted[0];
    return s ? { s, today: !!(finished ?? upcoming) && s.weekday === todayIs, done: !!finished } : null;
  });
  const namesOf = (s: Session) => (s.exercises ?? []).map((e) => LIBRARY[e.exerciseId]?.name ?? e.exerciseId);

  // the body, lit by the planned sets of the sessions marked Done this week; before any, by the whole plan
  const lit = $derived(doneSessions.length && plan && profile ? analyseProgram(doneSessions, { goal: plan.goal, experience: profile.experience, library: LIBRARY }) : analysis);
  const levels = $derived(lit ? weekLevels(Object.fromEntries(MUSCLES.map((m) => [m, lit.muscles[m].sets]))) : {});
  // this week in two numbers, from the sessions marked Done: kcal burned and planned sets
  const weekKcal = $derived(plan ? Math.round(doneSessions.reduce((a, s) => a + sessionKcal(s, plan.weightKg), 0)) : 0);
  const weekSets = $derived(doneSessions.reduce((a, s) => a + (s.exercises ?? []).reduce((n, e) => n + e.sets, 0), 0));
  const litNames = $derived((Object.keys(levels) as (keyof typeof M)[]).map((m) => M[m]).join(', '));
  // the same moment as Today's Done: a haptic, and the Burst on the tick
  let burst = $state<string | null>(null);
  function markDone(s: Session) {
    haptic();
    logSession({ date: view.today, sessionKey: s.key, status: 'done' });
    burst = s.key;
    setTimeout(() => (burst = null), 1400);
  }
  // Undo plays it back (the owner, 19 Nov): the check shrinks, Undo slides back to where Done was, then it is unmarked
  let leaving = $state<string | null>(null);
  function undo(s: Session) {
    if (leaving) return;
    haptic();
    leaving = s.key;
    setTimeout(() => { clearSessionLog(view.today, s.key); leaving = null; }, dur('--d-ui'));
  }

  const MAX_SESSIONS = 28; // the record schema's limit
  let editing = $state<{ session: Session; isNew: boolean } | null>(null);
  let templates = $state(false);
  let aiOpen = $state(false);
  let why = $state<string | null>(null);
  const edit = (s: Session) => (editing = { session: $state.snapshot(s), isNew: false });
  const add = (weekday: number) => sessions.length < MAX_SESSIONS && (editing = { session: { key: crypto.randomUUID().slice(0, 8), weekday, name: '', type: 'strength', minutes: 60, intensity: 'moderate' }, isNew: true });

  const M = t.train.muscles;
  function sentence(f: Finding) {
    const r = t.train.recs;
    const m = f.muscle ? M[f.muscle] : '';
    switch (f.kind) {
      case 'addSets': return r.addSets(m, num(f.value, 1), num(f.change ?? 0));
      case 'removeSets': return r.removeSets(m, num(f.value, 1), num(V.setsHigh), num(f.change ?? 0));
      case 'frequency': return r.frequency(m, num(f.value));
      case 'strengthSessions': return r.strengthSessions(num(f.value), num(f.change ?? 0));
      case 'restDay': return r.restDay;
      case 'aerobicIncluded': return r.aerobicIncluded(num(f.value));
      case 'longSession': return r.longSession(num(f.value));
    }
  }
  function hybridSentence(p: HybridPoint) {
    const names = p.weekdays.map((d) => t.train.weekdays[d]);
    const days = names.length > 1 ? t.train.dayList(names.slice(0, -1).join(', '), names[names.length - 1]) : names[0];
    return p.kind === 'spaceOut' ? t.train.hybridPoints.spaceOut(days, num(p.value ?? 0)) : t.train.hybridPoints[p.kind](days);
  }

  const TYPE_ICON: Record<Session['type'], Component<{ size?: number; strokeWidth?: number }>> = { strength: Dumbbell, circuit: Repeat, cardio: HeartPulse, sport: Volleyball, mobility: PersonStanding, walk: Footprints };
</script>

<!-- one sentence and its Why, which shows the source in place -->
{#snippet point(id: string, text: string, source: SourceId, testid: string)}
  <div class="border-line py-3 [&+&]:border-t" data-testid={testid}>
    <div class="flex items-start gap-3">
      <p class="text-body min-w-0 flex-1 pt-2.5">{text}</p>
      <Button variant="plain" size="sm" class="-mr-4" aria-expanded={why === id} onclick={() => (why = why === id ? null : id)} data-testid="rec-why">{t.train.why}</Button>
    </div>
    {#if why === id}
      <p class="text-caption text-ink-2 pt-1" data-testid="rec-source" in:collapse out:collapse={{ leave: true }}>{source === 'OT' ? t.plan.assumption : SOURCES[source]?.cite}</p>
    {/if}
  </div>
{/snippet}


{#snippet programCard()}
  <Card data-testid="train-summary">
    {#if sessions.length}
      <p class="text-eyebrow text-ink-2" data-testid="train-program">{program.name || t.train.ownProgram}</p>
      {#snippet sessionsFact()}<span class="num" data-testid="train-sessions">{num(sessions.length)}</span> {t.after.sessionsWeek(num(sessions.length))}{/snippet}
      {#snippet minutesFact()}<span class="num" data-testid="train-minutes">{num(minutes)}</span> {t.after.minutesWeek}{/snippet}
      <Facts class="text-callout mt-1" rest="text-ink-2" facts={[sessionsFact, minutesFact]} />
      <div class="border-line mt-4 flex items-center gap-3 border-t pt-4">
        <p class="text-callout text-ink-2 min-w-0 flex-1">{t.train.adds(num(Math.round(perDay)))}</p>
        <Button size="sm" onclick={() => (templates = true)} data-testid="train-change">{t.train.change}</Button>
      </div>
      {#if pending}<p class="text-caption text-ink-2 mt-3" data-testid="train-pending">{t.train.fromTomorrow}</p>{/if}
    {:else}
      <EmptyState text={t.today.noProgram} action={t.train.pick} onaction={() => (templates = true)} />
    {/if}
  </Card>
{/snippet}

<section aria-label={t.tabs.train} data-testid="tab-train" class="flex flex-col gap-3 pt-2 [@media(max-height:620px)]:pt-0">
  {#if !plan || !profile}
    <p class="text-ink-2" data-testid="no-plan">{t.today.noPlan}</p>
  {:else}
    <!-- R1, from what a lifter opens Train to do: 1. what is next, and can I start (the big card, with this week's pills);
         2. the week; 3. the program in one compact row, the analysis collapsed. No program yet: choosing one comes first -->
    {#if !sessions.length}{@render programCard()}{/if}
    {#if next}
      <!-- R2, the owner's one card with small boxes (as Today's): what is next on the featured panel with the week's ring
           and the one action, then the week on the body and in two numbers. The boxes at the card's corners nest in it -->
      <section class="bg-surface shadow-card flex flex-col gap-2 rounded-xl p-2" aria-label={t.train.upNext}>
        <div class="feature text-ink rounded-t-sheet {analysis?.hasExercises ? 'rounded-b-md' : 'rounded-b-sheet'} p-5 [background:var(--grad-feature)] [@media(max-height:620px)]:p-4" data-testid="train-next">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-eyebrow">{next.today ? t.train.nextToday : t.train.weekdays[next.s.weekday]}</p>
              <h2 class="text-heading mt-1">{next.s.name}</h2>
              <p class="text-callout mt-1"><Facts facts={[t.train.types[next.s.type], t.after.minN(num(next.s.minutes))]} /></p>
            </div>
            <div class="flex flex-none flex-col items-center gap-1" data-testid="train-week-pills">
              <WeekRing done={weekDone} planned={sessions.length} size={48} label={t.train.ringLabel(num(weekDone), num(sessions.length))} />
              <span class="text-caption num font-semibold" aria-hidden="true">{num(weekDone)}/{num(sessions.length)}</span>
            </div>
          </div>
          {#if namesOf(next.s).length}<p class="text-callout mt-2 line-clamp-1 opacity-80">{namesOf(next.s).join(', ')}</p>{/if}
          <div class="mt-4 flex items-center gap-3 [@media(max-height:620px)]:mt-3">
            {#if next.done}
              <span class="bg-success text-night relative grid size-7 flex-none place-items-center rounded-full transition-[opacity,scale] duration-[var(--d-press)] {leaving === next.s.key ? 'scale-50 opacity-0' : ''}" in:pop data-testid="train-tick">
                <Check size={17} strokeWidth={3.5} aria-hidden="true" />
                {#if burst === next.s.key}<Burst />{/if}
              </span>
              <!-- 19 Nov, the owner: Undo is grey, and slides from where Done was to beside the check as it pops, and back -->
              <span class="inline-flex transition-transform duration-[var(--d-ui)] ease-[var(--ease-out)] {leaving === next.s.key ? '-translate-x-10' : ''}" data-theme="light" in:fly={{ x: -40, duration: dur('--d-ui'), easing: cubicOut }}>
                <Button variant="neutral" onclick={() => undo(next.s)} data-testid="train-undo">{t.today.undo}</Button>
              </span>
            {:else if next.today}
              <Button variant="primary" onclick={() => markDone(next.s)} data-testid="train-start">{t.today.done}</Button>
            {:else}
              <Button variant="surface" onclick={() => edit(next.s)} data-testid="train-next-open">{t.train.look}</Button>
            {/if}
          </div>
        </div>

        {#if analysis?.hasExercises}
          <div class="grid grid-cols-3 grid-rows-2 gap-2">
            <!-- the week on the body: three violet steps by sets per muscle (S11 bands) -->
            <div class="bg-surface-2 rounded-bl-sheet col-span-2 row-span-2 flex min-w-0 flex-col rounded-md px-4 pt-3 pb-5" data-testid="train-muscles">
              <div class="flex items-baseline justify-between gap-2">
                <p class="text-caption text-ink-2 font-semibold">{doneSessions.length ? t.train.muscles7 : t.train.musclesPlanned}</p>
                <span class="text-caption text-ink-2 num">{num(Object.keys(levels).length)}/{num(MUSCLES.length)}</span>
              </div>
              <MuscleMap level={levels} sex={profile.sex} label={t.train.mapLabel(litNames)} class="mt-2 h-36 flex-1 [@media(max-height:620px)]:h-28" />
              <!-- inset from the 40 corner, so a wrapped legend at large text stays inside its curve -->
              <div class="text-caption text-ink-2 mt-2 flex flex-wrap justify-center gap-x-3 px-4" aria-hidden="true">
                {#each [t.train.legendLow(num(V.setsBuilding)), t.train.legendMid(num(V.setsBuilding), num(V.setsRange - 1)), t.train.legendHigh(num(V.setsRange))] as l, i (l)}
                  <span class="inline-flex items-center gap-1 whitespace-nowrap"><i class="size-2 rounded-full" style="background: {MUSCLE_STEPS[i + 1]}"></i>{l}</span>
                {/each}
              </div>
            </div>
            <div class="bg-surface-2 flex min-w-0 flex-col justify-end rounded-md px-4 py-3" data-testid="train-week-kcal">
              <p class="text-caption text-ink-2 truncate">{t.train.burnedWeek}</p>
              <p class="text-subhead num flex flex-wrap items-baseline gap-x-1"><Count value={weekKcal} /> <span class="text-caption text-ink-2 font-medium">{t.after.kcal}</span></p>
              <p class="text-caption text-ink-2 truncate">{t.train.weekSoFar}</p>
            </div>
            <div class="bg-surface-2 rounded-br-sheet flex min-w-0 flex-col justify-end rounded-md px-4 py-3" data-testid="train-week-sets">
              <p class="text-caption text-ink-2 truncate">{t.train.setsWeek}</p>
              <p class="text-subhead num"><Count value={weekSets} /></p>
              <p class="text-caption text-ink-2 truncate">{t.train.weekSoFar}</p>
            </div>
          </div>
        {/if}
      </section>
    {/if}

    <Suggestion {sessions} goal={plan.goal} experience={profile.experience} />
    <Experience {sessions} goal={plan.goal} />

    <!-- R2, the owner: the week takes a row, not a page. A column a day: its letter, an icon for each session (the type
         as a picture, green once done this week), the day's minutes. An icon opens its session; an empty day's plus adds
         one. Today wears the ink ring -->
    <section class="bg-surface shadow-card rounded-lg p-3 pt-4" aria-label={t.train.week} data-testid="train-week">
      <h2 class="text-subhead px-1">{t.train.week}</h2>
      <div class="mt-3 grid grid-cols-7 gap-1">
        {#each t.train.weekdays as dayName, d (dayName)}
          {@const list = sessions.filter((s) => s.weekday === d)}
          <div class="relative flex min-w-0 flex-col items-center gap-1 rounded-md py-2" data-testid="train-day-{d}">
            <!-- R3, the owner: today's ring is drawn over the session icons, not behind them -->
            {#if d === todayIs}<span class="ring-ink pointer-events-none absolute inset-0 z-10 rounded-md ring-2 ring-inset" aria-hidden="true"></span>{/if}
            <span class="text-caption font-semibold {d === todayIs ? 'text-ink' : 'text-ink-2'}">{t.week.letters[d]}</span>
            {#each list as s (s.key)}
              {@const Icon = TYPE_ICON[s.type]}
              {@const done = statusOf(s) === 'done'}
              <button type="button" class="grid size-11 place-items-center rounded-full transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.95] {done ? 'bg-success text-night' : s.type === 'strength' || s.type === 'circuit' ? 'bg-ink text-canvas' : 'bg-lavender text-night'}" aria-label="{d === todayIs ? t.train.dayToday(dayName) : dayName}, {s.name}" onclick={() => edit(s)} data-testid="train-session">
                <Icon size={20} strokeWidth={2.25} />
                <span class="sr-only">{s.name !== t.train.types[s.type] ? `${s.name} ` : ''}{t.train.types[s.type]}, {t.after.minN(num(s.minutes))}</span>
              </button>
            {:else}
              <button type="button" class="text-ink-3 active:bg-surface-2 grid size-11 place-items-center rounded-full border border-dashed border-[var(--line-strong)] transition-colors duration-[var(--d-press)]" aria-label={t.train.restOn(d === todayIs ? t.train.dayToday(dayName) : dayName)} onclick={() => add(d)} data-testid="train-rest">
                <Plus size={18} strokeWidth={2.25} aria-hidden="true" />
              </button>
            {/each}
            <span class="text-caption text-ink-2 num">{list.length ? num(list.reduce((a, s) => a + s.minutes, 0)) : ''}</span>
          </div>
        {/each}
      </div>
      <div class="text-caption text-ink-2 mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1" aria-hidden="true">
        <span class="inline-flex items-center gap-1"><i class="bg-ink size-2 rounded-full"></i>{t.train.legendLift}</span>
        <span class="inline-flex items-center gap-1"><i class="bg-lavender size-2 rounded-full"></i>{t.train.legendCardio}</span>
        <span class="inline-flex items-center gap-1"><i class="bg-success size-2 rounded-full"></i>{t.today.done}</span>
      </div>
      <div class="flex flex-wrap items-center justify-between gap-x-2">
        <Button variant="plain" size="sm" class="-ml-2" disabled={sessions.length >= MAX_SESSIONS} onclick={() => add(todayIs)} data-testid="train-add">{t.train.addSession}</Button>
        <!-- R2: the coach changes the week from a sentence -->
        <Button variant="plain" size="sm" class="-mr-2" onclick={() => (aiOpen = true)} data-testid="program-ai-open"><Sparkles size={16} strokeWidth={2.25} aria-hidden="true" />{t.aiProgram.open}</Button>
      </div>
    </section>

    {#if sessions.length}{@render programCard()}{/if}

    {#if analysis}
      <h2 class="text-heading mt-2">{t.train.analysis}</h2>
      {#if analysis.hasExercises}
        <!-- R1: ten rows are detail, so the card says how many muscles are in the range and opens on a tap -->
        <Card aria-label={t.train.balance} data-testid="train-balance">
          <Disclosure title={t.train.balance} line={t.train.balanceOf(num(MUSCLES.filter((m) => analysis.muscles[m].band === 'inRange').length), num(MUSCLES.length), num(V.setsRange), num(V.setsHigh))}>
            <p class="text-callout text-ink-2">{t.train.balanceLine(num(V.setsRange), num(V.setsHigh))}</p>
            {#each groups as g (g.key)}
              <p class="text-eyebrow text-ink-2 mt-5 mb-3" data-testid="muscle-group-{g.key}">{g.title}</p>
              <div class="flex flex-col gap-3">
                {#each g.rows as m (m)}
                  {@const sets = analysis.muscles[m].sets}
                  <div class="grid grid-cols-[6.5em_1fr_2.5em] items-center gap-3" data-testid="muscle-{m}">
                    <span class="text-callout">{M[m]}</span>
                    <Track value={sets} target={V.setsHigh} zone={[V.setsRange, V.setsHigh]} label="{M[m]} {t.train.sets(num(sets, 1))}" />
                    <span class="text-callout num text-right font-semibold">{num(sets, 1)}</span>
                  </div>
                {/each}
              </div>
            {/each}
          </Disclosure>
        </Card>
      {:else}
        <Card data-testid="train-balance-empty">
          <EmptyState text={t.train.noExercises} action={t.train.listExercises} onaction={() => (sessions[0] ? edit(sessions[0]) : add(todayIs))} />
        </Card>
      {/if}

      <Card list aria-label={t.train.suggestions} data-testid="train-recs">
        <CardHead level={3} class="pt-5 pb-4" title={t.train.suggestions} line={t.train.suggestionsLine} />
        <div class="border-line border-t">
          {#each recs as f (`${f.kind}${f.muscle ?? ''}`)}
            {@render point(`${f.kind}${f.muscle ?? ''}`, sentence(f), f.source, 'rec')}
          {:else}
            <p class="text-body text-ink-2 flex items-center gap-3 py-4"><Check class="text-success-ink flex-none" size={20} strokeWidth={2.5} aria-hidden="true" />{t.train.allGood}</p>
          {/each}
        </div>
      </Card>

      <Card aria-label={t.train.cardio} data-testid="train-cardio">
        <CardHead level={3} title={t.train.cardio} line={t.train.cardioLine(num(analysis.aerobicMinutes), num(V.aerobicMinutes.min), num(V.aerobicMinutes.max))} />
        <div class="mt-4">
          <Track value={analysis.aerobicMinutes} target={V.aerobicMinutes.max} zone={[V.aerobicMinutes.min, V.aerobicMinutes.max]} label="{t.train.cardio} {t.train.cardioLine(num(analysis.aerobicMinutes), num(V.aerobicMinutes.min), num(V.aerobicMinutes.max))}" />
        </div>
        {#each analysis.notes as n (n.kind)}<p class="text-callout text-ink-2 mt-3">{sentence(n)}</p>{/each}
      </Card>

      {#if analysis.hybrid.length}
        <Card list aria-label={t.train.hybrid} data-testid="train-hybrid">
          <CardHead level={3} class="pt-5 pb-4" title={t.train.hybrid} line={t.train.hybridLine} />
          <div class="border-line border-t">
            {#each analysis.hybrid as p (p.kind)}{@render point(`hybrid-${p.kind}`, hybridSentence(p), p.source, 'hybrid-point')}{/each}
          </div>
        </Card>
      {/if}
    {/if}

    <SessionSheet bind:editing {program} weightKg={plan.weightKg} />
    <TemplatesSheet bind:open={templates} goal={plan.goal} experience={profile.experience} />
    <ProgramAiSheet bind:open={aiOpen} {program} goal={plan.goal} experience={profile.experience} today={view.today} />
  {/if}
</section>
