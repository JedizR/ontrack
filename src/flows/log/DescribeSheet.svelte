<!-- SCREENS.md section 7, Describe: a sentence about the meal, analysed into the same Review sheet as a photo. R1: a
     mic turns speech into the sentence where the browser can (Safari's own recognition); nowhere else it is not shown. -->
<script lang="ts">
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Mic from '@lucide/svelte/icons/mic';
  import Square from '@lucide/svelte/icons/square';
  import { haptic } from '$lib/haptics';
  import { sheets } from '$lib/sheets.svelte';
  import { t } from '$lib/i18n';
  import { thaiFirst } from '$lib/data/foods';
  import { MAX_TEXT } from '../../../shared/analysis';

  let text = $state('');
  $effect(() => {
    if (!sheets.describe) return;
    text = '';
    // the mic on Add: listening at once, where the browser can
    if (sheets.listen) { sheets.listen = false; queueMicrotask(() => listen()); }
  });
  const ready = $derived(text.trim().length > 0);

  // R1: speech to text through the browser's recognition, if it has one. The words land in the field to be read and fixed;
  // nothing is sent anywhere by Ontrack until Find the foods.
  type Rec = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
  const Speech = (typeof window !== 'undefined' ? ((window as unknown as Record<string, new () => Rec>).SpeechRecognition ?? (window as unknown as Record<string, new () => Rec>).webkitSpeechRecognition) : undefined);
  let rec: Rec | null = null;
  let listening = $state(false);
  let before = '';
  function listen() {
    if (!Speech) return;
    haptic();
    if (rec) return void rec.stop();
    rec = new Speech();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    before = text.trim() ? `${text.trim()} ` : '';
    rec.onresult = (e) => { text = (before + Array.from(e.results).map((r) => r[0].transcript).join('')).slice(0, MAX_TEXT); };
    rec.onend = rec.onerror = () => { listening = false; rec = null; };
    listening = true;
    rec.start();
  }
  $effect(() => () => rec?.stop());

  function analyse() {
    if (!ready) return;
    sheets.describe = false;
    sheets.review = { kind: 'text', text: text.trim() };
  }
</script>

{#snippet footer()}
  <Button variant="primary" size="lg" full disabled={!ready} onclick={analyse} data-testid="describe-analyse">{t.describe.analyse}</Button>
{/snippet}

<Sheet bind:open={sheets.describe} title={t.describe.title} layer="base" testid="describe-sheet" {footer}>
  <div class="flex items-center justify-between gap-3">
    <label for="describe-text" class="text-caption text-ink-2">{t.describe.field}</label>
    {#if Speech}
      <Button size="sm" onclick={listen} aria-pressed={listening} data-testid="describe-mic">
        {#if listening}<Square size={16} strokeWidth={2.5} fill="currentColor" aria-hidden="true" />{t.describe.stop}{:else}<Mic size={18} strokeWidth={2.25} aria-hidden="true" />{t.describe.speak}{/if}
      </Button>
    {/if}
  </div>
  <textarea id="describe-text" rows="4" maxlength={MAX_TEXT} {@attach (el) => el.focus()} enterkeyhint="done" bind:value={text} placeholder={thaiFirst() ? t.describe.hintThai : t.describe.hint} class="input-field mt-2 block w-full resize-none py-4" data-testid="describe-text"></textarea>
</Sheet>
