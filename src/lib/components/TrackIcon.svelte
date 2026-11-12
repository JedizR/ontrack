<script lang="ts">
  // The Today tab icon: the brand track with its marker, drawn like a Lucide icon.
  let { size = 24, strokeWidth = 2 }: { size?: number; strokeWidth?: number } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={strokeWidth} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <rect x="3" y="7" width="18" height="10" rx="5" />
  <circle cx="15" cy="7" r="1.6" fill="currentColor" />
</svg>
