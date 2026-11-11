<!-- DESIGN.md section 7, Source label: where a meal's numbers came from. An estimate carries a small outlined circle. No colour. -->
<script lang="ts">
  import { t } from '$lib/i18n';

  let { source }: { source: 'database' | 'estimate' } = $props();
</script>

<span class="inline-flex items-center gap-1">
  {#if source === 'estimate'}<span class="size-2 flex-none rounded-full border border-current" aria-hidden="true"></span>{/if}{t.source[source]}
</span>
