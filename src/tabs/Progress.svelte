<!-- SCREENS.md section 9, Progress (R3): two haze cards, the weight trend and the consistency, then the chart card (what it
     shows, the chart, its range under it as a finance app has it, three small boxes), then what the chart shows in more
     detail (the goal, maintenance, intake, training), the weeks, check-ins (this week's first when it is ready), History. -->
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
  import TrainDots from '$lib/components/TrainDots.svelte';
  import { db } from '$lib/db/store.svelte';
  import { view } from '$lib/view.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { accountOf, checkinDueOn } from '$lib/model/progress';
  import { baseline, dayCounts, effectiveRate, proteinBand, roundTarget, weeklyEee, U, V } from '$lib/model/engine';
  import DayChart from '$lib/components/DayChart.svelte';
  import AskSheet from '../flows/progress/AskSheet.svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import { dayView, planFor } from '$lib/model/day';
  import { addDays, dayTitle, daysBetween, shortDate, yearOf } from '$lib/model/dates';
  import { kgToLb, weightText } from '$lib/model/units';
  import { haptic } from '$lib/haptics';
  import Check from '@lucide/svelte/icons/check';
  import Disclosure from '$lib/components/Disclosure.svelte';
  import Dumbbell from '@lucide/svelte/icons/dumbbell';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import { LIBRARY } from '$lib/data/exercises';
  import { num } from '$lib/model/format';
  import HistorySheet from '../flows/progress/HistorySheet.svelte';
  import CoachCard from '$lib/components/CoachCard.svelte';
  import { askFacts, weekFacts } from '$lib/model/coach';
  import type { CoachRequest } from '../../shared/coach';
  import type { Checkin } from '../../shared/records';
  const tray = $derived(prefs.tray);
  // the weigh-in flow loads on first use, as on Today
  const weighIn = (date: string) => import('../flows/log/weigh').then((m) => m.weighIn(date));

  const acct = $derived(accountOf(db));
  const profile = $derived(db.get('profile', 'profile'));
  const plans = $derived(db.live('plan'));
  const today = $derived(view.today);
  const plan = $derived(planFor(plans, today));
  const hasProgram = $derived(!!db.get('program', 'program')?.sessions.length);

  // R3, finance-app ranges (1W 1M 3M 6M 1Y All) in whole weeks, so the weeks below cover exactly the days in view. 1W, 1M and All always show; a longer
  // one shows once the account is older than the one before it
  const age = $derived(acct?.first ? daysBetween(acct.first, today) + 1 : 1);
  const RANGES = $derived([1, 4, 13, 26, 52].map((w) => w * U.daysPerWeek).filter((d, i, all) => i < 2 || age > all[i - 1]).concat(0));
  let range = $state(4 * U.daysPerWeek);
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
  // what the trend moved over the range: from its value on the first day in view (the first weigh-in's, before there is one)
  const thenKg = $derived(acct?.trendOn(from));
  const then = $derived(thenKg != null && Number.isFinite(thenKg) ? inUnit(thenKg) : points[0]?.trend);
  const delta = $derived(trendNow != null && then != null ? Math.round((inUnit(trendNow) - then) * 10) / 10 || 0 : null);
  const signed = (d: number) => `${d > 0 ? '+' : ''}${num(d, 1)}`;

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

  const measured = $derived(result?.stats.tdeeObserved ?? null);
  const formula = $derived(plan && profile ? baseline(plan.bmr, profile.neat) + weeklyEee(plan) / U.daysPerWeek : 0);

  const weeks = $derived(acct ? acct.weeks(today, Math.ceil((span + 1) / U.daysPerWeek)) : []);
  const complete = $derived(weeks.flatMap((w) => w.days.filter((d) => d.complete)));
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
  const bars = $derived(
    weeks.map((w) => ({ avg: w.meanIntake, target: w.meanTarget, reached: w.meanIntake != null && !!plan && !!profile && dayCounts(plan.goal, w.meanIntake, w.meanTarget, profile.sex) })),
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
  const avgKcal = $derived(complete.length ? Math.round(mean(complete.map((d) => d.intake))) : null);
  const avgProtein = $derived(complete.length ? Math.round(mean(complete.map((d) => d.protein))) : null);

  // R2, the AI week recap (WHOOP's weekly report, numbers as slots): this week so far, once a day is fully logged
  const weekReq = $derived.by((): CoachRequest | null => {
    const w = acct?.weeks(today, 1)[0];
    if (!w || !plan || !profile || !w.days.some((d) => d.complete)) return null;
    const now = acct?.trendOn(today);
    const was = acct?.trendOn(addDays(today, -7));
    const trend = now != null && was != null && Number.isFinite(was) ? { now, was } : undefined;
    return { kind: 'week', facts: weekFacts({ week: w, proteinG: plan.proteinG, units: profile.units, trend, logs: db.live('slog').map((r) => r.data) }), localDate: today };
  });

  // Ask Ontrack (27 Nov): open from the first day, told who the user is, their plan, their day and program, then the week
  const asked = $derived.by(() => {
    if (!plan || !profile) return null;
    const program = db.get('program', 'program');
    const meals = db.live('meal').map((r) => r.data).filter((m) => m.date === today).sort((a, b) => b.at.localeCompare(a.at));
    const d = dayView({ plan, sex: profile.sex, mode: profile.calorieMode, date: today, sessions: program?.sessions ?? [], logs: db.live('slog').map((r) => r.data), meals });
    const weighed = db.live('weight').map((r) => r.data).filter((w) => w.date <= today).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
    return askFacts({
      week: weekReq?.facts ?? {}, profile, year: yearOf(today), goal: plan.goal, ratePct: plan.ratePctPerWeek, goalWeightKg: plan.goalWeightKg, weightKg: weighed?.kg,
      day: { ...d, sessions: d.sessions.map((s) => ({ name: s.session.name, done: s.status === 'done' })) }, meals: meals.map((m) => m.title).filter(Boolean), program,
    });
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
  const sessionBars = $derived(weeks.map(({ training: k }) => ({ avg: k.done, target: k.planned, reached: k.planned > 0 && k.done >= k.planned })));
  // R7b, the owner: a dot a day, green with a workout done (a rest day's activity too), grey a training day without, an outline a rest day
  // the owner (25 Nov): always this week and the three before it, as a habit tracker's month; the range sets the boxes
  const dots = $derived((acct ? acct.weeks(today, 5).flatMap((w) => w.days) : []).map((d) => ({ date: d.date, state: d.sessions.some((s) => s.status === 'done') ? 'done' : d.sessions.length ? 'missed' : 'rest' }) as const));
  const daily = $derived(span < 4 * U.daysPerWeek);
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
  // what the chart has to draw; with nothing, it says so in its middle
  const hasData = $derived(
    show === 'weight' ? points.length > 1 : show === 'training' ? training.planned > 0 : inRange.some((d) => d.items > 0),
  );
  const lastKg = $derived(acct?.points.at(-1)?.kg);
  // how many days the weigh-ins so far cover, the second thing the first check-in needs
  const spanDays = $derived(acct && acct.points.length ? daysBetween(acct.points[0].date, acct.points.at(-1)!.date) + 1 : 0);
  const changeOf = (days: number) => {
    const was = acct?.trendOn(addDays(today, -days));
    return trendNow == null || was == null || !Number.isFinite(was) ? null : signed(Math.round((inUnit(trendNow) - inUnit(was)) * 10) / 10 || 0);
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
    <!-- R3, the owner (19 November): ONE white card holding sub-boxes, built as Today's. Its first row is two gradient boxes side by
         side, the weight trend and the consistency, each an eyebrow, a figure and one line on the same rows (the left one is the
         way to weigh in, no button). Then what the chart shows, the chart and its range (a row of short pills under it, the chosen
         one filled, as in a finance app), and the last row three small grey boxes. The boxes at the card's corners take its corner
         less the gap (U1b). Words on the gradients are night in both themes, as the Add sheet's composer -->
    {@const unit = metric ? t.after.kg : t.after.lb}
    {@const trending = trendNow != null && points.length > 1}
    <section class="flex flex-col gap-2 {tray ? 'bg-surface shadow-card rounded-xl p-2' : ''}" aria-label={SHOWS.find((x) => x.value === show)?.label} data-testid="progress-{show === 'weight' ? 'weight' : `chart-${show}`}">
      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="text-night rounded-tl-sheet flex min-w-0 flex-col rounded-md p-5 text-left transition-transform duration-[var(--d-press)] active:scale-[0.98] [@media(max-height:620px)]:p-4 [background:var(--grad-trend)]" data-theme="light" aria-describedby="weigh-hint" onclick={() => weighIn(today)} data-testid="progress-log-weight">
          <span class="text-eyebrow text-night/70">{t.progress.weightTrend}</span>
          <span class="mt-2 flex items-baseline gap-1">
            {#if trending}
              <!-- always one decimal: a trend of 60.0 is a measurement, and the lighter tenth keeps 72.4 from reading as 724 -->
              <span class="text-display" data-testid="progress-trend"><Count value={inUnit(trendNow)} from={points[0].trend} format={(v) => v.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}>{#snippet children(text)}<Figure {text} />{/snippet}</Count></span>
            {:else if lastKg != null}
              <span class="text-display" data-testid="progress-last"><Figure text={inUnit(lastKg).toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} /></span>
            {:else}
              <!-- nothing weighed yet: a faint stand-in for the figure, never a word at its size -->
              <span class="bg-night/10 h-9 w-20 rounded-full" aria-hidden="true"></span>
            {/if}
            {#if lastKg != null}<span class="text-callout text-night/70">{unit}</span>{/if}
          </span>
          <span class="text-caption mt-1">
            {#if trending}<Facts rest="text-night/70" facts={[delta != null && `${signed(delta)} ${unit}`, t.progress.rangeName[range]]} />
            {:else}<span class="text-night/70">{lastKg != null ? t.after.lastWeigh : t.progress.noWeighIns}</span>{/if}
          </span>
        </button>
        <span id="weigh-hint" hidden>{t.weigh.action}</span>
        <div class="text-night rounded-tr-sheet flex min-w-0 flex-col rounded-md p-5 [@media(max-height:620px)]:p-4 [background:var(--grad-streak)]" data-theme="light" role="group" aria-label={t.progress.consistency} data-testid="progress-consistency">
          <span class="text-eyebrow text-night/70">{t.progress.consistency}</span>
          <span class="mt-2 flex items-baseline gap-1"><span class="text-display" data-testid="progress-consistency-days"><Count value={onTrackDays} from={0} /></span><span class="text-callout text-night/70">{t.after.days}</span></span>
          <span class="text-caption mt-1"><Facts rest="text-night/70" facts={[t.after.onTrack, t.progress.fourWeeks]} /></span>
        </div>
      </div>

      <Segmented bind:value={show} options={SHOWS} label={t.progress.metricLabel} />

      {#snippet box(label: string, value: string, cap: string, corner: string, testid: string, onclick?: () => void)}
        {#if onclick}
          <button type="button" class="bg-surface-2 active:bg-surface-3 {corner} flex min-h-[calc(var(--s-16)+var(--s-4))] min-w-0 flex-col justify-start rounded-md px-4 py-3 text-left transition-colors duration-[var(--d-press)]" {onclick} data-testid={testid}>
            <span class="text-caption text-ink-2">{label}</span><span class="text-subhead num">{value}</span>{#if cap}<span class="text-caption text-ink-2">{cap}</span>{/if}
          </button>
        {:else}
          <div class="bg-surface-2 {corner} flex min-h-[calc(var(--s-16)+var(--s-4))] min-w-0 flex-col justify-start rounded-md px-4 py-3" data-testid={testid}>
            <span class="text-caption text-ink-2">{label}</span><span class="text-subhead num">{value}</span>{#if cap}<span class="text-caption text-ink-2">{cap}</span>{/if}
          </div>
        {/if}
      {/snippet}

      <!-- the chart, always there: with nothing to show yet it is a grey box with one line. A new range or metric draws it again -->
      <div class={tray ? 'px-2' : ''} data-testid="progress-chart">
        {#key `${show}${range}`}
          {#if !hasData}
            <div class="text-caption text-ink-2 bg-surface-2 grid h-[156px] place-items-center rounded-md" data-testid="chart-empty">{t.progress.noData}</div>
          {:else if show === 'weight'}
            <TrendChart {points} {span} {band} from={shortDate(from)} to={shortDate(today)} label={t.progress.chart(shortDate(from), shortDate(today), num(inUnit(trendNow ?? points[0].value), 1))} />
          {:else if show === 'calories'}
            {#if daily}<DayChart height={134} days={calDays} from={shortDate(from)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />
            {:else}<WeekBars weeks={bars} height={134} from={shortDate(weeks[0].start)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />{/if}
            <div class="text-caption text-ink-2 mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1" aria-hidden="true">
              <span class="inline-flex items-center gap-1.5"><i class="bg-progress size-2.5 rounded-xs"></i>{t.progress.legendIn}</span>
              {#if daily}<span class="inline-flex items-center gap-1.5"><i class="bg-ink h-0.5 w-3 rounded-full"></i>{t.progress.legendOut}</span>
              <span class="inline-flex items-center gap-1.5"><i class="bg-lavender size-2.5 rounded-xs"></i>{t.progress.legendExercise}</span>{/if}
            </div>
          {:else if show === 'protein'}
            {#if daily}<DayChart days={proDays} band={pBand} from={shortDate(from)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />
            {:else}<WeekBars weeks={proBars} from={shortDate(weeks[0].start)} to={shortDate(today)} label={t.progress.bars(num(weeks.length))} />{/if}
          {:else}
            <TrainDots days={dots} {today} label={t.progress.trainDots(num(dots.filter((d) => d.state === 'done').length), num(dots.filter((d) => d.state !== 'rest').length))} />
          {/if}
        {/key}
        <!-- small text pills, equal and left under the chart, the chosen one filled (the 44 tap is the button, the pill is 32) -->
        <div class="mt-1 flex" role="radiogroup" aria-label={t.progress.range}>
          {#each RANGES as d (d)}
            <button type="button" role="radio" aria-checked={range === d} aria-label={t.progress.rangeName[d]} class="group grid min-h-11 min-w-11 place-items-center" onclick={() => { if (range !== d) { haptic(); range = d; } }} data-testid="range-{d}">
              <span class="text-callout grid h-8 min-w-11 place-items-center rounded-full px-3 font-semibold transition-colors duration-[var(--d-ui)] {range === d ? 'bg-ink text-canvas' : 'text-ink-2 group-active:bg-surface-2'}">{t.progress.rangeShort[d]}</span>
            </button>
          {/each}
        </div>
      </div>

      <div class="grid grid-cols-3 gap-2" data-testid="progress-boxes">
        {#if show === 'weight'}
          {#if rate != null}
            {@render box(t.progress.boxPace, `${num(rate, 1)}${t.after.percent}`, t.progress.target(num(targetRate, 1)), 'rounded-bl-sheet', 'progress-box-pace')}
          {:else}
            <!-- before the first check-in: how far the weigh-ins are to the two things it needs -->
            {@render box(t.progress.boxCheckin, acct.points.length < V.minWeighIns ? t.after.daysOf(num(acct.points.length), num(V.minWeighIns)) : t.after.daysOf(num(Math.min(V.minSpanDays, spanDays)), num(V.minSpanDays)), acct.points.length < V.minWeighIns ? t.after.weighIns : t.after.days, 'rounded-bl-sheet', 'progress-box-pace')}
          {/if}
          {@render box(t.progress.boxWeek, changeOf(7) ?? t.progress.dash, changeOf(7) ? unit : '', '', 'progress-box-week')}
          {@render box(t.progress.boxGoal, goalKg ? weightText(goalKg, profile.units) : t.goal[plan.goal], goalKg ? goalLine : t.progress.change, 'rounded-br-sheet', 'progress-goal-row', () => (sheets.goal = true))}
        {:else if show === 'calories'}
          {@render box(t.progress.boxIn, avgKcal == null ? t.progress.dash : num(avgKcal), avgKcal == null ? '' : t.after.perDay, 'rounded-bl-sheet', 'progress-box-in')}
          {@render box(t.progress.boxOut, avgOut == null ? t.progress.dash : num(avgOut), avgExercise ? t.progress.outSplit(num(avgExercise)) : t.after.perDay, '', 'progress-box-out')}
          {@render box(t.progress.boxBalance, balance == null ? t.progress.dash : signedKcal(balance), balance == null ? '' : t.after.perDay, 'rounded-br-sheet', 'progress-box-balance')}
        {:else if show === 'protein'}
          {@render box(t.progress.boxAvg, avgProtein == null ? t.progress.dash : `${num(avgProtein)} ${t.after.g}`, t.after.perDay, 'rounded-bl-sheet', 'progress-box-avg')}
          {@render box(t.progress.boxTarget, `${num(plan.proteinG)} ${t.after.g}`, t.after.perDay, '', 'progress-box-target')}
          {@render box(t.progress.boxDays, t.after.daysOf(num(proteinHit), num(complete.length)), '', 'rounded-br-sheet', 'progress-box-days')}
        {:else}
          {@render box(t.progress.boxStrength, num(training.strength, 1), t.after.aWeek, 'rounded-bl-sheet', 'progress-box-strength')}
          {@render box(t.progress.boxCardio, num(training.cardio), t.after.minAWeek, '', 'progress-box-cardio')}
          <!-- R5: sessions marked Done of those planned in the range (set logging, and the kg it lifted, went in R3) -->
          {@render box(t.progress.boxDone, t.after.daysOf(num(training.done), num(training.planned)), t.after.sessions, 'rounded-br-sheet', 'progress-box-done')}
        {/if}
      </div>
    </section>

    {#snippet askOpen()}
      <Button variant="plain" size="sm" class="-ml-4 mt-1 -mb-2" onclick={() => (asking = true)} data-testid="ask-open"><Sparkles size={16} strokeWidth={2.25} aria-hidden="true" />{t.ask.open}</Button>
    {/snippet}
    {#if weekReq}
      <CoachCard req={weekReq} eyebrow={t.progress.yourWeek} testid="progress-coach" action={askOpen} />
    {:else if asked}
      <!-- before a day of the week is fully logged there is no recap yet, but Ask is open (27 Nov) -->
      <section class="rounded-lg p-5 {tray ? 'bg-surface shadow-card' : 'bg-surface-2'}" data-testid="progress-ask">
        <p class="text-eyebrow text-ink-2">{t.ask.title}</p>
        <p class="text-callout mt-2">{t.ask.lead}</p>
        {@render askOpen()}
      </section>
    {/if}
    {#if asked}<AskSheet bind:open={asking} facts={asked} localDate={today} />{/if}

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

    <!-- the consistency card above is the figure; the weeks behind it open here -->
    <Card list aria-label={t.progress.weeklyDetail} data-testid="progress-weeks">
      <Disclosure title={t.progress.weeklyDetail} line={t.progress.consistencyLine} testid="consistency-detail">
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
          {#if plan}<p class="text-caption text-ink-2" data-testid="consistency-counts">{t.progress.counts[plan.goal]}</p>{/if}
        </div>
      </Disclosure>
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
