<!-- SCREENS.md section 6, Today: the week strip, the hero with the track and macros, at most one card, the training
     card, and the day's meals, newest first. Supplements with calories are rows; those with none are chips under "Taken"
     (N2). A past day picked in the strip shows the same view. -->
<script lang="ts" module>
  // the cards fade up once, on the first paint of a session (DESIGN.md section 10)
  let first = true;
</script>

<script lang="ts">
  import { onMount, type Component } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Search from '@lucide/svelte/icons/search';
  import Hash from '@lucide/svelte/icons/hash';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import Camera from '@lucide/svelte/icons/camera';
  import TextIcon from '@lucide/svelte/icons/text';
  import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
  import { t } from '$lib/i18n';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Chip from '$lib/components/Chip.svelte';
  import Row from '$lib/components/Row.svelte';
  import SwipeRow from '$lib/components/SwipeRow.svelte';
  import Track from '$lib/components/Track.svelte';
  import HeroNumber from '$lib/components/HeroNumber.svelte';
  import WeekStrip from '$lib/components/WeekStrip.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import ShakerIcon from '$lib/components/ShakerIcon.svelte';
  import Thumb from '../flows/log/Thumb.svelte';
  import { sync } from '$lib/sync/engine.svelte';
  import { session } from '$lib/session.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { clearSessionLog, deleteMeal, logSession, undoToast } from '$lib/actions';
  import { dayView, mealSource, planFor, weighInDue, totals } from '$lib/model/day';
  import { checkinDueOn } from '$lib/model/progress';
  import { daysBetween, lastWeek, timeOf } from '$lib/model/dates';
  import { proteinBand, roundTarget, sessionKcal } from '$lib/model/engine';
  import { num } from '$lib/model/format';
  // the weigh-in flow loads on first use: it brings the onboarding limits with it
  const weighIn = (date: string) => import('../flows/log/weigh').then((m) => m.weighIn(date));
  import { ids, type Meal, type Session } from '../../shared/records';

  // a new device after sign in: nothing local yet, the first pull is on its way
  const bringing = $derived(!!session.user && !sync.pulled && sync.status === 'syncing');

  const profile = $derived(db.get('profile', 'profile'));
  const plans = $derived(db.live('plan'));
  const sessions = $derived(db.get('program', 'program')?.sessions ?? []);
  const logs = $derived(db.live('slog').map((r) => r.data));
  const allMeals = $derived(db.live('meal'));
  const byDate = $derived.by(() => {
    const m = new Map<string, { id: string; data: Meal }[]>();
    for (const r of allMeals) m.set(r.data.date, [...(m.get(r.data.date) ?? []), r]);
    return m;
  });
  const viewOf = (date: string) => {
    const plan = planFor(plans, date);
    if (!plan || !profile) return null;
    return { plan, ...dayView({ plan, sex: profile.sex, mode: profile.calorieMode, date, sessions, logs, meals: (byDate.get(date) ?? []).map((r) => r.data) }) };
  };

  const day = $derived(viewOf(view.date));
  const week = $derived(lastWeek(view.today).map((date) => ({ date, onTrack: !!byDate.get(date)?.length && viewOf(date)?.status === 'on' })));
  const logged = $derived([...(byDate.get(view.date) ?? [])].sort((a, b) => b.data.at.localeCompare(a.data.at)));
  // a supplement with no calories is not a meal row: it shows as taken (F21)
  const isTaken = (m: Meal) => m.method === 'supplement' && totals(m.items).kcal === 0;
  const meals = $derived(logged.filter((r) => !isTaken(r.data)));
  const taken = $derived(logged.filter((r) => isTaken(r.data)).reverse());

  // the counterpart (section 6): to go or left until the zone, then On track, past it the amount over in plain ink
  const side = $derived.by(() => {
    if (!day) return { side: '' };
    const { kcal } = day.eaten;
    if (kcal > day.zone[1]) return { side: num(Math.round(kcal - day.target)), cap: t.after.over };
    if (kcal >= day.zone[0]) return { side: t.today.onTrack };
    return { side: num(Math.round(day.target - kcal)), cap: day.plan.goal === 'gain' ? t.after.toGo : t.after.left };
  });
  const macros = $derived(
    day
      ? [
          { key: 'protein', label: t.today.protein, value: day.eaten.protein, target: day.macros.proteinG, zone: proteinBand(day.macros.proteinG) },
          { key: 'carbs', label: t.today.carbs, value: day.eaten.carbs, target: day.macros.carbsG, zone: undefined },
          { key: 'fat', label: t.today.fat, value: day.eaten.fat, target: day.macros.fatG, zone: undefined },
        ]
      : [],
  );

  // at most one card (section 6), on today only: the weekly check-in first, then the weigh-in prompt
  const checkinCard = $derived(!view.past && !!profile && checkinDueOn(plans, profile.checkinWeekday, view.today) && !db.get('checkin', ids.checkin(view.today)));
  const weights = $derived(db.live('weight').map((r) => r.data.date));
  const lastWeigh = $derived(weights.filter((d) => d <= view.today).sort().at(-1));
  const weighCard = $derived(!view.past && !checkinCard && !!profile && weighInDue(weights, view.today));
  // O1: the first two days on the phone that saved the plan, until a meal is logged and the next weigh-in is in
  const startDay = $derived(prefs.firstDay);
  const mealDone = $derived(allMeals.length > 0);
  const weighDone = $derived(!!startDay && weights.some((d) => d > startDay));
  const firstCard = $derived(!view.past && !!startDay && daysBetween(startDay, view.today) <= 1 && !(mealDone && weighDone));

  const ICON: Record<Meal['method'], Component<{ size?: number; strokeWidth?: number }>> = { photo: Camera, text: TextIcon, search: Search, quick: Hash, saved: Bookmark, supplement: ShakerIcon, barcode: ScanBarcode };
  const titleOf = (m: Meal) => m.title || m.items[0]?.name || t.source.manual;

  function remove(id: string, m: Meal) {
    undoToast(m.method === 'supplement' ? t.supplement.deleted(titleOf(m)) : t.toast.mealDeleted, deleteMeal(id));
  }
  /** A supplement entry opens its amount step to edit, while the supplement is still set up; anything else the Meal sheet. */
  function openMeal(id: string, m: Meal) {
    if (bySupplement(m)) sheets.supplement = { id: m.items[0].supplementId!, meal: id };
    else sheets.meal = id;
  }
  const amountOf = (m: Meal) => t.supplement.amount(num(m.items[0]?.scoops ?? 1, 1), m.items.length > 1);
  /** an entry edits in its amount step, so its scoops stay true; once its supplement is gone it edits as a meal */
  const bySupplement = (m: Meal) => m.method === 'supplement' && !!m.items[0]?.supplementId && !!db.get('supplement', m.items[0].supplementId);
  const kindOf = (s: Session) => t.train.types[s.type];
  // the line under a session: its type only when the name says something else
  const lineOf = (s: Session, status: string | undefined) => {
    const same = s.name === kindOf(s);
    if (status === 'skipped') return t.today.skippedLine;
    if (status === 'done') return same ? t.today.doneShort(num(s.minutes)) : t.today.doneLine(kindOf(s), num(s.minutes));
    const kcal = num(Math.round(sessionKcal(s, day!.plan.weightKg)));
    return same ? t.today.sessionShort(num(s.minutes), kcal) : t.today.session(kindOf(s), num(s.minutes), kcal);
  };
  const animate = first;
  onMount(() => { first = false; });
  /** the appear effect for the nth card, on the first paint only */
  const rise = (i: number) => (animate ? { class: 'appear', style: `--i: ${i}` } : {});
</script>

{#snippet step(label: string, done: boolean, onclick?: () => void, testid?: string)}
  {@const mark = done ? 'bg-ink text-canvas' : 'ring-ink-3 ring-2 ring-inset'}
  <li>
    {#if onclick && !done}
      <button type="button" class="active:bg-surface-2 -mx-6 flex min-h-11 w-[calc(100%+var(--inset)*2)] items-center gap-3 px-6 py-2 text-left transition-colors duration-[var(--d-press)]" {onclick} data-testid={testid}>
        <span class="size-6 flex-none rounded-full {mark}" aria-hidden="true"></span>
        <span class="text-body text-accent-ink flex-1 font-semibold">{label}</span>
        <ChevronRight class="text-ink-2 flex-none" size={20} strokeWidth={2} aria-hidden="true" />
      </button>
    {:else}
      <div class="flex min-h-11 items-center gap-3 py-2" aria-label={done ? t.firstDay.done(label) : undefined} data-testid={testid}>
        <span class="grid size-6 flex-none place-items-center rounded-full {mark}" aria-hidden="true">{#if done}<Check size={16} strokeWidth={3} />{/if}</span>
        <span class="text-body flex-1 {done ? 'text-ink-2' : ''}">{label}</span>
      </div>
    {/if}
  </li>
{/snippet}

<section aria-label={t.tabs.today} data-testid="tab-today" class="flex flex-col gap-4 pt-1">
  {#if sync.status === 'auth'}
    <!-- SCREENS.md section 12, session expired: local data is untouched -->
    <Card data-testid="session-expired">
      <p class="text-body font-semibold">{t.session.expired}</p>
      <p class="text-callout text-ink-2 mt-1">
        {session.wrongAccount && prefs.lastEmail ? t.session.wrongAccount(prefs.lastEmail) : t.session.expiredLead}
      </p>
      <Button variant="primary" class="mt-4" onclick={() => (sheets.signin = true)} data-testid="session-signin">{t.shell.signIn}</Button>
    </Card>
  {/if}

  {#if bringing}
    <div class="flex flex-col gap-4" data-testid="bringing" aria-busy="true">
      <p class="text-callout text-ink-2">{t.session.bringing}</p>
      <Skeleton class="h-16 rounded-md" />
      <Skeleton class="h-76 rounded-xl" />
      <Skeleton class="h-19 rounded-lg" />
      <Skeleton class="h-40 rounded-lg" />
    </div>
  {:else if !day}
    <p class="text-ink-2" data-testid="no-plan">{t.today.noPlan}</p>
  {:else}
    <div {...rise(0)}><WeekStrip days={week} today={view.today} selected={view.date} onselect={(d) => (view.date = d)} /></div>
    {#if view.past}
      <div class="-my-2"><Chip onclick={() => (view.date = view.today)}>{t.today.backToToday}</Chip></div>
    {/if}

    <Card hero aria-label={t.today.calories} data-testid="hero" {...rise(1)}>
      <!-- the whole card opens How it is calculated; it holds no other control. OneFin's "Withdraw" card: the number on
           the screen's one haze panel with a glass chip for the day, then grey stat tiles for the macros -->
      <button type="button" class="block w-full text-left transition-transform duration-[var(--d-press)] active:scale-[0.98]" aria-describedby="hero-how" aria-haspopup="dialog" onclick={() => (sheets.how = true)} data-testid="hero-open">
        <div class="haze rounded-sheet p-4">
          <HeroNumber value={Math.round(day.eaten.kcal)} caption={t.after.ofKcal(num(day.target))} side={side.side} sideCaption={side.cap} reached={!side.cap} />
          <div class="mt-4"><Track hero value={day.eaten.kcal} target={day.target} zone={day.zone} label="{num(Math.round(day.eaten.kcal))} {t.after.ofKcal(num(day.target))}" /></div>
          <div class="text-caption text-ink-2 mt-3 flex items-center justify-between gap-4">
            <span class="glass text-ink rounded-full px-2.5 py-0.5 font-semibold whitespace-nowrap" data-testid="day-kind">{day.training ? t.today.trainingDay : t.today.restDay}</span>
            <span class="text-right">{t.today.onTrackFrom(num(roundTarget(day.zone[0])))}</span>
          </div>
        </div>

        <div class="mt-2 grid grid-cols-3 gap-2">
          {#each macros as m (m.key)}
            <!-- the track sits at the bottom of each tile, so the three stay level when a value wraps at large text -->
            <div class="bg-surface-2 flex min-w-0 flex-col rounded-md px-4 pt-3 pb-4" data-testid="macro-{m.key}">
              <div class="text-caption text-ink-2">{m.label}</div>
              <div class="text-body num font-semibold">{num(Math.round(m.value))}{' '}<span class="text-caption text-ink-2 block font-medium whitespace-nowrap">{t.after.ofGrams(num(m.target))}</span></div>
              <div class="mt-auto pt-2"><Track value={m.value} target={m.target} zone={m.zone} label="{m.label} {num(Math.round(m.value))} {t.after.ofGrams(num(m.target))}" /></div>
            </div>
          {/each}
        </div>
      </button>
      <span id="hero-how" hidden>{t.today.how}</span>
    </Card>

    {#if checkinCard}
      <Card data-testid="checkin-card" {...rise(2)}>
        <div class="flex items-center gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-body font-semibold">{t.checkin.cardTitle}</p>
            <p class="text-callout text-ink-2 mt-0.5">{t.checkin.cardLine}</p>
          </div>
          <Button size="sm" onclick={() => (sheets.checkin = view.today)} data-testid="checkin-open">{t.checkin.open}</Button>
        </div>
      </Card>
    {:else if weighCard}
      <Card data-testid="weigh-card" {...rise(2)}>
        <div class="flex items-center gap-3">
          <div class="min-w-0 flex-1">
            <p class="text-body font-semibold">{t.weigh.promptTitle}</p>
            <p class="text-callout text-ink-2 mt-0.5">{lastWeigh ? t.weigh.promptLast(num(daysBetween(lastWeigh, view.today))) : t.weigh.promptNone}</p>
          </div>
          <Button size="sm" onclick={() => weighIn(view.today)} data-testid="weigh-open">{t.weigh.action}</Button>
        </div>
      </Card>
    {:else if firstCard}
      <!-- SCREENS.md section 4, after onboarding: a true head start (the plan is saved), then the two first habits -->
      {@const tomorrow = view.today === startDay}
      <Card data-testid="first-day" {...rise(2)}>
        <h2 class="text-body font-semibold">{t.firstDay.title}</h2>
        <ul class="mt-2 -mb-2 flex flex-col">
          {@render step(t.firstDay.saved, true)}
          {@render step(t.firstDay.meal, mealDone, () => (sheets.add = true), 'first-meal')}
          {@render step(tomorrow ? t.firstDay.weighTomorrow : t.firstDay.weighToday, weighDone, tomorrow ? undefined : () => weighIn(view.today), 'first-weigh')}
        </ul>
      </Card>
    {/if}

    <Card list aria-label={t.today.training} data-testid="training" {...rise(3)}>
      {#each day.sessions as { session: s, status } (s.key)}
        <Row title={s.name} caption={lineOf(s, status)} testid="session-{s.key}" wrap>
          {#snippet leading()}<div class="tile grid size-full place-items-center"><TrainIcon /></div>{/snippet}
          {#snippet trailing()}
            <div class="flex flex-none items-center gap-1">
              {#if status}
                {#if status === 'done'}<Check class="text-success-ink" size={24} strokeWidth={2.5} aria-hidden="true" />{/if}
                <Button variant="plain" size="sm" onclick={() => clearSessionLog(view.date, s.key)} data-testid="session-undo">{t.today.undo}</Button>
              {:else}
                <Button size="sm" onclick={() => logSession({ date: view.date, sessionKey: s.key, status: 'done' })} data-testid="session-done">{t.today.done}</Button>
                <button type="button" class="text-ink-2 active:bg-surface-2 -mr-3 grid size-11 flex-none place-items-center rounded-sm transition-colors duration-[var(--d-press)]" aria-label={t.today.more(s.name)} onclick={() => (sheets.session = { date: view.date, key: s.key, name: s.name })} data-testid="session-more">
                  <Ellipsis size={24} strokeWidth={2} />
                </button>
              {/if}
            </div>
          {/snippet}
        </Row>
      {:else}
        <Row title={(day.plan.sessions ?? sessions).length ? t.today.restDay : t.today.noProgram}>
          {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><TrainIcon /></div>{/snippet}
        </Row>
      {/each}
    </Card>

    <div {...rise(4)}>
      <div class="mt-2 flex items-baseline justify-between">
        <h2 class="text-heading">{t.today.meals}</h2>
        {#if meals.length}<span class="text-caption text-ink-2" data-testid="meal-count">{t.today.logged(num(meals.length))}</span>{/if}
      </div>
    </div>
    {#snippet tile(Icon: Component<{ size?: number; strokeWidth?: number }>)}
      <div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Icon size={24} strokeWidth={2} /></div>
    {/snippet}
    <Card list aria-label={t.today.meals} data-testid="meals" {...rise(5)}>
      {#each meals as { id, data: m } (id)}
        {@const Icon = ICON[m.method]}
        <SwipeRow ondelete={() => remove(id, m)} testid="meal">
          <Row title={titleOf(m)} value={num(Math.round(totals(m.items).kcal))} onclick={() => openMeal(id, m)}>
            {#snippet leading()}
              {#if m.thumb}<Thumb {id} class="size-full">{#snippet fallback()}{@render tile(Icon)}{/snippet}</Thumb>{:else}{@render tile(Icon)}{/if}
            {/snippet}
            {#snippet caption()}{timeOf(m.at)}, {#if bySupplement(m)}{amountOf(m)}{#if m.items[0].source === 'typical'}, <SourceLabel source="typical" />{/if}{:else}<SourceLabel source={mealSource(m.items)} />{/if}{/snippet}
          </Row>
        </SwipeRow>
      {:else}
        <p class="text-body text-ink-2 py-4" data-testid="meals-empty">{allMeals.length ? t.today.noMeals : t.today.firstMeal}</p>
      {/each}
      {#if taken.length}
        <div class="border-line flex flex-wrap items-center gap-x-2 border-t py-2" data-testid="taken">
          <span class="text-caption text-ink-2 mr-1">{t.supplement.taken}</span>
          {#each taken as { id, data: m } (id)}
            <button type="button" class="group inline-grid min-h-[var(--tap)] flex-none place-items-center" aria-label={t.supplement.takenChip(titleOf(m))} onclick={() => openMeal(id, m)} data-testid="taken-chip">
              <span class="text-callout bg-surface-2 group-active:bg-surface-3 inline-flex h-11 items-center gap-1.5 rounded-sm px-3 font-semibold whitespace-nowrap transition-[transform,background-color] duration-[var(--d-press)] group-active:scale-[0.97]">
                <Check size={18} strokeWidth={2.5} aria-hidden="true" />{titleOf(m)}
              </span>
            </button>
          {/each}
        </div>
      {/if}
    </Card>
  {/if}
</section>
