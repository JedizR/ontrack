<!-- A real screen of the app in an iPhone 16 drawn in CSS (DESIGN.md section 13, L2): the night bezel, the status bar with
     its time and the Dynamic Island, then the screen below it. The box is the phone's own 71.6 by 147.6 mm (Apple's
     published outer size, the owner's exact ratio), so every phone is the same shape at any width. Measures are shares of
     the phone's width: the display is 64.9 by 140.7 mm, so the bezel is 4.7 at the sides and 4.8 above and below, the
     screen's corners 12.7 (55 points of 393), the status bar 54 points (12.45), the island 126 by 37 points at 11 from the
     top. The screenshot under the status bar is 393 by 798 points (tests/e2e/landing-shots.spec.ts), the rest of the screen. -->
<script lang="ts">
  import { t } from '$lib/i18n';
  let { src, alt, eager = false, class: cls = '' }: { src: string; alt: string; eager?: boolean; class?: string } = $props();
  const loading = $derived(eager ? 'eager' : 'lazy');
  // the status bar continues the screen's own top: the colour of its first rows, read once the screenshot has loaded
  let top = $state<string>();
  function sample(e: Event) {
    const img = e.currentTarget as HTMLImageElement;
    const g = Object.assign(document.createElement('canvas'), { width: 1, height: 1 }).getContext('2d');
    if (!g) return;
    g.drawImage(img, 0, 0, img.naturalWidth, 4, 0, 0, 1, 1);
    const [r, gr, b] = g.getImageData(0, 0, 1, 1).data;
    top = `rgb(${r} ${gr} ${b})`;
  }
</script>

<div class="@container {cls}" style:aspect-ratio="71.6 / 147.6">
  <div class="bg-night ring-line-strong box-border h-full rounded-[17.4cqw] px-[4.7cqw] py-[4.8cqw] ring-1 ring-inset">
    <div class="bg-surface-2 flex h-full flex-col overflow-clip rounded-[12.7cqw]">
      <div class="text-night relative h-[12.45cqw] flex-none" style:background-color={top} aria-hidden="true">
        <span class="num absolute top-[6.9cqw] left-[16cqw] -translate-y-1/2 text-[4cqw] leading-none font-semibold">{t.landing.phoneTime}</span>
        <span class="bg-night absolute top-[2.54cqw] left-1/2 h-[8.53cqw] w-[29.06cqw] -translate-x-1/2 rounded-full"></span>
        <svg viewBox="0 0 70 13" class="absolute top-[6.9cqw] right-[7.5cqw] w-[16.5cqw] -translate-y-1/2" fill="currentColor">
          <!-- signal, wifi and battery, as iOS draws them -->
          <rect x="0" y="8" width="3" height="4" rx="1" /><rect x="4.5" y="6" width="3" height="6" rx="1" /><rect x="9" y="3.5" width="3" height="8.5" rx="1" /><rect x="13.5" y="1" width="3" height="11" rx="1" />
          <path d="M30 2.2a10 10 0 0 1 7 2.8l-1.3 1.3a8.2 8.2 0 0 0-11.4 0L23 5a10 10 0 0 1 7-2.8Zm0 3.6a6.4 6.4 0 0 1 4.5 1.8l-1.3 1.3a4.6 4.6 0 0 0-6.4 0l-1.3-1.3A6.4 6.4 0 0 1 30 5.8Zm0 3.6c.8 0 1.5.3 2 .8L30 12l-2-1.8c.5-.5 1.2-.8 2-.8Z" />
          <rect x="44" y="1.5" width="22" height="10" rx="3" fill="none" stroke="currentColor" stroke-opacity="0.4" /><rect x="46" y="3.5" width="18" height="6" rx="1.5" /><rect x="67" y="4.8" width="1.6" height="3.4" rx="0.8" fill-opacity="0.4" />
        </svg>
      </div>
      <!-- the screenshots are 393 by 798 points at 1.6 times, under the status bar -->
      <img {src} {alt} width="393" height="798" {loading} fetchpriority={eager ? 'high' : 'auto'} decoding="async" onload={sample} class="block min-h-0 w-full flex-1 object-cover object-top" />
    </div>
  </div>
</div>
