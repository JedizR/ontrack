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
  import { sheets } from '$lib/sheets.svelte';
  import { keypad } from '$lib/keypad.svelte';
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

  // the sign in, account and keypad sheets (and the drawer code under them) load after the first paint, like the tabs
  let SignIn = $state<Component<{ open: boolean; title?: string }> | null>(null);
  let Account = $state<Component<{ open: boolean }> | null>(null);
  let Keypad = $state<Component | null>(null);
  async function loadSheets() {
    const [s, a, k] = await Promise.all([import('./flows/signin/SignInSheet.svelte'), import('./settings/AccountSheet.svelte'), import('$lib/components/KeypadSheet.svelte')]);
    [SignIn, Account, Keypad] = [s.default, a.default, k.default];
  }
  $effect(() => { if ((sheets.signin || sheets.account || keypad.open) && !SignIn) void loadSheets(); });

  // First run, and a signed in account with no profile yet, go through onboarding (SCREENS.md section 1). A phone that
  // is signed in but has never pulled shows Today's first load state: the account may already have a plan.
  const onboarded = $derived(db.ready && !!db.get('profile', 'profile'));
  const pulledOnce = $derived(sync.pulled || (db.ready && db.meta.cursor !== null));
  const onboarding = $derived(!onboarded && !(db.ready && (!pulledOnce || !!prefs.draft?.saved)));
  let Onboarding = $state<Component | null>(null);
  $effect(() => {
    if (onboarding && !Onboarding) void import('./flows/onboarding/Onboarding.svelte').then((m) => (Onboarding = m.default));
  });
  // a draft meets the account after sign in: it becomes the plan, or the account's own plan wins
  $effect(() => {
    if (db.ready && pulledOnce && prefs.draft) void import('./flows/onboarding/settle').then((m) => m.settle());
  });

  // tab changes slide in from the side the finger came from; swiping wraps around
  let dir = $state(1);
  async function go(i: Tab, d?: 1 | -1) {
    if (i === prefs.tab) return;
    await loadTab(i);
    dir = d ?? (i > prefs.tab ? 1 : -1);
    prefs.tab = i;
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
    const preload = setTimeout(() => { void loadTab(1); void loadTab(2); loadSheets().catch(() => undefined); }, 800); // a failed preload retries on first open

    if (import.meta.env.PROD) {
      import('virtual:pwa-register').then(({ registerSW }) => {
        const update = registerSW({
          onNeedRefresh() {
            toast(t.update.ready, { duration: Infinity, action: { label: t.update.action, onClick: () => update(true) } });
          },
        });
      });
    }
    return () => clearTimeout(preload);
  });
</script>

{#if onboarding}
  {#if Onboarding}<Onboarding />{/if}
{:else}
<div class="bg-canvas relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col overflow-x-clip">
  <Header
    title={TITLES[prefs.tab]}
    sync={MARK[sync.status]}
    signedIn={!!session.user}
    onaccount={() => (session.user ? (sheets.account = true) : (sheets.signin = true))}
  />

  <!-- flex-1: the whole area between header and dock takes swipes, not just the content -->
  <main class="flex-1 px-5 pb-[calc(env(safe-area-inset-bottom)+var(--dock-h)+40px)]" use:swipe={swipeOpts}>
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

  <Dock tab={prefs.tab} onselect={(i) => void go(i)} {swipeOpts} />
</div>
{/if}

{#if SignIn}<SignIn bind:open={sheets.signin} title={onboarding && prefs.draft?.at === 'plan' ? t.signin.save : t.signin.welcomeBack} />{/if}
{#if Account}<Account bind:open={sheets.account} />{/if}
{#if Keypad}<Keypad />{/if}
<Toasts />
