<!-- Development screen: every component in its states (/gallery), and Today composed from them (/gallery/today).
     Gallery-only labels are inline; product words come from the catalog. Never in production builds. -->
<script lang="ts">
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import { onMount, type Component } from 'svelte';
  import { toast } from 'svelte-sonner';
  import Hash from '@lucide/svelte/icons/hash';
  import Search from '@lucide/svelte/icons/search';
  import { prefs, applyTheme, applyFontSize, type FontSize, type Tab, type Theme } from '$lib/prefs.svelte';
  import { picker } from '$lib/picker.svelte';
  import { undoToast } from '$lib/actions';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import Header from '$lib/components/Header.svelte';
  import Dock from '$lib/components/Dock.svelte';
  import Toasts from '$lib/components/Toasts.svelte';
  import WheelSheet from '$lib/components/WheelSheet.svelte';
  import Wheel from '$lib/components/Wheel.svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Row from '$lib/components/Row.svelte';
  import CardHead from '$lib/components/CardHead.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Stepper from '$lib/components/Stepper.svelte';
  import Track from '$lib/components/Track.svelte';
  import HeroNumber from '$lib/components/HeroNumber.svelte';
  import WeekStrip from '$lib/components/WeekStrip.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import SyncMark from '$lib/components/SyncMark.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import TodayComposed from './TodayComposed.svelte';
  import { KCAL, MEALS, PROTEIN_ZONE, TODAY, WEEK } from './fixtures';

  const today = location.pathname.startsWith('/gallery/today');
  let tab = $state<Tab>(0);
  const noSwipe = { onDrag() {}, onSwipe() {}, onCancel() {} };
  onMount(() => {
    applyTheme();
    applyFontSize();
  });

  const THEMES: { value: Theme; label: string }[] = [
    { value: 'system', label: t.prefs.system },
    { value: 'light', label: t.prefs.light },
    { value: 'dark', label: t.prefs.dark },
  ];
  const SIZES: { value: FontSize; label: string }[] = [
    { value: 'system', label: t.prefs.system },
    { value: 'm', label: t.prefs.m },
    { value: 'l', label: t.prefs.l },
    { value: 'xl', label: t.prefs.xl },
  ];

  // hero: the counterpart follows the gain rules in docs/SCREENS.md section 6
  const { target, zone } = KCAL;
  let eaten = $state(1840);
  const side = $derived(eaten < zone[0] ? { side: num(target - eaten), cap: t.after.toGo } : eaten <= zone[1] ? { side: t.today.onTrack } : { side: num(eaten - target), cap: t.after.over });

  const PORTIONS = ['Half', 'Same', 'One and a half', 'Double'];
  let portion = $state('Same');
  let grams = $state(180);
  let picked = $state('2026-11-10');
  let sheetOpen = $state(false);

  let height = $state(170);
  let weight = $state(70);
  async function weighIn() {
    const kg = await picker.ask({ title: t.weigh.title, value: 82.4, min: 30, max: 300, decimals: 1, unit: t.after.kg, hint: t.weigh.hint, saveLabel: (v) => t.weigh.save(`${num(v, 1)} ${t.after.kg}`) });
    if (kg !== null) toast(t.weigh.saved(`${num(kg, 1)} ${t.after.kg}`));
  }
</script>

{#snippet heading(title: string)}
  <h2 class="text-heading mt-10 mb-4 first:mt-4">{title}</h2>
{/snippet}
{#snippet note(text: string)}
  <p class="text-caption text-ink-2 mt-4 mb-2">{text}</p>
{/snippet}
{#snippet tile(Icon: Component<{ size?: number; strokeWidth?: number }>)}
  <div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Icon size={24} strokeWidth={2} /></div>
{/snippet}

<div class="bg-canvas relative mx-auto min-h-svh w-full max-w-[480px] overflow-x-clip">
  <Header title={today ? t.tabs.today : 'Gallery'} />

  <main class="px-4 pb-[calc(var(--dock-h)+12px+env(safe-area-inset-bottom)+24px)]" data-testid="gallery">
    {#if today}
      <TodayComposed />
    {:else}
      <section data-section="prefs">
        {@render heading('Theme and text size')}
        <Segmented label={t.prefs.theme} options={THEMES} bind:value={() => prefs.theme, (v) => (prefs.theme = v)} />
        <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label={t.prefs.textSize}>
          {#each SIZES as s (s.value)}
            <Chip selected={prefs.fontSize === s.value} onclick={() => (prefs.fontSize = s.value)}>{s.label}</Chip>
          {/each}
        </div>
        <a href="/gallery/today" class="bg-surface-2 active:bg-surface-3 text-callout mt-3 inline-flex h-12 items-center rounded-sm px-5 font-semibold">Today, composed</a>
      </section>

      <section data-section="buttons">
        {@render heading('Buttons')}
        {@render note('Primary, the flat ink pill (white on dark), 56 high. One per screen')}
        <Button variant="primary" size="lg" full onclick={() => toast('Added 720 kcal')}>Add 720 kcal</Button>
        {@render note('Neutral, the grey pill for a second action')}
        <Button full>Choose a program</Button>
        {@render note('Neutral, plain (a violet link) and danger, 48 high')}
        <div class="flex flex-wrap gap-2">
          <Button>Search</Button>
          <Button variant="plain">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </div>
        {@render note('Compact, 36 high on screen and 44 to tap, and disabled')}
        <div class="flex flex-wrap gap-2">
          <Button size="sm">Done</Button>
          <Button variant="plain" size="sm">Skip</Button>
          <Button variant="primary" size="sm" disabled>Save</Button>
        </div>
      </section>

      <section data-section="track">
        {@render heading('Track')}
        {@render note('Below the zone: violet')}
        <Track hero value={1840} {target} {zone} label="1,840 of 2,460 kcal" />
        {@render note('In the zone: green')}
        <Track hero value={2400} {target} {zone} label="2,400 of 2,460 kcal" />
        {@render note('Past the zone on a lose day: violet again')}
        <Track hero value={2700} {target} zone={[2214, 2583]} label="2,700 of 2,460 kcal" />
        {@render note('Small, protein below and in its zone, then carbs with no zone')}
        <div class="grid grid-cols-3 gap-4">
          <Track value={84} target={108} zone={PROTEIN_ZONE} label="Protein 84 of 108 g" />
          <Track value={104} target={108} zone={PROTEIN_ZONE} label="Protein 104 of 108 g" />
          <Track value={236} target={361} label="Carbs 236 of 361 g" />
        </div>
      </section>

      <section data-section="hero">
        {@render heading('Hero number and card')}
        <Card hero>
          <div class="haze rounded-sheet p-6">
            <HeroNumber value={eaten} caption={t.after.ofKcal(num(target))} side={side.side} sideCaption={side.cap} reached={!side.cap} />
            <div class="mt-4"><Track hero value={eaten} {target} {zone} label="{num(eaten)} {t.after.ofKcal(num(target))}" /></div>
          </div>
        </Card>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onclick={() => (eaten += 250)}>Add 250 kcal</Button>
          <Button variant="plain" size="sm" onclick={() => (eaten = 1840)}>Reset</Button>
        </div>
      </section>

      {#snippet estimate()}<SourceLabel source="estimate" />{/snippet}
      {#snippet database()}<SourceLabel source="database" />{/snippet}
      <!-- U3: the five levels inside the app (DESIGN.md section 5, Hierarchy) -->
      <section data-section="type">
        {@render heading('Text levels')}
        <Card>
          <p class="text-eyebrow text-ink-2">Label, the eyebrow</p>
          <p class="text-subhead mt-1">Subhead, a card's title</p>
          <p class="text-body mt-2 font-semibold">Body, a row's title</p>
          <p class="text-callout text-ink-2"><Facts facts={['Meta, the line under it', 'a second fact']} /></p>
          <p class="text-caption text-ink-2 mt-2">Caption, a label under a figure</p>
        </Card>
      </section>

      <section data-section="rows">
        {@render heading('Card and rows')}
        {@render note('A status card: the subject, the status, why, one action')}
        <Card>
          <CardHead eyebrow={t.checkin.cardEyebrow} title={t.checkin.cardTitle} line={t.checkin.cardLine}>
            {#snippet action()}<Button size="sm">{t.checkin.open}</Button>{/snippet}
          </CardHead>
        </Card>
        {@render note('A list card')}
        <Card list>
          <Row title="Push day" wrap>
      {#snippet caption()}<Facts facts={['Strength', t.after.minN('60'), t.after.kcalN('240')]} />{/snippet}
            {#snippet leading()}<div class="tile grid size-full place-items-center"><TrainIcon /></div>{/snippet}
            {#snippet trailing()}<Button size="sm">{t.today.done}</Button>{/snippet}
          </Row>
        </Card>
        {@render note('Tappable rows, photo or a tile for how the meal was logged')}
        <Card list>
          {#each MEALS.slice(0, 2) as m (m.name)}
            {#snippet src()}<SourceLabel source={m.source} />{/snippet}
            <Row title={m.name} value={num(m.kcal)} unit={t.after.kcal} onclick={() => (sheetOpen = true)}>
              {#snippet leading()}<img src={m.photo} alt="" class="size-full object-cover" />{/snippet}
              {#snippet caption()}<Facts facts={[m.time, src]} />{/snippet}
            </Row>
          {/each}
          <Row title="Quick add" value="350" unit={t.after.kcal} onclick={() => (sheetOpen = true)}>
            {#snippet leading()}{@render tile(Hash)}{/snippet}
            {#snippet caption()}<Facts facts={['15:30', estimate]} />{/snippet}
          </Row>
          <Row title="Greek yoghurt" value="146" unit={t.after.kcal} onclick={() => (sheetOpen = true)}>
            {#snippet leading()}{@render tile(Search)}{/snippet}
            {#snippet caption()}<Facts facts={['16:10', database]} />{/snippet}
          </Row>
        </Card>
      </section>

      <section data-section="chips">
        {@render heading('Chips and stepper')}
        <div class="flex flex-wrap gap-2" role="group" aria-label="Portion">
          {#each PORTIONS as p (p)}
            <Chip selected={portion === p} onclick={() => (portion = p)}>{p}</Chip>
          {/each}
        </div>
        <div class="mt-3"><Stepper bind:value={grams} step={10} min={0} max={2000} unit="g" label="grams" /></div>
      </section>

      <section data-section="sheets">
        {@render heading('Sheets')}
        <div class="flex flex-wrap gap-2">
          <Button onclick={() => (sheetOpen = true)}>Open a sheet</Button>
          <Button onclick={weighIn}>Open the wheel sheet</Button>
        </div>
      </section>

      <section data-section="wheel">
        {@render heading('Wheels')}
        {@render note('A bounded value: tap the band to type it')}
        <!-- side by side, the two share one band, as on onboarding's height and weight -->
        <div class="group relative grid grid-cols-2 gap-3">
          <div class="bg-surface-2 ring-ink absolute inset-x-0 top-[calc(2*var(--wheel-row))] h-[var(--wheel-row)] rounded-sm group-has-[[role=slider]:focus-visible]:ring-2" aria-hidden="true"></div>
          <Wheel bind:value={height} min={100} max={250} unit={t.after.cm} band={false} label={t.body.height} testid="wheel-height" />
          <Wheel bind:value={weight} min={30} max={300} decimals={1} unit={t.after.kg} band={false} label={t.body.weight} testid="wheel-weight" />
        </div>
      </section>

      <section data-section="week">
        {@render heading('Week strip')}
        {@render note('Today, two days on track')}
        <WeekStrip days={WEEK} today={TODAY} />
        {@render note('Viewing a past day')}
        <WeekStrip days={WEEK} today={TODAY} selected={picked} onselect={(d) => (picked = d)} />
      </section>

      <section data-section="feedback">
        {@render heading('Toast, source and sync')}
        <div class="flex flex-wrap gap-2">
          <Button onclick={() => toast('Saved')}>Show a toast</Button>
          <Button onclick={() => undoToast('Meal deleted', () => toast('Meal restored'))}>Show an undo toast</Button>
        </div>
        {@render note('Source labels')}
        <p class="text-caption text-ink-2 flex gap-4"><SourceLabel source="database" /><SourceLabel source="estimate" /></p>
        {@render note('Sync mark: syncing, offline, needs attention. Idle shows nothing')}
        <div class="flex gap-4">
          <SyncMark state="syncing" />
          <SyncMark state="offline" />
          <SyncMark state="attention" />
        </div>
      </section>

      <section data-section="states">
        {@render heading('Empty and loading')}
        <Card>
          <EmptyState text={t.empty.train} action="Add your program" onaction={() => toast('Opens the program editor')} />
        </Card>
        {@render note('Skeleton of the hero card')}
        <Card hero aria-busy="true" aria-label={t.loading}>
          <div class="p-4">
            <div class="flex items-end justify-between">
              <div><Skeleton class="h-14 w-40 rounded-sm" /><Skeleton class="mt-1 h-4.5 w-24 rounded-xs" /></div>
              <Skeleton class="h-11 w-16 rounded-sm" />
            </div>
            <Skeleton class="mt-4 h-3.5 rounded-full" />
          </div>
        </Card>
      </section>
    {/if}
  </main>

  <Dock tab={today ? 0 : tab} onselect={(i) => (tab = i)} swipeOpts={noSwipe} />
</div>

<Sheet bind:open={sheetOpen} title="Chicken rice bowl" testid="sample-sheet">
  <div>
    <Row title="Jasmine rice" value="390" caption="300 g" />
    <Row title="Roast chicken" value="250" caption="150 g" />
    <Row title="Cucumber" value="8" caption="50 g" />
  </div>
  {#snippet footer()}
    <Button variant="primary" size="lg" full onclick={() => (sheetOpen = false)}>Add 648 kcal</Button>
  {/snippet}
</Sheet>
<Toasts />
<WheelSheet />
