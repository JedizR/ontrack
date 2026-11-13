<!-- Facts on one line, apart by a small divider, never a comma or a middle dot; the facts after the first one step
     lighter when `lead` lifts the first. shortcut: local to the social sheets, replace with U1b's app-wide divider. -->
<script lang="ts">
  let { facts, lead = '', class: cls = '' }: { facts: string[]; lead?: string; class?: string } = $props();
</script>

<span class="{cls} inline-flex flex-wrap items-center gap-x-2">
  {#each facts as f, i (i)}
    {#if i}<span class="bg-line-strong h-3 w-px" aria-hidden="true"></span><span class="sr-only">,</span>{/if}
    <span class={i ? '' : lead}>{f}</span>
  {/each}
</span>
