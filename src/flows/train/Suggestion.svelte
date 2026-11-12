<!-- SCREENS.md section 4, after onboarding (O1): while the program has no exercises listed, the template that fits the
     week the answers made (its days, lifting or cardio or both) and the experience, in one tap with an undo, or Not now.
     Cardio only, or no training, with a gain goal: Minimal 2 days, for the two strength sessions a week (F10). -->
<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import { changeProgram, undoToast } from '$lib/actions';
  import { TEMPLATES, suggestTemplate, type TrainKind } from '$lib/data/templates';
  import { prefs } from '$lib/prefs.svelte';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import type { Experience, Goal } from '$lib/model/engine';
  import type { Session } from '../../../shared/records';

  let { sessions, goal, experience }: { sessions: Session[]; goal: Goal; experience: Experience } = $props();

  const lifts = $derived(sessions.some((s) => s.type === 'strength' || s.type === 'circuit'));
  const kind = $derived<TrainKind>(lifts && sessions.some((s) => s.type === 'cardio') ? 'both' : lifts || !sessions.length ? 'lifting' : 'cardio');
  const days = $derived(new Set(sessions.map((s) => s.weekday)).size);
  const tpl = $derived.by(() => {
    if (prefs.suggestOff || sessions.some((s) => s.exercises?.length)) return undefined;
    const id = suggestTemplate(kind, days, experience, goal);
    return TEMPLATES.find((x) => x.id === id);
  });
  // the gain case adds strength to a week without it; otherwise the template fits the days
  const adds = $derived(kind === 'cardio' || days === 0);

  function use() {
    if (!tpl) return;
    const add = $state.snapshot(tpl.sessions);
    // the gain case adds the strength sessions to the week the user has, lifting first on a shared day (S22)
    const program = adds && sessions.length ? { name: '', sessions: [...add, ...$state.snapshot(sessions)] } : { name: tpl.name, sessions: add };
    undoToast(t.train.saved, changeProgram(program));
  }
</script>

{#if tpl}
  <Card data-testid="train-suggest">
    <p class="text-body font-semibold">{t.suggest.title}</p>
    <p class="text-callout mt-1">{adds ? t.suggest.gainLine(tpl.name) : t.suggest.line(tpl.name, num(tpl.daysPerWeek))}</p>
    <p class="text-callout text-ink-2 mt-1">{t.train.suits[tpl.id]}</p>
    <div class="mt-4 -mb-2 flex flex-wrap items-center gap-x-2">
      <Button size="sm" onclick={use} data-testid="suggest-use">{t.suggest.use}</Button>
      <Button variant="plain" size="sm" onclick={() => (prefs.suggestOff = true)} data-testid="suggest-later">{t.suggest.later}</Button>
    </div>
  </Card>
{/if}
