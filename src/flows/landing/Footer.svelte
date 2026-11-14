<!-- L5, the owner: a short footer. "Keep your calories" in over the wordmark, both lines the same width, big and in
     the middle, then the essentials: the small print, centred, and the year (far left) and version (far right) on one line;
     the contact and legal links, with a faint divider between them, come first on a phone and in the middle on a wide
     screen. -->
<script lang="ts">
  import Wordmark from '$lib/components/Wordmark.svelte';
  import { t } from '$lib/i18n';

  const L = t.landing;
  // the address public/privacy.html and terms.html give: data, not words, so not in the catalog
  const CONTACT = 'team.ontrackapp@gmail.com';
  const link = 'tap link-line text-callout text-ink active:bg-surface-2 inline-flex min-h-11 items-center rounded-xs px-2';
  const LINKS = [[CONTACT, `mailto:${CONTACT}`], [t.settings.privacy, '/privacy.html'], [t.settings.terms, '/terms.html']];
</script>

<footer class="px-4 pt-16 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6" data-testid="landing-footer">
  <div class="mx-auto max-w-[1200px] [container-type:inline-size]">
    <!-- the first line is sized from the column so it spans it; the wordmark under it takes the same width -->
    <h2 class="keep text-poster text-ink text-center whitespace-nowrap" style:font-size="calc(100cqw / 8.3)">{L.footer.keep}</h2>
    <Wordmark class="text-ink mt-[0.12em] h-auto w-full [&>svg]:h-auto! [&>svg]:w-full!" />

    <div class="border-line-strong text-caption text-ink-2 mt-6 flex flex-wrap items-center justify-between gap-x-8 gap-y-1 border-t pt-2">
      <nav class="order-1 flex w-full flex-wrap items-center justify-center sm:order-3 sm:w-auto" aria-label={t.settings.privacy}>
        {#each LINKS as [label, href], i (href)}
          {#if i}<span class="bg-line-strong h-4 w-px" aria-hidden="true"></span>{/if}
          <a class={link} {href} target={i ? '_blank' : undefined} rel={i ? 'noopener' : undefined}>{label}</a>
        {/each}
      </nav>
      <p class="text-ink-3 order-2 w-full text-center sm:order-1">{t.screening.disclaimer}</p>
      <!-- on a phone the line under the small print sits as far from it as the small print does from the links (19 px of air each) -->
      <span class="order-3 max-sm:mt-3.25 sm:order-2">{L.footer.year}</span>
      <span class="order-4 max-sm:mt-3.25">{t.settings.version} {__APP_VERSION__}</span>
    </div>
  </div>
</footer>
