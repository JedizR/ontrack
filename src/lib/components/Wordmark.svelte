<!-- DESIGN.md section 1: the mark with the word Ontrack beside it, live text. Only on Welcome and Settings. -->
<script lang="ts">
  import { t } from '$lib/i18n';
</script>

<div class="flex items-center gap-2" role="img" aria-label={t.app.name}>
  <svg viewBox="0 0 64 64" fill="none" class="size-9 flex-none" aria-hidden="true">
    <mask id="ot-mark-gap">
      <rect width="64" height="64" fill="white" />
      <circle cx="42" cy="22" r="6.5" fill="black" />
    </mask>
    <rect x="13.25" y="22" width="37.5" height="20" rx="10" stroke="currentColor" stroke-width="4.5" mask="url(#ot-mark-gap)" />
    <circle cx="42" cy="22" r="4" fill="currentColor" />
  </svg>
  <!-- Geist 600 at Heading size, never in capitals (DESIGN.md section 1) -->
  <span class="leading-none font-semibold tracking-[-0.02em]" style="font-size: var(--t-heading)" aria-hidden="true">{t.app.name}</span>
</div>
