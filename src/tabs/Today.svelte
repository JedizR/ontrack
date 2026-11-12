<!-- SCREENS.md section 6, Today: the week strip, the hero with the track and macros, at most one card, the training
     card, and the day's meals, newest first. A past day picked in the strip shows the same view. -->
<script lang="ts">
  import type { Component } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import Search from '@lucide/svelte/icons/search';
  import Hash from '@lucide/svelte/icons/hash';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import Camera from '@lucide/svelte/icons/camera';
  import TextIcon from '@lucide/svelte/icons/text';
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
  import { sync } from '$lib/sync/engine.svelte';
  import { session } from '$lib/session.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { clearSessionLog, deleteMeal, logSession, undoToast } from '$lib/actions';
  import { dayView, mealSource, planFor, weighInDue, totals } from '$lib/model/day';
  import { daysBetween, lastWeek, timeOf } from '$lib/model/dates';
  import { proteinBand, roundTarget, sessionKcal } from '$lib/model/engine';
  import { num } from '$lib/model/format';
  // the weigh-in flow loads on first use: it brings the onboarding limits with it
  const weighIn = (date: string) => import('../flows/log/weigh').then((m) => m.weighIn(date));
  import type { Meal, Session } from '../../shared/records';

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
  const meals = $derived([...(byDate.get(view.date) ?? [])].sort((a, b) => b.data.at.localeCompare(a.data.at)));

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

  // at most one card (section 6); in M5 that is the weigh-in prompt, on today only
  const weights = $derived(db.live('weight').map((r) => r.data.date));
  const lastWeigh = $derived(weights.filter((d) => d <= view.today).sort().at(-1));
  const weighCard = $derived(!view.past && !!profile && weighInDue(weights, view.today));

  const ICON: Record<Meal['method'], Component<{ size?: number; strokeWidth?: number }>> = { photo: Camera, text: TextIcon, search: Search, quick: Hash, saved: Bookmark };
  const titleOf = (m: Meal) => m.title || m.items[0]?.name || t.source.manual;

  function remove(id: string) {
    undoToast(t.toast.mealDeleted, deleteMeal(id));
  }
  const kindOf = (s: Session) => t.train.types[s.type];
</script>

<section aria-label={t.tabs.today} data-testid="tab-today" class="flex flex-col gap-3 pt-2">
  {#if sync.status === 'auth'}
    <!-- SCREENS.md section 12, session expired: local data is untouched -->
    <Card data-testid="session-expired">
      <p class="text-body font-semibold">{t.session.expired}</p>
      <p class="text-callout text-ink-2 mt-1">
        {session.wrongAccount && prefs.lastEmail ? t.session.wrongAccount(prefs.lastEmail) : t.session.expiredLead}
      </p>
      <Button variant="neutral" class="mt-3" onclick={() => (sheets.signin = true)} data-testid="session-signin">{t.shell.signIn}</Button>
    </Card>
  {/if}

  {#if bringing}
    <div class="flex flex-col gap-3" data-testid="bringing" aria-busy="true">
      <p class="text-callout text-ink-2">{t.session.bringing}</p>
      <Skeleton class="h-56 rounded-xl" />
      <Skeleton class="h-24 rounded-lg" />
      <Skeleton class="h-40 rounded-lg" />
    </div>
  {:else if !day}
    <p class="text-ink-2" data-testid="no-plan">{t.today.noPlan}</p>
  {:else}
    <div class="mb-1"><WeekStrip days={week} today={view.today} selected={view.date} onselect={(d) => (view.date = d)} /></div>
    {#if view.past}
      <div><Chip onclick={() => (view.date = view.today)}>{t.today.backToToday}</Chip></div>
    {/if}

    <Card hero aria-label={t.today.calories} data-testid="hero">
      <!-- the whole card opens How it is calculated; it holds no other control -->
      <button type="button" class="block w-full text-left transition-transform duration-[var(--d-press)] active:scale-[0.98]" aria-describedby="hero-how" aria-haspopup="dialog" onclick={() => (sheets.how = true)} data-testid="hero-open">
        <HeroNumber value={Math.round(day.eaten.kcal)} caption={t.after.ofKcal(num(day.target))} side={side.side} sideCaption={side.cap} reached={!side.cap} />
        <div class="mt-4 mb-2"><Track hero value={day.eaten.kcal} target={day.target} zone={day.zone} label="{num(Math.round(day.eaten.kcal))} {t.after.ofKcal(num(day.target))}" /></div>
        <div class="text-caption text-ink-2 flex justify-between gap-4">
          <span data-testid="day-kind">{day.training ? t.today.trainingDay : t.today.restDay}</span>
          <span>{t.today.onTrackFrom(num(roundTarget(day.zone[0])))}</span>
        </div>

        <div class="border-line mt-5 grid grid-cols-3 gap-4 border-t pt-4">
          {#each macros as m (m.key)}
            <div class="min-w-0" data-testid="macro-{m.key}">
              <div class="text-caption text-ink-2">{m.label}</div>
              <div class="text-body num font-semibold">{num(Math.round(m.value))}</div>
              <div class="text-caption text-ink-2 whitespace-nowrap">{t.after.ofGrams(num(m.target))}</div>
              <div class="mt-2"><Track value={m.value} target={m.target} zone={m.zone} label="{m.label} {num(Math.round(m.value))} {t.after.ofGrams(num(m.target))}" /></div>
            </div>
          {/each}
        </div>
      </button>
      <span id="hero-how" hidden>{t.today.how}</span>
    </Card>

    {#if weighCard}
      <Card data-testid="weigh-card">
        <p class="text-body font-semibold">{t.weigh.promptTitle}</p>
        <p class="text-callout text-ink-2 mt-1">{lastWeigh ? t.weigh.promptLast(num(daysBetween(lastWeigh, view.today))) : t.weigh.promptNone}</p>
        <Button class="mt-3" onclick={() => weighIn(view.today)} data-testid="weigh-open">{t.weigh.action}</Button>
      </Card>
    {/if}

    <Card list aria-label={t.today.training} data-testid="training">
      {#each day.sessions as { session: s, status } (s.key)}
        <Row title={s.name} caption={status === 'done' ? t.today.doneLine(kindOf(s), num(s.minutes)) : status === 'skipped' ? t.today.skippedLine : t.today.session(kindOf(s), num(s.minutes), num(Math.round(sessionKcal(s, day.plan.weightKg))))} testid="session-{s.key}">
          {#snippet leading()}<div class="bg-surface-2 grid size-full place-items-center"><TrainIcon /></div>{/snippet}
          {#snippet trailing()}
            {#if status}
              {#if status === 'done'}<Check size={24} strokeWidth={1.75} aria-hidden="true" />{/if}
              <Button variant="plain" size="sm" onclick={() => clearSessionLog(view.date, s.key)} data-testid="session-undo">{t.today.undo}</Button>
            {:else}
              <Button size="sm" onclick={() => logSession({ date: view.date, sessionKey: s.key, status: 'done' })} data-testid="session-done">{t.today.done}</Button>
              <button type="button" class="text-ink-2 active:bg-surface-2 -mr-3 grid size-11 flex-none place-items-center rounded-full transition-colors duration-[var(--d-press)]" aria-label={t.today.more(s.name)} onclick={() => (sheets.session = { date: view.date, key: s.key, name: s.name })} data-testid="session-more">
                <Ellipsis size={24} strokeWidth={1.75} />
              </button>
            {/if}
          {/snippet}
        </Row>
      {:else}
        <Row title={sessions.length ? t.today.restDay : t.today.noProgram}>
          {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><TrainIcon /></div>{/snippet}
        </Row>
      {/each}
    </Card>

    <div class="mx-1 mt-2 flex items-baseline justify-between">
      <h2 class="text-heading">{t.today.meals}</h2>
      {#if meals.length}<span class="text-caption text-ink-2" data-testid="meal-count">{t.today.logged(num(meals.length))}</span>{/if}
    </div>
    <Card list aria-label={t.today.meals} data-testid="meals">
      {#each meals as { id, data: m } (id)}
        {@const Icon = ICON[m.method]}
        <SwipeRow ondelete={() => remove(id)} testid="meal">
          <Row title={titleOf(m)} value={num(Math.round(totals(m.items).kcal))} onclick={() => (sheets.meal = id)}>
            {#snippet leading()}<div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Icon size={24} strokeWidth={1.75} /></div>{/snippet}
            {#snippet caption()}{timeOf(m.at)}, <SourceLabel source={mealSource(m.items)} />{/snippet}
          </Row>
        </SwipeRow>
      {:else}
        <p class="text-body text-ink-2 py-4" data-testid="meals-empty">{allMeals.length ? t.today.noMeals : t.today.firstMeal}</p>
      {/each}
    </Card>
  {/if}
</section>
