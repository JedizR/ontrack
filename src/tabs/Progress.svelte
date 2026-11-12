<!-- SCREENS.md section 9, Progress: the range, then weight (the trend, the chart, the rate against the target, Log
     weight), maintenance once measured, intake by week with protein, the last four weeks' consistency, check-ins
     (this week's first when it is ready), and History. -->
<script lang="ts">
  import { t } from '$lib/i18n';
  import Figure from '$lib/components/Figure.svelte';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Row from '$lib/components/Row.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import TrendChart from '$lib/components/TrendChart.svelte';
  import WeekBars from '$lib/components/WeekBars.svelte';
  import { db } from '$lib/db/store.svelte';
  import { view } from '$lib/view.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { accountOf, checkinDueOn } from '$lib/model/progress';
  import { baseline, calorieStatus, effectiveRate, roundTarget, weeklyEee, U, V } from '$lib/model/engine';
  import { planFor } from '$lib/model/day';
  import { addDays, dayTitle, daysBetween, shortDate } from '$lib/model/dates';
  import { kgToLb } from '$lib/model/units';
  import { num } from '$lib/model/format';
  import HistorySheet from '../flows/progress/HistorySheet.svelte';
  import type { Checkin } from '../../shared/records';
  // the weigh-in flow loads on first use, as on Today
  const weighIn = (date: string) => import('../flows/log/weigh').then((m) => m.weighIn(date));

  const acct = $derived(accountOf(db));
  const profile = $derived(db.get('profile', 'profile'));
  const plans = $derived(db.live('plan'));
  const today = $derived(view.today);
  const plan = $derived(planFor(plans, today));

  const RANGES = [{ value: 28, label: t.progress.weeks4 }, { value: 91, label: t.progress.months3 }, { value: 0, label: t.progress.all }];
  let range = $state(28);
  // the first day in view: the range's start, or the account's first day when that is later
  const from = $derived.by(() => {
    const first = acct?.first ?? today;
    const start = range ? addDays(today, 1 - range) : first;
    return start > first ? start : first;
  });
  const span = $derived(daysBetween(from, today));

  // today's check-in numbers: the measured rate and maintenance
  const result = $derived(acct?.checkinOn(today) ?? null);
  const metric = $derived(profile?.units !== 'imperial');
  const inUnit = (kg: number) => (metric ? kg : kgToLb(kg));
  const trendNow = $derived(acct?.trendOn(today));
  const points = $derived(
    acct?.points.filter((p) => p.date >= from && p.date <= today).map((p) => ({ day: daysBetween(from, p.date), value: inUnit(p.kg), trend: inUnit(p.trend) })) ?? [],
  );
  const targetRate = $derived(plan && profile ? (plan.goal === 'maintain' ? 0 : effectiveRate(plan, profile.sex) * (plan.goal === 'lose' ? -1 : 1)) : 0);
  // the band: the target rate, give or take the change the check-in still calls on track (SCIENCE.md section 10)
  const band = $derived({ perDay: inUnit(((targetRate / U.percent) * (trendNow ?? 0)) / U.daysPerWeek), tol: inUnit(V.onTrackChange / V.kcalPerKg) });
  const rate = $derived(result?.stats.ratePctPerWeek ?? null);

  const measured = $derived(result?.stats.tdeeObserved ?? null);
  const formula = $derived(plan && profile ? baseline(plan.bmr, profile.neat) + weeklyEee(plan) / U.daysPerWeek : 0);

  const weeks = $derived(acct ? acct.weeks(today, Math.ceil((span + 1) / U.daysPerWeek)) : []);
  const complete = $derived(weeks.flatMap((w) => w.days.filter((d) => d.complete)));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const bars = $derived(
    weeks.map((w) => ({ avg: w.meanIntake, target: w.meanTarget, reached: w.meanIntake != null && !!plan && !!profile && calorieStatus(plan.goal, w.meanIntake, w.meanTarget, profile.sex) === 'on' })),
  );
  const four = $derived(acct ? acct.weeks(today, 4) : []);

  const checkins = $derived(db.live('checkin').map((r) => r.data).sort((a, b) => b.date.localeCompare(a.date)));
  const due = $derived(!!profile && checkinDueOn(plans, profile.checkinWeekday, today) && !checkins.some((c) => c.date === today));
  function outcome(c: Checkin) {
    const { reason, kcalChange } = c.proposal;
    if (c.decision === 'accepted') return kcalChange > 0 ? t.progress.raised(num(kcalChange)) : t.progress.lowered(num(-kcalChange));
    return reason === 'raise' || reason === 'lower' ? t.progress.kept : t.progress.outcome[reason];
  }
  let history = $state(false);
</script>

<section aria-label={t.tabs.progress} data-testid="tab-progress" class="flex flex-col gap-4 pt-1">
  {#if !acct || !plan || !profile}
    <p class="text-ink-2" data-testid="no-plan">{t.today.noPlan}</p>
  {:else}
    <Segmented bind:value={range} options={RANGES} label={t.progress.range} />

    <!-- the screen's hero (OneFin's stats cards): the trend and its rate on the one haze panel, the chart on solid white -->
    <Card hero aria-label={t.progress.weight} data-testid="progress-weight">
      <div class="haze rounded-sheet p-4">
        <p class="text-eyebrow text-ink-2">{t.progress.weight}</p>
        <!-- a trend needs two weigh-ins in view; with fewer, the card is its empty state -->
        {#if trendNow != null && points.length > 1}
          <p class="text-display mt-2" data-testid="progress-trend"><Figure text={num(inUnit(trendNow), 1)} /></p>
          <p class="text-caption text-ink-2 mt-1">{metric ? t.after.kg : t.after.lb} {t.after.trend}</p>
        {/if}
        <p class="mt-3 {rate != null ? 'text-callout' : 'text-body text-ink-2'}" data-testid="progress-rate">
          {rate != null ? t.progress.rate(num(rate, 1), num(targetRate, 1)) : t.progress.needWeighIns(num(V.minWeighIns), num(V.minSpanDays / U.daysPerWeek))}
        </p>
      </div>
      <div class="px-4 pt-4 pb-2">
        {#if trendNow != null && points.length > 1}
          <TrendChart {points} {span} {band} from={shortDate(from)} to={shortDate(today)} label={t.progress.chart(shortDate(from), shortDate(today), num(inUnit(trendNow), 1))} />
        {/if}
        <Button class="mt-4 first:mt-0" onclick={() => weighIn(today)} data-testid="progress-log-weight">{t.progress.logWeight}</Button>
      </div>
    </Card>

    {#if measured != null}
      <Card aria-label={t.progress.maintenance} data-testid="progress-maintenance">
        <p class="text-eyebrow text-ink-2">{t.progress.maintenance}</p>
        <div class="mt-2 flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <p class="text-display" data-testid="progress-measured">{num(roundTarget(measured))}</p>
            <p class="text-caption text-ink-2 mt-1">{t.after.measured}</p>
          </div>
          <div>
            <p class="text-display text-ink-2" data-testid="progress-formula">{num(roundTarget(formula))}</p>
            <p class="text-caption text-ink-2 mt-1">{t.after.formula}</p>
          </div>
        </div>
        <p class="text-callout text-ink-2 mt-3">{t.progress.measured(num(V.rateWindowDays / U.daysPerWeek))}</p>
      </Card>
    {/if}

    <Card aria-label={t.progress.intake} data-testid="progress-intake">
      <p class="text-eyebrow text-ink-2">{t.progress.intake}</p>
      {#if complete.length}
        <p class="text-display mt-2" data-testid="progress-intake-avg">{num(Math.round(mean(complete.map((d) => d.intake))))}</p>
        <p class="text-caption text-ink-2 mt-1">{t.after.kcalWeekAvg}</p>
        <div class="mt-4">
          <WeekBars weeks={bars} from={shortDate(weeks[0].start)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />
        </div>
        <p class="text-caption text-ink-2 mt-2">{t.progress.intakeLine}</p>
        <p class="text-callout mt-3" data-testid="progress-protein">{t.progress.protein(num(Math.round(mean(complete.map((d) => d.protein)))), num(plan.proteinG))}</p>
      {:else}
        <p class="text-body text-ink-2 mt-2">{t.progress.intakeNone}</p>
        <Button class="mt-4" onclick={() => (sheets.add = true)} data-testid="progress-add">{t.shell.add}</Button>
      {/if}
    </Card>

    <Card aria-label={t.progress.consistency} data-testid="progress-consistency">
      <p class="text-eyebrow text-ink-2">{t.progress.consistency}</p>
      <p class="text-caption text-ink-2 mt-1">{t.progress.consistencyLine}</p>
      <div class="mt-4 flex flex-col gap-4">
        {#each four as w, i (w.start)}
          <div role="img" aria-label={t.progress.weekOnTrack(t.progress.weeksAgo[i], num(w.onTrack))} data-testid="consistency-week">
            <div class="text-caption text-ink-2 flex justify-between gap-3" aria-hidden="true">
              <span>{t.progress.weeksAgo[i]}</span><span class="num text-ink font-semibold">{t.progress.ofSeven(num(w.onTrack))}</span>
            </div>
            <div class="mt-2 grid grid-cols-7 justify-items-center" aria-hidden="true">
              {#each w.days as d (d.date)}<i class="size-3 rounded-full {d.onTrack ? 'bg-success-ink' : 'bg-track'}" data-on={d.onTrack || undefined}></i>{/each}
            </div>
          </div>
        {/each}
      </div>
    </Card>

    <h2 class="text-heading mt-2">{t.progress.checkins}</h2>
    <Card list aria-label={t.progress.checkins} data-testid="progress-checkins">
      {#if due}<Row title={t.progress.ready} caption={t.progress.readyLine} onclick={() => (sheets.checkin = today)} testid="checkin-ready" />{/if}
      {#each checkins as c (c.date)}
        <Row title={dayTitle(c.date)} caption={outcome(c)} onclick={() => (sheets.checkin = c.date)} testid="checkin-row" />
      {:else}
        {#if !due}<p class="text-body text-ink-2 py-4">{t.progress.checkinsNone}</p>{/if}
      {/each}
    </Card>

    <Card list aria-label={t.progress.history}>
      <Row title={t.progress.history} caption={t.progress.historyLine} onclick={() => (history = true)} testid="progress-history" />
    </Card>

    <HistorySheet bind:open={history} {acct} />
  {/if}
</section>
