<!-- A short list of choices as full width rows with a check on the picked one (Settings, M9a): a radio group. A tap
     selects and saves; nothing moves on by itself. Rows are divided by hairlines, as Row's are. -->
<script lang="ts" generics="T extends string | number">
  import Check from '@lucide/svelte/icons/check';
  import { haptic } from '$lib/haptics';

  let { value, options, label, onchange, testid }: {
    value: T;
    options: { value: T; label: string; caption?: string }[];
    label: string;
    onchange: (v: T) => void;
    testid?: string;
  } = $props();
</script>

<div role="radiogroup" aria-label={label} data-testid={testid}>
  {#each options as o (o.value)}
    {@const on = o.value === value}
    <button
      type="button"
      role="radio"
      aria-checked={on}
      class="active:bg-surface-2 -mx-6 flex w-[calc(100%+var(--inset)*2)] items-center px-6 text-left transition-colors duration-[var(--d-press)]"
      onclick={() => { if (!on) { haptic(); onchange(o.value); } }}
    >
      <span class="border-line flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 [*+*>&]:border-t">
        <span class="min-w-0 flex-1">
          <span class="text-body block font-semibold">{o.label}</span>
          {#if o.caption}<span class="text-caption text-ink-2 block">{o.caption}</span>{/if}
        </span>
        <Check class="flex-none {on ? 'text-ink' : 'invisible'}" size={22} strokeWidth={2.5} aria-hidden="true" />
      </span>
    </button>
  {/each}
</div>
