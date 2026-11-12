<!-- A logged meal's thumbnail, from this phone or downloaded once from the account; the fallback until it is there. -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { mealThumb } from '$lib/actions';

  let { id, class: cls = '', fallback }: { id: string; class?: string; fallback?: Snippet } = $props();
  let url = $state<string | null>(null);

  $effect(() => {
    let made: string | null = null;
    let gone = false;
    void mealThumb(id).then((b) => { if (b && !gone) url = made = URL.createObjectURL(b); });
    return () => {
      gone = true;
      if (made) URL.revokeObjectURL(made);
      url = null;
    };
  });
</script>

{#if url}<img src={url} alt="" class="object-cover {cls}" data-testid="thumb" />{:else}{@render fallback?.()}{/if}
