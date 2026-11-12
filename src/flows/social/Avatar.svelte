<!-- A person on the food map and in the friends panel (S1b): their profile photo, or the first letter of their name on
     lavender. `ring`: the violet ring of a map pin, Ontrack's echo of Instagram's story ring. -->
<script lang="ts">
  import { photoUrl } from './photos';

  let {
    name,
    path = null,
    local = null,
    size = 'md',
    ring = false,
    class: cls = '',
  }: { name: string; path?: string | null; local?: string | null; size?: 'sm' | 'md' | 'row' | 'lg' | 'xl'; ring?: boolean; class?: string } = $props();

  const SIZE = { sm: 'size-6 text-caption', md: 'size-10 text-body', row: 'size-12 text-body', lg: 'size-18 text-heading', xl: 'size-24 text-heading' };
  let url = $state<string | null>(null);
  $effect(() => {
    const from = { path, local };
    let gone = false;
    url = null;
    void photoUrl(from).then((u) => { if (!gone) url = u; });
    return () => { gone = true; };
  });
  const initial = $derived(name.trim().charAt(0).toUpperCase());
</script>

<!-- the lavender sits on the surface: in dark it is translucent, and a pin's avatar sits on a photo -->
<span class="bg-surface block flex-none overflow-hidden rounded-full font-semibold {SIZE[size]} {ring ? 'ring-accent ring-offset-surface ring-2 ring-offset-2' : ''} {cls}" aria-hidden="true" data-testid="avatar-person">
  {#if url}<img src={url} alt="" class="size-full object-cover" />{:else}<span class="tile grid size-full place-items-center">{initial}</span>{/if}
</span>
