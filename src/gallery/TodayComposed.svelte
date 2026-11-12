<!-- Today composed from the real components with sample content (once design/reference-today.html, retired in D1).
     Static sample data: the real Today reads the store. -->
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

<div class="flex flex-col gap-4 pt-1">
  <WeekStrip days={WEEK} today={TODAY} {selected} onselect={(d) => (selected = d)} />

  <Card hero aria-label={t.today.calories} data-testid="hero">
    <HeroNumber value={eaten} caption={t.after.ofKcal(num(target))} side={num(target - eaten)} sideCaption={t.after.toGo} />
    <div class="mt-4"><Track hero value={eaten} {target} {zone} label="{num(eaten)} {t.after.ofKcal(num(target))}" /></div>
    <div class="text-caption text-ink-2 mt-2 flex justify-between gap-4">
      <span>{t.today.trainingDay}</span>
      <span>{t.today.onTrackFrom(num(zone[0]))}</span>
    </div>
    <div class="mt-4 grid grid-cols-3 gap-4">
      {#each MACROS as m (m.label)}
        <div class="flex min-w-0 flex-col">
          <div class="text-caption text-ink-2">{m.label}</div>
          <div class="text-body num mb-1.5 font-semibold">{m.value}<span class="text-caption text-ink-2 ml-1 font-medium whitespace-nowrap">{t.after.ofGrams(num(m.target))}</span></div>
          <div class="mt-auto"><Track value={m.value} target={m.target} zone={m.zone} label="{m.label} {m.value} {t.after.ofGrams(num(m.target))}" /></div>
        </div>
      {/each}
    </div>
  </Card>

  <Card list aria-label={t.today.training}>
    <Row title="Push day" caption={t.today.session('Strength', '60', '240')} wrap>
      {#snippet leading()}<div class="tile grid size-full place-items-center"><TrainIcon /></div>{/snippet}
      {#snippet trailing()}<Button size="sm">{t.today.done}</Button>{/snippet}
    </Row>
  </Card>

  <div class="mt-2 flex items-baseline justify-between px-1">
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
</div>
