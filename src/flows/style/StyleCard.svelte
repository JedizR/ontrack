<!-- The owner, 20 Nov: once, under Today's hero, the two styles side by side as small drawings. A tap puts the app in that
     style at once, so it is tried on the real page; Use keeps it and closes the card. Settings has the same choice at its
     top, which the last line points to. The drawings use arbitrary backgrounds so Bento's card (which turns its grey
     children white) does not repaint them. -->
<script lang="ts">
  import Card from '$lib/components/Card.svelte';
  import CardHead from '$lib/components/CardHead.svelte';
  import Button from '$lib/components/Button.svelte';
  import { t } from '$lib/i18n';
  import { haptic } from '$lib/haptics';
  import { prefs, type Look } from '$lib/prefs.svelte';

  const LOOKS: Look[] = ['tray', 'bento'];
  const BOXES = [0, 1, 2];
  function pick(v: Look) {
    if (prefs.look === v) return;
    haptic();
    prefs.look = v;
  }
  function keep() {
    haptic();
    prefs.stylePicked = true;
  }
</script>

<Card data-testid="style-card">
  <CardHead eyebrow={t.style.eyebrow} title={t.style.title} line={t.style.line} />
  <div class="mt-4 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.prefs.look}>
    {#each LOOKS as v (v)}
      {@const on = prefs.look === v}
      <button
        type="button"
        role="radio"
        aria-checked={on}
        class="bg-surface-2 flex min-w-0 flex-col gap-2 rounded-md p-2 pb-3 text-left ring-2 transition-[box-shadow,transform] duration-[var(--d-press)] ring-inset active:scale-[0.98] {on ? 'ring-ink' : 'ring-transparent'}"
        onclick={() => pick(v)}
        data-testid="style-{v}"
      >
        <!-- 8 inside the tile's 24, so 16; the shapes 8 inside that are 8, and Tray's boxes 4 inside its 8 tray are 4 -->
        <span class="flex h-20 flex-col rounded-sm p-2 {v === 'tray' ? '[background:var(--surface-2)]' : '[background:var(--surface)]'}" aria-hidden="true">
          {#if v === 'tray'}
            <span class="shadow-card flex flex-1 flex-col gap-1 rounded-xs p-1 [background:var(--surface)]">
              <span class="flex-1 rounded-[calc(var(--r-xs)-var(--s-1))] [background:var(--accent-soft)]"></span>
              <span class="grid flex-1 grid-cols-3 gap-1">{#each BOXES as b (b)}<span class="rounded-[calc(var(--r-xs)-var(--s-1))] [background:var(--surface-2)]"></span>{/each}</span>
            </span>
          {:else}
            <span class="flex flex-1 flex-col gap-1">
              <span class="rounded-xs flex-1 [background:var(--accent-soft)]"></span>
              <span class="grid flex-1 grid-cols-3 gap-1">{#each BOXES as b (b)}<span class="rounded-xs [background:var(--surface-2)]"></span>{/each}</span>
            </span>
          {/if}
        </span>
        <span class="flex flex-col px-1">
          <span class="text-callout font-semibold">{t.prefs.looks[v]}</span>
          <span class="text-caption text-ink-2">{t.prefs.lookLines[v]}</span>
        </span>
      </button>
    {/each}
  </div>
  <Button variant="primary" full class="mt-4" onclick={keep} data-testid="style-use">{t.style.use(t.prefs.looks[prefs.look])}</Button>
  <p class="text-caption text-ink-2 mt-3">{t.style.later}</p>
</Card>
