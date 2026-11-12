<!-- SCREENS.md section 13, Your profile: the photo, name and handle friends find you by, and the switch that shows your
     program to friends (off unless turned on). A new handle is checked with the server; the rest saves offline. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import { toast } from 'svelte-sonner';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Switch from '$lib/components/Switch.svelte';
  import { t } from '$lib/i18n';
  import { db } from '$lib/db/store.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { handleFree, saveSocial, syncNow } from '$lib/actions';
  import { HANDLE } from '../../../shared/records';
  import Avatar from './Avatar.svelte';

  let name = $state('');
  let handle = $state('');
  let show = $state(false);
  /** undefined keeps the photo, null removes it, a Blob replaces it */
  let photo = $state<Blob | null | undefined>(undefined);
  let preview = $state<string | null>(null);
  let check = $state<'idle' | 'checking' | 'free' | 'taken' | 'bad' | 'offline'>('idle');
  let error = $state('');
  let saving = $state(false);
  let picker: HTMLInputElement;

  const was = $derived(db.get('social', 'social'));
  const open = $derived(sheets.profile !== null);
  const tidy = $derived(handle.trim().replace(/^@/, '').toLowerCase());
  const changed = $derived(tidy !== (was?.handle ?? ''));
  const valid = $derived(name.trim().length > 0 && HANDLE.test(tidy) && check !== 'taken');

  $effect(() => {
    if (open) untrack(() => {
      const s = db.get('social', 'social');
      name = s?.name ?? '';
      handle = s?.handle ?? '';
      show = !!s?.showProgram;
      setPhoto(undefined);
      check = 'idle';
      error = '';
    });
  });

  // a changed handle is checked after a pause; characters a handle cannot hold are said at once
  $effect(() => {
    const h = tidy;
    if (!open || !changed) return void (check = 'idle');
    if (/[^a-z0-9_]/.test(h)) return void (check = 'bad');
    if (!HANDLE.test(h)) return void (check = 'idle');
    check = 'checking';
    const timer = setTimeout(async () => {
      const r = await handleFree(h);
      if (h !== tidy) return;
      check = r.ok ? (r.value ? 'free' : 'taken') : r.error === 'offline' ? 'offline' : 'idle';
    }, 400);
    return () => clearTimeout(timer);
  });

  function setPhoto(p: Blob | null | undefined) {
    if (preview) URL.revokeObjectURL(preview);
    photo = p;
    preview = p ? URL.createObjectURL(p) : null;
  }
  const hasPhoto = $derived(photo ? true : photo === null ? false : !!was?.photo);

  async function save() {
    if (!valid || saving) return;
    saving = true;
    error = '';
    const r = await saveSocial({ handle: tidy, name, showProgram: show }, photo);
    saving = false;
    if (r === 'taken') return void (check = 'taken');
    if (r !== 'ok') return void (error = r === 'offline' ? t.social.handleOffline : r === 'bad_request' ? t.social.badPhoto : t.social.actionFailed);
    const then = sheets.profile?.then;
    sheets.profile = null;
    setPhoto(undefined);
    toast(t.social.saved);
    void syncNow(); // friends can find the new handle as soon as it reaches the server
    then?.();
  }

  const caption = $derived(
    check === 'taken' ? t.social.taken : check === 'bad' ? t.social.badHandle : check === 'offline' ? t.social.handleOffline : check === 'free' ? t.social.available : t.social.handleRule,
  );
</script>

{#snippet footer()}
  <Button variant="primary" size="lg" full disabled={!valid || saving} onclick={save} data-testid="profile-save">{t.social.save}</Button>
{/snippet}

<Sheet bind:open={() => open, (v) => { if (!v) { sheets.profile = null; setPhoto(undefined); } }} title={was ? t.social.profile : t.social.setup} layer="nested" testid="profile-sheet" {footer}>
  <div class="flex items-center gap-4">
    {#if preview}
      <img src={preview} alt="" class="size-24 flex-none rounded-full object-cover" data-testid="profile-preview" />
    {:else}
      <Avatar name={name || '?'} local={photo === null ? null : (was?.photo ?? null)} size="xl" />
    {/if}
    <div class="flex flex-col items-start gap-1">
      <Button size="sm" onclick={() => picker.click()} data-testid="profile-photo">{hasPhoto ? t.social.changePhoto : t.social.addPhoto}</Button>
      {#if hasPhoto}<Button variant="plain" size="sm" onclick={() => setPhoto(null)} data-testid="profile-photo-remove">{t.social.removePhoto}</Button>{/if}
    </div>
    <input bind:this={picker} type="file" accept="image/*" class="hidden" onchange={(e) => { const f = e.currentTarget.files?.[0]; if (f) setPhoto(f); e.currentTarget.value = ''; }} data-testid="profile-photo-input" />
  </div>

  <div class="mt-6 flex flex-col gap-2">
    <label for="profile-name" class="text-caption text-ink-2">{t.social.name}</label>
    <input id="profile-name" type="text" maxlength="40" autocomplete="given-name" enterkeyhint="next" bind:value={name} placeholder={t.social.nameHint} class="input-field w-full min-w-0" data-testid="profile-name" />
  </div>

  <div class="mt-4 flex flex-col gap-2">
    <label for="profile-handle" class="text-caption text-ink-2">{t.social.handleLabel}</label>
    <div class="relative">
      <span class="text-body text-ink-2 pointer-events-none absolute top-1/2 left-5 -translate-y-1/2" aria-hidden="true">@</span>
      <input id="profile-handle" type="text" maxlength="21" autocapitalize="none" autocomplete="username" autocorrect="off" spellcheck="false" enterkeyhint="done" bind:value={handle} placeholder={t.social.handleHint} class="input-field w-full min-w-0 pl-10" aria-describedby="profile-handle-note" data-testid="profile-handle" />
    </div>
    <p id="profile-handle-note" class="text-caption {check === 'taken' || check === 'bad' ? 'text-attention' : 'text-ink-2'}" aria-live="polite" data-testid="profile-handle-note">{caption}</p>
  </div>

  <div class="border-line mt-4 flex items-center gap-4 border-t pt-4">
    <div class="min-w-0 flex-1">
      <p class="text-body font-semibold">{t.social.showProgram}</p>
      <p class="text-caption text-ink-2">{t.social.showProgramLine}</p>
    </div>
    <Switch bind:checked={show} label={t.social.showProgram} testid="profile-program" />
  </div>

  <p class="text-caption text-ink-2 mt-4">{t.social.findable}</p>
  {#if error}<p class="text-callout text-attention mt-3" role="alert" data-testid="profile-error">{error}</p>{/if}
</Sheet>
