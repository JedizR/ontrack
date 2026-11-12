<!-- SCREENS.md section 4, "Your number so far": the pinned card from the daily movement question on. The engine's own
     rows answered so far, with the latest row and what it added; the digits count from the last value shown, so the
     number grows on the tap that answers and holds still as the next screen slides in. Information, not an action:
     neither violet nor green. -->
<script lang="ts" module>
  /** the value the card last showed, across screens; Your plan's hero counts up from it */
  export const shown = { last: 0 };
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { num } from '$lib/model/format';
  import { dur } from '$lib/haptics';
  import { t } from '$lib/i18n';
  import type { soFar } from './draft';

  let { now }: { now: NonNullable<ReturnType<typeof soFar>> } = $props();

  const value = new Tween(untrack(() => shown.last || now.value), { duration: dur(400), easing: cubicOut });
  $effect(() => {
    value.target = now.value;
    shown.last = now.value;
  });
  const LABEL = { bmr: t.plan.bmr, movement: t.plan.movement, training: t.plan.training };
</script>

<div class="bg-surface shadow-card flex min-h-18 items-center gap-4 rounded-md px-6 py-3" data-testid="so-far">
  <div class="min-w-0 flex-1">
    <p class="text-eyebrow text-ink-2">{t.onboarding.soFar}</p>
    <p class="text-caption text-ink-2 mt-1">
      {LABEL[now.row]}{#if now.added}{' '}<span class="text-ink num font-semibold" data-testid="so-far-added">+{num(now.added)} {t.after.kcal}</span>{/if}
    </p>
  </div>
  <p class="flex-none text-right" aria-hidden="true">
    <span class="text-heading num font-semibold" data-testid="so-far-value">{num(Math.round(value.current))}</span>
    <span class="text-caption text-ink-2">{t.after.kcal}</span>
  </p>
  <span class="sr-only" aria-live="polite">{t.onboarding.soFarLabel(num(now.value))}</span>
</div>
