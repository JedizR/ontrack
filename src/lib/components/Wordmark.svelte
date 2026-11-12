<!-- DESIGN.md section 1: the frozen ONTRACK wordmark (design/brand/wordmark.svg, the owner's, with the mark as its O),
     filled in currentColor. Only where the name is spelled out: the landing page's bar and its giant footer (L1). -->
<script lang="ts">
  import svg from '../../../design/brand/wordmark.svg?raw';
  /** the box the drawing fills: 24 high by default */
  let { class: cls = 'h-6 w-fit' }: { class?: string } = $props();
</script>

<!-- the file carries its own role="img" and label -->
<div class="{cls} [&>svg]:h-full [&>svg]:w-auto">{@html svg}</div>
