<!-- SCREENS.md section 8, Session sheet: name, day, type, minutes in fives, intensity with a line for each level, the
     calories the session adds, the exercises with sets and reps, Add exercise, Delete session. Edits a copy; Save
     changes the program, and the targets follow from tomorrow. -->
<script lang="ts">
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import { toast } from 'svelte-sonner';
  import { changeProgram, undoToast } from '$lib/actions';
  import { sessionKcal, type Intensity, type SessionType } from '$lib/model/engine';
  import { LIBRARY } from '$lib/data/exercises';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import ExercisePicker from './ExercisePicker.svelte';
  import type { Program, Session } from '../../../shared/records';

  let { editing = $bindable(), program, weightKg }: {
    /** a copy of the session being edited, or a new one */
    editing: { session: Session; isNew: boolean } | null;
    program: Program;
    weightKg: number;
  } = $props();

  const TYPES: SessionType[] = ['strength', 'circuit', 'cardio', 'sport', 'mobility', 'walk'];
  const INTENSITIES: Intensity[] = ['light', 'moderate', 'hard'];
  // the record schema's limits: 600 minutes a session, 20 exercises, 20 sets, 100 reps
  const MAX = { minutes: 600, exercises: 20, sets: 20, reps: 100 };
  // a new exercise starts here; the user sets their own
  const START = { sets: 3, repsMin: 8, repsMax: 12 };

  let opened = $state<number | null>(null);
  let picking = $state(false);
  const s = $derived(editing?.session);

  function commit(sessions: Session[], message: string) {
    try {
      undoToast(message, changeProgram({ name: program.name, sessions }));
    } catch {
      // only size can fail here: the controls keep every other value inside the schema
      toast(t.train.tooLarge);
      return;
    }
    editing = null;
    opened = null;
  }
  function save() {
    if (!editing) return;
    const next = $state.snapshot(editing.session);
    next.name = next.name.trim() || t.train.types[next.type];
    // nothing changed: no new plan
    if (!editing.isNew && JSON.stringify(next) === JSON.stringify(program.sessions.find((x) => x.key === next.key))) return void (editing = null);
    commit(editing.isNew ? [...program.sessions, next] : program.sessions.map((x) => (x.key === next.key ? next : x)), t.train.saved);
  }
  function remove() {
    if (editing) commit(program.sessions.filter((x) => x.key !== editing!.session.key), t.train.deleted);
  }
  function pick(exerciseId: string) {
    if (!s) return;
    s.exercises = [...(s.exercises ?? []), { exerciseId, ...START }];
    opened = s.exercises.length - 1;
  }
  const label = 'text-eyebrow text-ink-2';
</script>

{#snippet footer()}
  <Button variant="primary" size="lg" full onclick={save} data-testid="session-save">{editing?.isNew ? t.train.add : t.train.save}</Button>
{/snippet}

<Sheet
  bind:open={() => editing !== null, (v) => { if (!v) { editing = null; opened = null; } }}
  title={editing?.isNew ? t.train.newSession : (s?.name ?? '')}
  layer="base"
  testid="train-session-sheet"
  {footer}
>
  {#if s}
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <label for="session-name" class="text-caption text-ink-2">{t.train.name}</label>
        <input
          id="session-name"
          placeholder={t.train.types[s.type]}
          maxlength={60}
          autocomplete="off"
          bind:value={s.name}
          class="input-field text-body w-full"
          data-testid="session-name"
        />
      </div>
      <div class="flex flex-col gap-3">
        <span class={label}>{t.train.day}</span>
        <div class="flex flex-wrap gap-2" role="group" aria-label={t.train.day}>
          {#each t.train.weekdaysShort as d, i (d)}
            <Chip selected={s.weekday === i} onclick={() => (s.weekday = i)}>{d}</Chip>
          {/each}
        </div>
      </div>
      <div class="flex flex-col gap-3">
        <span class={label}>{t.train.type}</span>
        <div class="flex flex-wrap gap-2" role="group" aria-label={t.train.type}>
          {#each TYPES as ty (ty)}
            <Chip selected={s.type === ty} onclick={() => (s.type = ty)}>{t.train.types[ty]}</Chip>
          {/each}
        </div>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class={label}>{t.train.minutes}</span>
        <Stepper bind:value={s.minutes} min={5} max={MAX.minutes} step={5} label={t.train.minutes} />
      </div>
      <!-- SCREENS.md section 8: a three way segmented control (U1b); the longest label fits at the largest text on the SE -->
      <div class="flex flex-col gap-3">
        <span class={label}>{t.train.intensity}</span>
        <Segmented bind:value={s.intensity} label={t.train.intensity} options={INTENSITIES.map((i) => ({ value: i, label: t.train.intensities[i] }))} />
        <p class="text-caption text-ink-2">{t.train.intensityLines[s.intensity]}</p>
      </div>
      <p class="text-body font-semibold" data-testid="session-kcal">{t.train.sessionAdds(num(Math.round(sessionKcal(s, weightKg))))}</p>

      <div>
        <h3 class="text-heading">{t.train.exercises}</h3>
        {#each s.exercises ?? [] as e, i (i)}
          <div class="border-line border-t py-3 first-of-type:border-t-0" data-testid="session-exercise">
            <button type="button" class="active:bg-surface-2 -mx-6 flex w-[calc(100%+var(--inset)*2)] flex-col items-start px-6 py-1 text-left transition-colors duration-[var(--d-press)]" aria-expanded={opened === i} onclick={() => (opened = opened === i ? null : i)}>
              <span class="text-body line-clamp-2 font-semibold">{LIBRARY[e.exerciseId]?.name ?? e.exerciseId}</span>
              <span class="text-caption text-ink-2">{t.train.exerciseLine(num(e.sets), num(e.repsMin), num(e.repsMax))}</span>
            </button>
            {#if opened === i}
              <div class="mt-2 flex flex-col gap-2">
                <div class="flex items-center justify-between gap-3">
                  <span class={label}>{t.train.setsLabel}</span>
                  <Stepper bind:value={e.sets} min={1} max={MAX.sets} label={t.train.setsLabel} />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class={label}>{t.train.repsFrom}</span>
                  <Stepper bind:value={() => e.repsMin, (v) => { e.repsMin = v; e.repsMax = Math.max(e.repsMax, v); }} min={1} max={MAX.reps} label={t.train.repsFrom} />
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class={label}>{t.train.repsTo}</span>
                  <Stepper bind:value={e.repsMax} min={e.repsMin} max={MAX.reps} label={t.train.repsTo} />
                </div>
                <div><Button variant="danger" size="sm" class="-ml-4" onclick={() => { s.exercises?.splice(i, 1); opened = null; }} data-testid="exercise-remove">{t.meal.remove}</Button></div>
              </div>
            {/if}
          </div>
        {:else}
          <p class="text-callout text-ink-2 mt-1">{t.train.noneListed}</p>
        {/each}
        <Button variant="plain" class="-ml-5 mt-1" disabled={(s.exercises?.length ?? 0) >= MAX.exercises} onclick={() => (picking = true)} data-testid="exercise-add">{t.train.addExercise}</Button>
      </div>
      {#if !editing?.isNew}
        <div><Button variant="danger" onclick={remove} data-testid="session-delete">{t.train.deleteSession}</Button></div>
      {/if}
    </div>
  {/if}
</Sheet>

<ExercisePicker bind:open={picking} onpick={pick} />
