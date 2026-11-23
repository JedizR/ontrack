<!-- R5, the owner: the plans, after Save the plan, at a free limit and from a Pro feature. Built from the paywalls that
     work (Cal AI's highlighted yearly with its monthly price, Perplexity's Free and Pro table, Flo's honest way to stay
     free): one hero, the two plan cards with yearly picked beside the action, then Free against Pro in one small table;
     one ink action, and Continue with Free as a plain button of the same width under it. Back from Stripe it says welcome. -->
<script lang="ts">
  import { fly } from 'svelte/transition';
  import Check from '@lucide/svelte/icons/check';
  import Minus from '@lucide/svelte/icons/minus';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Burst from '$lib/components/Burst.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { membership } from '$lib/billing.svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { haptic, dur } from '$lib/haptics';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import { toast } from 'svelte-sonner';
  import { FREE_AI_PER_DAY, PRICES, TRIAL_DAYS, type Interval } from '../../../shared/plans';

  const p = t.paywall;
  const from = $derived(sheets.paywall?.from ?? 'onboarding');
  const welcome = $derived(from === 'welcome');
  const head = $derived(p.heads[from === 'welcome' ? 'onboarding' : from]);
  let pick = $state<Interval>('year');
  $effect(() => { if (sheets.paywall) pick = 'year'; });
  const tray = $derived(prefs.tray);

  const saving = Math.round((1 - PRICES.year / (PRICES.month * 12)) * 100);
  const perMonth = Math.round(PRICES.year / 12);
  const days = num(TRIAL_DAYS);
  // the table: a string is the cell's words, true a check, false a dash
  const ROWS: { label: string; free: string | boolean; pro: string | boolean }[] = [
    { label: p.rows.ai, free: p.perDay(num(FREE_AI_PER_DAY)), pro: p.unlimited },
    { label: p.rows.logging, free: true, pro: true },
    { label: p.rows.targets, free: true, pro: true },
    { label: p.rows.training, free: true, pro: true },
    { label: p.rows.recap, free: p.basic, pro: p.byAi },
    { label: p.rows.ask, free: false, pro: true },
    { label: p.rows.adjust, free: false, pro: true },
    { label: p.rows.friends, free: true, pro: true },
  ];

  const close = () => (sheets.paywall = null);
  async function go() {
    haptic();
    if (!(await membership.checkout(pick))) toast(p.unavailable);
  }
</script>

{#snippet cell(v: string | boolean, pro: boolean)}
  {#if v === true}<span class="{pro ? 'text-accent-ink' : 'text-ink'} inline-grid" role="img" aria-label={p.yes}><Check size={18} strokeWidth={2.75} aria-hidden="true" /></span>
  {:else if v === false}<span class="text-ink-3 inline-grid" role="img" aria-label={p.no}><Minus size={18} strokeWidth={2.5} aria-hidden="true" /></span>
  {:else}<span class="text-caption text-center font-semibold {pro ? 'text-accent-ink' : 'text-ink-2'}">{v}</span>{/if}
{/snippet}

{#snippet footer()}
  {#if welcome}
    <Button variant="primary" size="lg" full onclick={close} data-testid="paywall-done">{p.welcomeGo}</Button>
  {:else}
    <Button variant="primary" size="lg" full disabled={membership.busy} onclick={go} data-testid="paywall-go">{membership.busy ? p.opening : p.go(days)}</Button>
    <Button variant="plain" size="lg" full class="mt-1" onclick={close} data-testid="paywall-free">{p.free}</Button>
  {/if}
{/snippet}

<Sheet bind:open={() => sheets.paywall !== null, (v) => { if (!v) sheets.paywall = null; }} title={welcome ? p.welcomeTitle : p.title} testid="paywall" {footer}>
  {#if welcome}
    <div class="rounded-lg p-6 text-center [background:var(--grad-hero)]" data-theme="light" data-testid="paywall-welcome">
      <span class="bg-success text-night relative mx-auto grid size-16 place-items-center rounded-full"><Check size={32} strokeWidth={3} aria-hidden="true" /><Burst /></span>
      <p class="text-heading mt-4 text-balance">{p.welcomeHead}</p>
      <p class="text-callout text-night/70 mt-2 text-balance">{p.welcomeLine}</p>
    </div>
  {:else}
    <!-- the one gradient: why Pro, in the words of where the sheet was opened -->
    <div class="rounded-lg p-5 [background:var(--grad-hero)]" data-theme="light" data-testid="paywall-hero">
      <span class="liquid-clear text-caption text-night inline-flex items-center gap-1 rounded-full py-0.5 pr-2.5 pl-2 font-semibold"><Sparkles size={14} strokeWidth={2.25} aria-hidden="true" />{p.badge}</span>
      <p class="text-heading mt-3 text-balance">{head[0]}</p>
      <p class="text-callout text-night/70 mt-1.5 text-balance">{head[1]}</p>
    </div>

    <!-- the two plans: yearly picked, with its month's price and the saving -->
    <div class="mt-5 grid grid-cols-2 gap-2" role="radiogroup" aria-label={p.plans} data-testid="paywall-plans">
      {#each ['year', 'month'] as const as k (k)}
        {@const on = pick === k}
        <button type="button" role="radio" aria-checked={on} class="relative flex min-w-0 flex-col items-start gap-0.5 {tray ? 'rounded-md' : 'rounded-sm'} px-4 pt-4 pb-3 text-left transition-[background-color,color] duration-[var(--d-ui)] {on ? 'bg-action text-on-action' : 'bg-surface-2 text-ink active:bg-surface-3'}" onclick={() => { if (!on) { haptic(); pick = k; } }} data-testid="paywall-{k}">
          {#if k === 'year'}<span class="bg-accent text-on-accent text-caption absolute -top-3 right-3 rounded-full px-2 py-0.5 font-semibold" data-testid="paywall-save">{p.save(num(saving))}</span>{/if}
          <span class="text-callout font-semibold {on ? 'opacity-70' : 'text-ink-2'}">{k === 'year' ? p.yearly : p.monthly}</span>
          <span class="text-subhead num">{p.baht(num(PRICES[k]))}</span>
          <span class="text-caption num {on ? 'opacity-70' : 'text-ink-2'}">{k === 'year' ? p.perMonthOf(num(perMonth)) : t.after.aMonth}</span>
        </button>
      {/each}
    </div>
    <p class="text-caption text-ink-2 mt-3" data-testid="paywall-fine">{p.fine(days, p.baht(num(PRICES[pick])), pick === 'year' ? t.after.aYear : t.after.aMonth)}</p>
    <!-- Free against Pro, Pro's column in violet (the brand) -->
    <div class="bg-surface-2 mt-5 {tray ? 'rounded-md' : 'rounded-sm'} px-4 py-1" role="table" aria-label={p.compare} data-testid="paywall-table">
      <div class="text-eyebrow text-ink-2 grid grid-cols-[1fr_4.5rem_4.5rem] items-center gap-2 py-2.5" role="row">
        <span role="columnheader">{p.feature}</span><span class="text-center" role="columnheader">{p.freeName}</span><span class="text-accent-ink text-center" role="columnheader">{p.proName}</span>
      </div>
      {#each ROWS as r, i (r.label)}
        <div class="border-line grid min-h-10 grid-cols-[1fr_4.5rem_4.5rem] items-center gap-2 border-t py-1.5" role="row" in:fly={{ y: 6, duration: dur('--d-ui'), delay: dur('--d-ui') && i * 30 }}>
          <span class="text-callout" role="rowheader">{r.label}</span>
          <span class="grid justify-items-center" role="cell">{@render cell(r.free, false)}</span>
          <span class="grid justify-items-center" role="cell">{@render cell(r.pro, true)}</span>
        </div>
      {/each}
    </div>

  {/if}
</Sheet>
