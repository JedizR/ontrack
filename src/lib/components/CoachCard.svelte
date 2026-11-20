<!-- R2, the coach's words on a card (research/r2/ai-analytics, numbers as slots): a headline and two or three lines about
     numbers the engine already worked out. Real AI text says so under it; the template stand-in says nothing. While it
     loads, lines of skeleton hold the card's height so nothing jumps. -->
<script lang="ts">
  import { prefs } from '$lib/prefs.svelte';
  import type { Snippet } from 'svelte';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Skeleton from './Skeleton.svelte';
  import { askCoach, type CoachAnswer } from '$lib/coach';
  import { t } from '$lib/i18n';
  import type { CoachRequest } from '../../../shared/coach';
  const curvy = $derived(prefs.look === 'curvy');

  let {
    req,
    eyebrow,
    testid,
    plain = false,
    action,
  }: {
    /** what to ask; null asks nothing (not enough data yet) */
    req: CoachRequest | null;
    eyebrow?: string;
    testid?: string;
    /** no card of its own: the words sit inside another surface (the finish screen, the check-in) */
    plain?: boolean;
    action?: Snippet;
  } = $props();

  let answer = $state<CoachAnswer | null>(null);
  let asked = '';
  $effect(() => {
    const key = req ? JSON.stringify(req) : '';
    if (key === asked) return;
    asked = key;
    answer = null;
    if (!req) return;
    const mine = key;
    void askCoach(req).then((a) => { if (asked === mine) answer = a; });
  });
</script>

{#if req}
  <section class={plain ? '' : curvy ? 'bg-surface shadow-card rounded-lg p-5' : 'bg-surface-2 rounded-lg p-5 [&_.bg-surface-2]:bg-surface'} aria-busy={!answer} data-testid={testid}>
    {#if eyebrow}<p class="text-eyebrow text-ink-2">{eyebrow}</p>{/if}
    {#if answer}
      <div class="appear">
        {#if answer.text.headline}<h3 class="text-subhead {eyebrow ? 'mt-2' : ''}" data-testid="coach-headline">{answer.text.headline}</h3>{/if}
        {#if answer.text.lines.length}
          <ul class="mt-2 flex flex-col gap-1.5" data-testid="coach-lines">
            {#each answer.text.lines as line, i (i)}<li class="text-callout">{line}</li>{/each}
          </ul>
        {/if}
        {#if answer.source === 'ai'}
          <p class="text-caption text-ink-2 mt-3 flex items-center gap-1" data-testid="coach-ai"><Sparkles size={14} strokeWidth={2.25} aria-hidden="true" />{t.coach.written}</p>
        {/if}
      </div>
    {:else}
      <div class="mt-2 flex flex-col gap-2" aria-hidden="true">
        <Skeleton class="h-5 w-2/3 rounded-xs" />
        <Skeleton class="h-4 w-full rounded-xs" />
        <Skeleton class="h-4 w-5/6 rounded-xs" />
      </div>
    {/if}
    {#if action}{@render action()}{/if}
  </section>
{/if}
