<!-- SCREENS.md section 13, Profile (19 Nov): the header's person button opens it. One card of grey boxes, as each tab's top
     card without the gradient: who you are, three honest facts (friends, days logged, goal and pace), and the way to edit
     it. Friends open from their box; Settings is the button pinned at the foot. Mounts the Edit profile sheet, which the
     food map and the friends panel open too, so there is only ever one. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Settings from '@lucide/svelte/icons/settings';
  import Pencil from '@lucide/svelte/icons/pencil';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Count from '$lib/components/Count.svelte';
  import Canvas from '../../settings/Canvas.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';
  import { kgPerWeek, planFor } from '$lib/model/day';
  import { weightText } from '$lib/model/units';
  import { db } from '$lib/db/store.svelte';
  import { session } from '$lib/session.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { view } from '$lib/view.svelte';
  import { friends, refreshFriends, waiting } from '$lib/friends.svelte';
  import Avatar from './Avatar.svelte';
  import ProfileSheet from './ProfileSheet.svelte';

  const social = $derived(db.get('social', 'social'));
  const profile = $derived(db.get('profile', 'profile'));
  const plan = $derived(planFor(db.live('plan'), view.today));
  const name = $derived(social?.name ?? session.user?.email ?? '');
  const count = $derived(friends.list.filter((f) => f.status === 'friend').length);
  // a day counts once it has a meal, however many: what was logged, never what was missed
  const days = $derived(new Set(db.live('meal').map((m) => m.data.date)).size);
  const pace = $derived(plan && profile && plan.goal !== 'maintain' ? t.profile.perWeek(weightText(kgPerWeek(plan, profile.sex, profile.calorieMode), profile.units)) : '');
  const requests = $derived(waiting());

  // the friends list is the server's: ask when the page opens
  $effect(() => { if (sheets.me && social) untrack(() => void refreshFriends()); });

  function openFriends() {
    sheets.me = false;
    sheets.friends = true;
  }
  // Settings replaces this page; its Back chevron comes back here
  function openSettings() {
    sheets.me = false;
    sheets.account = true;
  }
</script>

{#snippet box(label: string, value: string | number, cap: string)}
  <span class="text-caption text-ink-2">{label}</span>
  <span class="text-subhead num">{#if typeof value === 'number'}<Count {value} />{:else}{value}{/if}</span>
  {#if cap}<span class="text-caption text-ink-2">{cap}</span>{/if}
{/snippet}
{#snippet footer()}
  <Button size="lg" full onclick={openSettings} data-testid="me-settings"><Settings size={20} strokeWidth={2} aria-hidden="true" />{t.profile.settings}</Button>
{/snippet}

<Sheet bind:open={() => sheets.me, (v) => (sheets.me = v)} title={t.profile.title} layer="base" testid="me-sheet" {footer}>
  <Canvas footer>
    <section class="bg-surface shadow-card flex flex-col gap-2 rounded-xl p-2" aria-label={t.profile.title} data-testid="me-card">
      <div class="bg-surface-2 rounded-t-sheet flex items-center gap-4 rounded-b-md p-5 [@media(max-height:620px)]:p-3" data-testid="me-head">
        <Avatar {name} local={social?.photo ?? null} size="lg" class="[@media(max-height:620px)]:size-14" />
        <div class="min-w-0 flex-1">
          <p class="text-subhead truncate" data-testid="me-name">{name}</p>
          <p class="text-callout text-ink-2 truncate">{social ? t.social.handle(social.handle) : t.profile.noHandle}</p>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button type="button" class="bg-surface-2 active:bg-surface-3 flex min-h-[var(--s-16)] min-w-0 flex-col justify-center rounded-md px-4 py-2 text-left transition-colors duration-[var(--d-press)]" aria-label={`${t.social.open}, ${num(count)}${requests ? `, ${t.social.requests(num(requests))}` : ''}`} onclick={openFriends} data-testid="me-friends">
          {@render box(t.profile.friends, count, requests ? t.profile.waiting(num(requests)) : '')}
        </button>
        <div class="bg-surface-2 flex min-h-[var(--s-16)] min-w-0 flex-col justify-center rounded-md px-4 py-2" data-testid="me-days">
          {@render box(t.profile.days, days, '')}
        </div>
      </div>
      <div class="bg-surface-2 flex min-h-[var(--s-16)] min-w-0 items-center justify-between gap-3 rounded-md px-4 py-2" data-testid="me-goal">
        <div class="flex min-w-0 flex-col"><span class="text-caption text-ink-2">{t.profile.goal}</span><span class="text-subhead">{plan ? t.goal[plan.goal] : ''}</span></div>
        {#if pace}<span class="text-caption text-ink-2 max-w-[45%] text-right">{pace}</span>{/if}
      </div>

      <button type="button" class="bg-surface-2 active:bg-surface-3 flex min-h-14 items-center gap-3 rounded-t-md rounded-b-sheet px-5 py-3 text-left transition-colors duration-[var(--d-press)]" onclick={() => (sheets.profile = {})} data-testid="me-edit">
        <Pencil class="flex-none" size={20} strokeWidth={2} aria-hidden="true" />
        <span class="min-w-0 flex-1">
          <span class="text-body block font-semibold">{social ? t.profile.edit : t.social.setupAction}</span>
          <span class="text-callout text-ink-2 block">{social ? t.profile.editLine : t.profile.setupLine}</span>
        </span>
        <ChevronRight class="text-ink-2 flex-none" size={20} strokeWidth={2.25} aria-hidden="true" />
      </button>
    </section>
  </Canvas>
</Sheet>

<ProfileSheet />
