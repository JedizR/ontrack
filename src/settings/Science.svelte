<!-- SCREENS.md section 11, The science: every constant in C under its group, with its plain name, value, source and
     status; a row opens its unit, its parts, its note and the full citation. Then the food tables, credited. -->
<script lang="ts">
  import Row from '$lib/components/Row.svelte';
  import { C } from '$lib/model/engine';
  import { num } from '$lib/model/format';
  import { SCIENCE } from '$lib/data/science';
  import { FOOD_SOURCES, OFF_SOURCE, SOURCES } from '$lib/data/sources';
  import { t } from '$lib/i18n';

  type Key = keyof typeof C;
  let opened = $state<Key | null>(null);
  const partOf = (key: Key, part: string) =>
    (key === 'neat' || key === 'neatSteps' ? (t.move as Record<string, unknown>)[part] : (t.science.parts as Record<string, string>)[part]) as string ?? part;
</script>

{#snippet heading(text: string)}
  <h3 class="text-eyebrow text-ink-2 mt-6 mb-1">{text}</h3>
{/snippet}

<p class="text-body">{t.science.intro}</p>
<p class="text-callout text-ink-2 mt-2">{t.science.statusKey}</p>

{#each SCIENCE as g (g.group)}
  {@render heading(t.science.groups[g.group])}
  <div data-testid="science-{g.group}">
    {#each g.keys as key (key)}
      {@const c = C[key] as (typeof C)[Key]}
      {@const open = opened === key}
      <Row title={t.science.names[key]} value={typeof c.value === 'number' ? num(c.value, 4) : undefined} onclick={() => (opened = open ? null : key)} testid="science-{key}">
        {#snippet caption()}
          <span class="block">{c.source === 'OT' ? t.science.ours : SOURCES[c.source]?.short}</span>
          <span class="block" data-testid="science-status">{t.science.status[c.status]}</span>
          {#if open}
            <span class="text-ink mt-2 block">{t.science.unit}: {c.unit}</span>
            {#if typeof c.value === 'object'}
              {#each Object.entries(c.value) as [part, v] (part)}
                <span class="text-ink flex justify-between gap-4"><span>{partOf(key, part)}</span><span class="num">{num(v, 4)}</span></span>
              {/each}
            {/if}
            {#if 'note' in c && c.note}<span class="mt-1 block">{c.note}</span>{/if}
            {#if c.source !== 'OT'}<span class="mt-1 block" data-testid="science-cite">{SOURCES[c.source]?.cite}</span>{/if}
            {#if key.startsWith('met')}<span class="mt-1 block">{t.science.met}</span>{/if}
          {/if}
        {/snippet}
      </Row>
    {/each}
  </div>
{/each}

{@render heading(t.science.foods)}
<p class="text-callout text-ink-2">{t.science.foodsLine}</p>
<div data-testid="science-foods">
  {#each [...Object.values(FOOD_SOURCES), OFF_SOURCE] as f (f.name)}
    <Row title={f.name}>
      {#snippet caption()}
        {#if f.terms}<a class="text-accent-ink inline-block min-h-[var(--tap)] py-2.5 underline" href={f.terms} target="_blank" rel="noopener">{t.science.terms}</a>{/if}
      {/snippet}
    </Row>
  {/each}
</div>
