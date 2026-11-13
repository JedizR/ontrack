<!-- An on and off control, 44 to tap. On is ink, as OneFin's selected option is black: violet is the brand and green a reached target.
     Off is the control edge (U1b), so the track and its knob keep 3 to 1 in both themes (WCAG 1.4.11). -->
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
  <span class="relative block h-[30px] w-[50px] rounded-full transition-[background-color,scale] duration-[var(--d-ui)] ease-[var(--spring-default)] group-active:scale-[0.97] {checked ? 'bg-ink' : 'bg-control-edge'}">
    <span class="bg-surface absolute top-[3px] left-[3px] size-6 rounded-full shadow-card transition-transform duration-[var(--d-ui)] ease-[var(--spring-default)] {checked ? 'translate-x-5' : ''}"></span>
  </span>
</button>
