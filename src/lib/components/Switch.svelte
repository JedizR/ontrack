<!-- An on and off control, 44 to tap. On is ink, never lime: lime means on track. -->
<script lang="ts">
  import { haptic } from '$lib/haptics';

  let { checked = $bindable(false), label, onchange, testid }: { checked: boolean; label: string; onchange?: (v: boolean) => void; testid?: string } = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  class="group grid h-11 flex-none place-items-center"
  onclick={() => { haptic(); checked = !checked; onchange?.(checked); }}
  data-testid={testid}
>
  <span class="relative block h-[30px] w-[50px] rounded-full transition-colors duration-[var(--d-ui)] {checked ? 'bg-ink' : 'bg-surface-3'}">
    <span class="bg-surface absolute top-[3px] left-[3px] size-6 rounded-full transition-transform duration-[var(--d-ui)] {checked ? 'translate-x-5' : ''}"></span>
  </span>
</button>
