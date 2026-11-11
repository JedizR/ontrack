<!-- Large single choice answers: a title, an optional line, an optional number on the right. Picked is ink filled. -->
<script lang="ts" generics="T extends string | number">
  import { haptic } from '$lib/haptics';

  let { options, value, label, onpick }: {
    options: { value: T; title: string; line?: string; figure?: string }[];
    value: T | undefined;
    label: string;
    onpick: (v: T) => void;
  } = $props();
</script>

<div class="flex flex-col gap-3" role="radiogroup" aria-label={label}>
  {#each options as o (o.value)}
    {@const on = o.value === value}
    <button
      type="button"
      role="radio"
      aria-checked={on}
      class="flex min-h-16 w-full items-center gap-4 rounded-md px-5 py-4 text-left transition-[transform,background-color] duration-[var(--d-press)] active:scale-[0.98] {on ? 'bg-ink text-canvas' : 'bg-surface text-ink active:bg-surface-2'}"
      onclick={() => { haptic(); onpick(o.value); }}
      data-testid="choice-{o.value}"
    >
      <span class="min-w-0 flex-1">
        <span class="text-body block font-semibold">{o.title}</span>
        {#if o.line}<span class="text-callout block {on ? 'text-canvas' : 'text-ink-2'}">{o.line}</span>{/if}
      </span>
      {#if o.figure}<span class="text-body num flex-none font-semibold">{o.figure}</span>{/if}
    </button>
  {/each}
</div>
