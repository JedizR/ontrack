<!-- DESIGN.md section 7, Card, in the app's two styles (Settings, Style):
     - Default (the owner, 19 Nov): no card inside a card. A card is a grey box on the white page with no shadow; anything
       grey inside it turns white so it still reads. A list is rows straight on the page, 8 into the gutter so its words
       line up with the boxes'. The hero is only a column: its panel and boxes are cards themselves.
     - Curvy (R3): a white surface with OneFin's soft shadow in light and a hairline ring in dark, radius 32, 24 inside.
       The hero is a white shell at radius 48 with 8 inside, holding the haze panel (40) and grey stat tiles. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';
  import { prefs } from '$lib/prefs.svelte';

  let {
    hero = false,
    list = false,
    class: cls = '',
    children,
    ...rest
  }: HTMLAttributes<HTMLElement> & {
    /** the one block a screen is about: its haze panel and stat boxes */
    hero?: boolean;
    /** holds rows, which bring their own vertical padding and hairlines */
    list?: boolean;
    children: Snippet;
  } = $props();

  const look = $derived(
    prefs.look === 'curvy'
      ? `bg-surface shadow-card ${hero ? 'rounded-xl p-2' : list ? 'overflow-hidden rounded-lg px-6 py-1' : 'rounded-lg p-6'}`
      : hero ? 'flex flex-col gap-2' : list ? '-mx-2 overflow-hidden px-6 py-1 [--row-bg:var(--canvas)]' : 'bg-surface-2 rounded-lg p-6 [&_.bg-surface-2]:bg-surface',
  );
</script>

<section class="{look} {cls}" data-list={list || undefined} {...rest}>
  {@render children()}
</section>
