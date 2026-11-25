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
  import Flower from '@lucide/svelte/icons/flower-2';
  import Button from '$lib/components/Button.svelte';
  import Segmented from '$lib/components/Segmented.svelte';
  import Camera from '@lucide/svelte/icons/camera';
  import ScanBarcode from '@lucide/svelte/icons/scan-barcode';
  import { barcodeDetector, cameraProblem, ultraWide, type Detector } from '$lib/scanner';
  import { productCode } from '$lib/barcode';
  import { haptic } from '$lib/haptics';
  import { isIOS } from '$lib/platform';
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
  // R7, the owner: a far-focusing main camera (the iPhone Pros) needs the macro lens, the ultra-wide that focuses close;
  // any camera can zoom, so a phone that cannot focus close backs off and zooms in. The camera's own zoom where the
  // browser offers it, else the picture is scaled and the shot cropped to match.
  let macroId = $state<string | null>(null);
  let macro = $state(false);
  let zoom = $state(1);
  let native = $state<{ min: number; max: number } | null>(null);
  const zMin = $derived(native ? Math.max(1, native.min) : 1);
  const zMax = $derived(native ? Math.min(native.max, 6) : 3); // a scaled 1920 frame past 3x is under the photo's 1024 px
  const STOPS = [1, 2, 3];
  /** The light: where the camera lists one, or on an iPhone's back camera, whose Safari turns it on without always
   *  listing it (the first tap checks it took) */
  function lightOf(track: MediaStreamTrack): false | null {
    const c = (track.getCapabilities?.() as { torch?: boolean | boolean[] } | undefined)?.torch;
    const listed = c === true || (Array.isArray(c) && c.includes(true));
    return listed || (c === undefined && isIOS() && track.getSettings?.().facingMode !== 'user') ? false : null;
  }
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
      // R7: a larger frame, so a zoomed shot still has the pixels the photo needs
      const lens = macro && macroId ? { deviceId: { exact: macroId } } : { facingMode: { ideal: 'environment' } };
      s = await navigator.mediaDevices.getUserMedia({ video: { ...lens, width: { ideal: 1920 }, height: { ideal: 1440 }, aspectRatio: { ideal: 4 / 3 } }, audio: false });
    } catch (e) {
      // a macro lens that will not open: back to the main camera, without the toggle
      if (me === run && macro) { macro = false; macroId = ''; zoom = 1; return void start(); }
      if (me === run) problem = cameraProblem(e);
      return;
    }
    if (me !== run) return void s.getTracks().forEach((tr) => tr.stop());
    stream = s;
    const track = s.getVideoTracks()[0];
    const caps = track?.getCapabilities?.() as { zoom?: { min: number; max: number } } | undefined;
    // a macro lens that turned out to face the user (an iPad's front ultra-wide): the main camera, without the toggle
    if (macro && track?.getSettings?.().facingMode === 'user') { macro = false; macroId = ''; zoom = 1; return void start(); }
    torch = track ? lightOf(track) : null;
    native = caps?.zoom && caps.zoom.max > 1 ? { min: caps.zoom.min, max: caps.zoom.max } : null;
    // a camera that lists a zoom but does not move to it gets the scaled picture instead
    const want = zoom;
    if (native) void track.applyConstraints({ advanced: [{ zoom } as MediaTrackConstraintSet] }).then(() => {
      const got = (track.getSettings() as { zoom?: number }).zoom;
      if (me === run && (got === undefined || Math.abs(got - want) > 0.05)) native = null;
    }, () => { if (me === run) native = null; });
    // the lenses have names only once the camera is allowed: the ultra-wide is the macro lens on an iPhone
    if (onphoto && macroId === null) void Promise.resolve().then(() => navigator.mediaDevices.enumerateDevices()).then((all) => {
      const wide = ultraWide(all);
      if (wide && wide !== track?.getSettings?.().deviceId) macroId = wide;
    }, () => {});
    if (video) {
      // some cameras list their light only once frames flow
      if (torch === null) video.addEventListener('playing', () => { if (me === run && torch === null) torch = lightOf(track); }, { once: true });
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
    haptic();
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] }).catch(() => {});
    // a light that did not come on (an iPhone lens without one): the button goes, rather than doing nothing again
    const got = (track.getSettings() as { torch?: boolean }).torch;
    torch = got === undefined || got === on ? on : on ? null : false;
  }

  /** A zoom between the camera's limits: its own zoom where it has one, else the picture's scale (the shot crops to it). */
  function setZoom(z: number) {
    zoom = Math.round(Math.min(zMax, Math.max(zMin, z)) * 10) / 10;
    const track = stream?.getVideoTracks()[0];
    if (native && track) void track.applyConstraints({ advanced: [{ zoom } as MediaTrackConstraintSet] }).catch(() => {});
  }
  /** Macro: the close-focusing lens, framed at 2x to match the main camera's view, or back. */
  function toggleMacro() {
    haptic();
    macro = !macro;
    zoom = macro ? 2 : 1;
    void start();
  }
  // pinch on the picture (one finger still scrolls the sheet), or drag along the zoom chips, to zoom anywhere between them
  let pinch: { d: number; z: number } | null = null;
  const dist = (e: TouchEvent) => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  function pinchStart(e: TouchEvent) { if (e.touches.length === 2) pinch = { d: dist(e), z: zoom }; }
  function pinchMove(e: TouchEvent) {
    if (!pinch || e.touches.length !== 2) return;
    setZoom((pinch.z * dist(e)) / pinch.d);
  }
  let drag: { x: number; z: number; moved: boolean } | null = null;
  function dragStart(e: PointerEvent) { drag = { x: e.clientX, z: zoom, moved: false }; }
  function dragMove(e: PointerEvent) {
    if (!drag) return;
    const dx = e.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 6) return;
    if (!drag.moved) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.moved = true;
    setZoom(drag.z + dx / 44); // a chip's width (44 px) is one step
  }
  function dragEnd() { setTimeout(() => (drag = null)); }
  const zoomText = (z: number) => `${Number.isInteger(z) ? z : z.toFixed(1)}×`;

  /** The frame on screen, as a JPEG: the camera stops and the sheet takes it from here. */
  async function snap() {
    if (!video || mode === 'barcode') return;
    const me = run; // a barcode read while the frame encodes wins; this photo is dropped
    // R7: just after a lens switch the reader is ready before the first frame; a tap then waits for it, briefly
    const v = video;
    if (v.readyState < 2) await new Promise((r) => { v.addEventListener('loadeddata', r, { once: true }); setTimeout(r, 1500); });
    if (v.readyState < 2 || me !== run) return;
    // what the viewfinder shows and no more: its object-cover crop of the frame, from the centre
    const vw = v.videoWidth, vh = v.videoHeight;
    const box = v.clientWidth / v.clientHeight || vw / vh;
    // a scaled picture (no zoom in the camera) is cropped to what it shows
    const scale = native ? 1 : zoom;
    const [sw, sh] = (vw / vh > box ? [vh * box, vh] : [vw, vw / box]).map((n) => Math.round(n / scale));
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    c.getContext('2d')?.drawImage(v, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, sw, sh);
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
      <div class="bg-toast relative {side ? 'aspect-[3/4] h-full flex-none' : 'aspect-[4/3] w-full'} touch-pan-y overflow-hidden rounded-md" ontouchstart={pinchStart} ontouchmove={pinchMove} ontouchend={() => (pinch = null)} role="application" aria-label={t.scan.zoom} data-vaul-no-drag>
        <video bind:this={video} class="size-full object-cover transition-transform duration-[var(--d-press)]" style={native || zoom === 1 ? undefined : `transform: scale(${zoom})`} playsinline muted autoplay aria-label={t.scan.viewfinder} data-testid="scanner-video"></video>
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
        {#if torch !== null && !embedded}
          <button type="button" class="text-night absolute right-3 bottom-3 grid size-11 place-items-center rounded-full bg-snow transition-transform duration-[var(--d-press)] active:scale-[0.95]" aria-label={torch ? t.scan.lightOff : t.scan.lightOn} aria-pressed={torch} onclick={light} data-testid="scanner-light">
            {#if torch}<Flashlight size={22} strokeWidth={2} />{:else}<FlashlightOff size={22} strokeWidth={2} />{/if}
          </button>
        {/if}
        {#if onphoto && live && mode !== 'barcode'}
          <!-- R7, the owner's iPhone camera: zoom chips at the foot of the picture; a drag along them zooms in between -->
          <div class="liquid-clear absolute bottom-3 left-1/2 flex -translate-x-1/2 touch-none rounded-full p-1" role="group" aria-label={t.scan.zoom} onpointerdown={dragStart} onpointermove={dragMove} onpointerup={dragEnd} onpointercancel={dragEnd} data-testid="scanner-zoom">
            {#each STOPS.filter((z) => z <= zMax) as z, i (z)}
              {@const on = zoom >= z && (i === STOPS.length - 1 || zoom < STOPS[i + 1] || STOPS[i + 1] > zMax)}
              <button type="button" class="text-caption num grid size-11 place-items-center rounded-full font-semibold transition-colors duration-[var(--d-press)] {on ? 'text-night bg-snow' : 'text-night'}" aria-pressed={on} aria-label={t.scan.zoomTo(String(z))} onclick={() => { if (!drag?.moved) setZoom(z); }} data-testid="zoom-{z}">{on ? zoomText(zoom) : `${z}×`}</button>
            {/each}
          </div>
        {/if}
        {#if embedded}
          <!-- in the Add sheet the hint rides on the picture, over the zoom chips -->
          <p class="text-caption text-toast-ink absolute {onphoto && live && mode !== 'barcode' ? 'bottom-18' : 'bottom-3'} left-3 right-3 font-semibold" aria-live="polite" data-testid="scanner-hint">{problem === 'busy' ? t.scan.busy : problem ? t.scan[problem === 'none' ? 'noCamera' : problem] : !live ? t.scan.starting : mode === 'meal' ? t.scan.holdMeal : mode === 'label' ? t.scan.holdLabel : slow ? t.scan.slow : t.scan.hold}</p>
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
      <!-- R7, the owner: macro on the left, the white shutter in the middle, the light on the right, as the iPhone's camera
           has them; a side with nothing to offer keeps its space so the shutter stays centred -->
      <div class="grid grid-cols-[3rem_auto_3rem] items-center justify-center gap-8" data-testid="scanner-controls">
        {#if macroId && mode !== 'barcode'}
          <button type="button" class="text-night relative grid size-12 place-items-center rounded-full bg-snow transition-transform duration-[var(--d-press)] active:scale-[0.95]" aria-label={macro ? t.scan.macroOff : t.scan.macroOn} aria-pressed={macro} onclick={toggleMacro} data-testid="scanner-macro">
            <Flower size={22} strokeWidth={2} />
            {#if !macro}<span class="bg-night absolute h-0.5 w-7 rotate-45 rounded-full ring-2 ring-snow" aria-hidden="true"></span>{/if}
          </button>
        {:else}<span></span>{/if}
        <button type="button" class="group grid size-16 place-items-center rounded-full border-[3px] border-snow p-1 transition-[transform,opacity] duration-[var(--d-press)] active:scale-[0.94] disabled:opacity-60" aria-label={t.scan.shutter} disabled={!live} onclick={snap} data-testid="scanner-shutter"><span class="shadow-pill size-full rounded-full bg-snow" aria-hidden="true"></span></button>
        {#if torch !== null}
          <button type="button" class="text-night grid size-12 place-items-center rounded-full bg-snow transition-transform duration-[var(--d-press)] active:scale-[0.95]" aria-label={torch ? t.scan.lightOff : t.scan.lightOn} aria-pressed={torch} onclick={light} data-testid="scanner-light">
            {#if torch}<Flashlight size={22} strokeWidth={2} />{:else}<FlashlightOff size={22} strokeWidth={2} />{/if}
          </button>
        {:else}<span></span>{/if}
      </div>
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
