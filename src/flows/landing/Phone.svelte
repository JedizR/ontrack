<!-- A real screen of the app in a phone drawn in CSS (DESIGN.md section 13): a night bezel at radius 48 around the
     screen at 40, the island on top. `crop` shows only the top share of the phone, fading into what is behind it. -->
<script lang="ts">
  let { src, alt, crop = 1, eager = false, class: cls = '' }: { src: string; alt: string; crop?: number; eager?: boolean; class?: string } = $props();
</script>

<div class="{cls} {crop < 1 ? 'overflow-hidden [mask-image:linear-gradient(to_bottom,black_75%,transparent)]' : ''}" style:aspect-ratio={crop < 1 ? `10 / ${(21.9 * crop).toFixed(2)}` : undefined}>
  <div class="bg-night shadow-float ring-line-strong relative rounded-xl p-2 ring-1">
    <!-- the screenshots are a 390 by 844 phone at 1.6 times: the size gives the box its shape before they load -->
    <img {src} {alt} width="390" height="844" loading={eager ? 'eager' : 'lazy'} fetchpriority={eager ? 'high' : 'auto'} decoding="async" class="bg-surface-2 block h-auto w-full rounded-sheet" />
    <span class="bg-night absolute top-[2.4%] left-1/2 h-[3.2%] w-[30%] -translate-x-1/2 rounded-full" aria-hidden="true"></span>
  </div>
</div>
