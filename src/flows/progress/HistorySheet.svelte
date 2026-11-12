<!-- SCREENS.md section 9, History: every day from the account's first, newest first, under its month. A day opens in
     the Today view, where it can be edited (F11). -->
<script lang="ts">
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { view } from '$lib/view.svelte';
  import { addDays, dayTitle, daysBetween, monthTitle } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import type { Account, DayStats } from '$lib/model/progress';

  let { open = $bindable(false), acct }: { open?: boolean; acct: Account } = $props();

  // built while open and kept while the sheet slides away, so a closed sheet costs nothing
  let months = $state<{ title: string; days: DayStats[] }[]>([]);
  $effect(() => {
    if (!open) return;
    const out: { title: string; days: DayStats[] }[] = [];
    const n = daysBetween(acct.first ?? view.today, view.today);
    for (let i = 0; i <= n; i++) {
      const d = acct.day(addDays(view.today, -i));
      if (!d) continue;
      const title = monthTitle(d.date);
      if (out.at(-1)?.title !== title) out.push({ title, days: [] });
      out.at(-1)!.days.push(d);
    }
    months = out;
  });

  function show(date: string) {
    open = false;
    prefs.tab = 0;
    view.date = date;
    scrollTo({ top: 0 });
  }
</script>

<Sheet bind:open title={t.history.title} layer="base" testid="history-sheet">
  {#each months as m, i (m.title)}
    <h3 class="text-eyebrow text-ink-2 {i ? 'mt-6' : ''}">{m.title}</h3>
    <div class="mt-1">
      {#each m.days as d (d.date)}
        <Row title={dayTitle(d.date)} value={d.items ? num(Math.round(d.intake)) : undefined} onclick={() => show(d.date)} testid="history-day">
          {#snippet caption()}
            {#if d.onTrack}<span class="text-success-ink">{t.today.onTrack}</span>{:else if d.items}{t.checkin.target(num(d.target))}{:else}{t.history.nothing}{/if}
          {/snippet}
        </Row>
      {/each}
    </div>
  {/each}
</Sheet>
