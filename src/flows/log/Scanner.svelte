<!-- SCREENS.md section 7, Scan sheet steps 1 and 2 (B1, F22), shared with the supplement setup's Scan the tub. R1, the owner's
     one camera: with `onphoto` it also offers Meal and Label next to Barcode, switched in place, and a Take photo button
     that keeps the frame on screen. The rear
     camera in a viewfinder with a framing guide, reading by itself, the light where the camera has one, and Type the
     number on the number pad. When the camera cannot open, the reason sits over the typing field. The camera stops when
     this leaves the screen. -->
<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import Flashlight from '@lucide/svelte/icons/flashlight';
  import FlashlightOff from '@lucide/svelte/icons/flashlight-off';
  import Button from '$lib/components/Button.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Camera from '@lucide/svelte/icons/camera';
  import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
  import { barcodeDetector, cameraProblem, type Detector } from '$lib/scanner';
  import { productCode } from '$lib/barcode';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';

  /** `typing`: the user chose Type the number; the sheet's back chevron sets it false to bring the camera back */
  /** `embedded`: inside the Add sheet, where a camera that cannot open says why in its hint, not with the typing field */
  /** `side`: R5, the Add sheet's other ways, stacked on the right of its viewfinder */
  let { oncode, onphoto, typing = $bindable(false), embedded = false, side }: { oncode: (code: string) => void; onphoto?: (frame: Blob, as: 'meal' | 'label') => void; typing?: boolean; embedded?: boolean; side?: Snippet } = $props();

  type Mode = 'barcode' | 'meal' | 'label';
  // the owner (18 Nov): with photos, one camera does all three; a barcode reads by itself in Meal and Label too
  let mode = $state<Mode>(untrack(() => (onphoto ? 'meal' : 'barcode')));

  const SLOW_MS = 8000;
  const EVERY_MS = 150;

  let problem = $state<'denied' | 'none' | 'busy' | 'reader' | null>(null);
  let live = $state(false);
  let slow = $state(false);
  let torch = $state<boolean | null>(null); // null: the camera has no light
  let digits = $state('');
  let wrong = $state(false);
  let video = $state<HTMLVideoElement>();
  let stream: MediaStream | null = null;
  let run = 0; // each start gets a number, so a late answer from an earlier one is ignored

  function stop() {
    run++;
    stream?.getTracks().forEach((tr) => tr.stop());
    stream = null;
    live = false;
  }

  async function start() {
    stop();
    const me = run;
    problem = null;
    slow = false;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return void (problem = 'none');
    const reader = barcodeDetector().catch(() => null);
    let s: MediaStream;
    try {
      // R5: 4:3, the phone camera's whole field (16:9 is a crop of it); a portrait phone hands it back as 3:4
      s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 }, aspectRatio: { ideal: 4 / 3 } }, audio: false });
    } catch (e) {
      if (me === run) problem = cameraProblem(e);
      return;
    }
    if (me !== run) return void s.getTracks().forEach((tr) => tr.stop());
    stream = s;
    const track = s.getVideoTracks()[0];
    torch = (track?.getCapabilities?.() as { torch?: boolean } | undefined)?.torch ? false : null;
    if (video) {
      video.srcObject = s;
      void video.play().catch(() => {}); // not awaited: the reader waits for frames anyway, and a stalled play must not hold it
    }
    const detector = await reader;
    if (me !== run) return;
    if (!detector) {
      // Meal and Label need no reader: the camera stays for them, only the barcode is lost
      if (onphoto) return void (live = true);
      stop();
      return void (problem = 'reader');
    }
    live = true;
    const since = Date.now();
    void watch(detector, me, since);
  }

  async function watch(d: Detector, me: number, since: number) {
    while (me === run) {
      if ((mode === 'barcode' || onphoto) && video && video.readyState >= 2) {
        const found = await d.detect(video).catch(() => []);
        if (me !== run) return;
        for (const b of found) {
          const code = productCode(b.rawValue, b.format);
          if (!code) continue;
          stop();
          haptic();
          return oncode(code);
        }
      }
      slow = mode === 'barcode' && Date.now() - since > SLOW_MS;
      await new Promise((r) => setTimeout(r, EVERY_MS));
    }
  }

  async function light() {
    const track = stream?.getVideoTracks()[0];
    if (!track || torch === null) return;
    const on = !torch;
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] }).then(() => (torch = on), () => {});
  }

  /** The frame on screen, as a JPEG: the camera stops and the sheet takes it from here. */
  async function snap() {
    if (!video || video.readyState < 2 || mode === 'barcode') return;
    const me = run; // a barcode read while the frame encodes wins; this photo is dropped
    // what the viewfinder shows and no more: its object-cover crop of the frame, from the centre
    const vw = video.videoWidth, vh = video.videoHeight;
    const box = video.clientWidth / video.clientHeight || vw / vh;
    const [sw, sh] = vw / vh > box ? [Math.round(vh * box), vh] : [vw, Math.round(vw / box)];
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    c.getContext('2d')?.drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, sw, sh);
    const frame = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/jpeg', 0.9));
    if (!frame || me !== run) return;
    haptic();
    stop();
    onphoto?.(frame, mode);
  }

  const type = () => (typing = true);
  function find() {
    const code = productCode(digits);
    wrong = !code;
    if (code) oncode(code);
  }

  // the camera runs while it is on screen: from the start, and again after typing, until this goes
  $effect(() => {
    if (typing) return;
    untrack(() => void start());
    return stop;
  });
  // the camera cannot open: the reason, then the typing field under it
  const typed = $derived(typing || (!embedded && problem !== null && problem !== 'busy'));
</script>

<div class="flex flex-col {side ? '@container gap-2.5' : 'gap-4'}" data-testid="scanner">
  {#if !typed}
    <!-- R5, the owner: in the Add sheet a 3:4 viewfinder (the camera's own field), narrower and taller, the other ways
         stacked on its right; its height is the width left over, at most 38 percent of the screen, so the shutter and the
         field stay in sight on a short phone -->
    {#snippet viewfinder()}
      <!-- dark until the camera starts; the caption under it says so -->
      <div class="bg-toast relative {side ? 'aspect-[3/4] h-full flex-none' : 'aspect-[4/3] w-full'} overflow-hidden rounded-md">
        <video bind:this={video} class="size-full object-cover" playsinline muted autoplay aria-label={t.scan.viewfinder} data-testid="scanner-video"></video>
        <!-- the framing guide: wide for a barcode, the rest dimmed by the scrim -->
        {#if onphoto}
          <!-- the owner (19 Nov): no frame; a small glass chip says a barcode is read at any time, its dot breathing while live -->
          {#if live}
            <span class="liquid-clear text-caption text-night absolute top-3 left-3 flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2 font-semibold" data-testid="scanner-reading">
              <ScanBarcode size={16} strokeWidth={2.25} aria-hidden="true" />{t.scan.readsCodes}<i class="bg-success size-1.5 animate-pulse rounded-full" aria-hidden="true"></i>
            </span>
          {/if}
        {:else}
          <div class="border-toast-ink pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-sm border-2 shadow-[0_0_0_999px_var(--scrim)] {mode === 'label' ? 'inset-x-[22%] h-[82%]' : 'inset-x-[10%] h-[40%]'}" aria-hidden="true" data-testid="scanner-frame"></div>
        {/if}
        {#if torch !== null}
          <button type="button" class="bg-toast text-toast-ink absolute right-3 bottom-3 grid size-11 place-items-center rounded-sm transition-transform duration-[var(--d-press)] active:scale-[0.97]" aria-label={torch ? t.scan.lightOff : t.scan.lightOn} aria-pressed={torch} onclick={light} data-testid="scanner-light">
            {#if torch}<FlashlightOff size={22} strokeWidth={2} />{:else}<Flashlight size={22} strokeWidth={2} />{/if}
          </button>
        {/if}
        {#if embedded}
          <!-- in the Add sheet the hint rides on the picture, clear of the light -->
          <p class="text-caption text-toast-ink absolute bottom-3 left-3 right-16 font-semibold" aria-live="polite" data-testid="scanner-hint">{problem === 'busy' ? t.scan.busy : problem ? t.scan[problem === 'none' ? 'noCamera' : problem] : !live ? t.scan.starting : mode === 'meal' ? t.scan.holdMeal : mode === 'label' ? t.scan.holdLabel : slow ? t.scan.slow : t.scan.hold}</p>
        {/if}
      </div>
    {/snippet}
    {#if side}
      <div class="flex h-[max(min(calc((100cqw-var(--s-16)-var(--s-4))*4/3),38svh),13.5rem)] gap-4" data-testid="scanner-row">{@render viewfinder()}{@render side()}</div>
    {:else}
      {@render viewfinder()}
    {/if}
    {#if onphoto && embedded}
      <!-- R5, the owner: the two photo modes across the full width, then the shutter in the middle under them (a camera's
           ring around the ink) -->
      <Segmented bind:value={mode} label={t.scan.modes} options={[{ value: 'meal', label: t.scan.modeMeal }, { value: 'label', label: t.scan.modeLabel }]} />
      <button type="button" class="group border-action disabled:border-surface-3 grid size-15 place-items-center self-center rounded-full border-[3px] p-1 transition-[transform,border-color] duration-[var(--d-press)] active:scale-[0.94]" aria-label={t.scan.shutter} disabled={!live} onclick={snap} data-testid="scanner-shutter"><span class="bg-action group-disabled:bg-surface-3 size-full rounded-full transition-colors duration-[var(--d-ui)]" aria-hidden="true"></span></button>
    {:else if onphoto}
      <Segmented bind:value={mode} label={t.scan.modes} options={[{ value: 'meal', label: t.scan.modeMeal }, { value: 'label', label: t.scan.modeLabel }]} />
    {/if}
    {#if !embedded}<p class="text-callout text-ink-2" aria-live="polite" data-testid="scanner-hint">
      {problem === 'busy' ? t.scan.busy : problem ? t.scan[problem === 'none' ? 'noCamera' : problem] : !live ? t.scan.starting : mode === 'meal' ? t.scan.holdMeal : mode === 'label' ? t.scan.holdLabel : slow ? t.scan.slow : t.scan.hold}
    </p>{/if}
    {#if onphoto && !embedded && mode !== 'barcode'}
      <Button variant="primary" size="lg" full disabled={!live} onclick={snap} data-testid="scanner-shutter"><Camera size={22} strokeWidth={2.25} aria-hidden="true" />{t.scan.shutter}</Button>
    {/if}
    {#if !embedded || problem}
      <!-- in the Add sheet, typing the number is only the way out when the camera cannot read (the owner, 19 Nov) -->
      <div class="flex flex-wrap gap-2">
        <!-- on the Add sheet's sky, the white face: grey would read as disabled there -->
        {#if problem === 'busy'}<Button variant={embedded ? 'surface' : 'neutral'} onclick={start} data-testid="scanner-retry">{t.scan.retry}</Button>{/if}
        <Button variant={embedded ? 'surface' : 'neutral'} onclick={type} data-testid="scanner-type">{t.scan.typeIt}</Button>
      </div>
    {/if}
  {:else}
    {#if problem && problem !== 'busy'}
      <p class="text-body" role="alert" data-testid="scanner-problem">{t.scan[problem === 'none' ? 'noCamera' : problem]}</p>
    {/if}
    <div class="flex flex-col gap-2">
      <label for="barcode-digits" class="text-caption text-ink-2">{t.scan.field}</label>
      <input
        id="barcode-digits"
        type="text"
        inputmode="numeric"
        autocomplete="off"
        enterkeyhint="search"
        maxlength="16"
        placeholder={t.scan.fieldHint}
        bind:value={digits}
        oninput={() => (wrong = false)}
        onkeydown={(e) => { if (e.key === 'Enter') find(); }}
        {@attach (el) => el.focus()}
        class="input-field num w-full min-w-0"
        aria-invalid={wrong}
        aria-describedby={wrong ? 'barcode-wrong' : undefined}
        data-testid="barcode-field"
      />
      {#if wrong}<p id="barcode-wrong" class="text-callout text-attention" role="alert" data-testid="barcode-wrong">{t.scan.badCode}</p>{/if}
    </div>
    <Button variant="primary" size="lg" full disabled={!digits.trim()} onclick={find} data-testid="barcode-find">{t.scan.find}</Button>
  {/if}
</div>
