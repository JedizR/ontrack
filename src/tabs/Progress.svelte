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
  import { baseline, calorieStatus, effectiveRate, proteinBand, roundTarget, weeklyEee, U, V } from '$lib/model/engine';
  import { totals } from '$lib/model/workout';
  import DayChart from '$lib/components/DayChart.svelte';
  import AskSheet from '../flows/progress/AskSheet.svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import { planFor } from '$lib/model/day';
  import { addDays, dayTitle, daysBetween, shortDate } from '$lib/model/dates';
  import { kgToLb, lbToKg, weightText } from '$lib/model/units';
  import { reducedMotion } from '$lib/haptics';
  import Check from '@lucide/svelte/icons/check';
  import Disclosure from '$lib/components/Disclosure.svelte';
  import Dumbbell from '@lucide/svelte/icons/dumbbell';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { guardrails } from '$lib/model/engine';
  import { picker } from '$lib/picker.svelte';
  import { setGoalWeight } from '$lib/actions';
  import { LIBRARY } from '$lib/data/exercises';
  import { LIMITS, weightWheel } from '../flows/onboarding/draft';
  import { num } from '$lib/model/format';
  import HistorySheet from '../flows/progress/HistorySheet.svelte';
  import CoachCard from '$lib/components/CoachCard.svelte';
  import { weekFacts } from '$lib/model/coach';
  import type { CoachRequest } from '../../shared/coach';
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
  // R1, Cal AI's weight changes, as one line: what the trend moved over the last 7 and 30 days, when it has data that far back
  const changes = $derived(
    [7, 30].flatMap((days) => {
      const was = acct?.trendOn(addDays(today, -days));
      if (trendNow == null || was == null || !Number.isFinite(was)) return [];
      const d = Math.round((inUnit(trendNow) - inUnit(was)) * 10) / 10;
      return [t.progress.change(num(days), `${d > 0 ? '+' : ''}${num(d, 1)}`, metric ? t.after.kg : t.after.lb)];
    }),
  );

  // R1: the goal weight, its own card: how far from the first weigh-in to the goal, and how much is left
  const goalKg = $derived(plan?.goalWeightKg);
  const startKg = $derived(acct?.points[0]?.kg);
  const goalFrac = $derived.by(() => {
    if (!goalKg || startKg == null || trendNow == null) return null;
    const total = Math.abs(goalKg - startKg);
    if (total < 0.2) return null;
    const done = goalKg > startKg ? trendNow - startKg : startKg - trendNow;
    return { done: Math.min(total, Math.max(0, done)), total };
  });
  const goalLine = $derived.by(() => {
    if (!goalKg || trendNow == null || !plan || plan.goal === 'maintain') return goalKg ? '' : t.plan.goalWeightHint;
    const left = plan.goal === 'lose' ? trendNow - goalKg : goalKg - trendNow;
    if (left <= 0) return t.progress.goalReached;
    return t.plan.toGo(weightText(left, profile?.units ?? 'metric'));
  });
  const round1 = (x: number) => Math.round(x * 10) / 10;
  async function askGoal() {
    if (!plan || !profile) return;
    const minKg = Math.max(guardrails({ age: 0, heightCm: profile.heightCm, weightKg: plan.weightKg }).minGoalWeightKg, LIMITS.weightKg[0]);
    const { min, max } = weightWheel(profile.units, minKg);
    const from = round1(inUnit(goalKg ?? trendNow ?? plan.weightKg));
    const v = await picker.ask({
      title: t.plan.goalWeight, value: Math.min(max, Math.max(min, from)), min, max, decimals: 1, unit: metric ? t.after.kg : t.after.lb,
      hint: t.plan.goalWeightHint, clearable: !!goalKg,
      range: (typed) => (typed < min ? t.plan.goalWeightLow(weightText(minKg, profile.units)) : t.body.weightRange(weightText(LIMITS.weightKg[0], profile.units, 0), weightText(LIMITS.weightKg[1], profile.units, 0))),
    });
    if (v === null) return;
    setGoalWeight(today, v === 0 ? null : Math.max(minKg, Math.round((metric ? v : lbToKg(v)) * 100) / 100));
  }


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
  // R1: "at a glance", Cal AI's top tiles: the four weeks' on track days, the range's sessions, the range's average intake
  const onTrackDays = $derived(four.reduce((n, w) => n + w.onTrack, 0));
  const thisWeek = $derived(weeks.at(-1)?.training);
  // R2: the card's boxes jump to the card that explains them
  const jump = (id: string) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (el) scrollTo({ top: el.getBoundingClientRect().top + scrollY - 72, behavior: reducedMotion() ? 'auto' : 'smooth' });
  };
  const avgKcal = $derived(complete.length ? Math.round(mean(complete.map((d) => d.intake))) : null);
  const avgProtein = $derived(complete.length ? Math.round(mean(complete.map((d) => d.protein))) : null);
  const sessionBars = $derived(weeks.map(({ training: k }) => ({ avg: k.done, target: k.planned, reached: k.planned > 0 && k.done >= k.planned })));

  // R2, the AI week recap (WHOOP's weekly report, numbers as slots): this week so far, once a day is fully logged
  const weekReq = $derived.by((): CoachRequest | null => {
    const w = acct?.weeks(today, 1)[0];
    if (!w || !plan || !profile || !w.days.some((d) => d.complete)) return null;
    const now = acct?.trendOn(today);
    const was = acct?.trendOn(addDays(today, -7));
    const trend = now != null && was != null && Number.isFinite(was) ? { now, was } : undefined;
    return { kind: 'week', facts: weekFacts({ week: w, proteinG: plan.proteinG, units: profile.units, trend, logs: db.live('slog').map((r) => r.data) }), localDate: today };
  });

  const checkins = $derived(db.live('checkin').map((r) => r.data).sort((a, b) => b.date.localeCompare(a.date)));
  const due = $derived(!!profile && checkinDueOn(plans, profile.checkinWeekday, today) && !checkins.some((c) => c.date === today));
  function outcome(c: Checkin) {
    const { reason, kcalChange } = c.proposal;
    if (c.decision === 'accepted') return kcalChange > 0 ? t.progress.raised(num(kcalChange)) : t.progress.lowered(num(-kcalChange));
    return reason === 'raise' || reason === 'lower' ? t.progress.kept : t.progress.outcome[reason];
  }
  let history = $state(false);
  let asking = $state(false);

  // R2, the owner (17 November): the chart is Progress's main content, and the user picks what it shows
  type Show = 'weight' | 'calories' | 'protein' | 'training';
  // four fit at the largest text when two of them show their short names (Kcal, Train); the full name is still read out
  const SHOWS: { value: Show; label: string; short?: string }[] = [
    { value: 'weight', label: t.progress.weight },
    { value: 'calories', label: t.progress.calories, short: t.progress.caloriesShort },
    { value: 'protein', label: t.today.protein },
    { value: 'training', label: t.progress.training, short: t.progress.trainingShort },
  ];
  let show = $state<Show>('weight');
  const inRange = $derived(weeks.flatMap((w) => w.days).filter((d) => d.date >= from && d.date <= today));
  const daily = $derived(range === 28);
  // calories in against calories out: what living takes (the plan's baseline) plus the sessions done
  const outOf = (d: (typeof inRange)[number]) => (d.living ?? 0) + (d.exercise ?? 0);
  const avgOut = $derived(inRange.length ? Math.round(mean(inRange.map(outOf))) : null);
  const avgExercise = $derived(inRange.length ? Math.round(mean(inRange.map((d) => d.exercise ?? 0))) : null);
  const balance = $derived(avgKcal != null && avgOut != null ? avgKcal - avgOut : null);
  const signedKcal = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${num(Math.abs(n))}`;
  const calDays = $derived(inRange.map((d) => ({ value: d.items ? d.intake : null, faint: !d.complete, reached: d.onTrack, out: d.living != null ? { living: d.living, exercise: d.exercise ?? 0 } : undefined })));
  // protein against its band
  const pBand = $derived(plan ? proteinBand(plan.proteinG) : ([0, 0] as [number, number]));
  const inBand = (g: number) => g >= pBand[0] && g <= pBand[1];
  const proDays = $derived(inRange.map((d) => ({ value: d.items ? d.protein : null, faint: !d.complete, reached: d.complete && inBand(d.protein) })));
  const proteinHit = $derived(complete.filter((d) => inBand(d.protein)).length);
  const proBars = $derived(weeks.map((w) => ({ avg: w.meanProtein, target: plan?.proteinG ?? 0, reached: w.meanProtein != null && inBand(w.meanProtein) })));
  // training: kg lifted in the range, from the sets logged
  const liftedKg = $derived(db.live('slog').map((r) => r.data).filter((l) => l.workout && l.date >= from && l.date <= today).reduce((a, l) => a + totals(l.workout!).volumeKg, 0));
  // what the chart has to draw; with nothing, it says so in its middle
  const hasData = $derived(
    show === 'weight' ? points.length > 1 : show === 'training' ? training.planned > 0 : inRange.some((d) => d.items > 0),
  );
  const lastKg = $derived(acct?.points.at(-1)?.kg);
  // how many days the weigh-ins so far cover, the second thing the first check-in needs
  const spanDays = $derived(acct && acct.points.length ? daysBetween(acct.points[0].date, acct.points.at(-1)!.date) + 1 : 0);
  const changeOf = (days: number) => {
    const was = acct?.trendOn(addDays(today, -days));
    if (trendNow == null || was == null || !Number.isFinite(was)) return null;
    const d = Math.round((inUnit(trendNow) - inUnit(was)) * 10) / 10;
    return `${d > 0 ? '+' : ''}${num(d, 1)}`;
  };
</script>

{#snippet meter(title: string, line: string | string[], value: number, target: number, zone: [number, number], testid: string)}
  {@const facts = [line].flat()}
  <div data-testid={testid}>
    <p class="text-body font-semibold">{title}</p>
    <p class="text-callout text-ink-2"><Facts {facts} /></p>
    <div class="mt-2"><Track grow {value} {target} {zone} label="{title}. {facts.join(', ')}" /></div>
  </div>
{/snippet}

<section aria-label={t.tabs.progress} data-testid="tab-progress" class="flex flex-col gap-3 pt-2 [@media(max-height:620px)]:pt-0">
  {#if !acct || !plan || !profile}
    <p class="text-ink-2" data-testid="no-plan">{t.today.noPlan}</p>
  {:else}
    <!-- R2, the owner (17 November): the chart is the page. Pick what it shows; the card holds the figure, the chart, the
         range under it (as Strava's progress detail) and three small boxes for what it shows (the one card rule) -->
    <Segmented bind:value={show} options={SHOWS} label={t.progress.metricLabel} />

    <section class="bg-surface shadow-card flex flex-col gap-2 rounded-xl p-2" aria-label={SHOWS.find((x) => x.value === show)?.label} data-testid="progress-{show === 'weight' ? 'weight' : `chart-${show}`}">
      <div class="haze rounded-t-sheet rounded-b-md p-4">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            {#if show === 'weight'}
              {#if trendNow != null && points.length > 1}
                <!-- always one decimal: a trend of 60.0 is a measurement, and the lighter tenth keeps 72.4 from reading as 724 -->
                <p class="text-display" data-testid="progress-trend"><Count value={inUnit(trendNow)} from={points[0].trend} format={(v) => v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}>{#snippet children(text)}<Figure {text} />{/snippet}</Count></p>
                <p class="text-caption text-ink-2 mt-1">{metric ? t.after.kg : t.after.lb} {t.after.trend}</p>
              {:else if lastKg != null}
                <!-- R2: before a trend, the last weigh-in is the figure, not a paragraph -->
                <p class="text-display" data-testid="progress-last"><Figure text={inUnit(lastKg).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} /></p>
                <p class="text-caption text-ink-2 mt-1">{metric ? t.after.kg : t.after.lb} {t.after.lastWeigh}</p>
              {:else}
                <p class="text-display text-ink-2">{t.progress.dash}</p>
                <p class="text-caption text-ink-2 mt-1">{t.progress.noWeighIns}</p>
              {/if}
            {:else if show === 'calories'}
              <p class="text-display" data-testid="progress-in"><Count value={avgKcal ?? 0} from={0} /></p>
              <p class="text-caption text-ink-2 mt-1">{t.after.kcalInAvg}</p>
            {:else if show === 'protein'}
              <p class="text-display" data-testid="progress-protein-avg"><Count value={avgProtein ?? 0} from={0} /></p>
              <p class="text-caption text-ink-2 mt-1">{t.after.gAvg}</p>
            {:else}
              <p class="text-display" data-testid="progress-done"><Count value={training.done} from={0} /></p>
              <p class="text-caption text-ink-2 mt-1">{t.after.sessionsOf(num(training.planned))}</p>
            {/if}
          </div>
          {#if show === 'weight'}
            <Button variant="surface" size="sm" class="flex-none" onclick={() => weighIn(today)} data-testid="progress-log-weight">{t.progress.logWeight}</Button>
          {:else if show === 'calories' && avgOut != null}
            <div class="flex-none text-right"><p class="text-subhead num" data-testid="progress-out">{num(avgOut)}</p><p class="text-caption text-ink-2">{t.after.kcalOutAvg}</p></div>
          {:else if show === 'protein'}
            <div class="flex-none text-right"><p class="text-subhead num">{num(plan.proteinG)} {t.after.g}</p><p class="text-caption text-ink-2">{t.after.target}</p></div>
          {:else if show === 'training'}
            <div class="flex-none text-right"><p class="text-subhead num whitespace-nowrap">{weightText(liftedKg, profile.units, 0)}</p><p class="text-caption text-ink-2">{t.after.lifted}</p></div>
          {/if}
        </div>
        {#if show === 'weight'}
          <!-- the pace against the plan's; before there is one, how many weigh-ins the first check-in still needs, in a line -->
          <p class="text-callout mt-2" data-testid="progress-rate">
            {#if rate != null}<Facts facts={[t.progress.rate(num(rate, 1)), t.progress.target(num(targetRate, 1))]} rest="text-ink-2" />{:else}<span class="text-ink-2">{acct.points.length < V.minWeighIns ? t.progress.weighInsFor(num(acct.points.length), num(V.minWeighIns)) : t.progress.daysFor(num(Math.min(V.minSpanDays, spanDays)), num(V.minSpanDays))}</span>{/if}
          </p>
        {/if}
      </div>

      <!-- three small boxes for what the chart shows, under its figure (R2: the card's foot is the chart, so the boxes are 24 round) -->
      {#snippet box(label: string, value: string, cap: string, corner: string, testid: string, onclick?: () => void)}
        {#if onclick}
          <button type="button" class="bg-surface-2 active:bg-surface-3 {corner} flex min-h-[var(--s-16)] min-w-0 flex-col justify-center rounded-md px-4 py-2 text-left transition-colors duration-[var(--d-press)]" {onclick} data-testid={testid}>
            <span class="text-caption text-ink-2">{label}</span><span class="text-subhead num">{value}</span>{#if cap}<span class="text-caption text-ink-2">{cap}</span>{/if}
          </button>
        {:else}
          <div class="bg-surface-2 {corner} flex min-h-[var(--s-16)] min-w-0 flex-col justify-center rounded-md px-4 py-2" data-testid={testid}>
            <span class="text-caption text-ink-2">{label}</span><span class="text-subhead num">{value}</span>{#if cap}<span class="text-caption text-ink-2">{cap}</span>{/if}
          </div>
        {/if}
      {/snippet}
      <div class="grid grid-cols-3 gap-2" data-testid="progress-boxes">
        {#if show === 'weight'}
          {@render box(t.progress.boxWeek, changeOf(7) ?? t.plan.noneYet, changeOf(7) ? (metric ? t.after.kg : t.after.lb) : '', '', 'progress-box-week')}
          {@render box(t.progress.boxMonth, changeOf(30) ?? t.plan.noneYet, changeOf(30) ? (metric ? t.after.kg : t.after.lb) : '', '', 'progress-box-month')}
          {@render box(t.progress.boxGoal, goalKg ? weightText(goalKg, profile.units) : t.progress.boxSet, goalKg ? goalLine : '', '', 'progress-goal-row', askGoal)}
        {:else if show === 'calories'}
          {@render box(t.progress.boxIn, avgKcal == null ? t.plan.noneYet : num(avgKcal), avgKcal == null ? '' : t.after.perDay, '', 'progress-box-in')}
          {@render box(t.progress.boxOut, avgOut == null ? t.plan.noneYet : num(avgOut), avgExercise ? t.progress.outSplit(num(avgExercise)) : t.after.perDay, '', 'progress-box-out')}
          {@render box(t.progress.boxBalance, balance == null ? t.plan.noneYet : signedKcal(balance), balance == null ? '' : t.after.perDay, '', 'progress-box-balance')}
        {:else if show === 'protein'}
          {@render box(t.progress.boxAvg, avgProtein == null ? t.plan.noneYet : `${num(avgProtein)} ${t.after.g}`, t.after.perDay, '', 'progress-box-avg')}
          {@render box(t.progress.boxTarget, `${num(plan.proteinG)} ${t.after.g}`, t.after.perDay, '', 'progress-box-target')}
          {@render box(t.progress.boxDays, t.after.daysOf(num(proteinHit), num(complete.length)), '', '', 'progress-box-days')}
        {:else}
          {@render box(t.progress.boxStrength, num(training.strength, 1), t.after.aWeek, '', 'progress-box-strength')}
          {@render box(t.progress.boxCardio, num(training.cardio), t.after.minAWeek, '', 'progress-box-cardio')}
          {@render box(t.progress.boxLifted, weightText(liftedKg, profile.units, 0), '', '', 'progress-box-lifted')}
        {/if}
      </div>
      <!-- the chart, the page's main content, always there (the owner): with nothing to show yet it says so in its middle.
           The range is three small pills at its head; a new range or metric draws it again, as on arrival -->
      <div class="px-3 pt-1 pb-3" data-testid="progress-chart">
        <div class="-my-1.5 flex justify-end" role="radiogroup" aria-label={t.progress.range}>
          {#each RANGES as r (r.value)}
            <button type="button" role="radio" aria-checked={range === r.value} class="group grid min-h-11 min-w-11 place-items-center" onclick={() => (range = r.value)}>
              <span class="text-caption grid h-8 place-items-center rounded-full px-3 font-semibold transition-colors duration-[var(--d-ui)] {range === r.value ? 'bg-ink text-canvas' : 'text-ink-2 group-active:bg-surface-2'}">{r.label}</span>
            </button>
          {/each}
        </div>
        {#key `${show}${range}`}
          {#if !hasData}
            <div class="text-callout text-ink-2 grid h-[184px] place-items-center rounded-md border border-dashed border-[var(--line-strong)]" data-testid="chart-empty">{t.progress.noData}</div>
          {:else if show === 'weight'}
            <TrendChart {points} {span} {band} from={shortDate(from)} to={shortDate(today)} label={t.progress.chart(shortDate(from), shortDate(today), num(inUnit(trendNow ?? points[0].value), 1))} />
          {:else if show === 'calories'}
            {#if daily}<DayChart days={calDays} from={shortDate(from)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />
            {:else}<WeekBars weeks={bars} from={shortDate(weeks[0].start)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />{/if}
            <div class="text-caption text-ink-2 mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1" aria-hidden="true">
              <span class="inline-flex items-center gap-1.5"><i class="bg-progress size-2.5 rounded-xs"></i>{t.progress.legendIn}</span>
              {#if daily}<span class="inline-flex items-center gap-1.5"><i class="bg-ink h-0.5 w-3 rounded-full"></i>{t.progress.legendOut}</span>
              <span class="inline-flex items-center gap-1.5"><i class="bg-lavender size-2.5 rounded-xs"></i>{t.progress.legendExercise}</span>{/if}
            </div>
          {:else if show === 'protein'}
            {#if daily}<DayChart days={proDays} band={pBand} from={shortDate(from)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />
            {:else}<WeekBars weeks={proBars} from={shortDate(weeks[0].start)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />{/if}
          {:else}
            <WeekBars weeks={sessionBars} from={shortDate(weeks[0].start)} to={shortDate(today)} label={t.progress.sessionBars(num(weeks.length))} />
          {/if}
        {/key}
      </div>
    </section>

    <CoachCard req={weekReq} eyebrow={t.progress.yourWeek} testid="progress-coach">
      {#snippet action()}
        <Button variant="plain" size="sm" class="-ml-4 mt-1 -mb-2" onclick={() => (asking = true)} data-testid="ask-open"><Sparkles size={16} strokeWidth={2.25} aria-hidden="true" />{t.ask.open}</Button>
      {/snippet}
    </CoachCard>
    {#if weekReq}<AskSheet bind:open={asking} facts={weekReq.facts} localDate={today} />{/if}

    <!-- what the chart shows, in more detail: the goal for weight, the weeks and maintenance for calories, the meters for training -->
    {#if show === 'weight' && goalFrac}
      <Card data-testid="progress-goal-card">
        <p class="text-callout"><Facts facts={[t.plan.goalWeight, goalLine]} rest="text-ink-2" /></p>
        <div class="mt-2" data-testid="progress-goal-track"><Track value={goalFrac.done} target={goalFrac.total} label={t.progress.goalTrack(num(Math.round((goalFrac.done / goalFrac.total) * U.percent)))} /></div>
      </Card>
    {/if}
    {#if show === 'calories' || show === 'protein'}
      <Card aria-label={t.progress.intake} data-testid="progress-intake">
        <p class="text-eyebrow text-ink-2">{t.progress.byWeek}</p>
        {#if complete.length}
          <p class="text-display mt-2" data-testid="progress-intake-avg"><Count value={mean(complete.map((d) => d.intake))} from={0} /></p>
          <p class="text-caption text-ink-2 mt-1">{t.after.kcalWeekAvg}</p>
          <div class="mt-4">
            {#key range}<WeekBars weeks={bars} from={shortDate(weeks[0].start)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />{/key}
          </div>
          <p class="text-callout text-ink-2 mt-2">{t.progress.intakeLine}</p>
          <p class="text-body border-line mt-4 border-t pt-4" data-testid="progress-protein"><Facts facts={[t.progress.protein(num(Math.round(mean(complete.map((d) => d.protein))))), t.progress.proteinTarget(num(plan.proteinG))]} rest="text-ink-2" /></p>
        {:else}
          <p class="text-body text-ink-2 mt-2">{t.progress.intakeNone}</p>
          <Button class="mt-4" onclick={() => (sheets.add = true)} data-testid="progress-add">{t.shell.add}</Button>
        {/if}
      </Card>
      {#if measured != null}
        <Card aria-label={t.progress.maintenance} data-testid="progress-maintenance">
         <Disclosure title={t.progress.maintenance} line={`${num(roundTarget(measured))} ${t.after.measured}`}>
          <div class="flex flex-wrap gap-x-10 gap-y-4">
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
         </Disclosure>
        </Card>
      {/if}
    {/if}
    {#if show === 'training'}
    <Card aria-label={t.progress.training} data-testid="progress-training">
        <p class="text-eyebrow text-ink-2">{t.progress.training}</p>
        {#if training.planned}
          <p class="text-display mt-2" data-testid="progress-sessions-done"><Count value={training.done} from={0} /></p>
          <p class="text-caption text-ink-2 mt-1">{t.after.ofPlanned(num(training.planned))}</p>
          {#if thisWeek && thisWeek.planned}
            <!-- R1: this week, a pill for each planned session: ticked once done -->
            <div class="border-line mt-4 flex flex-wrap items-center gap-2 border-t pt-4" role="img" aria-label={t.progress.weekPills(num(thisWeek.done), num(thisWeek.planned))} data-testid="progress-week-pills">
              {#each Array.from({ length: thisWeek.planned }, (_, i) => i) as i (i)}
                <span class="grid size-9 place-items-center rounded-full transition-colors duration-[var(--d-ui)] {i < thisWeek.done ? 'bg-ink text-canvas' : 'bg-track text-ink-2'}" aria-hidden="true">{#if i < thisWeek.done}<Check size={18} strokeWidth={2.75} />{:else}<span class="text-callout num font-semibold">{i + 1}</span>{/if}</span>
              {/each}
              <span class="text-callout text-ink-2 ml-1">{t.progress.weekPills(num(thisWeek.done), num(thisWeek.planned))}</span>
            </div>
          {/if}
          <div class="mt-4">
            {#key range}<WeekBars weeks={sessionBars} from={shortDate(weeks[0].start)} to={shortDate(today)} label={t.progress.sessionBars(num(weeks.length))} />{/key}
          </div>
          <p class="text-callout text-ink-2 mt-2">{t.progress.sessionsLine}</p>
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
    {/if}

    <Card aria-label={t.progress.consistency} data-testid="progress-consistency">
      <!-- U3: a summary card leads with its figure, the on track days of the four weeks, its line as the caption -->
      <p class="text-eyebrow text-ink-2">{t.progress.consistency}</p>
      <p class="text-display mt-2" data-testid="progress-consistency-days"><Count value={four.reduce((n, w) => n + w.onTrack, 0)} from={0} /></p>
      <p class="text-caption text-ink-2 mt-1">{t.progress.consistencyLine}</p>
      <div class="border-line mt-4 border-t">
      <Disclosure title={t.progress.weeklyDetail} testid="consistency-detail">
      <div class="flex flex-col gap-4">
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
      </Disclosure>
      </div>
    </Card>


    <h2 class="text-heading mt-2">{t.progress.checkins}</h2>
    <Card list aria-label={t.progress.checkins} data-testid="progress-checkins">
      {#if due}<Row title={t.progress.ready} caption={t.progress.readyLine} chevron onclick={() => (sheets.checkin = today)} testid="checkin-ready" />{/if}
      {#each checkins as c (c.date)}
        <Row title={dayTitle(c.date)} caption={outcome(c)} chevron onclick={() => (sheets.checkin = c.date)} testid="checkin-row" />
      {:else}
        {#if !due}<p class="text-body text-ink-2 py-4">{t.progress.checkinsNone}</p>{/if}
      {/each}
    </Card>

    <Card list aria-label={t.progress.history}>
      <Row title={t.progress.history} caption={t.progress.historyLine} chevron onclick={() => (history = true)} testid="progress-history" />
    </Card>

    <HistorySheet bind:open={history} {acct} />
  {/if}
</section>
