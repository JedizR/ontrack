<script lang="ts">
  import { onMount, type Component } from 'svelte';
  import { fly } from 'svelte/transition';
  import { toast } from 'svelte-sonner';
  import { prefs, applyTheme, applyFontSize, type Tab } from '$lib/prefs.svelte';
  import { dur } from '$lib/haptics';
  import { swipe } from '$lib/swipe';
  import { t } from '$lib/i18n';
  import Header from '$lib/components/Header.svelte';
  import Dock from '$lib/components/Dock.svelte';
  import Toasts from '$lib/components/Toasts.svelte';
  import Today from './tabs/Today.svelte';
  import { session } from '$lib/session.svelte';
  import { sync } from '$lib/sync/engine.svelte';
  import { logOpen, sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { dayTitle } from '$lib/model/dates';
  import { picker } from '$lib/picker.svelte';
  import { db } from '$lib/db/store.svelte';
  import type { SyncState } from '$lib/components/SyncMark.svelte';

  const TITLES = [t.tabs.today, t.tabs.train, t.tabs.progress];

  // Today ships in the first bundle; the other tabs load once, early, so switching never shows an empty frame
  let Train = $state<Component | null>(null);
  let Progress = $state<Component | null>(null);
  async function loadTab(i: number) {
    if (i === 1 && !Train) Train = (await import('./tabs/Train.svelte')).default;
    if (i === 2 && !Progress) Progress = (await import('./tabs/Progress.svelte')).default;
  }
  $effect(() => { void loadTab(prefs.tab); });

  // the sign in, account and wheel sheets (and the drawer code under them) load after the first paint, like the tabs
  let SignIn = $state<Component<{ open: boolean; title?: string }> | null>(null);
  let Account = $state<Component<{ open: boolean }> | null>(null);
  let Wheel = $state<Component | null>(null);
  async function loadSheets() {
    const [s, a, k] = await Promise.all([import('./flows/signin/SignInSheet.svelte'), import('./settings/AccountSheet.svelte'), import('$lib/components/WheelSheet.svelte')]);
    [SignIn, Account, Wheel] = [s.default, a.default, k.default];
  }
  $effect(() => { if ((sheets.signin || sheets.account || picker.open) && !SignIn) void loadSheets(); });
  // the logging sheets: Add, Search, Quick add, Meal, How it is calculated and the session menu
  let Log = $state<Component | null>(null);
  const loadLog = async () => { Log ??= (await import('./flows/log/LogSheets.svelte')).default; };
  $effect(() => { if (logOpen() && !Log) void loadLog(); });
  // the check-in sheet, from Today's card or Progress
  let Checkin = $state<Component | null>(null);
  const loadCheckin = async () => { Checkin ??= (await import('./flows/checkin/CheckinSheet.svelte')).default; };
  $effect(() => { if (sheets.checkin && !Checkin) void loadCheckin(); });
  const add = () => (db.ready ? (sheets.add = true) : (sheets.signin = true));

  // First run, and a signed in account with no profile yet, go through onboarding (SCREENS.md section 1). A phone that
  // is signed in but has never pulled shows Today's first load state: the account may already have a plan.
  // While the last user's store opens, the shell: a returning user never sees the landing page flash by.
  const onboarded = $derived(db.ready && !!db.get('profile', 'profile'));
  const pulledOnce = $derived(sync.pulled || (db.ready && db.meta.cursor !== null));
  const onboarding = $derived(db.ready ? !onboarded && pulledOnce && !prefs.draft?.saved : !prefs.lastUser);
  let Onboarding = $state<Component | null>(null);
  $effect(() => {
    if (onboarding && !Onboarding) import('./flows/onboarding/Onboarding.svelte').then((m) => (Onboarding = m.default), (e) => console.error('onboarding failed to load', e));
  });
  // L1: before the first question comes the landing page, its own chunk (it replaced Welcome): a signed-out visitor with
  // no draft, one who came back from the first question, or an account with no plan yet. Onboarding loads beside it
  const landing = $derived(onboarding && (prefs.draft?.at ?? 'welcome') === 'welcome');
  let Landing = $state<Component | null>(null);
  $effect(() => {
    if (landing && !Landing) import('./flows/landing/Landing.svelte').then((m) => (Landing = m.default), (e) => console.error('the landing page failed to load', e));
  });
  // a draft meets the account after sign in: it becomes the plan, or the account's own plan wins
  $effect(() => {
    if (db.ready && sync.pulledNow && prefs.draft) import('./flows/onboarding/settle').then((m) => m.settle(), (e) => console.error('the plan could not be saved', e));
  });

  // tab changes slide in from the side the finger came from; swiping wraps around
  let dir = $state(1);
  async function go(i: Tab, d?: 1 | -1) {
    if (i === prefs.tab) return;
    await loadTab(i);
    dir = d ?? (i > prefs.tab ? 1 : -1);
    prefs.tab = i;
    view.date = view.today; // a past day is a Today view; elsewhere the plus logs to today
    scrollTo({ top: 0 });
  }
  let dragX = $state(0);
  let dragging = $state(false);
  const swipeOpts = {
    onDrag: (dx: number) => { dragging = true; dragX = dx * 0.4; },
    onSwipe: (d: 1 | -1) => { dragging = false; dragX = 0; void go(((prefs.tab + d + 3) % 3) as Tab, d); },
    onCancel: () => { dragging = false; dragX = 0; },
  };

  // the header's dot: an expired session and a failing sync both need attention
  const MARK: Record<typeof sync.status, SyncState> = { idle: 'idle', syncing: 'syncing', offline: 'offline', error: 'attention', auth: 'attention' };

  onMount(() => {
    applyTheme();
    applyFontSize();
    void session.boot();
    const preload = setTimeout(() => { void loadTab(1); void loadTab(2); loadSheets().catch(() => undefined); loadLog().catch(() => undefined); }, 800); // a failed preload retries on first open
    // a tab can stay open past midnight: Today follows the calendar when it comes back
    const tick = () => { if (document.visibilityState === 'visible') view.tick(); };
    document.addEventListener('visibilitychange', tick);
    const clock = setInterval(tick, 60_000);

    if (import.meta.env.PROD) {
      import('virtual:pwa-register').then(({ registerSW }) => {
        const update = registerSW({
          onNeedRefresh() {
            toast(t.update.ready, { duration: Infinity, action: { label: t.update.action, onClick: () => update(true) } });
          },
        });
      });
    }
    return () => { clearTimeout(preload); clearInterval(clock); document.removeEventListener('visibilitychange', tick); };
  });
</script>

{#if landing}
  {#if Landing}<Landing />{/if}
{:else if onboarding}
  {#if Onboarding}<Onboarding />{/if}
{:else}
<!-- svh: the height with Safari's toolbars showing, so nothing reflows when they collapse -->
<div class="bg-canvas relative mx-auto flex min-h-svh w-full max-w-[480px] flex-col overflow-x-clip">
  <Header
    title={prefs.tab === 0 && view.past ? dayTitle(view.date) : TITLES[prefs.tab]}
    sync={MARK[sync.status]}
    signedIn={!!session.user}
    onaccount={() => (session.user ? (sheets.account = true) : (sheets.signin = true))}
  />

  <!-- flex-1: the whole area between header and dock takes swipes, not just the content -->
  <!-- the content ends clear of the dock, which floats 12 above the safe area -->
  <main class="flex-1 px-4 pb-[calc(var(--dock-h)+12px+env(safe-area-inset-bottom)+24px)]" use:swipe={swipeOpts}>
    <div style="transform: translateX({dragX}px); transition: {dragging ? 'none' : 'transform 240ms var(--ease-out)'}">
      {#key prefs.tab}
        <div in:fly={{ x: 40 * dir, duration: dur(220), opacity: 0.2 }}>
          {#if prefs.tab === 0}
            <Today />
          {:else if prefs.tab === 1}
            {#if Train}<Train />{/if}
          {:else if Progress}
            <Progress />
          {/if}
        </div>
      {/key}
    </div>
  </main>

  <Dock tab={prefs.tab} onselect={(i) => void go(i)} onadd={add} {swipeOpts} />
</div>
{/if}

{#if SignIn}<SignIn bind:open={sheets.signin} title={onboarding && prefs.draft?.at === 'plan' ? t.signin.save : t.signin.welcomeBack} />{/if}
{#if Account}<Account bind:open={sheets.account} />{/if}
{#if Log}<Log />{/if}
{#if Wheel}<Wheel />{/if}
{#if Checkin}<Checkin />{/if}
<Toasts />
