<!-- SCREENS.md section 5, Sign in: Google, or an email code typed in this app. Both finish inside the installed app
     (magic links would open Safari, which has its own storage). The six boxes are one input underneath, so iOS can
     fill the code from Mail and a paste lands whole. -->
<script lang="ts">
  import { untrack } from 'svelte';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import { t } from '$lib/i18n';
  import { session } from '$lib/session.svelte';
  import { sendEmailCode, signInWithGoogle, verifyEmailCode } from '$lib/actions';
  import type { FailKind } from '$lib/backend/types';

  let { open = $bindable(false), title = t.signin.welcomeBack }: { open?: boolean; title?: string } = $props();

  const CODE_LENGTH = 6;
  const RESEND_S = 30;
  const CODE_LIFE_MS = 10 * 60_000;

  let step = $state<'email' | 'code'>('email');
  let email = $state('');
  let code = $state('');
  let busy = $state(false);
  let error = $state('');
  let shake = $state(false);
  let sentAt = 0;
  let wait = $state(0);
  let google = $state(false);
  let codeInput = $state<HTMLInputElement>();

  const validEmail = $derived(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
  const MESSAGES: Partial<Record<FailKind, string>> = { network: t.signin.offline, rate_limited: t.signin.rateLimited, bad_request: t.signin.badEmail };

  // every open starts at the email step; whether Google is offered depends on the project
  $effect(() => {
    if (!open) return;
    untrack(() => { step = 'email'; code = ''; error = ''; busy = false; });
    void session.backend?.auth.googleEnabled().then((on) => (google = on));
  });
  // the resend countdown
  $effect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => (wait -= 1), 1000);
    return () => clearTimeout(id);
  });

  const offline = () => navigator.onLine === false;

  async function send(again = false) {
    if (busy || !validEmail) return;
    if (offline()) return void (error = t.signin.offline);
    busy = true;
    error = '';
    const r = await sendEmailCode(email.trim());
    busy = false;
    if (r !== 'ok') return void (error = MESSAGES[r] ?? t.signin.failed);
    sentAt = Date.now();
    wait = RESEND_S;
    code = '';
    step = 'code';
    if (again) error = t.signin.sentAgain;
    setTimeout(() => codeInput?.focus(), 50);
  }

  async function verify() {
    if (busy) return;
    if (offline()) return void (error = t.signin.offline);
    busy = true;
    error = '';
    const r = await verifyEmailCode(email.trim(), code);
    busy = false;
    if (r === 'ok') return void (open = false);
    if (r === 'wrong_code') {
      // the provider cannot tell a mistyped code from an old one; the clock can
      error = Date.now() - sentAt > CODE_LIFE_MS ? t.signin.expired : t.signin.wrongCode;
      code = '';
      shake = true;
      codeInput?.focus();
    } else error = MESSAGES[r] ?? t.signin.failed;
  }

  function typed(e: Event & { currentTarget: HTMLInputElement }) {
    code = e.currentTarget.value.replace(/\D/g, '').slice(0, CODE_LENGTH);
    e.currentTarget.value = code;
    if (code.length === CODE_LENGTH) void verify();
  }

  async function withGoogle() {
    if (offline()) return void (error = t.signin.offline);
    busy = true;
    const r = await signInWithGoogle(); // leaves the page when it works
    busy = false;
    if (r !== 'ok') error = MESSAGES[r] ?? t.signin.failed;
  }
</script>

{#snippet message()}
  <p class="text-callout mt-3 min-h-5 {error === t.signin.sentAgain ? 'text-ink-2' : 'text-danger'}" role="alert" data-testid="signin-error">{error}</p>
{/snippet}

<Sheet bind:open {title} layer="base" testid="signin-sheet">
  <p class="text-callout text-ink-2">{t.signin.lead}</p>

  {#if step === 'email'}
    {#if google}
      <div class="mt-5">
        <Button full onclick={withGoogle} disabled={busy} data-testid="signin-google">
          <img src="/google.svg" alt="" class="size-5" />{t.signin.google}
        </Button>
      </div>
      <div class="text-caption text-ink-2 my-4 flex items-center gap-3" aria-hidden="true">
        <span class="bg-line h-px flex-1"></span>{t.signin.or}<span class="bg-line h-px flex-1"></span>
      </div>
    {/if}
    <form class="flex flex-col gap-2 {google ? '' : 'mt-5'}" onsubmit={(e) => { e.preventDefault(); void send(); }}>
      <label for="signin-email" class="text-caption text-ink-2">{t.signin.email}</label>
      <input
        id="signin-email"
        type="email"
        inputmode="email"
        autocomplete="email"
        autocapitalize="off"
        spellcheck="false"
        enterkeyhint="send"
        bind:value={email}
        class="bg-surface-2 h-13 w-full rounded-sm px-4 outline-none focus-visible:outline-2 focus-visible:outline-ink"
        data-testid="signin-email"
      />
    </form>
    {@render message()}
  {:else}
    <p class="text-body mt-5">{t.signin.codeSent(email.trim())}</p>
    <div class="relative mt-4 {shake ? 'animate-shake' : ''}" onanimationend={() => (shake = false)}>
      <div class="grid grid-cols-6 gap-2" aria-hidden="true">
        {#each { length: CODE_LENGTH } as _, i}
          <div class="num bg-surface-2 text-heading grid h-14 place-items-center rounded-sm {i === code.length && !busy ? 'ring-ink ring-2' : ''}">{code[i] ?? ''}</div>
        {/each}
      </div>
      <input
        bind:this={codeInput}
        value={code}
        oninput={typed}
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        pattern="[0-9]*"
        maxlength={CODE_LENGTH}
        aria-label={t.signin.code}
        disabled={busy}
        class="absolute inset-0 size-full opacity-0"
        data-testid="signin-code"
      />
    </div>
    {@render message()}
    <div class="mt-3 flex flex-wrap items-center gap-x-2">
      <Button variant="plain" size="sm" class="-ml-4" disabled={wait > 0 || busy} onclick={() => send(true)} data-testid="signin-resend">
        {wait > 0 ? t.signin.sendAgainIn(String(wait)) : t.signin.sendAgain}
      </Button>
      <Button variant="plain" size="sm" disabled={busy} onclick={() => { step = 'email'; error = ''; }}>{t.signin.otherEmail}</Button>
    </div>
  {/if}


  {#snippet footer()}
    {#if step === 'email'}
      <Button variant="primary" size="lg" full disabled={!validEmail || busy} onclick={() => send()} data-testid="signin-send">
        {busy ? t.signin.sending : t.signin.sendCode}
      </Button>
    {:else}
      <Button variant="primary" size="lg" full disabled={code.length < CODE_LENGTH || busy} onclick={verify} data-testid="signin-verify">
        {busy ? t.signin.checking : t.shell.signIn}
      </Button>
    {/if}
  {/snippet}
</Sheet>
