<!-- SCREENS.md section 6, Today: the week strip, the hero with the track and macros, at most one card, the training
     card, and the day's meals, newest first. Supplements with calories are rows; those with none are chips under "Taken"
     (N2). A past day picked in the strip shows the same view. M9a: gain mode's evening easy adds, the nothing logged
     reminder (each card can be turned off in Settings, F23) and Finish day under the meals. -->
<script lang="ts" module>
  // the cards fade up once, on the first paint of a session (DESIGN.md section 10)
  let first = true;
</script>

<script lang="ts">
  import { onMount, type Component } from 'svelte';
  import { fade } from 'svelte/transition';
  import Check from '@lucide/svelte/icons/check';
  import Plus from '@lucide/svelte/icons/plus';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import Burst from '$lib/components/Burst.svelte';
  import Scale from '@lucide/svelte/icons/scale';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import Search from '@lucide/svelte/icons/search';
  import Hash from '@lucide/svelte/icons/hash';
  import Bookmark from '@lucide/svelte/icons/bookmark';
  import Camera from '@lucide/svelte/icons/camera';
  import TextIcon from '@lucide/svelte/icons/text';
  import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
  import { t } from '$lib/i18n';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Row from '$lib/components/Row.svelte';
  import CardHead from '$lib/components/CardHead.svelte';
  import SwipeRow from '$lib/components/SwipeRow.svelte';
  import Track from '$lib/components/Track.svelte';
  import Count from '$lib/components/Count.svelte';
  import WeekStrip from '$lib/components/WeekStrip.svelte';
  import SourceLabel from '$lib/components/SourceLabel.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import ShakerIcon from '$lib/components/ShakerIcon.svelte';
  import Thumb from '../flows/log/Thumb.svelte';
  import { sync } from '$lib/sync/engine.svelte';
  import { collapse, dur, haptic, pop } from '$lib/haptics';
  import { session } from '$lib/session.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { view } from '$lib/view.svelte';
  import { db } from '$lib/db/store.svelte';
  import { clearSessionLog, closeDay, deleteMeal, logSession, reopenDay, saveMeal, undoToast } from '$lib/actions';
  import { itemFor, loadFoods, type Food } from '$lib/data/foods';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import { askCoach, type CoachAnswer } from '$lib/coach';
  import { gapCandidates, gapFacts } from '$lib/model/coach';
  import { easyAdds, easyDue } from '$lib/model/easy';
  import { dayView, mealSource, planFor, recentFoods, totals } from '$lib/model/day';
  import { weightText } from '$lib/model/units';
  import { checkinDueOn } from '$lib/model/progress';
  import { addDays, daysBetween, stampOn, timeOf } from '$lib/model/dates';
  import { proteinBand, sessionKcal, V } from '$lib/model/engine';
  import { num } from '$lib/model/format';
  // the weigh-in flow loads on first use: it brings the onboarding limits with it
  const weighIn = (date: string) => import('../flows/log/weigh').then((m) => m.weighIn(date));
  import { ids, type Meal, type MealItem, type Session } from '../../shared/records';

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
  // R1: eight weeks of days to slide through, the last one today (the strip anchors it); older days are in History
  const week = $derived(Array.from({ length: 56 }, (_, i) => addDays(view.today, i - 55)).map((date) => ({ date, onTrack: !!byDate.get(date)?.length && viewOf(date)?.status === 'on' })));
  const logged = $derived([...(byDate.get(view.date) ?? [])].sort((a, b) => b.data.at.localeCompare(a.data.at)));
  // a supplement with no calories is not a meal row: it shows as taken (F21)
  const isTaken = (m: Meal) => m.method === 'supplement' && totals(m.items).kcal === 0;
  const meals = $derived(logged.filter((r) => !isTaken(r.data)));
  const taken = $derived(logged.filter((r) => isTaken(r.data)).reverse());

  // the counterpart: what is left, or past the target the amount over in plain ink, never red
  const lead = $derived.by(() => {
    if (!day) return { n: 0, cap: '', on: false };
    const { kcal } = day.eaten;
    const on = kcal >= day.zone[0] && kcal <= day.zone[1];
    if (kcal > day.target) return { n: Math.round(kcal - day.target), cap: t.after.kcalOver, on };
    return { n: Math.round(day.target - kcal), cap: day.plan.goal === 'gain' ? t.after.kcalToGo : t.after.kcalLeft, on };
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

  // at most one card (section 6), on today only: the weekly check-in, the evening easy adds, the weigh-in prompt, Getting
  // started, then nothing logged yet; Settings turns each reminder off (F23), the check-in staying on Progress
  const remind = $derived(prefs.remind);
  const closed = $derived(!!db.get('day', ids.day(view.date))?.closed);
  const checkinCard = $derived(remind.checkin && !view.past && !!profile && checkinDueOn(plans, profile.checkinWeekday, view.today) && !db.get('checkin', ids.checkin(view.today)));
  const gap = $derived(day ? day.target - day.eaten.kcal : 0);
  const easyCard = $derived(remind.easy && !view.past && !checkinCard && !!day && easyDue({ goal: day.plan.goal, time: view.time, eaten: day.eaten.kcal, target: day.target, closed }));
  let foods = $state<Food[] | null>(null);
  $effect(() => { if ((easyCard || gapDue) && !foods) loadFoods().then((f) => (foods = f), () => undefined); });
  // R2, close the gap (research/r2/ai-analytics 4): from noon, with a meal in and protein under its band, three foods
  // from the table that fit what is left, picked and given a reason by the coach; each logs in one tap
  const proteinLeft = $derived(day ? Math.round(proteinBand(day.macros.proteinG)[0] - day.eaten.protein) : 0);
  const gapDue = $derived(!view.past && !!day && !closed && logged.length > 0 && view.time >= '12:00' && proteinLeft >= 15 && day.target - day.eaten.kcal >= 150);
  let pgap = $state<CoachAnswer | null>(null);
  let gapKey = '';
  $effect(() => {
    if (!gapDue || !foods || !day) return void (pgap = null);
    const kcalLeft = Math.round(day.target - day.eaten.kcal);
    // data first (the owner): foods this person logs, the most logged first, then the table's protein foods
    const recent = recentFoods(allMeals.map((r) => r.data), 40);
    const times = new Map<string, number>();
    for (const m of allMeals) for (const it of m.data.items) if (it.foodId) times.set(it.foodId, (times.get(it.foodId) ?? 0) + 1);
    const candidates = gapCandidates({ foods, recent, kcalLeft }).sort((a, b) => (times.get(b.id) ?? 0) - (times.get(a.id) ?? 0));
    const key = `${view.date}:${Math.round(proteinLeft / 10)}:${candidates.map((c) => c.id).join()}`;
    if (key === gapKey || candidates.length < 3) return;
    gapKey = key;
    void askCoach({ kind: 'gap', facts: gapFacts({ kcalLeft, proteinLeft }), localDate: view.date, candidates }).then((a) => { if (gapKey === key) pgap = a; });
  });
  const gapItems = $derived(
    pgap?.picks && foods
      ? pgap.picks.flatMap((p) => {
          const f = foods!.find((x) => x.id === p.id);
          const c = recentFoods(allMeals.map((r) => r.data), 20).find((r) => r.foodId === p.id);
          return f ? [{ reason: p.reason, item: itemFor(f, c?.grams || f.portions.find((x) => x.label !== '100 g')?.grams || 100, db.get('food', f.id)?.per100) }] : [];
        })
      : [],
  );
  const easy = $derived(easyCard && foods ? easyAdds(foods, recentFoods(allMeals.map((r) => r.data), 20).map((r) => r.foodId), gap, (id) => db.get('food', id)?.per100) : []);
  const weights = $derived(db.live('weight').map((r) => r.data.date));
  const lastWeigh = $derived(weights.filter((d) => d <= view.today).sort().at(-1));
  const weighedOn = $derived(db.live('weight').find((r) => r.data.date === view.date)?.data);
  const nothingCard = $derived(remind.meal && !view.past && !closed && logged.length === 0 && view.time >= remind.mealAt);
  // Finish day: on today from 20:00, on any past day (section 6)
  const finishable = $derived(view.past || view.time >= `${String(V.finishDayHour).padStart(2, '0')}:00`);
  function addEasy(item: MealItem) {
    const id = saveMeal({ date: view.date, at: stampOn(view.date), title: item.name, method: 'search', items: [item] });
    undoToast(t.add.logged(item.name), () => { deleteMeal(id); });
  }
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
  // 19 Nov, the owner: a cardio session named only "Cardio" shows its machine ("Treadmill"), with Cardio under it, as Strength is
  const sessionTitle = (s: Session) => (s.name === kindOf(s) && s.setup ? t.train.machines[s.setup.machine] : s.name);
  // the facts under a session: its type only when the name says something else, then minutes, then its calories (a done session's green check says Done)
  const lineOf = (s: Session, status: string | undefined) => {
    if (status === 'skipped') return [t.today.skippedLine];
    const end = status === 'done' ? undefined : t.after.kcalN(num(Math.round(sessionKcal(s, day!.plan.weightKg))));
    return [sessionTitle(s) !== kindOf(s) && kindOf(s), t.after.minN(num(s.minutes)), end];
  };
  // R2: a meal logged while Today is open lands with a short violet glow, so the eye finds it (not on first paint)
  const known = new Set<string>();
  let fresh = $state<string | null>(null);
  $effect(() => {
    const now = allMeals.map((r) => r.id);
    if (known.size) for (const id of now) if (!known.has(id)) fresh = id;
    for (const id of now) known.add(id);
  });
  // R2: a session done turns its box the action's ink, spread from the button that did it. 19 Nov, the owner: each of the
  // day's sessions is its own box, done on its own
  let justDone = $state<{ key: string; x: number; y: number } | null>(null);
  // the words of the box just tapped turn once the ink has reached them, a quarter of a second in
  let lateKey = $state<string | null>(null);
  const inked = (key: string, status: string | undefined) => status === 'done' && lateKey !== key;
  function markDone(e: MouseEvent, s: Session) {
    const btn = e.currentTarget as HTMLElement;
    const box = btn.closest('[data-testid="todo"]')?.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    justDone = box ? { key: s.key, x: b.left + b.width / 2 - box.left, y: b.top + b.height / 2 - box.top } : null;
    lateKey = s.key;
    setTimeout(() => { if (lateKey === s.key) lateKey = null; }, 240);
    haptic();
    logSession({ date: view.date, sessionKey: s.key, status: 'done' });
    setTimeout(() => (justDone = null), 1400);
  }
  // Undo plays it backwards (the owner): the ink shrinks into the button, the words turn back as it leaves them, and the
  // session is unmarked once the ink is gone
  let undoing = $state<{ key: string; x: number; y: number } | null>(null);
  function undoDone(e: MouseEvent, s: Session) {
    const btn = e.currentTarget as HTMLElement;
    const box = btn.closest('[data-testid="todo"]')?.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    justDone = null;
    undoing = { key: s.key, ...(box ? { x: b.left + b.width / 2 - box.left, y: b.top + b.height / 2 - box.top } : { x: 0, y: 0 }) };
    haptic();
    // the words and the check go first, then the ink closes (the owner: never lag behind it); the ink leaves the words
    // first, so they turn back at once
    lateKey = s.key;
    setTimeout(() => {
      clearSessionLog(view.date, s.key);
      undoing = null;
      lateKey = null;
    }, 380);
  }
  $effect(() => { void view.date; justDone = null; undoing = null; });
  // the weigh-in lands while Today is open (not on a change of day): its box inks from the button, words a beat later
  let weighJust = $state(false);
  let weighLate = $state(false);
  let weighWas: { date: string; on: boolean } | null = null;
  $effect(() => {
    const now = { date: view.date, on: !!weighedOn };
    if (weighWas && weighWas.date === now.date && !weighWas.on && now.on) {
      weighJust = weighLate = true;
      setTimeout(() => (weighLate = false), 240);
      setTimeout(() => (weighJust = false), 1400);
    }
    weighWas = now;
  });
  let animate = first;
  onMount(() => { first = false; });
  // the day's cards are made again when the day in view changes: they rise only on the session's first paint
  const firstDate = view.date;
  $effect(() => { if (view.date !== firstDate) animate = false; });
  /** the appear effect for the nth card, on the first paint only */
  const rise = (i: number) => (animate && view.date === firstDate ? { class: 'appear', style: `--i: ${i}` } : {});
</script>

<section aria-label={t.tabs.today} data-testid="tab-today" class="flex flex-col gap-3 pt-2 [@media(max-height:620px)]:pt-0">
  {#if sync.status === 'auth'}
    <!-- SCREENS.md section 12, session expired: local data is untouched -->
    <Card data-testid="session-expired">
      <CardHead title={t.session.expired} line={session.wrongAccount && prefs.lastEmail ? t.session.wrongAccount(prefs.lastEmail) : t.session.expiredLead} />
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
    <!-- R2, the owner's pick (17 November): one card holding small boxes, as OneFin's Withdraw card. The haze panel leads
         with what is left; under it the three macros, then the day's session and its weigh-in, each a grey box 8 apart.
         The boxes at the card's corners take its corner less the gap (U1b) -->
    <div {...rise(1)}><section class="bg-surface shadow-card flex flex-col gap-2 rounded-xl p-2" aria-label={t.today.calories} data-testid="hero">
      <!-- the haze is the panel's, never the button's (DESIGN.md: no gradient on a button) -->
      <div class="haze rounded-t-sheet rounded-b-md"><button type="button" class="block w-full p-5 text-left transition-transform duration-[var(--d-press)] active:scale-[0.98] [@media(max-height:620px)]:p-4" aria-describedby="hero-how" aria-haspopup="dialog" onclick={() => (sheets.how = true)} data-testid="hero-open">
        <!-- R2, the owner: what was eaten leads (the figure the day is about), what is left beside it in the counterpart -->
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <div class="text-hero num" data-testid="hero-value"><Count value={Math.round(day.eaten.kcal)} /></div>
            <div class="text-callout text-ink-2 mt-1">{t.after.ofKcal(num(day.target))}</div>
          </div>
          <div class="flex flex-none flex-col items-end gap-2 pt-1 text-right">
            <span class="liquid-clear text-ink text-caption rounded-full px-2.5 py-0.5 font-semibold whitespace-nowrap" data-testid="day-kind">{day.training ? t.today.trainingDay : t.today.restDay}</span>
            <div class="leading-tight">
              <div class="text-heading num flex items-center justify-end gap-1 normal-case {lead.on ? 'text-success-ink' : ''}" data-testid="hero-left">
                {#key view.date}{#if lead.on}<span class="inline-grid" in:pop data-testid="hero-reached"><Check size={20} strokeWidth={3} aria-hidden="true" /></span>{/if}{/key}{#if lead.on}<span class="text-subhead">{t.today.onTrack}</span>{:else}<Count value={lead.n} />{/if}
              </div>
              <!-- on track, the words lead and the amount moves to the caption ("8 kcal left"), never a bare 8 beside a tick -->
              <div class="text-caption text-ink-2 num" data-testid="hero-cap">{lead.on ? `${num(lead.n)} ${lead.cap}` : lead.cap}</div>
            </div>
          </div>
        </div>
        <div class="mt-4 [@media(max-height:620px)]:mt-3"><Track hero scope={view.date} value={day.eaten.kcal} target={day.target} zone={day.zone} label="{num(Math.round(day.eaten.kcal))} {t.after.ofKcal(num(day.target))}" /></div>
      </button></div>
      <span id="hero-how" hidden>{t.today.how}</span>

      <div class="grid grid-cols-3 gap-2">
        {#each macros as m (m.key)}
          <!-- the track sits at the foot of each box, so the three stay level when a value wraps at large text -->
          <div class="bg-surface-2 flex min-w-0 flex-col rounded-md px-4 pt-3 pb-4 [@media(max-height:620px)]:pt-2 [@media(max-height:620px)]:pb-2" data-testid="macro-{m.key}">
            <div class="text-caption text-ink-2 flex items-center gap-1">
              {m.label}{#key view.date}{#if m.zone && m.value >= m.zone[0] && m.value <= m.zone[1]}<span class="text-success-ink inline-grid" in:pop><Check size={14} strokeWidth={3} aria-hidden="true" /></span>{/if}{/key}
            </div>
            <div class="text-subhead num flex flex-wrap items-baseline gap-x-1"><Count value={m.value} /><span class="text-caption text-ink-2 font-medium whitespace-nowrap">/ {num(m.target)} {t.after.g}</span></div>
            <div class="mt-auto pt-2"><Track scope={view.date} value={m.value} target={m.target} zone={m.zone} label="{m.label} {num(Math.round(m.value))} {t.after.ofGrams(num(m.target))}" /></div>
          </div>
        {/each}
      </div>

      <div class="grid grid-cols-3 gap-2">
        <!-- the day's training: a tap on its name opens its menu (Mark done, Skip), the action beside it -->
        <!-- R2, the owner: Done turns the box the action's ink, spreading out from the button; its words follow, the check
             becomes a filled green circle with a burst, and Done becomes a grey Undo in the same place -->
        <div class="col-span-2 flex min-w-0 flex-col gap-2" aria-label={t.today.upNext} data-testid="training">
          {#each day.sessions as { session: s, status }, i (s.key)}
            {@const ink = (justDone?.key === s.key ? justDone : undoing?.key === s.key ? undoing : null)}
            <div class="bg-surface-2 text-ink relative flex flex-1 {day.sessions.length > 1 ? 'min-h-14' : 'min-h-[calc(var(--s-16)+var(--s-4))]'} min-w-0 items-center gap-2 overflow-hidden rounded-md py-2 pr-2 pl-4 {i === day.sessions.length - 1 ? 'rounded-bl-sheet' : ''} [@media(max-height:620px)]:py-1" style={inked(s.key, status) ? '--ink: var(--on-action); --ink-2: color-mix(in srgb, var(--on-action) 68%, transparent)' : undefined} data-done={status === 'done' || undefined} data-testid="todo">
              {#if status === 'done'}<span class="bg-action absolute inset-0 {justDone?.key === s.key ? 'ink-in' : undoing?.key === s.key ? 'ink-out' : ''}" style="--x: {ink?.x ?? 0}px; --y: {ink?.y ?? 0}px" aria-hidden="true"></span>{/if}
              <div class="relative flex min-w-0 flex-1 items-center gap-2" data-testid="session-{s.key}">
                <button type="button" class="min-w-0 flex-1 rounded-sm py-1 text-left transition-opacity duration-[var(--d-press)] active:opacity-60 disabled:cursor-default" disabled={!!status} aria-label={t.today.more(sessionTitle(s))} onclick={() => (sheets.session = { date: view.date, key: s.key, name: sessionTitle(s) })} data-testid="session-more">
                  <span class="text-body block truncate font-semibold">{sessionTitle(s)}</span>
                  <span class="text-caption text-ink-2 block"><Facts facts={lineOf(s, status)} /></span>
                </button>
                <!-- outside the block below, so it already exists when Done is tapped: only then does the check pop -->
                {#if status === 'done'}
                  <span class="bg-success text-night relative grid size-7 flex-none place-items-center rounded-full transition-[opacity,scale] duration-[var(--d-press)] {undoing?.key === s.key ? 'scale-50 opacity-0' : ''}" in:pop data-testid="session-tick">
                    <Check size={17} strokeWidth={3.5} aria-hidden="true" />
                    {#if justDone?.key === s.key}<Burst />{/if}
                  </span>
                  <!-- where Done was, the same size: Undo on a grey that sits on the ink -->
                  <Button variant="on-ink" size="sm" class="min-w-[4.5rem]" disabled={undoing?.key === s.key} onclick={(e: MouseEvent) => undoDone(e, s)} data-testid="session-undo">{t.today.undo}</Button>
                {:else if status}
                  <Button variant="plain" size="sm" onclick={() => clearSessionLog(view.date, s.key)} data-testid="session-undo">{t.today.undo}</Button>
                {:else}
                  <Button variant="primary" size="sm" class="min-w-[4.5rem]" onclick={(e: MouseEvent) => markDone(e, s)} data-testid="session-done">{t.today.done}</Button>
                {/if}
              </div>
            </div>
          {:else}
            <div class="bg-surface-2 text-ink rounded-bl-sheet flex min-h-[calc(var(--s-16)+var(--s-4))] min-w-0 flex-1 items-center gap-3 rounded-md py-2 pr-2 pl-4" data-testid="todo">
              <span class="text-ink-2 inline-grid"><TrainIcon /></span>
              <p class="text-body text-ink-2 font-semibold">{(day.plan.sessions ?? sessions).length ? t.today.restDay : t.today.noProgram}</p>
            </div>
          {/each}
        </div>
        <!-- the weigh-in: one tap, a weight once done, the prompt while it is due -->
        <!-- 19 Nov, the owner: the weigh-in as the sessions are: once weighed the box turns the action's ink (spread from its
             button when it happens here) with the filled green check centred above the weight, and Edit under the words;
             before, the grey box with Add -->
        <div class="bg-surface-2 text-ink rounded-br-sheet relative flex min-h-[calc(var(--s-16)+var(--s-4))] min-w-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-md px-2 py-3 text-center" style={weighedOn && !weighLate ? '--ink: var(--on-action); --ink-2: color-mix(in srgb, var(--on-action) 68%, transparent)' : undefined} data-done={!!weighedOn || undefined} data-testid="weigh-card">
          {#if weighedOn}<span class="bg-action absolute inset-0 {weighJust ? 'ink-in' : ''}" style="--x: 50%; --y: 80%" aria-hidden="true"></span>{/if}
          <span class="relative flex min-w-0 flex-col items-center">
            {#if weighedOn}
              <span class="bg-success text-night relative mb-2 grid size-7 place-items-center rounded-full" in:pop data-testid="weigh-tick">
                <Check size={17} strokeWidth={3.5} aria-hidden="true" />
                {#if weighJust}<Burst />{/if}
              </span>
              <span class="text-subhead num whitespace-nowrap">{weightText(weighedOn.kg, profile?.units ?? 'metric')}</span>
              <span class="text-caption text-ink-2">{t.weigh.done}</span>
            {:else}
              <span class="text-ink-2 mb-2 inline-grid"><Scale size={20} strokeWidth={2.25} aria-hidden="true" /></span>
              <span class="text-body font-semibold">{view.past ? t.weigh.none : t.weigh.action}</span>
              {#if !view.past}<span class="text-caption text-ink-2">{lastWeigh ? t.weigh.promptDays(num(daysBetween(lastWeigh, view.today))) : t.weigh.promptFirstShort}</span>{/if}
            {/if}
          </span>
          <Button variant={weighedOn ? 'on-ink' : 'primary'} size="sm" class="relative min-w-[4.5rem]" onclick={() => weighIn(view.date)} data-testid="weigh-open">{weighedOn ? t.weigh.edit : t.weigh.add}</Button>
        </div>
      </div>
    </section></div>

    <!-- U1c: the cards below belong to the day in view. A day picked in the strip replaces them at once, so nothing
         collapses or slides for a change of day; within a day, the one card and the meals come and go with motion -->
    {#key view.date}
    <div class="flex flex-col gap-3" in:fade={{ duration: dur('--d-fade') }}>
    {#if checkinCard}
      <!-- U3: status cards, as Shop's order cards: the subject in the eyebrow, the status as the title, then why -->
      <div in:collapse out:collapse={{ leave: true }}><Card data-testid="checkin-card" {...rise(2)}>
        <CardHead eyebrow={t.checkin.cardEyebrow} title={t.checkin.cardTitle} line={t.checkin.cardLine}>
          {#snippet action()}<Button size="sm" onclick={() => (sheets.checkin = view.today)} data-testid="checkin-open">{t.checkin.open}</Button>{/snippet}
        </CardHead>
      </Card></div>
    {:else if easyCard}
      <!-- F10: three calorie dense foods, together about the gap, each added in one tap -->
      <div in:collapse out:collapse={{ leave: true }}><Card data-testid="easy-card" {...rise(2)}>
        <CardHead eyebrow={t.today.easyEyebrow} title={t.today.easyTitle(num(Math.round(gap)))} line={t.today.easyLine} />
        <div class="mt-2 -mb-3">
          {#each easy as item (item.foodId)}
            <Row title={item.name} caption="{num(item.grams ?? 0)} {t.after.g}" wrap testid="easy-item">
              {#snippet trailing()}<Button size="sm" onclick={() => addEasy(item)} data-testid="easy-add">{t.today.easyAdd(num(Math.round(item.kcal)))}</Button>{/snippet}
            </Row>
          {/each}
        </div>
      </Card></div>
    {:else if gapDue && gapItems.length}
      <!-- R2, the owner: the suggestions, more obvious. The screen's one featured card (violet marks Ontrack): what is
           missing as its title, then three foods, the ones this person logs first, each added in one tap -->
      <!-- R2, the owner: on the featured gradient, and a chevron at its top right folds it to its title line (remembered) -->
      <div in:collapse out:collapse={{ leave: true }}><section class="feature text-ink rounded-lg p-5 [background:var(--grad-feature)]" data-theme="light" aria-label={t.today.gapTitle(num(proteinLeft))} data-testid="gap-card">
        <div class="flex items-start gap-2">
          <div class="min-w-0 flex-1">
            <p class="text-eyebrow flex items-center gap-1.5"><Sparkles size={16} strokeWidth={2.25} aria-hidden="true" />{t.today.gapEyebrow}</p>
            <h3 class="text-heading mt-2">{t.today.gapTitle(num(proteinLeft))}</h3>
          </div>
          <button type="button" class="active:bg-ink/10 -mt-2 -mr-2 grid size-11 flex-none place-items-center rounded-full transition-colors duration-[var(--d-press)]" aria-expanded={!prefs.gapFolded} aria-label={prefs.gapFolded ? t.today.gapShow : t.today.gapHide} onclick={() => (prefs.gapFolded = !prefs.gapFolded)} data-testid="gap-fold">
            <ChevronDown size={22} strokeWidth={2.25} class="transition-transform duration-[var(--d-ui)] {prefs.gapFolded ? '' : 'rotate-180'}" aria-hidden="true" />
          </button>
        </div>
        {#if !prefs.gapFolded}
        <div class="mt-3 flex flex-col gap-2" in:collapse out:collapse={{ leave: true }}>
          {#each gapItems as g (g.item.foodId)}
            <div class="bg-surface flex min-h-14 items-center gap-3 rounded-md py-2 pr-2 pl-4" data-testid="gap-item">
              <div class="min-w-0 flex-1">
                <p class="text-body truncate font-semibold">{g.item.name}</p>
                <p class="text-caption text-ink-2 truncate"><Facts facts={[`${num(g.item.grams ?? 0)} ${t.after.g}`, g.reason]} /></p>
              </div>
              <Button variant="primary" size="sm" onclick={() => addEasy(g.item)} data-testid="gap-add">{t.today.gapAdd(num(Math.round(g.item.protein)))}</Button>
            </div>
          {/each}
        </div>
        {#if pgap?.source === 'ai'}<p class="text-caption mt-3 flex items-center gap-1 opacity-70"><Sparkles size={14} strokeWidth={2.25} aria-hidden="true" />{t.coach.written}</p>{/if}
        {/if}
      </section></div>
    {:else if nothingCard}
      <div in:collapse out:collapse={{ leave: true }}><Card data-testid="nothing-card" {...rise(2)}>
        <CardHead eyebrow={t.today.meals} title={t.today.nothingTitle} line={t.today.nothingLine}>
          {#snippet action()}<Button size="sm" onclick={() => (sheets.add = true)} data-testid="nothing-add">{t.today.nothingAction}</Button>{/snippet}
        </CardHead>
      </Card></div>
    {/if}


    <div {...rise(4)}>
      <div class="mt-1 flex items-baseline justify-between">
        <h2 class="text-heading">{t.today.meals}</h2>
        {#if meals.length}<span class="text-callout text-ink-2" data-testid="meal-count">{t.today.logged(num(meals.length))}</span>{/if}
      </div>
    </div>
    {#snippet tile(Icon: Component<{ size?: number; strokeWidth?: number }>)}
      <div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Icon size={24} strokeWidth={2} /></div>
    {/snippet}
    <Card list aria-label={t.today.meals} data-testid="meals" {...rise(5)}>
      {#each meals as { id, data: m } (id)}
        {@const Icon = ICON[m.method]}
        {#snippet source()}<SourceLabel source={bySupplement(m) ? 'typical' : mealSource(m.items)} />{/snippet}
        <SwipeRow ondelete={() => remove(id, m)} testid="meal" class={fresh === id ? 'landed' : ''}>
          <Row title={titleOf(m)} value={num(Math.round(totals(m.items).kcal))} unit={t.after.kcal} onclick={() => openMeal(id, m)}>
            {#snippet leading()}
              {#if m.thumb}<Thumb {id} class="size-full">{#snippet fallback()}{@render tile(Icon)}{/snippet}</Thumb>{:else}{@render tile(Icon)}{/if}
            {/snippet}
            {#snippet caption()}<Facts facts={bySupplement(m) ? [timeOf(m.at), amountOf(m), m.items[0].source === 'typical' && source] : [timeOf(m.at), source]} />{/snippet}
          </Row>
        </SwipeRow>
      {:else}
        {#if allMeals.length || view.past}
          <p class="text-body text-ink-2 py-4" data-testid="meals-empty">{t.today.noMeals}</p>
        {:else}
          <!-- R2: a new account's first meal is one tap from here, as the Getting started card's was -->
          <Row title={t.today.firstMealTitle} caption={t.today.firstMealLine} onclick={() => (sheets.add = true)} chevron testid="first-meal">
            {#snippet leading()}<div class="tile grid size-full place-items-center"><Plus size={22} strokeWidth={2.25} aria-hidden="true" /></div>{/snippet}
          </Row>
        {/if}
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

    <!-- section 6: a finished day counts as complete for the check-in (SCIENCE.md section 10) -->
    {#if closed}
      <div class="flex items-center gap-3" data-testid="day-finished" in:fade={{ duration: dur('--d-fade') }}>
        <p class="text-callout text-ink-2 min-w-0 flex-1">{t.today.finished}</p>
        <Button variant="plain" size="sm" class="-mr-4" onclick={() => reopenDay(view.date)} data-testid="day-reopen">{t.today.reopen}</Button>
      </div>
    {:else if finishable}
      <div in:fade={{ duration: dur('--d-fade') }}><Button variant="plain" size="sm" class="-ml-4" onclick={() => closeDay(view.date)} data-testid="day-finish">{t.today.finish}</Button></div>
    {/if}
    </div>
    {/key}
  {/if}
</section>
