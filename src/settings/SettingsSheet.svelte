<!-- SCREENS.md section 11, Settings (M9a): the rows on the sheet in groups. A switch, a segmented choice or a time saves on
     the tap; Profile, Goal and pace, Check-in day, The science and Delete account open a page inside the sheet. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { fly } from 'svelte/transition';
  import { dur } from '$lib/haptics';
  import { toast } from 'svelte-sonner';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import Button from '$lib/components/Button.svelte';
  import Switch from '$lib/components/Switch.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Options from './Options.svelte';
  import PlanPage from './PlanPage.svelte';
  import Science from './Science.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';
  import { V } from '$lib/model/engine';
  import { session } from '$lib/session.svelte';
  import { db } from '$lib/db/store.svelte';
  import { sync } from '$lib/sync/engine.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { prefs, type FontSize, type Theme } from '$lib/prefs.svelte';
  import { thaiByLanguage } from '$lib/data/foods';
  import { deleteAccount, exportAll, exportMeals, saveSettings, signOut, syncNow } from '$lib/actions';
  import type { Profile } from '../../shared/records';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  type Page = 'main' | 'profile' | 'goal' | 'checkin' | 'science' | 'delete';
  let page = $state<Page>('main');
  let busy = $state(false);
  let unsent = $state(false);
  let typed = $state('');
  let error = $state('');
  let plan = $state<PlanPage | null>(null);

  const email = $derived(session.user?.email ?? '');
  const matches = $derived(!!email && typed.trim().toLowerCase() === email.toLowerCase());
  const profile = $derived(db.get('profile', 'profile'));
  const social = $derived(db.get('social', 'social'));
  const remind = $derived(prefs.remind);
  const offline = $derived(sync.status === 'offline');

  $effect(() => {
    if (open) untrack(() => { page = 'main'; busy = false; unsent = false; typed = ''; error = ''; });
  });

  const TITLES: Record<Page, string> = { main: t.settings.title, profile: t.settings.profile, goal: t.settings.goal, checkin: t.settings.checkinDay, science: t.science.title, delete: t.account.delete };
  // switches, units, the check-in day: one field of the profile, no plan change (the day's mode is read per day)
  const set = (c: Partial<Profile>) => { if (profile) saveSettings({ ...$state.snapshot(profile), ...c }); };
  const setRemind = (c: Partial<typeof prefs.remind>) => (prefs.remind = { ...prefs.remind, ...c });

  async function leave(force = false) {
    busy = true;
    // reloads the app when it works; stops here when changes could not be sent
    if ((await signOut(force)) === 'unsent') unsent = true;
    busy = false;
  }
  async function remove() {
    if (!matches) return;
    busy = true;
    error = '';
    if ((await deleteAccount()) !== 'ok') error = t.account.deleteFailed;
    busy = false;
  }
  async function share(f: () => Promise<'shared' | 'saved' | 'cancelled'>) {
    if ((await f()) === 'saved') toast(t.settings.exported);
  }
  function report() {
    const body = t.settings.reportBody(__APP_VERSION__, navigator.userAgent);
    location.href = `mailto:${import.meta.env.VITE_SUPPORT_EMAIL ?? ''}?subject=${encodeURIComponent(t.settings.reportSubject)}&body=${encodeURIComponent(body)}`;
  }
  /** The friends profile lives over the food map (S1b): open them both. */
  function friends() {
    open = false;
    sheets.friends = true;
    sheets.profile = {};
  }

  const THEMES: { value: Theme; label: string }[] = [{ value: 'system', label: t.prefs.system }, { value: 'light', label: t.prefs.light }, { value: 'dark', label: t.prefs.dark }];
  const SIZES: { value: FontSize; label: string }[] = [{ value: 'system', label: t.prefs.system }, { value: 'm', label: t.prefs.m }, { value: 'l', label: t.prefs.l }, { value: 'xl', label: t.prefs.xl }];
  const hour = `${String(V.easyAdds.fromHour).padStart(2, '0')}:00`;
</script>

{#snippet heading(text: string, line?: string)}
  <h3 class="text-caption text-ink-2 font-semibold mt-8 mb-1 first:mt-0">{text}</h3>
  {#if line}<p class="text-caption text-ink-2 mb-1">{line}</p>{/if}
{/snippet}
{#snippet chevron()}<ChevronRight class="text-ink-2 flex-none" size={20} strokeWidth={2} aria-hidden="true" />{/snippet}
{#snippet toggle(title: string, caption: string | undefined, checked: boolean, change: (v: boolean) => void, testid: string)}
  <Row {title} {caption} wrap>
    {#snippet trailing()}<Switch {checked} label={title} onchange={change} {testid} />{/snippet}
  </Row>
{/snippet}
<!-- a choice under its label, full width, with the hairline rows have -->
{#snippet choice(title: string, body: import('svelte').Snippet)}
  <div class="border-line flex flex-col gap-2 py-3 [*+&]:border-t">
    <span class="text-body font-semibold">{title}</span>
    {@render body()}
  </div>
{/snippet}

{#snippet footer()}
  {#if page === 'delete'}
    <Button variant="danger" size="lg" full disabled={!matches || busy} onclick={remove} data-testid="delete-confirm-button">
      {busy ? t.account.deleting : t.account.delete}
    </Button>
  {:else if plan}
    <Button variant="primary" size="lg" full disabled={!plan.ready()} onclick={() => plan?.save()} data-testid="set-save">{plan.label()}</Button>
  {/if}
{/snippet}

<!-- the sheet is already a surface, so the rows sit on it directly, on the gutter -->
<Sheet
  bind:open
  title={TITLES[page]}
  layer="base"
  testid="account-sheet"
  footer={page === 'delete' || page === 'profile' || page === 'goal' ? footer : undefined}
  onback={page !== 'main' && !busy ? () => (page = 'main') : undefined}
  backLabel={t.account.back}
>
  <!-- U1c: a page slides in from the right, and the main list back in from the left, as iOS pushes and pops -->
  {#key page}
  <div in:fly={{ x: page === 'main' ? -24 : 24, duration: dur('--d-settle') }}>
  {#if page === 'profile' || page === 'goal'}
    <PlanPage bind:this={plan} mode={page} done={() => (page = 'main')} />
  {:else if page === 'checkin' && profile}
    <p class="text-callout text-ink-2 mb-2">{t.settings.checkinDayLine}</p>
    <Options label={t.settings.checkinDay} value={profile.checkinWeekday} onchange={(v) => set({ checkinWeekday: v })} options={t.train.weekdays.map((label, value) => ({ value, label }))} testid="set-checkin-day" />
  {:else if page === 'science'}
    <Science />
  {:else if page === 'delete'}
    <p class="text-lead">{t.account.deleteLead}</p>
    <form class="mt-5 flex flex-col gap-2" onsubmit={(e) => { e.preventDefault(); void remove(); }}>
      <label for="delete-confirm" class="text-caption text-ink-2">{t.account.deleteConfirm}</label>
      <input id="delete-confirm" type="email" autocomplete="off" autocapitalize="off" spellcheck="false" bind:value={typed} class="input-field w-full" data-testid="delete-confirm" />
    </form>
    <p class="text-callout text-danger mt-3 min-h-5" role="alert">{error}</p>
  {:else}
    {#if profile}
      {@render heading(t.settings.you)}
      <div>
        <Row title={t.settings.profile} caption={t.settings.profileLine} onclick={() => (page = 'profile')} trailing={chevron} testid="set-profile" />
        <Row title={t.settings.goal} onclick={() => (page = 'goal')} trailing={chevron} testid="set-goal-open" />
        {#snippet units()}
          <Segmented label={t.settings.units} value={profile!.units} onchange={(v) => set({ units: v })} options={[{ value: 'metric', label: t.body.metric }, { value: 'imperial', label: t.body.imperial }]} />
        {/snippet}
        {@render choice(t.settings.units, units)}
      </div>

      {@render heading(t.settings.targets)}
      <div>
        {@render toggle(t.plan.even, t.settings.evenLine, profile.calorieMode === 'even', (v) => set({ calorieMode: v ? 'even' : 'matched' }), 'set-even')}
        <Row title={t.settings.checkinDay} caption={t.train.weekdays[profile.checkinWeekday]} onclick={() => (page = 'checkin')} trailing={chevron} testid="set-checkin" />
        <Row title={t.settings.how} onclick={() => (sheets.how = true)} trailing={chevron} testid="set-how" />
      </div>
    {/if}

    {@render heading(t.settings.reminders, t.settings.remindersLine)}
    <div>
      {@render toggle(t.settings.remindMeal, undefined, remind.meal, (v) => setRemind({ meal: v }), 'set-remind-meal')}
      {#if remind.meal}
        <div class="border-line flex min-h-16 items-center gap-3 border-t py-2">
          <label for="remind-at" class="text-body min-w-0 flex-1 font-semibold">{t.settings.remindMealAt}</label>
          <input id="remind-at" type="time" value={remind.mealAt} onchange={(e) => { if (/^\d\d:\d\d$/.test(e.currentTarget.value)) setRemind({ mealAt: e.currentTarget.value }); }} class="input-field num w-32" data-testid="set-remind-at" />
        </div>
      {/if}
      {@render toggle(t.settings.remindWeigh, undefined, remind.weigh, (v) => setRemind({ weigh: v }), 'set-remind-weigh')}
      {@render toggle(t.settings.remindCheckin, undefined, remind.checkin, (v) => setRemind({ checkin: v }), 'set-remind-checkin')}
      {@render toggle(t.settings.remindEasy, t.settings.remindEasyLine(hour), remind.easy, (v) => setRemind({ easy: v }), 'set-remind-easy')}
    </div>

    {@render heading(t.settings.food)}
    <div>{@render toggle(t.settings.thai, t.settings.thaiLine, prefs.thai ?? thaiByLanguage(), (v) => (prefs.thai = v), 'set-thai')}</div>

    {@render heading(t.settings.display)}
    <div>
      {#snippet theme()}<Segmented label={t.prefs.theme} bind:value={() => prefs.theme, (v) => (prefs.theme = v)} options={THEMES} />{/snippet}
      {@render choice(t.prefs.theme, theme)}
    </div>
    <!-- four sizes do not fit a segmented control at the largest text on the SE: rows, as the other longer choices -->
    <h4 class="text-body mt-3 font-semibold">{t.prefs.textSize}</h4>
    <Options label={t.prefs.textSize} value={prefs.fontSize} onchange={(v) => (prefs.fontSize = v)} options={SIZES} testid="set-text-size" />

    {@render heading(t.settings.data)}
    <div>
      <Row title={t.settings.exportAll} caption={t.settings.exportAllLine} onclick={() => share(exportAll)} testid="set-export-all" />
      <Row title={t.settings.exportMeals} caption={t.settings.exportMealsLine} onclick={() => share(exportMeals)} testid="set-export-meals" />
      <Row title={t.account.backup} caption={offline ? t.settings.offline : db.pending > 0 ? t.account.waiting(num(db.pending)) : t.account.backedUp} wrap testid="set-backup">
        {#snippet trailing()}
          {#if db.pending > 0 && !offline}
            <Button size="sm" disabled={sync.status === 'syncing'} onclick={() => syncNow()} data-testid="set-sync">{t.settings.syncNow}</Button>
          {/if}
        {/snippet}
      </Row>
    </div>

    {@render heading(t.settings.about)}
    <div>
      <Row title={t.science.title} onclick={() => (page = 'science')} trailing={chevron} testid="set-science" />
      <Row title={t.settings.privacy} caption={t.settings.opensPage} onclick={() => window.open('/privacy.html', '_blank', 'noopener')} trailing={chevron} testid="set-privacy" />
      <Row title={t.settings.terms} caption={t.settings.opensPage} onclick={() => window.open('/terms.html', '_blank', 'noopener')} trailing={chevron} testid="set-terms" />
      <Row title={t.settings.report} caption={t.settings.reportLine} onclick={report} trailing={chevron} testid="set-report" />
      <Row title={t.settings.version} value={__APP_VERSION__} testid="set-version" />
    </div>

    {@render heading(t.settings.account)}
    <div>
      <Row title={t.account.email} caption={email} />
      <Row title={t.settings.friends} caption={social ? t.social.handle(social.handle) : undefined} onclick={friends} trailing={chevron} testid="set-friends" />
    </div>
    {#if unsent}
      <p class="text-callout text-attention mt-4" role="alert" data-testid="account-unsent">{t.account.unsent(num(db.pending))}</p>
    {/if}
    <!-- Sign out is the second action; Delete account is a quiet danger link under it, not its twin -->
    <div class="mt-6 flex flex-col items-start gap-2">
      {#if unsent}
        <Button variant="danger" full disabled={busy} onclick={() => leave(true)} data-testid="account-signout-anyway">{t.account.signOutAnyway}</Button>
      {:else}
        <Button full disabled={busy} onclick={() => leave()} data-testid="account-signout">{busy ? t.account.signingOut : t.account.signOut}</Button>
      {/if}
      <Button variant="danger" size="sm" class="-ml-4" disabled={busy} onclick={() => (page = 'delete')} data-testid="account-delete">{t.account.delete}</Button>
    </div>
  {/if}
  </div>
  {/key}
</Sheet>
