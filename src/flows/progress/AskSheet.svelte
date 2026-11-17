<!-- R2, Ask Ontrack (research/r2/ai-analytics 5: Oura's Advisor, WHOOP's Coach, Alma's Ask): questions about your own
     weeks, answered from the facts the engine worked out (numbers as slots, so every number is the engine's). Three
     suggested questions to start, a field for your own, the answers above it. It never sets a target: the check-in
     does. One line at the foot says what the answers are made of. -->
<script lang="ts">
  import { tick } from 'svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import ArrowUp from '@lucide/svelte/icons/arrow-up';
  import Sheet from '$lib/components/Sheet.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { askCoach, type CoachAnswer } from '$lib/coach';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import type { CoachFacts } from '../../../shared/coach';
  import { MAX_QUESTION } from '../../../shared/coach';

  let { open = $bindable(false), facts, localDate }: { open?: boolean; facts: CoachFacts; localDate: string } = $props();

  type Turn = { q: string; a: CoachAnswer | null };
  let turns = $state<Turn[]>([]);
  let draft = $state('');
  let list = $state<HTMLElement>();
  $effect(() => { if (!open) draft = ''; });

  async function ask(q: string) {
    const question = q.trim().slice(0, MAX_QUESTION);
    if (!question || turns.some((x) => !x.a)) return;
    haptic();
    draft = '';
    const turn: Turn = { q: question, a: null };
    turns.push(turn);
    await tick();
    // the sheet's own list scrolls, never the page (scrollIntoView pans iOS's whole viewport)
    list?.closest('.overflow-y-auto')?.scrollTo({ top: 1e6, behavior: 'smooth' });
    const a = await askCoach({ kind: 'ask', facts, question, localDate });
    const i = turns.findIndex((x) => x.q === question && !x.a);
    if (i >= 0) turns[i].a = a;
  }
  const busy = $derived(turns.some((x) => !x.a));
</script>

{#snippet footer()}
  <form class="flex items-center gap-2" onsubmit={(e) => { e.preventDefault(); void ask(draft); }}>
    <input
      type="text"
      bind:value={draft}
      maxlength={MAX_QUESTION}
      enterkeyhint="send"
      placeholder={t.ask.placeholder}
      aria-label={t.ask.placeholder}
      class="input-field min-w-0 flex-1 rounded-full"
      data-testid="ask-field"
    />
    <button type="submit" class="bg-action text-on-action active:bg-action-press grid size-14 flex-none place-items-center rounded-full transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.97] disabled:opacity-40" disabled={!draft.trim() || busy} aria-label={t.ask.send} data-testid="ask-send">
      <ArrowUp size={24} strokeWidth={2.25} aria-hidden="true" />
    </button>
  </form>
  <p class="text-caption text-ink-2 mt-2 text-center">{t.ask.caution}</p>
{/snippet}

<Sheet bind:open title={t.ask.title} layer="base" testid="ask-sheet" {footer}>
  {#if !turns.length}
    <p class="text-body text-ink-2">{t.ask.lead}</p>
    <div class="mt-4 flex flex-col items-start gap-2" data-testid="ask-chips">
      {#each t.ask.chips as c (c)}
        <button type="button" class="bg-surface-2 active:bg-surface-3 text-callout min-h-11 rounded-full px-4 text-left font-semibold transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.97]" onclick={() => ask(c)} data-testid="ask-chip">{c}</button>
      {/each}
    </div>
  {/if}
  <div class="flex flex-col gap-4" bind:this={list} aria-live="polite">
    {#each turns as turn, i (i)}
      <div class="flex flex-col gap-2">
        <p class="bg-surface-2 text-body max-w-[85%] self-end rounded-md rounded-br-xs px-4 py-2.5" data-testid="ask-q">{turn.q}</p>
        {#if turn.a}
          <div class="appear max-w-[92%]" data-testid="ask-a">
            {#if turn.a.text.headline}<p class="text-subhead">{turn.a.text.headline}</p>{/if}
            {#each turn.a.text.lines as line, k (k)}<p class="text-body mt-1">{line}</p>{/each}
            {#if turn.a.source === 'ai'}<p class="text-caption text-ink-2 mt-2 flex items-center gap-1"><Sparkles size={14} strokeWidth={2.25} aria-hidden="true" />{t.coach.written}</p>{/if}
          </div>
        {:else}
          <div class="flex w-3/4 flex-col gap-2" aria-label={t.ask.thinking}>
            <Skeleton class="h-4 w-full rounded-xs" />
            <Skeleton class="h-4 w-2/3 rounded-xs" />
          </div>
        {/if}
      </div>
    {/each}
  </div>
</Sheet>
