<!-- A shared meal's photo on the map or in its sheet (S1b): yours from the phone, a friend's from the server. A skeleton
     while it loads; before it has uploaded, a lavender tile with a camera, and `coming` said under it. -->
<script lang="ts">
  import Camera from '@lucide/svelte/icons/camera';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { photoUrl } from './photos';

  let { path = null, local = null, class: cls = '', alt = '', coming = '' }: { path?: string | null; local?: string | null; class?: string; alt?: string; coming?: string } = $props();

  let url = $state<string | null | undefined>(undefined); // undefined while it loads
  $effect(() => {
    const from = { path, local };
    let gone = false;
    url = undefined;
    void photoUrl(from).then((u) => { if (!gone) url = u; });
    return () => { gone = true; };
  });
</script>

{#if url}
  <img src={url} {alt} class="object-cover {cls}" data-testid="shared-photo" />
{:else if url === null}
  <span class="tile flex flex-col items-center justify-center gap-2 {cls}" data-testid="shared-photo-coming">
    <Camera size={coming ? 32 : 20} strokeWidth={2} aria-hidden="true" />
    {#if coming}<span class="text-callout">{coming}</span>{/if}
  </span>
{:else}
  <Skeleton class="block {cls}" />
{/if}
