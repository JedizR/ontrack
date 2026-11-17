<!-- R1, the owner's "learn from Bevel": a strength session logged set by set. From Today, Start opens this over the day: a clock,
     each exercise of the session with its sets (kg and reps, started from what was lifted last time), a tick for a set that
     is done (it starts a rest, with plus and minus 15 s and Skip), then How was it? from 1 to 10 and a summary (time, sets,
     reps, volume, any new best). Closing with sets done saves what was done, as Bevel's End workout does; closing with
     none discards. It lives in the browser: the clock follows timestamps, and a locked screen does not lose the time. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import Plus from '@lucide/svelte/icons/plus';
  import Sheet from '$lib/components/Sheet.svelte';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { logSession, undoToast, clearSessionLog } from '$lib/actions';
  import { LIBRARY } from '$lib/data/exercises';
  import { heaviest, lastSets, muscleSets, newBests, sessionLevels, totals } from '$lib/model/workout';
  import { addDays, weekdayOf } from '$lib/model/dates';
  import { kgToLb, lbToKg, weightText } from '$lib/model/units';
  import { num } from '$lib/model/format';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import { ids, type Workout } from '../../../shared/records';

  /** A rest between sets: a starting point the user moves with the plus and minus (a habit, not a science constant) */
  const REST_S = 120;
  const REST_STEP_S = 15;

  type Row = { kg: string; reps: string; done: boolean };
  type Card_ = { exerciseId: string; name: string; plan: string; muscles: string; rows: Row[] };

  const target = $derived(sheets.workout);
  const profile = $derived(db.get('profile', 'profile'));
  const metric = $derived(profile?.units !== 'imperial');
  const unit = $derived(metric ? t.after.kg : t.after.lb);
  const logs = $derived(db.live('slog').map((r) => r.data));

  let cards = $state<Card_[]>([]);
  let step = $state<'sets' | 'effort'>('sets');
  let startedAt = $state(0);
  let now = $state(Date.now());
  let rest = $state<number | null>(null); // when the rest ends, ms
  let effort = $state<number | null>(null);

  const show = (kg: number) => String(Math.round((metric ? kg : kgToLb(kg)) * 10) / 10);
  const kgOf = (txt: string) => {
    const v = parseFloat(txt.replace(',', '.'));
    return Number.isFinite(v) && v >= 0 ? Math.round((metric ? v : lbToKg(v)) * 100) / 100 : 0;
  };

  // opened on a session: its exercises, each set started from what was lifted last time
  $effect(() => {
    const tg = target;
    if (!tg) return;
    untrack(() => {
      const s = db.get('program', 'program')?.sessions.find((x) => x.key === tg.key);
      cards = (s?.exercises ?? []).map((e) => {
        const last = lastSets(logs.filter((l) => !(l.date === tg.date && l.sessionKey === tg.key)), e.exerciseId);
        return {
          exerciseId: e.exerciseId,
          name: LIBRARY[e.exerciseId]?.name ?? e.exerciseId,
          plan: t.workout.plan(num(e.sets), e.repsMin === e.repsMax ? num(e.repsMin) : `${num(e.repsMin)} to ${num(e.repsMax)}`),
          muscles: (LIBRARY[e.exerciseId]?.primary ?? []).map((m) => t.train.muscles[m]).join(', '),
          rows: Array.from({ length: e.sets }, (_, i) => {
            const was = last?.[i] ?? last?.at(-1);
            return { kg: was ? show(was.kg) : '', reps: String(was ? was.reps : e.repsMax), done: false };
          }),
        };
      });
      step = 'sets';
      effort = null;
      rest = null;
      startedAt = Date.now();
      now = startedAt;
    });
  });
  // the clock, while open; timestamps, so a locked screen does not lose the time
  $effect(() => {
    if (!target) return;
    const id = setInterval(() => (now = Date.now()), 500);
    return () => clearInterval(id);
  });
  const left = $derived(rest === null ? 0 : Math.max(0, Math.ceil((rest - now) / 1000)));
  $effect(() => {
    if (rest !== null && now >= rest) { rest = null; haptic(); }
  });
  const clock = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    const mm = String(m).padStart(h ? 2 : 1, '0'), rr = String(r).padStart(2, '0');
    return h ? `${h}:${mm}:${rr}` : `${mm}:${rr}`;
  };
  const elapsed = $derived(Math.max(0, Math.floor((now - startedAt) / 1000)));

  const doneSets = $derived(cards.reduce((a, c) => a + c.rows.filter((r) => r.done).length, 0));
  function tick(row: Row) {
    row.done = !row.done;
    if (row.done) { haptic(); rest = Date.now() + REST_S * 1000; }
  }
  function addSet(c: Card_) {
    const last = c.rows.at(-1);
    c.rows.push({ kg: last?.kg ?? '', reps: last?.reps ?? '8', done: false });
  }

  function workout(seconds: number, effortValue: number | null): Workout {
    return {
      startedAt: new Date(startedAt).toISOString(),
      seconds,
      ...(effortValue ? { effort: effortValue } : {}),
      lifts: cards
        .map((c) => ({ exerciseId: c.exerciseId, sets: c.rows.filter((r) => r.done).map((r) => ({ kg: kgOf(r.kg), reps: Math.max(0, Math.round(Number(r.reps) || 0)) })) }))
        .filter((l) => l.sets.length),
    };
  }
  /** Writes the session as done with its sets, and returns the workout for the summary. */
  function write(effortValue: number | null) {
    if (!target) return null;
    const w = workout(elapsed, effortValue);
    logSession({ date: target.date, sessionKey: target.key, status: 'done', workout: w });
    return w;
  }

  const finish = () => { if (doneSets) step = 'effort'; };
  function save(withEffort: boolean) {
    if (!target) return;
    const { date, key } = target;
    const before = logs.filter((l) => !(l.date === date && l.sessionKey === key));
    const w = write(withEffort ? effort : null);
    if (!w) return;
    const r = totals(w);
    const units = profile?.units ?? 'metric';
    const was = heaviest(before);
    // R2: the finish screen (WorkoutDone): this week's sessions done, counted after this one is written
    const program = db.get('program', 'program');
    const monday = addDays(date, -weekdayOf(date));
    const planned = program?.sessions ?? [];
    const doneThisWeek = planned.filter((x) => x.key === key || db.get('slog', ids.slog(addDays(monday, x.weekday), x.key))?.status === 'done').length;
    sheets.done = {
      name: program?.sessions.find((x) => x.key === key)?.name ?? t.workout.title,
      seconds: w.seconds,
      sets: r.sets,
      reps: r.reps,
      volumeKg: r.volumeKg,
      bests: newBests(before, w).map((b) => {
        const prior = was.get(b.exerciseId);
        return { name: LIBRARY[b.exerciseId]?.name ?? b.exerciseId, text: t.workout.best(weightText(b.kg, units), num(b.reps)), gain: prior ? weightText(b.kg - prior.kg, units) : null };
      }),
      levels: sessionLevels(muscleSets([w], LIBRARY)),
      week: { done: doneThisWeek, planned: planned.length },
      workout: w,
      date,
      key,
    };
    sheets.workout = null;
  }
  /** Closed before finishing: what was done is kept, none is dropped (Bevel's End workout). */
  function leave() {
    if (target && doneSets) {
      const { date, key } = target;
      write(null);
      undoToast(t.workout.saved(num(doneSets)), () => clearSessionLog(date, key));
    }
    sheets.workout = null;
  }

  const EFFORT = $derived(effort ? t.workout.effortLabels[Math.min(5, Math.floor((effort - 1) / 2))] : '');
</script>

{#snippet footer()}
  {#if step === 'sets'}
    {#if rest !== null}
      <div class="bg-surface-2 mb-2 flex items-center gap-2 rounded-md py-1 pr-1 pl-4" role="timer" aria-live="off" data-testid="workout-rest">
        <span class="text-callout text-ink-2">{t.workout.rest}</span>
        <span class="text-subhead num flex-1" data-testid="workout-rest-left">{clock(left)}</span>
        <Button size="sm" variant="plain" onclick={() => (rest = (rest ?? Date.now()) - REST_STEP_S * 1000)} aria-label={t.workout.shorter}>-{REST_STEP_S}</Button>
        <Button size="sm" variant="plain" onclick={() => (rest = (rest ?? Date.now()) + REST_STEP_S * 1000)} aria-label={t.workout.longer}>+{REST_STEP_S}</Button>
        <Button size="sm" onclick={() => (rest = null)} data-testid="workout-rest-skip">{t.workout.skipRest}</Button>
      </div>
    {/if}
    <Button variant="primary" size="lg" full disabled={!doneSets} onclick={finish} data-testid="workout-finish">{t.workout.finish}</Button>
  {:else if step === 'effort'}
    <Button variant="primary" size="lg" full disabled={!effort} onclick={() => save(true)} data-testid="workout-effort-save">{t.workout.save}</Button>
    <Button variant="plain" size="lg" full onclick={() => save(false)} data-testid="workout-effort-skip">{t.workout.skipEffort}</Button>
  {/if}
{/snippet}

<Sheet bind:open={() => sheets.workout !== null, (v) => { if (!v) leave(); }} title={db.get('program', 'program')?.sessions.find((x) => x.key === target?.key)?.name ?? t.workout.title} layer="base" testid="workout-sheet" {step} {footer}>
  {#if step === 'sets'}
    <p class="text-display num" aria-label={t.workout.clock} data-testid="workout-clock">{clock(elapsed)}</p>
    <div class="mt-4 flex flex-col gap-4 pb-2">
      {#each cards as c (c.exerciseId)}
        <Card data-testid="workout-exercise">
          <p class="text-subhead">{c.name}</p>
          <p class="text-callout text-ink-2"><Facts facts={[c.plan, c.muscles]} /></p>
          <div class="text-caption text-ink-2 mt-4 grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2 px-0" aria-hidden="true">
            <span>{t.workout.set}</span><span class="text-center">{unit}</span><span class="text-center">{t.workout.reps}</span><span></span>
          </div>
          <div class="mt-2 flex flex-col gap-2">
            {#each c.rows as row, i (i)}
              <div class="grid grid-cols-[2rem_1fr_1fr_2.75rem] items-center gap-2" data-testid="workout-set">
                <span class="text-callout text-ink-2 num">{i + 1}</span>
                <input type="text" inputmode="decimal" enterkeyhint="next" bind:value={row.kg} aria-label="{t.workout.set} {i + 1}, {unit}" placeholder="0" class="input-field num w-full min-w-0 text-center {row.done ? 'opacity-60' : ''}" data-testid="workout-kg" />
                <input type="text" inputmode="numeric" enterkeyhint="done" bind:value={row.reps} aria-label="{t.workout.set} {i + 1}, {t.workout.reps}" class="input-field num w-full min-w-0 text-center {row.done ? 'opacity-60' : ''}" data-testid="workout-reps" />
                <button type="button" class="grid size-11 place-items-center rounded-sm transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.97] {row.done ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink-2 active:bg-surface-3'}" aria-pressed={row.done} aria-label="{t.workout.set} {i + 1}, {t.workout.tick}" onclick={() => tick(row)} data-testid="workout-tick">
                  <Check size={22} strokeWidth={2.5} aria-hidden="true" />
                </button>
              </div>
            {/each}
          </div>
          <Button variant="plain" size="sm" class="-ml-4 mt-1" onclick={() => addSet(c)} data-testid="workout-add-set"><Plus size={18} strokeWidth={2.25} aria-hidden="true" />{t.workout.addSet}</Button>
        </Card>
      {:else}
        <p class="text-body text-ink-2">{t.workout.none}</p>
      {/each}
    </div>
  {:else if step === 'effort'}
    <h2 class="text-heading mt-2">{t.workout.effortQ}</h2>
    <div class="mt-6 grid grid-cols-5 gap-2" role="radiogroup" aria-label={t.workout.effortQ}>
      {#each Array.from({ length: 10 }, (_, i) => i + 1) as n (n)}
        <button type="button" role="radio" aria-checked={effort === n} class="text-body num min-h-14 rounded-sm font-semibold transition-[transform,background-color,color] duration-[var(--d-ui)] ease-[var(--spring-default)] active:scale-[0.97] {effort === n ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink active:bg-surface-3'}" onclick={() => { haptic(); effort = n; }} data-testid="workout-effort-{n}">{n}</button>
      {/each}
    </div>
    <p class="text-callout text-ink-2 mt-4 min-h-[1lh]" aria-live="polite">{EFFORT}</p>
  {/if}
</Sheet>
