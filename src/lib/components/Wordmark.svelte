<!-- DESIGN.md section 1: the frozen ONTRACK wordmark (design/brand/wordmark.svg, the owner's, with the mark as its O),
     filled in currentColor. Only where the name is spelled out: Welcome, and the landing page in L1. -->
<script lang="ts">
  import svg from '../../../design/brand/wordmark.svg?raw';
</script>

<!-- the file carries its own role="img" and label -->
<div class="h-6 w-fit [&>svg]:h-full [&>svg]:w-auto">{@html svg}</div>
