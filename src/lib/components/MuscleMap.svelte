<!-- R2, the muscle map (Strava's strength activity, with the steps it lacks): the body front and back, each muscle filled
     in one of three violet steps by how much it was worked, the rest the track's grey. The fills grow in one after
     another when the map arrives. An image for assistive tech, named by the muscles it shows. -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { loadBody, muscleOf, type Body } from '$lib/data/body';
  import type { Muscle } from '$lib/model/engine';
  import { MUSCLE_STEPS } from '$lib/data/body';

  let {
    level,
    sex,
    label,
    class: cls = '',
  }: {
    /** how worked each muscle is: 1 a little, 2 well, 3 a lot; a muscle left out is not worked */
    level: Partial<Record<Muscle, 1 | 2 | 3>>;
    sex?: string;
    label: string;
    class?: string;
  } = $props();

  let body = $state<Body | null>(null);
  let shown = $state(false);
  $effect(() => { void loadBody(sex).then((b) => (body = b)); });
  // the fills start grey and step up on the next frame, so the transition plays on arrival
  onMount(() => { requestAnimationFrame(() => requestAnimationFrame(() => (shown = true))); });

  const FILL = MUSCLE_STEPS;
  const order: Muscle[] = ['chest', 'shoulders', 'back', 'biceps', 'triceps', 'core', 'quads', 'glutes', 'hamstrings', 'calves'];
  const fillOf = (part: string) => {
    const m = muscleOf[part];
    const l = m ? (level[m] ?? 0) : 0;
    return { fill: shown ? FILL[l] : FILL[0], i: m ? order.indexOf(m) : 0 };
  };
</script>

<div class="grid grid-cols-2 gap-2 {cls}" role="img" aria-label={label} data-testid="muscle-map">
  {#if body}
    {#each [body.front, body.back] as side, s (s)}
      <svg viewBox={side.viewBox} class="h-full w-full" aria-hidden="true">
        {#each Object.entries(side.parts) as [part, paths] (part)}
          {@const f = fillOf(part)}
          {#each paths as d, k (k)}
            <path {d} class="muscle" style="fill: {f.fill}; --i: {f.i}" />
          {/each}
        {/each}
        <path d={side.outline} fill="none" stroke="var(--line-strong)" stroke-width="1.5" vector-effect="non-scaling-stroke" />
      </svg>
    {/each}
  {:else}
    <div class="bg-surface-2 col-span-2 h-full min-h-32 rounded-md"></div>
  {/if}
</div>

<style>
  .muscle {
    transition: fill var(--d-move) var(--ease-out);
    transition-delay: calc(var(--i) * 45ms);
  }
</style>
