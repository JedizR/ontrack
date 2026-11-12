<!-- SCREENS.md section 8, Exercise picker: a search field, muscle chips, rows with the primary muscles as a caption.
     Picking a row hands its id back and closes. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Row from '$lib/components/Row.svelte';
  import { EXERCISES } from '$lib/data/exercises';
  import { MUSCLES, type Muscle } from '$lib/model/engine';
  import { t } from '$lib/i18n';

  let { open = $bindable(), onpick }: { open: boolean; onpick: (exerciseId: string) => void } = $props();

  let q = $state('');
  let muscle = $state<Muscle | null>(null);
  $effect(() => { if (open) untrack(() => { q = ''; muscle = null; }); });

  const list = $derived(EXERCISES.filter((e) => (!muscle || e.primary.includes(muscle)) && e.name.toLowerCase().includes(q.trim().toLowerCase())));
</script>

<Sheet bind:open title={t.train.addExercise} layer="nested" testid="exercise-picker">
  <input
    aria-label={t.train.search}
    type="search"
    autocomplete="off"
    spellcheck="false"
    placeholder={t.train.search}
    bind:value={q}
    class="input-field text-body w-full appearance-none [&::-webkit-search-cancel-button]:appearance-none"
    data-testid="exercise-search"
  />
  <div class="-mx-6 mt-2 flex gap-2 overflow-x-auto px-6" role="group" aria-label={t.train.muscle}>
    <Chip selected={muscle === null} onclick={() => (muscle = null)}>{t.train.allMuscles}</Chip>
    {#each MUSCLES as m (m)}
      <Chip selected={muscle === m} onclick={() => (muscle = m)}>{t.train.muscles[m]}</Chip>
    {/each}
  </div>
  <div class="mt-1">
    {#each list as e (e.id)}
      <Row title={e.name} caption={e.primary.map((m) => t.train.muscles[m]).join(', ')} onclick={() => { onpick(e.id); open = false; }} testid="exercise-option" />
    {:else}
      <p class="text-callout text-ink-2 mt-3">{t.train.noMatch}</p>
    {/each}
  </div>
</Sheet>
