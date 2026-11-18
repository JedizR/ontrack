<!-- R2, a small congratulation: dots fly out of what was just done and fade, once. 19 Nov, the owner: a little explosion,
     subtle, all in the check's green: a ring opens behind the dots, which go out at two short distances. Decoration
     only; under reduced motion it is gone at once. -->
<script lang="ts">
  const DOTS = 12;
</script>

<span class="burst pointer-events-none absolute inset-0" aria-hidden="true">
  <b></b>
  {#each Array.from({ length: DOTS }, (_, i) => i) as i (i)}
    <i style="--a: {(i * 360) / DOTS}deg; --d: {i % 2 ? 18 : 26}px; --s: {i % 2 ? 4 : 5}px"></i>
  {/each}
</span>

<style>
  .burst b {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    border: 2px solid var(--success);
    animation: ring 480ms var(--ease-out) forwards;
  }
  .burst i {
    position: absolute;
    left: 50%;
    top: 50%;
    width: var(--s);
    height: var(--s);
    margin: calc(var(--s) / -2);
    border-radius: 999px;
    background: var(--success);
    animation: burst 640ms var(--ease-out) forwards;
  }
  @keyframes ring {
    from { transform: scale(1); opacity: 0.7; }
    to { transform: scale(1.9); opacity: 0; }
  }
  @keyframes burst {
    0% { transform: rotate(var(--a)) translateY(0) scale(0.4); opacity: 1; }
    40% { transform: rotate(var(--a)) translateY(calc(-0.7 * var(--d))) scale(1); opacity: 1; }
    100% { transform: rotate(var(--a)) translateY(calc(-1 * var(--d))) scale(0.2); opacity: 0; }
  }
</style>
