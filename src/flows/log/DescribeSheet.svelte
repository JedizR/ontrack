<!-- SCREENS.md section 7, Describe: a sentence about the meal, analysed into the same Review sheet as a photo. -->
<script lang="ts">
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { t } from '$lib/i18n';
  import { thaiFirst } from '$lib/data/foods';
  import { MAX_TEXT } from '../../../shared/analysis';

  let text = $state('');
  $effect(() => { if (sheets.describe) text = ''; });
  const ready = $derived(text.trim().length > 0);

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
  <label for="describe-text" class="text-caption text-ink-2">{t.describe.field}</label>
  <textarea id="describe-text" rows="4" maxlength={MAX_TEXT} {@attach (el) => el.focus()} enterkeyhint="done" bind:value={text} placeholder={thaiFirst() ? t.describe.hintThai : t.describe.hint} class="input-field mt-2 block w-full resize-none py-4" data-testid="describe-text"></textarea>
</Sheet>
