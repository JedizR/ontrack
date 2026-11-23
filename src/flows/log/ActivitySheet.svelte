<!-- R5, the owner: a rest day's box asks "Any activity today?". What, how long and how hard, prefilled to one tap (Oura's
     Add an activity: type first, 30 minutes, moderate), with the energy it adds. It is saved for that day only, as a session
     marked Done on the day's log: the program and the weeks after it do not change. -->
<script lang="ts">
  import type { Component } from 'svelte';
  import Footprints from '@lucide/svelte/icons/footprints';
  import HeartPulse from '@lucide/svelte/icons/heart-pulse';
  import Bike from '@lucide/svelte/icons/bike';
  import Dumbbell from '@lucide/svelte/icons/dumbbell';
  import Volleyball from '@lucide/svelte/icons/volleyball';
  import Flower from '@lucide/svelte/icons/flower-2';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { db } from '$lib/db/store.svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { logSession, undoToast, clearSessionLog } from '$lib/actions';
  import { planFor } from '$lib/model/day';
  import { weekdayOf } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { sessionKcal } from '$lib/model/engine';
  import { dur, haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import type { Session } from '../../../shared/records';

  type Kind = keyof typeof t.activity.kinds;
  const KINDS: { key: Kind; type: Session['type']; icon: Component<{ size?: number; strokeWidth?: number }> }[] = [
    { key: 'walk', type: 'walk', icon: Footprints },
    { key: 'run', type: 'cardio', icon: HeartPulse },
    { key: 'ride', type: 'cardio', icon: Bike },
    { key: 'strength', type: 'strength', icon: Dumbbell },
    { key: 'sport', type: 'sport', icon: Volleyball },
    { key: 'yoga', type: 'mobility', icon: Flower },
  ];
  const MINUTES = [15, 30, 45, 60, 90];

  let kind = $state<Kind>('walk');
  let minutes = $state(30);
  let intensity = $state<Session['intensity']>('moderate');
  $effect(() => { if (sheets.activity) { kind = 'walk'; minutes = 30; intensity = 'moderate'; } });

  const date = $derived(sheets.activity);
  const plan = $derived(date ? planFor(db.live('plan'), date) : undefined);
  const session = $derived<Session | null>(date ? { key: 'x', weekday: weekdayOf(date), name: t.activity.kinds[kind], type: KINDS.find((k) => k.key === kind)!.type, minutes, intensity } : null);
  const kcal = $derived(plan && session ? Math.round(sessionKcal(session, plan.weightKg)) : 0);
  const tray = $derived(prefs.tray);

  function add() {
    if (!date || !session) return;
    // a key of its own, so two activities on one day are two records
    const key = `x${Date.now().toString(36)}`;
    const extra = { ...session, key };
    const day = date; // the sheet's date goes when it closes
    haptic();
    sheets.activity = null;
    // written as the sheet finishes leaving, so Today inks the new box in from nothing (as Done does)
    setTimeout(() => {
      logSession({ date: day, sessionKey: key, status: 'done', extra });
      sheets.inked = key;
      undoToast(t.activity.added(extra.name), () => clearSessionLog(day, key));
    }, dur('--d-leave'));
  }
</script>

{#snippet footer()}
  <!-- the payoff, always in sight over the action: the engine's own number for this activity -->
  <p class="text-callout num text-ink-2 mb-3 text-center" aria-live="polite" data-testid="activity-kcal">{t.activity.adds(num(kcal))}</p>
  <Button variant="primary" size="lg" full disabled={!session} onclick={add} data-testid="activity-add">{t.activity.add}</Button>
{/snippet}

<Sheet bind:open={() => sheets.activity !== null, (v) => { if (!v) sheets.activity = null; }} title={t.activity.title} layer="base" testid="activity-sheet" {footer}>
  <p class="text-callout text-ink-2">{t.activity.lead}</p>
  <h3 class="text-eyebrow text-ink-2 mt-5 mb-2">{t.activity.kind}</h3>
  <div class="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t.activity.kind} data-testid="activity-kind">
    {#each KINDS as k (k.key)}
      {@const on = k.key === kind}
      {@const Icon = k.icon}
      <button type="button" role="radio" aria-checked={on} class="flex min-h-18 min-w-0 flex-col items-center justify-center gap-1.5 {tray ? 'rounded-md' : 'rounded-sm'} px-2 py-2 transition-[background-color,color] duration-[var(--d-ui)] {on ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink active:bg-surface-3'}" onclick={() => { if (!on) { haptic(); kind = k.key; } }} data-testid="activity-{k.key}">
        <Icon size={22} strokeWidth={2} />
        <span class="text-callout font-semibold">{t.activity.kinds[k.key]}</span>
      </button>
    {/each}
  </div>
  <h3 class="text-eyebrow text-ink-2 mt-5 mb-2">{t.activity.minutes}</h3>
  <!-- five quick picks as tiles (a segmented control holds at most four) -->
  <div class="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label={t.activity.minutes} data-testid="activity-minutes">
    {#each MINUTES as m (m)}
      {@const on = minutes === m}
      <button type="button" role="radio" aria-checked={on} class="text-callout num min-h-11 min-w-0 {tray ? 'rounded-sm' : 'rounded-xs'} font-semibold transition-[background-color,color] duration-[var(--d-ui)] {on ? 'bg-ink text-canvas' : 'bg-surface-2 text-ink active:bg-surface-3'}" onclick={() => { if (!on) { haptic(); minutes = m; } }}>{num(m)}</button>
    {/each}
  </div>
  <h3 class="text-eyebrow text-ink-2 mt-5 mb-2">{t.activity.effort}</h3>
  <div data-testid="activity-effort"><Segmented bind:value={intensity} label={t.activity.effort} options={(['light', 'moderate', 'hard'] as const).map((i) => ({ value: i, label: t.train.intensities[i] }))} /></div>
</Sheet>
