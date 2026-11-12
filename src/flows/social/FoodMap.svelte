<!-- SCREENS.md section 13, Food map (S1b, PRD F17): full screen over the shell. The map (MapLibre GL JS on OpenFreeMap,
     loaded here, in its own chunk), a round back button top left, Go to where I am and Show all shared meals top right,
     the shared meals as photo pins with the person's avatar, grouped with "+N more", and the friends panel at the
     bottom. Instagram's story map for layout, Ontrack for the look: glass only on the round buttons and the chips. -->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import type { Map as MapLibre } from 'maplibre-gl';
  import ChevronLeft from '@lucide/svelte/icons/chevron-left';
  import LocateFixed from '@lucide/svelte/icons/locate-fixed';
  import Scan from '@lucide/svelte/icons/scan';
  import Button from '$lib/components/Button.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';
  import { totals } from '$lib/model/day';
  import { db } from '$lib/db/store.svelte';
  import { session } from '$lib/session.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { prefs } from '$lib/prefs.svelte';
  import { friends, refreshFriends } from '$lib/friends.svelte';
  import { mapMeals, type SocialError } from '$lib/actions';
  import { clusterPins, currentPosition, type Position } from '$lib/geo';
  import type { Friend, SharedMeal } from '$lib/backend/types';
  import FriendsPanel from './FriendsPanel.svelte';
  import PinSheet from './PinSheet.svelte';
  import ProfileSheet from './ProfileSheet.svelte';
  import FriendSheet from './FriendSheet.svelte';
  import Avatar from './Avatar.svelte';
  import Photo from './Photo.svelte';
  import { forgetPhotos } from './photos';

  // OpenFreeMap's styles: quiet grounds, so the photos carry the colour (docs/DECISIONS.md, S1b). Free, no key; MapLibre
  // shows the attribution the tiles carry.
  const STYLE = { light: 'https://tiles.openfreemap.org/styles/positron', dark: 'https://tiles.openfreemap.org/styles/dark' };
  const WORLD = { south: -90, west: -180, north: 90, east: 180 };
  // where a pin's point sits in its button: the photo frame (64) and the point (8) above the place
  const PIN_W = 64;

  type Status = 'loading' | 'ready' | 'offline' | 'nogl' | 'failed';
  let status = $state<Status>('loading');
  let mealsError = $state<SocialError | null>(null);
  let container: HTMLDivElement;
  let map = $state.raw<MapLibre | null>(null);
  let frame = $state(0); // moves with the map, so pins follow it
  let zoom = $state(1.5);
  let size = $state({ w: 0, h: 0 });
  let server = $state.raw<SharedMeal[]>([]);
  let here = $state<Position | null>(null);
  let note = $state<'ask' | 'off' | null>(null);
  let lowered = $state(0); // the lowered panel's height: fitted pins stay above it
  let raised = $state(false);
  let pinMeals = $state<SharedMeal[] | null>(null);
  let friend = $state<Friend | null>(null);

  const me = $derived(session.user?.userId ?? '');
  const social = $derived(db.get('social', 'social'));
  // your own shared meals come from the phone: at once, offline, and gone the moment you unshare
  const mine = $derived(
    db.live('meal').filter((r) => r.data.share && r.data.thumb).map((r): SharedMeal => {
      const sum = totals(r.data.items);
      const share = r.data.share!;
      return { owner: me, mealId: r.id, lat: share.lat, lng: share.lng, takenAt: r.data.at, title: r.data.title || r.data.items[0]?.name || '', kcal: Math.round(sum.kcal), protein: sum.protein, carbs: sum.carbs, fat: sum.fat, photo: null };
    }),
  );
  const pins = $derived([...mine, ...server.filter((s) => s.owner !== me)].sort((a, z) => z.takenAt.localeCompare(a.takenAt)));
  const clusters = $derived(clusterPins(pins, zoom));

  /** Who a pin belongs to: you, or a friend from the list (a name only until the list arrives). */
  function whoOf(owner: string): { name: string; path: string | null; local: string | null } {
    if (owner === me) return { name: t.social.you, path: null, local: social?.photo ?? null };
    const f = friends.list.find((p) => p.id === owner);
    return { name: f?.name ?? '', path: f?.photo ?? null, local: null };
  }

  function webgl() {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') ?? c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  async function start() {
    status = 'loading';
    if (!navigator.onLine) return void (status = 'offline');
    if (!webgl()) return void (status = 'nogl');
    try {
      const [maplibre, worker] = await Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'), import('maplibre-gl/dist/maplibre-gl.css')]);
      maplibre.setWorkerUrl(worker.default);
      map?.remove();
      // with nothing shared yet, the phone's part of the world: its time zone gives a longitude, 15 degrees an hour
      const m = new maplibre.Map({
        container,
        style: document.documentElement.dataset.theme === 'dark' ? STYLE.dark : STYLE.light,
        center: [-new Date().getTimezoneOffset() / 4, 20],
        zoom: 1.5,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
      });
      m.touchZoomRotate.disableRotation();
      m.on('move', () => frame++);
      m.on('moveend', () => (zoom = m.getZoom()));
      m.on('resize', () => (size = { w: container.clientWidth, h: container.clientHeight }));
      // a style that never loads is a failed map; a tile that fails later is not
      let styled = false;
      m.once('style.load', () => (styled = true));
      m.once('load', () => { if (status === 'loading') status = 'ready'; });
      m.on('error', () => { if (!styled) status = navigator.onLine ? 'failed' : 'offline'; });
      size = { w: container.clientWidth, h: container.clientHeight };
      map = m;
      await loadMeals();
      fit(false);
    } catch {
      status = navigator.onLine ? 'failed' : 'offline';
    }
  }

  // shortcut: one query for the whole world, the newest 500; query the box on moveend once friends share more than that
  async function loadMeals() {
    const r = await mapMeals(WORLD);
    mealsError = r.ok ? null : r.error;
    if (r.ok) server = r.value;
  }

  /** Every shared meal in view, above the lowered panel. */
  function fit(animate = true) {
    if (!map || !pins.length) return;
    let [w, s, e, n] = [180, 90, -180, -90];
    for (const p of pins) [w, s, e, n] = [Math.min(w, p.lng), Math.min(s, p.lat), Math.max(e, p.lng), Math.max(n, p.lat)];
    map.fitBounds([[w, s], [e, n]], { padding: { top: 140, bottom: lowered + 48, left: 56, right: 56 }, maxZoom: 14, duration: animate ? 600 : 0 });
  }

  async function locate(asked = false) {
    if (!prefs.locationOk && !asked) return void (note = 'ask');
    prefs.locationOk = true;
    note = null;
    const r = await currentPosition();
    if (r === 'denied') return void (note = 'off');
    if (r === 'unavailable') return;
    here = r;
    raised = false;
    map?.flyTo({ center: [r.lng, r.lat], zoom: Math.max(zoom, 13) });
  }

  /** Where a place is on screen now, or null when it is well outside. `_` is the frame, so this reruns as the map moves. */
  function at(p: Position, _: number) {
    if (!map) return null;
    const { x, y } = map.project([p.lng, p.lat]);
    return x < -PIN_W || y < -16 || x > size.w + PIN_W || y > size.h + 120 ? null : { x, y };
  }

  const close = () => (sheets.friends = false);

  // a friend accepted or removed changes whose meals are on the map
  const friendIds = $derived(friends.list.filter((f) => f.status === 'friend').map((f) => f.id).join());
  let seen: string | null = null;
  $effect(() => {
    const ids = friendIds;
    if (friends.status !== 'ready') return;
    untrack(() => { if (seen !== null && ids !== seen) void loadMeals(); seen = ids; });
  });

  const message = $derived.by(() => {
    if (status === 'offline') return { text: t.social.mapOffline };
    if (status === 'nogl') return { text: t.social.noGl };
    if (status === 'failed') return { text: t.social.mapFailed, action: t.social.retry, run: () => void start() };
    if (mealsError === 'auth') return { text: t.social.signedOut, action: t.social.signIn, run: () => (sheets.signin = true) };
    if (mealsError && mealsError !== 'offline') return { text: t.social.mapFailed, action: t.social.retry, run: () => void loadMeals() };
    if (note === 'off') return { text: t.social.locateOff };
    return null;
  });

  onMount(() => {
    // the page under the map must not scroll with it on iOS
    const was = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    void refreshFriends();
    void start();
    const online = () => { if (status === 'offline') void start(); };
    addEventListener('online', online);
    return () => {
      removeEventListener('online', online);
      document.documentElement.style.overflow = was;
      map?.remove();
      forgetPhotos();
    };
  });
</script>

{#snippet round(label: string, testid: string, onclick: () => void, Icon: typeof ChevronLeft)}
  <button type="button" class="glass text-ink pointer-events-auto grid size-12 place-items-center rounded-full transition-transform duration-[var(--d-press)] active:scale-[0.97]" aria-label={label} {onclick} data-testid={testid}>
    <Icon size={24} strokeWidth={2} aria-hidden="true" />
  </button>
{/snippet}

<div class="bg-canvas fixed inset-0 z-40 mx-auto max-w-[480px] overflow-hidden" style="--panel: {lowered}px" role="dialog" aria-modal="true" aria-label={t.social.open} data-testid="food-map">
  <!-- MapLibre makes its container position: relative, so the container fills a placed box rather than being placed -->
  <div class="absolute inset-0 {status === 'offline' || status === 'nogl' ? 'hidden' : ''}">
    <div bind:this={container} class="size-full" data-testid="map-canvas"></div>
  </div>

  <!-- the pins, over the map; older first so the newest is on top -->
  {#if map && status === 'ready'}
    <div class="pointer-events-none absolute inset-0 overflow-hidden" data-testid="pins">
      {#each [...clusters].reverse() as c (c.lead.owner + c.lead.mealId)}
        {@const p = at(c.lead, frame)}
        {#if p}
          {@const who = whoOf(c.lead.owner)}
          <div class="absolute top-0 left-0" style="transform: translate3d({p.x}px, {p.y}px, 0)">
            <button
              type="button"
              class="pointer-events-auto absolute top-0 left-0 flex w-max -translate-x-1/2 -translate-y-18 flex-col items-center transition-transform duration-[var(--d-press)] active:scale-[0.97]"
              aria-label={t.social.pin(who.name, c.lead.title || t.social.sharedMeal, num(c.more.length))}
              onclick={() => (pinMeals = [c.lead, ...c.more])}
              data-testid="pin"
            >
              <span class="bg-surface shadow-float relative block rounded-control p-1">
                <Photo path={c.lead.owner === me ? null : c.lead.photo} local={c.lead.owner === me ? c.lead.mealId : null} class="block size-14 rounded-sm" />
                <Avatar name={who.name} path={who.path} local={who.local} size="sm" ring class="absolute bottom-2 left-2" />
              </span>
              <svg class="fill-surface -mt-px block h-2 w-4" viewBox="0 0 16 8" aria-hidden="true"><path d="M0 0h16L8 8z" /></svg>
              {#if c.more.length}
                <span class="glass text-caption text-ink num mt-1 rounded-full px-2.5 py-0.5 font-semibold whitespace-nowrap" data-testid="pin-more">{t.social.more(num(c.more.length))}</span>
              {/if}
            </button>
          </div>
        {/if}
      {/each}
      {#if here}
        {@const p = at(here, frame)}
        {#if p}<span class="bg-action ring-surface absolute top-0 left-0 size-4 rounded-full ring-4" style="transform: translate3d({p.x}px, {p.y}px, 0) translate(-50%, -50%)" role="img" aria-label={t.social.here} data-testid="map-here"></span>{/if}
      {/if}
    </div>
  {/if}

  <!-- Instagram's round controls: back on the left, where I am and show all on the right -->
  <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)]">
    {@render round(t.social.back, 'map-back', close, ChevronLeft)}
    {#if map && status === 'ready'}
      <div class="flex flex-col gap-3">
        {@render round(t.social.locate, 'map-locate', () => void locate(), LocateFixed)}
        {@render round(t.social.fit, 'map-fit', () => { raised = false; void loadMeals().then(() => fit()); }, Scan)}
      </div>
    {/if}
  </div>

  {#if note === 'ask'}
    <div class="bg-surface shadow-card absolute inset-x-4 top-[calc(env(safe-area-inset-top)+136px)] rounded-lg p-6" data-testid="map-locate-note">
      <p class="text-body">{t.social.locateNote}</p>
      <div class="mt-4 flex flex-wrap gap-2">
        <Button onclick={() => void locate(true)} data-testid="map-locate-continue">{t.social.continue}</Button>
        <Button variant="plain" onclick={() => (note = null)}>{t.social.notNow}</Button>
      </div>
    </div>
  {:else if message}
    <div class="bg-surface shadow-card absolute inset-x-4 rounded-lg p-6 {map && status === 'ready' ? 'top-[calc(env(safe-area-inset-top)+136px)]' : 'top-[calc(env(safe-area-inset-top)+76px)]'}" role="status" data-testid="map-message">
      <p class="text-body">{message.text}</p>
      {#if message.action}<Button class="mt-4" onclick={message.run}>{message.action}</Button>{/if}
    </div>
  {/if}

  <FriendsPanel bind:lowered bind:raised onfriend={(f) => (friend = f)} />
</div>

<PinSheet bind:meals={pinMeals} {whoOf} {me} />
<FriendSheet bind:friend />
<ProfileSheet />

<style>
  /* MapLibre's attribution sits above the lowered friends panel, in the theme's colours */
  [data-testid='food-map'] :global(.maplibregl-ctrl-bottom-right) {
    bottom: var(--panel, 0px);
  }
  [data-testid='food-map'] :global(.maplibregl-ctrl-attrib) {
    background: var(--glass-solid);
    color: var(--ink-2);
  }
  [data-testid='food-map'] :global(.maplibregl-ctrl-attrib a) {
    color: var(--ink-2);
  }
</style>
