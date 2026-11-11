<!-- DESIGN.md section 7, Empty state: one line saying what will appear here and one button to make it appear. No illustrations. -->
<script lang="ts">
  import Button from './Button.svelte';

  let { text, action, onaction }: { text: string; action?: string; onaction?: () => void } = $props();
</script>

<div class="flex flex-col items-start gap-3">
  <p class="text-body text-ink-2">{text}</p>
  {#if action && onaction}<Button onclick={onaction}>{action}</Button>{/if}
</div>
