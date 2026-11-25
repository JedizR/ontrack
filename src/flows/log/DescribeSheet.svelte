<!-- SCREENS.md section 7, Describe: a sentence about the meal, analysed into the same Review sheet as a photo. R7: the
     mic records up to 15 s and the server writes it down in Thai, English or both (R1 had Safari's English only); a
     browser that cannot record falls back to its own recognition in the phone's language. -->
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
  import { canRecord, record, tooShort, type Recording } from '$lib/voice';
  import { transcribe } from '$lib/actions';

  let text = $state('');
  $effect(() => {
    if (!sheets.describe) return void stopAll();
    text = '';
    note = '';
    // the mic on Add: listening at once, where the browser can
    if (sheets.listen) { sheets.listen = false; queueMicrotask(() => listen()); }
  });
  const ready = $derived(text.trim().length > 0);

  // R1: the browser's recognition, where the phone cannot record
  type Rec = { lang: string; interimResults: boolean; continuous: boolean; start(): void; stop(): void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null };
  const Speech = (typeof window !== 'undefined' ? ((window as unknown as Record<string, new () => Rec>).SpeechRecognition ?? (window as unknown as Record<string, new () => Rec>).webkitSpeechRecognition) : undefined);
  let rec: Rec | null = null;
  // R7: the clip goes to the server only to be written down; the words land in the field to be read and fixed, and
  // nothing else is sent until Find the foods
  let clip: Recording | null = null;
  let listening = $state(false);
  let writing = $state(false);
  let note = $state('');
  const mic = canRecord();
  let starting = false; // a second tap while the microphone opens is ignored, or the first would stay on
  let gen = 0; // each close of the sheet; an answer for an earlier one is dropped
  async function listen() {
    haptic();
    if (writing || starting) return;
    if (clip) return void finish();
    if (rec) return void rec.stop();
    note = '';
    if (!mic) return speech();
    const me = gen;
    starting = true;
    let c: Recording;
    try { c = await record(() => void finish()); } catch (e) {
      starting = false;
      if (me === gen) note = (e as DOMException).name === 'NotAllowedError' ? t.describe.micOff : t.describe.failed;
      return;
    }
    starting = false;
    if (!sheets.describe || me !== gen) return c.cancel(); // closed while the phone asked
    clip = c;
    listening = true;
  }
  async function finish() {
    const c = clip;
    if (!c) return;
    clip = null;
    listening = false;
    const audio = c.stop();
    if (tooShort(audio)) return void (note = t.describe.nothing);
    const me = gen;
    writing = true;
    const r = await transcribe(audio);
    if (me !== gen) return;
    writing = false;
    if (!r.ok) note = r.error === 'offline' ? t.describe.offline : t.describe.failed;
    else if (!r.text) note = t.describe.nothing;
    else text = ((text.trim() ? `${text.trim()} ` : '') + r.text).slice(0, MAX_TEXT);
  }
  function stopAll() { gen++; clip?.cancel(); clip = null; rec?.stop(); listening = false; writing = false; }
  const line = $derived(listening ? t.describe.listening : writing ? t.describe.writing : note);

  let before = '';
  function speech() {
    if (!Speech) return;
    rec = new Speech();
    rec.lang = navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    before = text.trim() ? `${text.trim()} ` : '';
    rec.onresult = (e) => { text = (before + Array.from(e.results).map((r) => r[0].transcript).join('')).slice(0, MAX_TEXT); };
    rec.onend = rec.onerror = () => { listening = false; rec = null; };
    listening = true;
    rec.start();
  }
  $effect(() => stopAll);

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
    {#if mic || Speech}
      <Button size="sm" onclick={listen} aria-pressed={listening} disabled={writing} data-testid="describe-mic">
        {#if listening}<Square size={16} strokeWidth={2.5} fill="currentColor" aria-hidden="true" />{t.describe.stop}{:else}<Mic size={18} strokeWidth={2.25} aria-hidden="true" />{t.describe.speak}{/if}
      </Button>
    {/if}
  </div>
  <textarea id="describe-text" rows="4" maxlength={MAX_TEXT} {@attach (el) => el.focus()} enterkeyhint="done" bind:value={text} placeholder={thaiFirst() ? t.describe.hintThai : t.describe.hint} class="input-field mt-2 block w-full resize-none py-4" data-testid="describe-text"></textarea>
  <div aria-live="polite">{#if line}<p class="text-caption text-ink-2 mt-2" data-testid="describe-note">{line}</p>{/if}</div>
</Sheet>
