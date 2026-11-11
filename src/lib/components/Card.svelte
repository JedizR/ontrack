<!-- DESIGN.md section 7, Card: a flat surface on the canvas, no shadow, no border. One card, one job. -->
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
    /** the one card a screen is about: radius 32 */
    hero?: boolean;
    /** holds rows, which bring their own vertical padding and hairlines */
    list?: boolean;
    children: Snippet;
  } = $props();
</script>

<section
  class="bg-surface {hero ? 'rounded-xl px-5 pt-6 pb-5' : list ? 'overflow-hidden rounded-lg px-5 py-1' : 'rounded-lg p-5'} {cls}"
  {...rest}
>
  {@render children()}
</section>
