<!-- Step 7: days a week, type, minutes and intensity; or a program from Templates; or later. Creates the program. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Step from './Step.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Button from '$lib/components/Button.svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import { TEMPLATES } from '$lib/data/templates';
  import { t } from '$lib/i18n';
  import type { Intensity, SessionType } from '$lib/model/engine';
  import { DEFAULT_TRAIN, type Draft, type Train } from './draft';

  let { d, next, back, progress }: {
    d: Draft;
    next: (p: Partial<Draft>) => void;
    back: () => void;
    progress: { n: number; total: number } | null;
  } = $props();

  const TYPES: SessionType[] = ['strength', 'circuit', 'cardio', 'sport', 'mobility', 'walk'];
  const INTENSITIES: Intensity[] = ['light', 'moderate', 'hard'];
  const MINUTES = { min: 10, max: 240, step: 5 };

  // the controls start from the custom week answered before, if any; this screen is created fresh on each visit
  const start = untrack(() => (d.train?.kind === 'custom' ? d.train : DEFAULT_TRAIN)) as Extract<Train, { kind: 'custom' }>;
  let days = $state(start.days);
  let type = $state(start.type);
  let minutes = $state(start.minutes);
  let intensity = $state(start.intensity);
  let picking = $state(false);

  // a program picked earlier stays until the controls are changed
  const changed = $derived(days !== start.days || type !== start.type || minutes !== start.minutes || intensity !== start.intensity);
  const program = $derived(!changed && d.train?.kind === 'template' ? TEMPLATES.find((x) => x.id === (d.train as { id: string }).id) : undefined);

  const label = 'text-eyebrow text-ink-2';
</script>

<Step title={t.train.q} onback={back} {progress} testid="step-train">
  <div class="flex flex-col gap-6">
    <div class="flex items-center justify-between gap-3">
      <span class={label}>{t.train.days}</span>
      <Stepper bind:value={days} min={1} max={7} label={t.train.days} />
    </div>
    <div class="flex flex-col gap-3">
      <span class={label}>{t.train.type}</span>
      <div class="flex flex-wrap gap-2" role="group" aria-label={t.train.type}>
        {#each TYPES as ty (ty)}
          <Chip selected={type === ty} onclick={() => (type = ty)}>{t.train.types[ty]}</Chip>
        {/each}
      </div>
    </div>
    <div class="flex items-center justify-between gap-3">
      <span class={label}>{t.train.minutes}</span>
      <Stepper bind:value={minutes} min={MINUTES.min} max={MINUTES.max} step={MINUTES.step} label={t.train.minutes} />
    </div>
    <!-- chips, not a segmented control: three options clip in one at the largest text on the SE -->
    <div class="flex flex-col gap-3">
      <span class={label}>{t.train.intensity}</span>
      <div class="flex flex-wrap gap-2" role="group" aria-label={t.train.intensity}>
        {#each INTENSITIES as i (i)}
          <Chip selected={intensity === i} onclick={() => (intensity = i)}>{t.train.intensities[i]}</Chip>
        {/each}
      </div>
    </div>
    {#if program}<p class="text-callout" data-testid="train-using">{t.train.using(program.name)}</p>{/if}
    <div class="flex flex-col gap-1">
      <Button full onclick={() => (picking = true)} data-testid="train-choose">{t.train.choose}</Button>
      <Button variant="plain" full onclick={() => next({ train: { kind: 'later' } })} data-testid="train-later">{t.train.later}</Button>
    </div>
  </div>
  {#snippet footer()}
    <Button variant="primary" size="lg" full onclick={() => next({ train: program ? d.train : { kind: 'custom', days, type, minutes, intensity } })} data-testid="continue">
      {t.onboarding.continue}
    </Button>
  {/snippet}
</Step>

<Sheet bind:open={picking} title={t.train.templates} layer="base" testid="templates-sheet">
  <div class="-mt-2">
    {#each TEMPLATES as tpl (tpl.id)}
      <Row
        title={tpl.name}
        onclick={() => { picking = false; next({ train: { kind: 'template', id: tpl.id } }); }}
        testid="template-{tpl.id}"
      >
        {#snippet caption()}
          <span class="block">{t.train.perWeek(String(tpl.daysPerWeek))}</span>
          <span class="block">{t.train.suits[tpl.id]}</span>
        {/snippet}
      </Row>
    {/each}
  </div>
</Sheet>
