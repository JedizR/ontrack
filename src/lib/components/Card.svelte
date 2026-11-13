<!-- DESIGN.md section 7, Card: a solid surface with OneFin's soft card shadow in light and a hairline ring in dark, radius
     32, 24 inside. The hero card (OneFin's "Withdraw" and invoice cards) is a white shell at radius 48 with 8 inside: the
     screen nests its one haze panel (radius 40) and grey stat tiles in it, so text still sits 24 from the edge. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  let {
    hero = false,
    list = false,
    class: cls = '',
    children,
    ...rest
  }: HTMLAttributes<HTMLElement> & {
    /** the one card a screen is about: a radius 48 shell holding a haze panel and stat tiles */
    hero?: boolean;
    /** holds rows, which bring their own vertical padding and hairlines */
    list?: boolean;
    children: Snippet;
  } = $props();
</script>

<section
  class="shadow-card {hero ? 'bg-surface rounded-xl p-2' : list ? 'bg-surface overflow-hidden rounded-lg px-6 py-1' : 'bg-surface rounded-lg p-6'} {cls}"
  data-list={list || undefined}
  {...rest}
>
  {@render children()}
</section>
