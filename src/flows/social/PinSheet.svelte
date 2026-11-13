<!-- SCREENS.md section 13, Meal photo sheet: a pin's meals, one at a time. The photo, who shared it and when, and its own
     nutrition in neutral words (never a target or the day's total, PRD section 7). Yours can come off the map here. -->
<script lang="ts">
  import { toast } from 'svelte-sonner';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';
  import { addDays, localDayOf, shortDate, timeOf, today } from '$lib/model/dates';
  import { unshareMeal } from '$lib/actions';
  import type { SharedMeal } from '$lib/backend/types';
  import Avatar from './Avatar.svelte';
  import Photo from './Photo.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import type { Who } from './who';

  let {
    meals = $bindable(null),
    whoOf,
    me,
  }: { meals?: SharedMeal[] | null; whoOf: (owner: string) => Who; me: string } = $props();

  let i = $state(0);
  $effect(() => { if (meals) i = Math.min(i, meals.length - 1); else i = 0; });
  const m = $derived(meals?.[i] ?? null);
  const who = $derived(m ? whoOf(m.owner) : null);

  function when(iso: string) {
    const day = localDayOf(iso);
    const time = timeOf(iso);
    const now = today();
    return day === now ? t.social.today(time) : day === addDays(now, -1) ? t.social.yesterday(time) : t.social.on(shortDate(day), time);
  }

  function unshare() {
    if (!m || !meals) return;
    unshareMeal(m.mealId);
    toast(t.social.unshared);
    const left = meals.filter((x) => x !== m);
    meals = left.length ? left : null;
  }
  const icon = 'active:bg-surface-2 text-ink grid size-11 place-items-center rounded-sm transition-colors duration-[var(--d-press)] disabled:text-ink-3';
</script>

<Sheet bind:open={() => meals !== null, (v) => { if (!v) meals = null; }} title={m?.title || t.social.sharedMeal} layer="base" testid="pin-sheet">
  {#if m && who}
    {#key m.owner + m.mealId}
      <Photo path={m.owner === me ? null : m.photo} local={m.owner === me ? m.mealId : null} alt={m.title || t.social.sharedMeal} coming={t.social.photoComing} class="aspect-[4/3] w-full rounded-md" />
    {/key}
    {#if meals && meals.length > 1}
      <div class="mt-2 flex items-center justify-center gap-2">
        <button type="button" class={icon} aria-label={t.social.previous} disabled={i === 0} onclick={() => i--} data-testid="pin-previous"><ChevronLeft size={24} strokeWidth={2} /></button>
        <span class="text-callout text-ink-2 num" data-testid="pin-page">{t.social.page(num(i + 1), num(meals.length))}</span>
        <button type="button" class={icon} aria-label={t.social.next} disabled={i === meals.length - 1} onclick={() => i++} data-testid="pin-next"><ChevronRight size={24} strokeWidth={2} /></button>
      </div>
    {/if}
    <div class="mt-4 flex items-center gap-3" data-testid="pin-who">
      <Avatar name={who.initial} path={who.path} local={who.local} size="md" />
      <div class="min-w-0">
        <p class="text-body truncate font-semibold">{who.name}</p>
        <p class="text-callout text-ink-2 num">{when(m.takenAt)}</p>
      </div>
    </div>
    <div class="mt-4" data-testid="pin-nutrition">
      <div class="flex items-baseline gap-2">
        <span class="text-display" data-testid="pin-kcal">{num(m.kcal)}</span>
        <span class="text-heading text-ink-2">{t.after.kcal}</span>
      </div>
      <p class="text-callout mt-2"><Facts facts={[t.after.proteinN(num(m.protein, 1)), t.after.carbsN(num(m.carbs, 1)), t.after.fatN(num(m.fat, 1))]} rest="text-ink-2" /></p>
    </div>
    {#if m.owner === me}
      <Button class="mt-6" onclick={unshare} data-testid="pin-unshare">{t.social.unshare}</Button>
    {/if}
  {/if}
</Sheet>
