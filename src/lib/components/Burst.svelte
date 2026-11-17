<!-- R2, a small congratulation: ten dots in the brand's colours fly out of what was just done and fade, once. Decoration
     only; under reduced motion it is gone at once. -->
<script lang="ts">
  const COLOURS = ['--success', '--lavender', '--peach', '--coral'];
</script>

<span class="burst pointer-events-none absolute inset-0" aria-hidden="true">
  {#each Array.from({ length: 10 }, (_, i) => i) as i (i)}
    <i style="--a: {i * 36}deg; --c: var({COLOURS[i % COLOURS.length]}); --d: {22 + (i % 3) * 6}px"></i>
  {/each}
</span>

<style>
  .burst i {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 6px;
    height: 6px;
    margin: -3px;
    border-radius: 999px;
    background: var(--c);
    animation: burst 720ms var(--ease-out) forwards;
  }
  @keyframes burst {
    from { transform: rotate(var(--a)) translateY(0) scale(1); opacity: 1; }
    to { transform: rotate(var(--a)) translateY(calc(-1 * var(--d))) scale(0.3); opacity: 0; }
  }
</style>
