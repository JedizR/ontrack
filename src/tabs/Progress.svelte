<!-- SCREENS.md section 9, Progress: the range, then weight (the trend, the chart, the rate against the target, Log
     weight), maintenance once measured, intake by week with protein, the last four weeks' consistency, training in the
     range, check-ins (this week's first when it is ready), and History. -->
<script lang="ts">
  import { t } from '$lib/i18n';
  import Figure from '$lib/components/Figure.svelte';
  import Count from '$lib/components/Count.svelte';
  import Card from '$lib/components/Card.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import Button from '$lib/components/Button.svelte';
  import Row from '$lib/components/Row.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Track from '$lib/components/Track.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import TrendChart from '$lib/components/TrendChart.svelte';
  import WeekBars from '$lib/components/WeekBars.svelte';
  import { db } from '$lib/db/store.svelte';
  import { view } from '$lib/view.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { prefs } from '$lib/prefs.svelte';
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
  const hasProgram = $derived(!!db.get('program', 'program')?.sessions.length);

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

  // the training card (PRD F20): the weeks cover exactly the days in view, so a week's average divides by those days,
  // a short first week counting as a whole one
  const training = $derived.by(() => {
    const sum = (k: 'planned' | 'done' | 'strength' | 'cardioMinutes') => weeks.reduce((a, w) => a + w.training[k], 0);
    const per = U.daysPerWeek / Math.max(span + 1, U.daysPerWeek);
    // rounded as shown, so the words and the track agree on whether the target is reached
    return { planned: sum('planned'), done: sum('done'), strength: Math.round(sum('strength') * per * 10) / 10, cardio: Math.round(sum('cardioMinutes') * per) };
  });
  const sessionBars = $derived(weeks.map(({ training: k }) => ({ avg: k.done, target: k.planned, reached: k.planned > 0 && k.done >= k.planned })));

  const checkins = $derived(db.live('checkin').map((r) => r.data).sort((a, b) => b.date.localeCompare(a.date)));
  const due = $derived(!!profile && checkinDueOn(plans, profile.checkinWeekday, today) && !checkins.some((c) => c.date === today));
  function outcome(c: Checkin) {
    const { reason, kcalChange } = c.proposal;
    if (c.decision === 'accepted') return kcalChange > 0 ? t.progress.raised(num(kcalChange)) : t.progress.lowered(num(-kcalChange));
    return reason === 'raise' || reason === 'lower' ? t.progress.kept : t.progress.outcome[reason];
  }
  let history = $state(false);
</script>

{#snippet meter(title: string, line: string | string[], value: number, target: number, zone: [number, number], testid: string)}
  {@const facts = [line].flat()}
  <div data-testid={testid}>
    <p class="text-body font-semibold">{title}</p>
    <p class="text-caption text-ink-2"><Facts {facts} /></p>
    <div class="mt-2"><Track grow {value} {target} {zone} label="{title}. {facts.join(', ')}" /></div>
  </div>
{/snippet}

<section aria-label={t.tabs.progress} data-testid="tab-progress" class="flex flex-col gap-4 pt-1">
  {#if !acct || !plan || !profile}
    <p class="text-ink-2" data-testid="no-plan">{t.today.noPlan}</p>
  {:else}
    <Segmented bind:value={range} options={RANGES} label={t.progress.range} />

    <!-- the screen's hero (OneFin's stats cards): the trend and its rate on the one haze panel, the chart on solid white -->
    <Card hero aria-label={t.progress.weight} data-testid="progress-weight">
      <!-- U1b: 24 inside the 40 corners, so the eyebrow clears the curve (the owner, feedback 5) -->
      <div class="haze rounded-sheet p-6">
        <p class="text-eyebrow text-ink-2">{t.progress.weight}</p>
        <!-- a trend needs two weigh-ins in view; with fewer, the card is its empty state -->
        {#if trendNow != null && points.length > 1}
          <!-- always one decimal: a trend of 60.0 is a measurement, and the lighter tenth keeps 72.4 from reading as 724 -->
          <!-- U1c: the figures count up on arrival; the trend from where the chart starts, so the change itself moves -->
          <p class="text-display mt-2" data-testid="progress-trend"><Count value={inUnit(trendNow)} from={points[0].trend} format={(v) => v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}>{#snippet children(text)}<Figure {text} />{/snippet}</Count></p>
          <p class="text-caption text-ink-2 mt-1">{metric ? t.after.kg : t.after.lb} {t.after.trend}</p>
        {/if}
        <p class="mt-3 {rate != null ? 'text-callout' : 'text-body text-ink-2'}" data-testid="progress-rate">
          {#if rate != null}<Facts facts={[t.progress.rate(num(rate, 1)), t.progress.target(num(targetRate, 1))]} rest="text-ink-2" />{:else}{t.progress.needWeighIns(num(V.minWeighIns), num(V.minSpanDays / U.daysPerWeek))}{/if}
        </p>
      </div>
      <div class="px-4 pt-4 pb-4">
        {#if trendNow != null && points.length > 1}
          <!-- U2: a new range draws its line again, as on arrival -->
          {#key range}<TrendChart {points} {span} {band} from={shortDate(from)} to={shortDate(today)} label={t.progress.chart(shortDate(from), shortDate(today), num(inUnit(trendNow), 1))} />{/key}
        {/if}
        <Button class="mt-4 first:mt-0" onclick={() => weighIn(today)} data-testid="progress-log-weight">{t.progress.logWeight}</Button>
      </div>
    </Card>

    {#if measured != null}
      <Card aria-label={t.progress.maintenance} data-testid="progress-maintenance">
        <p class="text-eyebrow text-ink-2">{t.progress.maintenance}</p>
        <div class="mt-2 flex flex-wrap gap-x-10 gap-y-4">
          <div>
            <p class="text-display" data-testid="progress-measured"><Count value={roundTarget(measured)} from={0} /></p>
            <p class="text-caption text-ink-2 mt-1">{t.after.measured}</p>
          </div>
          <div>
            <p class="text-display text-ink-2" data-testid="progress-formula"><Count value={roundTarget(formula)} from={0} /></p>
            <p class="text-caption text-ink-2 mt-1">{t.after.formula}</p>
          </div>
        </div>
        <p class="text-callout text-ink-2 mt-3">{t.progress.measured(num(V.rateWindowDays / U.daysPerWeek))}</p>
      </Card>
    {/if}

    <Card aria-label={t.progress.intake} data-testid="progress-intake">
      <p class="text-eyebrow text-ink-2">{t.progress.intake}</p>
      {#if complete.length}
        <p class="text-display mt-2" data-testid="progress-intake-avg"><Count value={mean(complete.map((d) => d.intake))} from={0} /></p>
        <p class="text-caption text-ink-2 mt-1">{t.after.kcalWeekAvg}</p>
        <div class="mt-4">
          {#key range}<WeekBars weeks={bars} from={shortDate(weeks[0].start)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />{/key}
        </div>
        <p class="text-caption text-ink-2 mt-2">{t.progress.intakeLine}</p>
        <p class="text-callout mt-3" data-testid="progress-protein"><Facts facts={[t.progress.protein(num(Math.round(mean(complete.map((d) => d.protein))))), t.progress.proteinTarget(num(plan.proteinG))]} rest="text-ink-2" /></p>
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

    <Card aria-label={t.progress.training} data-testid="progress-training">
      <p class="text-eyebrow text-ink-2">{t.progress.training}</p>
      {#if training.planned}
        <p class="text-display mt-2" data-testid="progress-sessions-done"><Count value={training.done} from={0} /></p>
        <p class="text-caption text-ink-2 mt-1">{t.after.ofPlanned(num(training.planned))}</p>
        <div class="mt-4">
          {#key range}<WeekBars weeks={sessionBars} from={shortDate(weeks[0].start)} to={shortDate(today)} label={t.progress.sessionBars(num(weeks.length))} />{/key}
        </div>
        <p class="text-caption text-ink-2 mt-2">{t.progress.sessionsLine}</p>
        <div class="border-line mt-4 flex flex-col gap-4 border-t pt-4">
          {@render meter(t.progress.strength, [t.progress.strengthLine(num(training.strength, 1)), t.progress.target(num(V.strengthSessions))], training.strength, V.strengthSessions, [V.strengthSessions, Infinity], 'progress-strength')}
          {@render meter(t.progress.cardio, t.progress.cardioLine(num(training.cardio), num(V.aerobicMinutes.min), num(V.aerobicMinutes.max)), training.cardio, V.aerobicMinutes.max, [V.aerobicMinutes.min, V.aerobicMinutes.max], 'progress-cardio')}
        </div>
      {:else}
        <!-- with a program whose first session is still to come there is nothing to plan, only to wait for -->
        <div class="mt-2">
          {#if hasProgram}<EmptyState text={t.progress.trainingSoon} />
          {:else}<EmptyState text={t.progress.trainingNone} action={t.progress.planWeek} onaction={() => { prefs.tab = 1; scrollTo({ top: 0 }); }} />{/if}
        </div>
      {/if}
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
