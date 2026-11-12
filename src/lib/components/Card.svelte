<!-- DESIGN.md section 7, Card: a surface with OneFin's soft card shadow in light and a hairline ring in dark, radius 32,
     24 inside. The hero card is radius 48 on the lavender gradient. One card, one job. -->
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
    /** the one card a screen is about: radius 48 on the hero gradient */
    hero?: boolean;
    /** holds rows, which bring their own vertical padding and hairlines */
    list?: boolean;
    children: Snippet;
  } = $props();
</script>

<section
  class="shadow-card {hero ? 'rounded-xl bg-(image:--grad-hero) p-6' : list ? 'bg-surface overflow-hidden rounded-lg px-6 py-1' : 'bg-surface rounded-lg p-6'} {cls}"
  {...rest}
>
  {@render children()}
</section>
