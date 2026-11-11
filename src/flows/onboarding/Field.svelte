<!-- A value that opens the keypad: label on the left, the value (or a prompt) on the right. -->
<script lang="ts">
  import { t } from '$lib/i18n';

  let { label, value, onclick, testid }: { label: string; value: string | null; onclick: () => void; testid: string } = $props();
</script>

<button
  type="button"
  class="bg-surface active:bg-surface-2 flex min-h-16 w-full items-center gap-4 rounded-md px-5 py-4 text-left transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.98]"
  {onclick}
  data-testid={testid}
>
  <span class="text-body flex-1 font-semibold">{label}</span>
  <span class="text-body num {value ? 'font-semibold' : 'text-ink-2'}">{value ?? t.body.tap}</span>
</button>
