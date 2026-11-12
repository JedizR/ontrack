<script lang="ts">
  // A protein shaker for supplements (N2): a lidded cup with a fill line, drawn like a Lucide icon. Lucide has none.
  let { size = 24, strokeWidth = 2 }: { size?: number; strokeWidth?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M8 5V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
  <path d="M6 5h12l-1.4 15.2a2 2 0 0 1-2 1.8H9.4a2 2 0 0 1-2-1.8z" />
  <path d="M6.6 11h10.8" />
</svg>
