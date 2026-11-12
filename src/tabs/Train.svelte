<!-- SCREENS.md section 8, Train: the summary with Change program, the week Monday to Sunday (a session opens the
     Session sheet; its handle drags it to another day), then the analysis: muscle balance, up to three
     recommendations with their sources, and cardio minutes against the guideline. -->
<script lang="ts">
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import Plus from '@lucide/svelte/icons/plus';
  import { t } from '$lib/i18n';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Track from '$lib/components/Track.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { db } from '$lib/db/store.svelte';
  import { view } from '$lib/view.svelte';
  import { changeProgram, undoToast } from '$lib/actions';
  import { planFor } from '$lib/model/day';
  import { weekdayOf } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { analyseProgram, eeeByWeekday, MUSCLES, U, V, type Finding } from '$lib/model/engine';
  import { LIBRARY } from '$lib/data/exercises';
  import { SOURCES } from '$lib/data/sources';
  import SessionSheet from '../flows/train/SessionSheet.svelte';
  import TemplatesSheet from '../flows/train/TemplatesSheet.svelte';
  import type { Program, Session } from '../../shared/records';

  const profile = $derived(db.get('profile', 'profile'));
  const plans = $derived(db.live('plan'));
  const plan = $derived(planFor(plans, view.today));
  // a change made today reaches the targets tomorrow (BUILD-PLAN M7)
  const pending = $derived(plans.some((p) => p.data.effectiveFrom > view.today));
  const program: Program = $derived(db.get('program', 'program') ?? { name: '', sessions: [] });
  const sessions = $derived(program.sessions);
  const todayIs = $derived(weekdayOf(view.today));
  const minutes = $derived(sessions.reduce((a, s) => a + s.minutes, 0));
  const perDay = $derived(plan ? eeeByWeekday(sessions, plan.weightKg).reduce((a, b) => a + b, 0) / U.daysPerWeek : 0);
  const analysis = $derived(plan && profile ? analyseProgram(sessions, { goal: plan.goal, experience: profile.experience, library: LIBRARY }) : null);
  // rows under the range first (section 8), each group in the usual order
  const muscles = $derived(analysis ? [...MUSCLES].sort((a, b) => Number(analysis.muscles[a].sets >= V.setsRange) - Number(analysis.muscles[b].sets >= V.setsRange)) : []);
  const recs = $derived(analysis?.recommendations.slice(0, 3) ?? []);

  let editing = $state<{ session: Session; isNew: boolean } | null>(null);
  let templates = $state(false);
  let why = $state<number | null>(null);
  const edit = (s: Session) => (editing = { session: $state.snapshot(s), isNew: false });
  const add = (weekday: number) => (editing = { session: { key: crypto.randomUUID().slice(0, 8), weekday, name: '', type: 'strength', minutes: 60, intensity: 'moderate' }, isNew: true });

  const MAX_SESSIONS = 28; // the record schema's limit
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

  // drag a session by its handle to another day; the rows of the day under the finger light up
  let drag = $state<{ key: string; from: number; y0: number; dy: number; over: number } | null>(null);
  let dragged = false;
  function down(e: PointerEvent, s: Session) {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag = { key: s.key, from: s.weekday, y0: e.clientY, dy: 0, over: s.weekday };
    dragged = false;
  }
  function move(e: PointerEvent) {
    if (!drag) return;
    drag.dy = e.clientY - drag.y0;
    if (Math.abs(drag.dy) > 4) dragged = true;
    const key = drag.key;
    const row = document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest<HTMLElement>('[data-day]')).find((el) => el && el.dataset.key !== key);
    if (row) drag.over = Number(row.dataset.day);
  }
  function up() {
    if (!drag) return;
    const { key, from, over } = drag;
    drag = null;
    if (over !== from) undoToast(t.train.saved, changeProgram({ name: program.name, sessions: sessions.map((s) => (s.key === key ? { ...s, weekday: over } : s)) }));
  }

  const hairline = '[&+&]:before:bg-line [&+&]:before:absolute [&+&]:before:top-0 [&+&]:before:right-0 [&+&]:before:left-15 [&+&]:before:h-px';
  const pressable = 'active:bg-surface-2 -ml-5 flex min-w-0 flex-1 items-center gap-4 py-4 pl-5 text-left transition-colors duration-[var(--d-press)]';
</script>

{#snippet day(d: number)}
  <span class="grid size-11 flex-none place-items-center rounded-sm text-caption font-semibold {d === todayIs ? 'bg-ink text-canvas' : 'bg-surface-2'}">{t.train.weekdaysShort[d]}</span>
{/snippet}

<section aria-label={t.tabs.train} data-testid="tab-train" class="flex flex-col gap-3 pt-2">
  {#if !plan || !profile}
    <p class="text-ink-2" data-testid="no-plan">{t.today.noPlan}</p>
  {:else}
    <Card data-testid="train-summary">
      {#if sessions.length}
        <p class="text-heading">{t.train.summary(num(sessions.length), num(minutes))}</p>
        <p class="text-callout text-ink-2 mt-1">{t.train.adds(num(Math.round(perDay)))}</p>
        <p class="text-callout text-ink-2">{program.name || t.train.ownProgram}</p>
        {#if pending}<p class="text-callout mt-2" data-testid="train-pending">{t.train.fromTomorrow}</p>{/if}
        <Button variant="plain" class="-ml-5 mt-1" onclick={() => (templates = true)} data-testid="train-change">{t.train.change}</Button>
      {:else}
        <EmptyState text={t.today.noProgram} action={t.train.pick} onaction={() => (templates = true)} />
      {/if}
    </Card>

    <h2 class="text-heading mx-1 mt-2">{t.train.week}</h2>
    <Card list aria-label={t.train.week} data-testid="train-week">
      {#each t.train.weekdays as dayName, d (dayName)}
        {@const list = sessions.filter((s) => s.weekday === d)}
        {@const lit = drag !== null && drag.over === d && drag.over !== drag.from ? 'bg-surface-2' : ''}
        {#each list as s (s.key)}
          {@const lifted = drag?.key === s.key}
          <div
            class="relative flex items-center {hairline} {lifted ? 'bg-surface shadow-float z-10 -mx-5 rounded-md px-5' : lit}"
            style={lifted ? `transform: translateY(${drag?.dy}px)` : undefined}
            data-day={d}
            data-key={s.key}
            data-testid="train-day-{d}"
          >
            <button type="button" class={pressable} aria-label="{d === todayIs ? t.train.dayToday(dayName) : dayName}, {s.name}" onclick={() => edit(s)} data-testid="train-session">
              {@render day(d)}
              <span class="min-w-0 flex-1">
                <span class="text-body line-clamp-2 block font-semibold">{s.name}</span>
                <span class="text-caption text-ink-2 block">{t.train.line(t.train.types[s.type], num(s.minutes))}</span>
              </span>
            </button>
            <button
              type="button"
              class="text-ink-2 -mr-3 grid size-11 flex-none cursor-grab touch-none place-items-center rounded-full"
              aria-label={t.train.move(s.name)}
              data-no-swipe
              onpointerdown={(e) => down(e, s)}
              onpointermove={move}
              onpointerup={up}
              onpointercancel={() => (drag = null)}
              onclick={() => { if (!dragged) edit(s); }}
              data-testid="train-handle"
            >
              <GripVertical size={24} strokeWidth={1.75} />
            </button>
          </div>
        {:else}
          <div class="relative flex items-center {hairline} {lit}" data-day={d} data-testid="train-day-{d}">
            <button type="button" class={pressable} aria-label={t.train.restOn(d === todayIs ? t.train.dayToday(dayName) : dayName)} onclick={() => add(d)} data-testid="train-rest">
              {@render day(d)}
              <span class="text-body text-ink-2 min-w-0 flex-1">{t.train.rest}</span>
              <Plus class="text-ink-2 mr-0.5 flex-none" size={24} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        {/each}
      {/each}
      <Button variant="plain" class="-ml-5 mb-2" disabled={sessions.length >= MAX_SESSIONS} onclick={() => add(todayIs)} data-testid="train-add">{t.train.addSession}</Button>
    </Card>

    {#if analysis}
      <h2 class="text-heading mx-1 mt-2">{t.train.analysis}</h2>
      {#if analysis.hasExercises}
        <Card aria-label={t.train.balance} data-testid="train-balance">
          <p class="text-body font-semibold">{t.train.balance}</p>
          <p class="text-caption text-ink-2">{t.train.balanceLine(num(V.setsRange), num(V.setsHigh))}</p>
          <div class="mt-4 flex flex-col gap-3">
            {#each muscles as m (m)}
              {@const sets = analysis.muscles[m].sets}
              <div class="grid grid-cols-[6.5em_1fr_2.5em] items-center gap-3" data-testid="muscle-{m}">
                <span class="text-callout">{M[m]}</span>
                <Track value={sets} target={V.setsHigh} zone={[V.setsRange, V.setsHigh]} label="{M[m]} {t.train.sets(num(sets, 1))}" />
                <span class="text-callout num text-right font-semibold">{num(sets, 1)}</span>
              </div>
            {/each}
          </div>
        </Card>
      {:else}
        <Card data-testid="train-balance-empty">
          <EmptyState text={t.train.noExercises} action={t.train.listExercises} onaction={() => (sessions[0] ? edit(sessions[0]) : add(todayIs))} />
        </Card>
      {/if}

      <Card list aria-label={t.train.analysis} data-testid="train-recs">
        {#each recs as f, i (`${f.kind}${f.muscle ?? ''}`)}
          <div class="border-line py-3 [&+&]:border-t" data-testid="rec">
            <div class="flex items-start gap-3">
              <p class="text-body min-w-0 flex-1 pt-2.5">{sentence(f)}</p>
              <Button variant="plain" size="sm" class="-mr-4" aria-expanded={why === i} onclick={() => (why = why === i ? null : i)} data-testid="rec-why">{t.train.why}</Button>
            </div>
            {#if why === i}
              <p class="text-caption text-ink-2 mt-1" data-testid="rec-source">{f.source === 'OT' ? t.plan.assumption : SOURCES[f.source]?.cite}</p>
            {/if}
          </div>
        {:else}
          <p class="text-body text-ink-2 py-4">{t.train.allGood}</p>
        {/each}
        <div class="border-line border-t py-4" data-testid="train-cardio">
          <div class="flex items-baseline justify-between gap-3">
            <span class="text-body font-semibold">{t.train.cardio}</span>
            <span class="text-caption text-ink-2">{t.train.cardioLine(num(analysis.aerobicMinutes), num(V.aerobicMinutes.min), num(V.aerobicMinutes.max))}</span>
          </div>
          <div class="mt-2">
            <Track value={analysis.aerobicMinutes} target={V.aerobicMinutes.max} zone={[V.aerobicMinutes.min, V.aerobicMinutes.max]} label="{t.train.cardio} {t.train.cardioLine(num(analysis.aerobicMinutes), num(V.aerobicMinutes.min), num(V.aerobicMinutes.max))}" />
          </div>
          {#each analysis.notes as n (n.kind)}<p class="text-caption text-ink-2 mt-2">{sentence(n)}</p>{/each}
        </div>
      </Card>
    {/if}

    <SessionSheet bind:editing {program} weightKg={plan.weightKg} />
    <TemplatesSheet bind:open={templates} goal={plan.goal} experience={profile.experience} />
  {/if}
</section>
