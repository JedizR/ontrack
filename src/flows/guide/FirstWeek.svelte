<!-- R6, the first-week guide (PRD F28): a status card under Today's hero in the plan's first 7 days. The head says how far
     along it is and why it matters (the first check-in tunes the target from these); three rows, one per step, each a
     grey tile that turns into the green check once the data shows it done. A step that can be done now carries a small
     Add; the workout points at Done on the hero rather than repeating it. The cross hides the guide, with Undo. -->
<script lang="ts">
  import type { Component } from 'svelte';
  import Check from '@lucide/svelte/icons/check';
  import Plus from '@lucide/svelte/icons/plus';
  import Scale from '@lucide/svelte/icons/scale';
  import X from '@lucide/svelte/icons/x';
  import Card from '$lib/components/Card.svelte';
  import CardHead from '$lib/components/CardHead.svelte';
  import Row from '$lib/components/Row.svelte';
  import Button from '$lib/components/Button.svelte';
  import TrainIcon from '$lib/components/TrainIcon.svelte';
  import { t } from '$lib/i18n';
  import { pop } from '$lib/haptics';
  import { sessionTitle } from '$lib/session-title';
  import { dayTitle, weekdayOf } from '$lib/model/dates';
  import { num } from '$lib/model/format';
  import type { Guide } from '$lib/model/guide';

  let { guide, onmeal, onweigh, ontrain, onhide, ...rest }: {
    guide: Guide;
    onmeal: () => void;
    onweigh: () => void;
    ontrain: () => void;
    onhide: () => void;
    [attr: string]: unknown;
  } = $props();

  type Step = { key: string; title: string; caption: string; done: boolean; icon: Component<{ size?: number; strokeWidth?: number }>; go?: () => void };
  const train = $derived.by(() => {
    const s = guide.train.step;
    if (s.kind === 'today') return { caption: t.guide.trainToday(sessionTitle(s.session)) };
    if (s.kind === 'next') return { caption: t.guide.trainNext(sessionTitle(s.session), t.train.weekdays[weekdayOf(s.date)]) };
    return { caption: t.guide.trainNone, go: ontrain };
  });
  const steps: Step[] = $derived([
    { key: 'meal', title: t.guide.meal, caption: t.guide.mealLine, done: guide.meal, icon: Plus, go: onmeal },
    { key: 'weigh', title: t.guide.weigh, caption: guide.weigh.tomorrow ? t.guide.weighTomorrow : t.guide.weighLine, done: guide.weigh.done, icon: Scale, go: guide.weigh.tomorrow ? undefined : onweigh },
    { key: 'train', title: t.guide.train, done: guide.train.done, icon: TrainIcon, ...train },
  ]);
  // "Nov 25" never splits across lines
  const when = $derived(dayTitle(guide.checkin).replace(/ (\d)/, ' $1'));
</script>

<Card {...rest}>
  <div class="flex items-start gap-2">
    <CardHead
      class="min-w-0 flex-1"
      eyebrow={t.guide.eyebrow}
      title={guide.finished ? t.guide.doneTitle : guide.done ? t.guide.count(num(guide.done)) : t.guide.start}
      line={guide.finished ? t.guide.doneLine(when) : t.guide.line(when)}
    />
    <!-- DESIGN.md section 7: close is a quiet glyph in a 44 rounded square, grey when pressed, as the sheets' close -->
    <button type="button" class="text-ink-2 active:bg-surface-2 -mt-2 -mr-2 grid size-11 flex-none place-items-center rounded-sm transition-colors duration-[var(--d-press)]" aria-label={t.guide.hide} onclick={onhide} data-testid="guide-hide">
      <X size={20} strokeWidth={2.25} aria-hidden="true" />
    </button>
  </div>
  <div class="mt-2 -mb-3">
    {#each steps as s (s.key)}
      <Row title={s.title} caption={s.done ? undefined : s.caption} wrap testid="guide-{s.key}">
        {#snippet leading()}
          {#if s.done}
            <div class="bg-success text-night grid size-full place-items-center" in:pop data-testid="guide-done"><Check size={22} strokeWidth={3} aria-hidden="true" /></div>
          {:else}
            {@const Icon = s.icon}
            <div class="bg-surface-2 text-ink-2 grid size-full place-items-center"><Icon size={22} strokeWidth={2.25} /></div>
          {/if}
        {/snippet}
        {#snippet trailing()}
          {#if !s.done && s.go}<Button size="sm" onclick={s.go} data-testid="guide-go-{s.key}">{t.guide.add}</Button>{/if}
        {/snippet}
      </Row>
    {/each}
  </div>
</Card>
