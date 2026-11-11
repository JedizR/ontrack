<!-- Development screen: every component in its states (/gallery), and Today composed from them (/gallery/today).
     Gallery-only labels are inline; product words come from the catalog. Never in production builds. -->
<script lang="ts">
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import { onMount, type Component } from 'svelte';
  import { toast } from 'svelte-sonner';
  import Hash from '@lucide/svelte/icons/hash';
  import Search from '@lucide/svelte/icons/search';
  import { prefs, applyTheme, applyFontSize, type FontSize, type Tab, type Theme } from '$lib/prefs.svelte';
  import { keypad } from '$lib/keypad.svelte';
  import { undoToast } from '$lib/actions';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import Header from '$lib/components/Header.svelte';
  import Dock from '$lib/components/Dock.svelte';
  import Toasts from '$lib/components/Toasts.svelte';
  import KeypadSheet from '$lib/components/KeypadSheet.svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Card from '$lib/components/Card.svelte';
  import Row from '$lib/components/Row.svelte';
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

  async function quickAdd() {
    const kcal = await keypad.ask({
      title: 'Quick add',
      unit: 'kcal',
      hint: 'Calories',
      chips: [100, 250, 500].map((v) => ({ label: num(v), value: v })),
      saveLabel: (v) => `Add ${num(v)} kcal`,
    });
    if (kcal !== null) toast(`Added ${num(kcal)} kcal`);
  }
</script>

{#snippet heading(title: string)}
  <h2 class="text-heading mt-10 mb-3 first:mt-4">{title}</h2>
{/snippet}
{#snippet note(text: string)}
  <p class="text-caption text-ink-2 mt-4 mb-2">{text}</p>
{/snippet}
{#snippet tile(Icon: Component<{ size?: number; strokeWidth?: number }>)}
  <div class="bg-surface-2 grid size-full place-items-center"><Icon size={24} strokeWidth={1.75} /></div>
{/snippet}

<div class="bg-canvas relative mx-auto min-h-dvh w-full max-w-[480px] overflow-x-clip">
  <Header title={today ? t.tabs.today : 'Gallery'} />

  <main class="px-5 pb-[calc(env(safe-area-inset-bottom)+var(--dock-h)+40px)]" data-testid="gallery">
    {#if today}
      <TodayComposed />
    {:else}
      <section data-section="prefs">
        {@render heading('Theme and text size')}
        <Segmented label={t.prefs.theme} options={THEMES} bind:value={() => prefs.theme, (v) => (prefs.theme = v)} />
        <div class="mt-3 flex flex-wrap gap-x-2" role="group" aria-label={t.prefs.textSize}>
          {#each SIZES as s (s.value)}
            <Chip selected={prefs.fontSize === s.value} onclick={() => (prefs.fontSize = s.value)}>{s.label}</Chip>
          {/each}
        </div>
        <a href="/gallery/today" class="bg-surface-2 active:bg-surface-3 text-callout mt-3 inline-flex h-11 items-center rounded-full px-5 font-medium">Today, composed</a>
      </section>

      <section data-section="buttons">
        {@render heading('Buttons')}
        {@render note('Primary, the main action, 52 high. One per screen')}
        <Button variant="primary" size="lg" full onclick={() => toast('Added 720 kcal')}>Add 720 kcal</Button>
        {@render note('Neutral, plain and danger, 44 high')}
        <div class="flex flex-wrap gap-2">
          <Button>Search</Button>
          <Button variant="plain">Cancel</Button>
          <Button variant="danger">Delete</Button>
        </div>
        {@render note('Compact, 36 high on screen and 44 to tap, and disabled')}
        <div class="flex flex-wrap gap-2">
          <Button size="sm">Done</Button>
          <Button variant="plain" size="sm">Skip</Button>
          <Button disabled>Save</Button>
        </div>
      </section>

      <section data-section="track">
        {@render heading('Track')}
        {@render note('Below the zone: ink')}
        <Track hero value={1840} {target} {zone} label="1,840 of 2,460 kcal" />
        {@render note('In the zone: lime')}
        <Track hero value={2400} {target} {zone} label="2,400 of 2,460 kcal" />
        {@render note('Past the zone on a lose day: ink again')}
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
          <HeroNumber value={eaten} caption={t.after.ofKcal(num(target))} side={side.side} sideCaption={side.cap} reached={!side.cap} />
          <div class="mt-4"><Track hero value={eaten} {target} {zone} label="{num(eaten)} {t.after.ofKcal(num(target))}" /></div>
        </Card>
        <div class="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onclick={() => (eaten += 250)}>Add 250 kcal</Button>
          <Button variant="plain" size="sm" onclick={() => (eaten = 1840)}>Reset</Button>
        </div>
      </section>

      <section data-section="rows">
        {@render heading('Card and rows')}
        <Card list>
          <Row title="Push day" caption={t.today.session('Strength', '60', '240')}>
            {#snippet leading()}{@render tile(TrainIcon)}{/snippet}
            {#snippet trailing()}<Button size="sm">{t.today.done}</Button>{/snippet}
          </Row>
        </Card>
        {@render note('Tappable rows, photo or a tile for how the meal was logged')}
        <Card list>
          {#each MEALS.slice(0, 2) as m (m.name)}
            <Row title={m.name} value={num(m.kcal)} onclick={() => (sheetOpen = true)}>
              {#snippet leading()}<img src={m.photo} alt="" class="size-full object-cover" />{/snippet}
              {#snippet caption()}{m.time}, <SourceLabel source={m.source} />{/snippet}
            </Row>
          {/each}
          <Row title="Quick add" value="350" onclick={() => (sheetOpen = true)}>
            {#snippet leading()}{@render tile(Hash)}{/snippet}
            {#snippet caption()}15:30, <SourceLabel source="estimate" />{/snippet}
          </Row>
          <Row title="Greek yoghurt" value="146" onclick={() => (sheetOpen = true)}>
            {#snippet leading()}{@render tile(Search)}{/snippet}
            {#snippet caption()}16:10, <SourceLabel source="database" />{/snippet}
          </Row>
        </Card>
      </section>

      <section data-section="chips">
        {@render heading('Chips and stepper')}
        <div class="flex flex-wrap gap-x-2" role="group" aria-label="Portion">
          {#each PORTIONS as p (p)}
            <Chip selected={portion === p} onclick={() => (portion = p)}>{p}</Chip>
          {/each}
        </div>
        <div class="mt-3"><Stepper bind:value={grams} step={10} min={0} max={2000} unit="g" label="grams" /></div>
      </section>

      <section data-section="sheets">
        {@render heading('Sheet and keypad')}
        <div class="flex flex-wrap gap-2">
          <Button onclick={() => (sheetOpen = true)}>Open a sheet</Button>
          <Button onclick={quickAdd}>Open the keypad</Button>
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
          <div class="flex items-end justify-between">
            <div><Skeleton class="h-16 w-40 rounded-sm" /><Skeleton class="mt-1 h-4.5 w-24 rounded-xs" /></div>
            <Skeleton class="h-11 w-16 rounded-sm" />
          </div>
          <Skeleton class="mt-4 h-3.5 rounded-full" />
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
<KeypadSheet />
