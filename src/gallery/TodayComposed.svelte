<!-- design/reference-today.html rebuilt from the real components, with the same content. Static sample data:
     the real Today arrives in M5 and reads the store. -->
<script lang="ts">
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import Card from '$lib/components/Card.svelte';
  import Row from '$lib/components/Row.svelte';
  import Track from '$lib/components/Track.svelte';
  import HeroNumber from '$lib/components/HeroNumber.svelte';
  import WeekStrip from '$lib/components/WeekStrip.svelte';
  import Button from '$lib/components/Button.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import { WEEK, TODAY, MEALS, KCAL, PROTEIN_ZONE } from './fixtures';

  let selected = $state(TODAY);
  const { target, zone } = KCAL;
  const eaten = MEALS.reduce((s, m) => s + m.kcal, 0);
  const MACROS = [
    { label: t.today.protein, value: 84, target: 108, zone: PROTEIN_ZONE },
    { label: t.today.carbs, value: 236, target: 361 },
    { label: t.today.fat, value: 52, target: 65 },
  ];
</script>

<div class="mt-2 mb-4"><WeekStrip days={WEEK} today={TODAY} {selected} onselect={(d) => (selected = d)} /></div>

<div class="flex flex-col gap-3">
  <Card hero aria-label={t.today.calories} data-testid="hero">
    <HeroNumber value={eaten} caption={t.after.ofKcal(num(target))} side={num(target - eaten)} sideCaption={t.after.toGo} />
    <div class="mt-4 mb-2"><Track hero value={eaten} {target} {zone} label="{num(eaten)} {t.after.ofKcal(num(target))}" /></div>
    <div class="text-caption text-ink-2 flex justify-between gap-4">
      <span>{t.today.trainingDay}</span>
      <span>{t.today.onTrackFrom(num(zone[0]))}</span>
    </div>

    <div class="border-line mt-5 grid grid-cols-3 gap-4 border-t pt-4">
      {#each MACROS as m (m.label)}
        <div class="min-w-0">
          <div class="text-caption text-ink-2">{m.label}</div>
          <!-- value and target on two lines, as the hero does, so the three columns stay level at every width and text size -->
          <div class="text-body num font-semibold">{m.value}</div>
          <div class="text-caption text-ink-2 whitespace-nowrap">{t.after.ofGrams(num(m.target))}</div>
          <div class="mt-2"><Track value={m.value} target={m.target} zone={m.zone} label="{m.label} {m.value} {t.after.ofGrams(num(m.target))}" /></div>
        </div>
      {/each}
    </div>
  </Card>

  <Card list aria-label={t.today.training}>
    <Row title="Push day" caption={t.today.session('Strength', '60', '240')}>
      {#snippet leading()}<div class="bg-surface-2 grid size-full place-items-center"><TrainIcon /></div>{/snippet}
      {#snippet trailing()}<Button size="sm">{t.today.done}</Button>{/snippet}
    </Row>
  </Card>
</div>

<div class="mx-1 mt-5 mb-3 flex items-baseline justify-between">
  <h2 class="text-heading">{t.today.meals}</h2>
  <span class="text-caption text-ink-2">{t.today.logged(String(MEALS.length))}</span>
</div>
<Card list aria-label={t.today.meals}>
  {#each MEALS as m (m.name)}
    <Row title={m.name} value={num(m.kcal)}>
      {#snippet leading()}<img src={m.photo} alt="" class="size-full object-cover" />{/snippet}
      {#snippet caption()}{m.time}, <SourceLabel source={m.source} />{/snippet}
    </Row>
  {/each}
</Card>
