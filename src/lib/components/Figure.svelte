<!-- DESIGN.md section 5: a formatted number whose decimals read lighter, as OneFin's "4,025.08". ink-2, not ink-3, so the
     decimals still pass on the hero's haze. -->
<script lang="ts">
  let { text }: { text: string } = $props();
  const at = $derived(text.lastIndexOf('.'));
</script>

{#if at < 0}{text}{:else}{text.slice(0, at)}<span class="text-ink-2">{text.slice(at)}</span>{/if}
