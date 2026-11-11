<!-- DESIGN.md section 7, Skeleton: a block in surface-2 at the final layout's size, with a slow opacity pulse.
     Size and radius come from the caller, so the skeleton matches what replaces it. -->
<script lang="ts">
  let { class: cls = '' }: { class?: string } = $props();
</script>

<div class="bg-surface-2 animate-pulse motion-reduce:animate-none {cls}" aria-hidden="true"></div>
