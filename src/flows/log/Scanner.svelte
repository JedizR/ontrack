<!-- SCREENS.md section 7, Scan sheet steps 1 and 2 (B1, F22), shared with the supplement setup's Scan the tub: the rear
     camera in a viewfinder with a framing guide, reading by itself, the light where the camera has one, and Type the
     number on the number pad. When the camera cannot open, the reason sits over the typing field. The camera stops when
     this leaves the screen. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Flashlight from '@lucide/svelte/icons/flashlight';
  import FlashlightOff from '@lucide/svelte/icons/flashlight-off';
  import Button from '$lib/components/Button.svelte';
  import { barcodeDetector, cameraProblem, type Detector } from '$lib/scanner';
  import { productCode } from '$lib/barcode';
  import { haptic } from '$lib/haptics';
  import { t } from '$lib/i18n';

  /** `typing`: the user chose Type the number; the sheet's back chevron sets it false to bring the camera back */
  let { oncode, typing = $bindable(false) }: { oncode: (code: string) => void; typing?: boolean } = $props();

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
      s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
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
      await video.play().catch(() => {});
    }
    const detector = await reader;
    if (me !== run) return;
    if (!detector) {
      stop();
      return void (problem = 'reader');
    }
    live = true;
    const since = Date.now();
    void watch(detector, me, since);
  }

  async function watch(d: Detector, me: number, since: number) {
    while (me === run) {
      if (video && video.readyState >= 2) {
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
      slow = Date.now() - since > SLOW_MS;
      await new Promise((r) => setTimeout(r, EVERY_MS));
    }
  }

  async function light() {
    const track = stream?.getVideoTracks()[0];
    if (!track || torch === null) return;
    const on = !torch;
    await track.applyConstraints({ advanced: [{ torch: on } as MediaTrackConstraintSet] }).then(() => (torch = on), () => {});
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
  const typed = $derived(typing || (problem !== null && problem !== 'busy'));
</script>

<div class="flex flex-col gap-4" data-testid="scanner">
  {#if !typed}
    <!-- dark until the camera starts; the caption under it says so -->
    <div class="bg-toast relative aspect-[4/3] w-full overflow-hidden rounded-md">
      <video bind:this={video} class="size-full object-cover" playsinline muted autoplay aria-label={t.scan.viewfinder} data-testid="scanner-video"></video>
      <!-- the framing guide: wide for a barcode, the rest dimmed by the scrim -->
      <div class="border-toast-ink pointer-events-none absolute inset-x-[10%] top-1/2 h-[40%] -translate-y-1/2 rounded-sm border-2 shadow-[0_0_0_999px_var(--scrim)]" aria-hidden="true"></div>
      {#if torch !== null}
        <button type="button" class="bg-toast text-toast-ink absolute right-3 bottom-3 grid size-11 place-items-center rounded-full transition-transform duration-[var(--d-press)] active:scale-[0.97]" aria-label={torch ? t.scan.lightOff : t.scan.lightOn} aria-pressed={torch} onclick={light} data-testid="scanner-light">
          {#if torch}<FlashlightOff size={22} strokeWidth={2} />{:else}<Flashlight size={22} strokeWidth={2} />{/if}
        </button>
      {/if}
    </div>
    <p class="text-callout text-ink-2" aria-live="polite" data-testid="scanner-hint">
      {problem === 'busy' ? t.scan.busy : !live ? t.scan.starting : slow ? t.scan.slow : t.scan.hold}
    </p>
    <div class="flex flex-wrap gap-2">
      {#if problem === 'busy'}<Button onclick={start} data-testid="scanner-retry">{t.scan.retry}</Button>{/if}
      <Button onclick={type} data-testid="scanner-type">{t.scan.typeIt}</Button>
    </div>
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
