<!-- SCREENS.md section 6: the training row's menu. Skip today returns the day to its rest target (F8). -->
<script lang="ts">
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import { sheets } from '$lib/sheets.svelte';
  import { logSession } from '$lib/actions';
  import { t } from '$lib/i18n';

  function done() {
    const s = sheets.session;
    if (s) logSession({ date: s.date, sessionKey: s.key, status: 'done' });
    sheets.session = null;
  }
  function skip() {
    const s = sheets.session;
    if (s) logSession({ date: s.date, sessionKey: s.key, status: 'skipped' });
    sheets.session = null;
  }
</script>

<Sheet bind:open={() => sheets.session !== null, (v) => { if (!v) sheets.session = null; }} title={sheets.session?.name ?? ''} layer="base" testid="session-sheet">
  <div class="flex flex-col gap-2">
    <Button full onclick={done} data-testid="session-mark-done">{t.today.done}</Button>
    <Button full onclick={skip} data-testid="session-skip">{t.today.skip}</Button>
  </div>
</Sheet>
