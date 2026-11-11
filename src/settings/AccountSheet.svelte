<!-- SCREENS.md section 11, Account: email, backup state, Sign out, Delete account (typed confirmation, danger style).
     Opens from the avatar until Settings exists (M9), which takes these rows over. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Row from '$lib/components/Row.svelte';
  import Button from '$lib/components/Button.svelte';
  import { t } from '$lib/i18n';
  import { num } from '$lib/model/format';
  import { session } from '$lib/session.svelte';
  import { db } from '$lib/db/store.svelte';
  import { deleteAccount, signOut } from '$lib/actions';

  let { open = $bindable(false) }: { open?: boolean } = $props();

  let mode = $state<'main' | 'delete'>('main');
  let busy = $state(false);
  let unsent = $state(false);
  let typed = $state('');
  let error = $state('');

  const email = $derived(session.user?.email ?? '');
  const matches = $derived(!!email && typed.trim().toLowerCase() === email.toLowerCase());

  $effect(() => {
    if (open) untrack(() => { mode = 'main'; busy = false; unsent = false; typed = ''; error = ''; });
  });

  async function leave(force = false) {
    busy = true;
    // reloads the app when it works; stops here when changes could not be sent
    if ((await signOut(force)) === 'unsent') unsent = true;
    busy = false;
  }

  async function remove() {
    if (!matches) return;
    busy = true;
    error = '';
    if ((await deleteAccount()) !== 'ok') error = t.account.deleteFailed;
    busy = false;
  }
</script>

{#snippet confirm()}
  <Button variant="danger" size="lg" full disabled={!matches || busy} onclick={remove} data-testid="delete-confirm-button">
    {busy ? t.account.deleting : t.account.delete}
  </Button>
{/snippet}

<!-- the sheet is already a surface, so the rows sit on it directly, on the gutter -->
<Sheet bind:open title={mode === 'main' ? t.account.title : t.account.delete} layer="base" testid="account-sheet" footer={mode === 'delete' ? confirm : undefined}>
  {#if mode === 'main'}
    <div>
      <Row title={t.account.email} caption={email} />
      <Row title={t.account.backup} caption={db.pending > 0 ? t.account.waiting(num(db.pending)) : t.account.backedUp} />
    </div>
    {#if unsent}
      <p class="text-callout text-attention mt-4" role="alert" data-testid="account-unsent">{t.account.unsent(num(db.pending))}</p>
    {/if}
    <div class="mt-5 flex flex-col gap-1">
      {#if unsent}
        <Button variant="danger" full disabled={busy} onclick={() => leave(true)} data-testid="account-signout-anyway">{t.account.signOutAnyway}</Button>
      {:else}
        <Button full disabled={busy} onclick={() => leave()} data-testid="account-signout">{busy ? t.account.signingOut : t.account.signOut}</Button>
      {/if}
      <Button variant="danger" full disabled={busy} onclick={() => (mode = 'delete')} data-testid="account-delete">{t.account.delete}</Button>
    </div>
  {:else}
    <p class="text-body">{t.account.deleteLead}</p>
    <form class="mt-5 flex flex-col gap-2" onsubmit={(e) => { e.preventDefault(); void remove(); }}>
      <label for="delete-confirm" class="text-caption text-ink-2">{t.account.deleteConfirm}</label>
      <input
        id="delete-confirm"
        type="email"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        bind:value={typed}
        class="bg-surface-2 h-13 w-full rounded-sm px-4 outline-none focus-visible:outline-2 focus-visible:outline-ink"
        data-testid="delete-confirm"
      />
    </form>
    <p class="text-callout text-danger mt-3 min-h-5" role="alert">{error}</p>
    <Button variant="plain" size="sm" class="-ml-4" disabled={busy} onclick={() => (mode = 'main')}>{t.account.back}</Button>
  {/if}
</Sheet>
