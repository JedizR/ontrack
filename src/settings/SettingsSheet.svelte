<!-- SCREENS.md section 11, Settings (M9a), reworked 19 Nov: groups as white cards of grey boxes on the canvas (no gradient), the
     most used first, the account last. Every row says what it is and what it is now; a switch is the whole box. A switch, a segmented choice or a time saves on
     the tap; Body details, Goal and pace, Check-in day, The science and Delete account open a page inside the sheet. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { fly } from 'svelte/transition';
  import { dur } from '$lib/haptics';
  import { toast } from 'svelte-sonner';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Options from './Options.svelte';
  import Box from './Box.svelte';
  import Choices from './Choices.svelte';
  import Group from './Group.svelte';
  import Canvas from './Canvas.svelte';
  import PlanPage from './PlanPage.svelte';
  import Science from './Science.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';
  import { V } from '$lib/model/engine';
  import { session } from '$lib/session.svelte';
  import { db } from '$lib/db/store.svelte';
  import { sync } from '$lib/sync/engine.svelte';
  import { view } from '$lib/view.svelte';
  import { planFor } from '$lib/model/day';
  import { sheets } from '$lib/sheets.svelte';
  import { prefs, type FontSize, type Look, type Theme } from '$lib/prefs.svelte';
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
  const now = $derived(planFor(db.live('plan'), view.today));
  const remind = $derived(prefs.remind);
  const offline = $derived(sync.status === 'offline');

  $effect(() => {
    if (open) untrack(() => { page = 'main'; busy = false; unsent = false; typed = ''; error = ''; });
  });

  const TITLES: Record<Page, string> = { main: t.settings.title, profile: t.settings.profile, goal: t.settings.goal, checkin: t.settings.checkinDay, science: t.science.title, delete: t.account.delete };
  // switches, units, the check-in day: one field of the profile, no plan change (the day's mode is read per day)
  const set = (c: Partial<Profile>) => { if (profile) saveSettings({ ...$state.snapshot(profile), ...c }); };
  const setRemind = (c: Partial<typeof prefs.remind>) => (prefs.remind = { ...prefs.remind, ...c });

  // Settings opens from the Profile page: its Back goes there
  function toProfile() {
    open = false;
    sheets.me = true;
  }

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

  const LOOKS: { value: Look; label: string }[] = [{ value: 'default', label: t.prefs.looks.default }, { value: 'curvy', label: t.prefs.looks.curvy }];
  const THEMES: { value: Theme; label: string }[] = [{ value: 'system', label: t.prefs.system }, { value: 'light', label: t.prefs.light }, { value: 'dark', label: t.prefs.dark }];
  const SIZES: { value: FontSize; label: string }[] = [{ value: 'system', label: t.prefs.system }, { value: 'm', label: t.prefs.m }, { value: 'l', label: t.prefs.l }, { value: 'xl', label: t.prefs.xl }];
  const hour = `${String(V.easyAdds.fromHour).padStart(2, '0')}:00`;
</script>

{#snippet pick(title: string, body: import('svelte').Snippet)}
  <div><p class="text-callout text-ink-2 px-4 pt-3 pb-2 font-semibold">{title}</p>{@render body()}</div>
{/snippet}
{#snippet units()}<Segmented label={t.settings.units} value={profile!.units} onchange={(v) => set({ units: v })} options={[{ value: 'metric', label: t.body.metric }, { value: 'imperial', label: t.body.imperial }]} />{/snippet}
{#snippet theme()}<Segmented label={t.prefs.theme} bind:value={() => prefs.theme, (v) => (prefs.theme = v)} options={THEMES} />{/snippet}
<!-- four sizes do not fit a segmented control at the largest text on the SE: two boxes to a line -->
{#snippet size()}<Choices label={t.prefs.textSize} value={prefs.fontSize} onchange={(v) => (prefs.fontSize = v)} options={SIZES} testid="set-text-size" />{/snippet}

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
  onback={page !== 'main' ? (busy ? undefined : () => (page = 'main')) : toProfile}
  backLabel={page === 'main' ? t.profile.title : t.account.back}
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
    <Canvas>
      <!-- the owner, 20 Nov: the app's style first, on every device, signed in or not -->
      <Group id="set-g-look" title={t.prefs.look}>
        <Segmented label={t.prefs.look} bind:value={() => prefs.look, (v) => (prefs.look = v)} options={LOOKS} />
      </Group>
      {#if profile}
        <Group id="set-g-display" title={t.settings.display}>
          {@render pick(t.settings.units, units)}
          {@render pick(t.prefs.theme, theme)}
          {@render pick(t.prefs.textSize, size)}
        </Group>
      {/if}

      <Group id="set-g-remind" title={t.settings.reminders} line={t.settings.remindersLine}>
        <Box title={t.settings.remindMeal} on={remind.meal} onchange={(v) => setRemind({ meal: v })} wrap testid="set-remind-meal" />
        {#if remind.meal}
          <Box title={t.settings.remindMealAt} labelFor="remind-at" wrap>
            {#snippet trailing()}
              <input id="remind-at" type="time" value={remind.mealAt} onchange={(e) => { if (/^\d\d:\d\d$/.test(e.currentTarget.value)) setRemind({ mealAt: e.currentTarget.value }); }} class="input-field num bg-surface! min-h-11! w-auto min-w-32" data-testid="set-remind-at" />
            {/snippet}
          </Box>
        {/if}
        <Box title={t.settings.remindWeigh} on={remind.weigh} onchange={(v) => setRemind({ weigh: v })} wrap testid="set-remind-weigh" />
        <Box title={t.settings.remindCheckin} on={remind.checkin} onchange={(v) => setRemind({ checkin: v })} wrap testid="set-remind-checkin" />
        <Box title={t.settings.remindEasy} caption={t.settings.remindEasyLine(hour)} on={remind.easy} onchange={(v) => setRemind({ easy: v })} wrap testid="set-remind-easy" />
      </Group>

      <Group id="set-g-food" title={t.settings.food}>
        <Box title={t.settings.thai} caption={t.settings.thaiLine} on={prefs.thai ?? thaiByLanguage()} onchange={(v) => (prefs.thai = v)} wrap testid="set-thai" />
      </Group>

      {#if profile}
        <Group id="set-g-plan" title={t.settings.you}>
          <Box title={t.settings.profile} caption={t.settings.profileLine} onclick={() => (page = 'profile')} chevron testid="set-profile" />
          <Box title={t.settings.goal} caption={now ? t.goal[now.goal] : undefined} onclick={() => (page = 'goal')} chevron testid="set-goal-open" />
          <Box title={t.plan.even} caption={t.settings.evenLine} on={profile.calorieMode === 'even'} onchange={(v) => set({ calorieMode: v ? 'even' : 'matched' })} wrap testid="set-even" />
          <Box title={t.settings.checkinDay} caption={t.train.weekdays[profile.checkinWeekday]} onclick={() => (page = 'checkin')} chevron testid="set-checkin" />
          <Box title={t.settings.how} onclick={() => (sheets.how = true)} chevron testid="set-how" />
        </Group>
      {/if}

      <Group id="set-g-data" title={t.settings.data}>
        <Box title={t.settings.exportAll} caption={t.settings.exportAllLine} onclick={() => share(exportAll)} testid="set-export-all" />
        <Box title={t.settings.exportMeals} caption={t.settings.exportMealsLine} onclick={() => share(exportMeals)} testid="set-export-meals" />
        <Box title={t.account.backup} caption={offline ? t.settings.offline : db.pending > 0 ? t.account.waiting(num(db.pending)) : t.account.backedUp} wrap testid="set-backup">
          {#snippet trailing()}
            {#if db.pending > 0 && !offline}
              <Button variant="surface" size="sm" disabled={sync.status === 'syncing'} onclick={() => syncNow()} data-testid="set-sync">{t.settings.syncNow}</Button>
            {/if}
          {/snippet}
        </Box>
      </Group>

      <Group id="set-g-about" title={t.settings.about}>
        <Box title={t.science.title} onclick={() => (page = 'science')} chevron testid="set-science" />
        <Box title={t.settings.privacy} caption={t.settings.opensPage} onclick={() => window.open('/privacy.html', '_blank', 'noopener')} chevron testid="set-privacy" />
        <Box title={t.settings.terms} caption={t.settings.opensPage} onclick={() => window.open('/terms.html', '_blank', 'noopener')} chevron testid="set-terms" />
        <Box title={t.settings.report} caption={t.settings.reportLine} onclick={report} chevron testid="set-report" />
        <Box title={t.settings.version} value={__APP_VERSION__} testid="set-version" />
      </Group>

      <Group id="set-g-account" title={t.settings.account}>
        <Box title={t.account.email} caption={email} />
        {#if unsent}
          <p class="text-callout text-attention px-4 pt-1" role="alert" data-testid="account-unsent">{t.account.unsent(num(db.pending))}</p>
          <Button variant="danger" full disabled={busy} onclick={() => leave(true)} data-testid="account-signout-anyway">{t.account.signOutAnyway}</Button>
        {:else}
          <Box title={busy ? t.account.signingOut : t.account.signOut} onclick={() => leave()} disabled={busy} testid="account-signout" />
        {/if}
        <!-- Sign out is the second action; Delete account is a quiet danger link under it, not its twin -->
        <Button variant="danger" size="sm" class="self-start" disabled={busy} onclick={() => (page = 'delete')} data-testid="account-delete">{t.account.delete}</Button>
      </Group>
    </Canvas>
  {/if}
  </div>
  {/key}
</Sheet>
