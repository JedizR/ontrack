<script lang="ts">
  import { t } from '$lib/i18n';
  import Card from '$lib/components/Card.svelte';
  import Button from '$lib/components/Button.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { sync } from '$lib/sync/engine.svelte';
  import { session } from '$lib/session.svelte';
  import { sheets } from '$lib/sheets.svelte';

  // a new device after sign in: nothing local yet, the first pull is on its way
  const bringing = $derived(!!session.user && !sync.pulled && sync.status === 'syncing');
</script>

<section aria-label={t.tabs.today} data-testid="tab-today" class="flex flex-col gap-3 pt-2">
  {#if sync.status === 'auth'}
    <!-- SCREENS.md section 12, session expired: local data is untouched -->
    <Card data-testid="session-expired">
      <p class="text-body font-semibold">{t.session.expired}</p>
      <p class="text-callout text-ink-2 mt-1">{t.session.expiredLead}</p>
      <Button variant="neutral" class="mt-3" onclick={() => (sheets.signin = true)} data-testid="session-signin">{t.shell.signIn}</Button>
    </Card>
  {/if}

  {#if bringing}
    <div class="flex flex-col gap-3" data-testid="bringing" aria-busy="true">
      <p class="text-callout text-ink-2">{t.session.bringing}</p>
      <Skeleton class="h-56 rounded-xl" />
      <Skeleton class="h-24 rounded-lg" />
      <Skeleton class="h-40 rounded-lg" />
    </div>
  {:else}
    <p class="text-ink-2">{t.empty.today}</p>
  {/if}
</section>
