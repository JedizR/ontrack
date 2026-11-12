<!-- SCREENS.md section 13, Share to map (S1b, F17): a switch row, off for every photo. On, the place comes from the
     photo's own location, else the phone's position read once. The first time, one sentence about location comes
     before the browser asks. The caption says where it will go; refusals say what to do. -->
<script lang="ts">
  import Switch from '$lib/components/Switch.svelte';
  import Button from '$lib/components/Button.svelte';
  import { t } from '$lib/i18n';
  import { prefs } from '$lib/prefs.svelte';
  import { currentPosition, photoPosition, type Position } from '$lib/geo';

  let {
    file = null,
    title,
    line,
    checked = $bindable(false),
    onplace,
    testid,
  }: {
    /** the original photo, whose location is read before anything else; none for a logged meal */
    file?: Blob | null;
    title: string;
    /** the caption while it is off */
    line: string;
    checked?: boolean;
    /** where it goes (rounded later, by the action), or null when it comes off */
    onplace?: (p: Position | null) => void;
    testid: string;
  } = $props();

  let stage = $state<'off' | 'on' | 'reading' | 'ask' | 'locating' | 'photo' | 'here' | 'denied' | 'notfound'>(checked ? 'on' : 'off');
  let place: Position | null = null;
  let pending: Promise<unknown> | null = null;

  /** Resolves once a position being read has arrived, so a meal added meanwhile goes with it. */
  export const settled = () => pending ?? Promise.resolve();
  export const position = () => (checked ? place : null);

  async function turn(on: boolean) {
    if (!on) {
      place = null;
      stage = 'off';
      onplace?.(null);
      return;
    }
    stage = 'reading';
    const fromFile = file ? await photoPosition(file).catch(() => null) : null;
    if (!checked) return;
    if (fromFile) return found(fromFile, 'photo');
    if (!prefs.locationOk) return void (stage = 'ask');
    await locate();
  }

  function locate() {
    prefs.locationOk = true;
    checked = true;
    stage = 'locating';
    pending = currentPosition().then((r) => {
      pending = null;
      if (!checked) return;
      if (typeof r === 'object') return found(r, 'here');
      checked = false;
      stage = r === 'denied' ? 'denied' : 'notfound';
    });
    return pending;
  }

  function found(p: Position, from: 'photo' | 'here') {
    place = p;
    stage = from;
    onplace?.(p);
  }

  const caption = $derived(
    { off: line, on: t.social.onMapLine, reading: t.social.locating, ask: file ? t.social.askPhoto : t.social.askHere, locating: t.social.locating, photo: t.social.fromPhoto, here: t.social.fromHere, denied: t.social.denied, notfound: t.social.notFound }[stage],
  );
</script>

<div class="border-line mt-4 border-t pt-4" data-testid={testid}>
  <div class="flex items-center gap-4">
    <div class="min-w-0 flex-1">
      <p class="text-body font-semibold">{title}</p>
      <p class="text-caption {stage === 'denied' ? 'text-attention' : 'text-ink-2'}" aria-live="polite" data-testid="{testid}-note">{caption}</p>
    </div>
    <Switch bind:checked label={title} onchange={(v) => void turn(v)} testid="{testid}-switch" />
  </div>
  {#if stage === 'ask'}
    <Button size="sm" class="mt-3" onclick={() => void locate()} data-testid="{testid}-locate">{t.social.useLocation}</Button>
  {:else if stage === 'notfound'}
    <Button size="sm" class="mt-3" onclick={() => void locate()} data-testid="{testid}-retry">{t.social.retry}</Button>
  {/if}
</div>
