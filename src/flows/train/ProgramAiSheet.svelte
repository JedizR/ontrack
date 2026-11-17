<!-- R2, the owner: "let AI analyse or adjust the workout program from what the user asks". Say how you train or what to
     change; the coach proposes the whole week (library exercises only, cardio after as its own linked session, numbers
     checked by the program's schema), shown day by day before anything changes. Use this program replaces it, with Undo;
     the targets follow at once, from the engine, never from the model. -->
<script lang="ts">
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Sheet from '$lib/components/Sheet.svelte';
  import Button from '$lib/components/Button.svelte';
  import Facts from '$lib/components/Facts.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import { askProgram } from '$lib/coach';
  import { changeProgram, undoToast } from '$lib/actions';
  import { haptic } from '$lib/haptics';
  import { num } from '$lib/model/format';
  import { t } from '$lib/i18n';
  import type { Program } from '../../../shared/records';
  import type { Goal, Experience } from '$lib/model/engine';

  let { open = $bindable(false), program, goal, experience, today }: { open?: boolean; program: Program; goal: Goal; experience: Experience; today: string } = $props();

  let draft = $state('');
  let phase = $state<{ kind: 'idle' } | { kind: 'asking' } | { kind: 'ready'; program: Program; summary: string } | { kind: 'failed'; message: string }>({ kind: 'idle' });
  $effect(() => { if (!open) { phase = { kind: 'idle' }; draft = ''; } });

  async function ask(q: string) {
    const question = q.trim().slice(0, 300);
    if (!question || phase.kind === 'asking') return;
    draft = question;
    haptic();
    phase = { kind: 'asking' };
    const r = await askProgram(question, $state.snapshot(program) as Program, { goal, experience }, today);
    phase = r.ok ? { kind: 'ready', program: r.program, summary: r.summary } : { kind: 'failed', message: r.error };
  }
  function use() {
    if (phase.kind !== 'ready') return;
    haptic();
    undoToast(t.aiProgram.used, changeProgram(phase.program));
    open = false;
  }
  const days = $derived(phase.kind === 'ready' ? t.train.weekdays.map((name, d) => ({ name, list: (phase as { program: Program }).program.sessions.filter((s) => s.weekday === d) })) : []);
</script>

{#snippet footer()}
  {#if phase.kind === 'ready'}
    <div class="flex flex-col gap-1">
      <Button variant="primary" size="lg" full onclick={use} data-testid="program-ai-use">{t.aiProgram.use}</Button>
      <Button variant="plain" size="md" full onclick={() => (phase = { kind: 'idle' })} data-testid="program-ai-again">{t.aiProgram.again}</Button>
    </div>
  {:else}
    <Button variant="primary" size="lg" full disabled={!draft.trim() || phase.kind === 'asking'} onclick={() => ask(draft)} data-testid="program-ai-ask">{t.aiProgram.ask}</Button>
  {/if}
{/snippet}

<Sheet bind:open title={t.aiProgram.title} layer="base" testid="program-ai-sheet" {footer}>
  {#if phase.kind === 'ready'}
    <div class="appear">
      <p class="text-body" data-testid="program-ai-summary">{phase.summary}</p>
      <p class="text-caption text-ink-2 mt-2 flex items-center gap-1"><Sparkles size={14} strokeWidth={2.25} aria-hidden="true" />{t.coach.written}</p>
      <div class="bg-surface-2 mt-4 rounded-md px-4 py-1" data-testid="program-ai-preview">
        {#each days as d (d.name)}
          <div class="border-line flex items-start gap-3 py-2.5 [&+&]:border-t">
            <span class="text-callout w-10 flex-none font-semibold">{d.name.slice(0, 3)}</span>
            <span class="text-callout min-w-0 flex-1">
              {#each d.list as s (s.key)}
                <span class="block"><span class="font-semibold">{s.name}</span> <span class="text-ink-2"><Facts facts={[t.after.minN(num(s.minutes)), s.exercises?.length ? t.train.exN(num(s.exercises.length)) : undefined, s.setup ? t.train.machines[s.setup.machine] : undefined]} /></span></span>
              {:else}
                <span class="text-ink-2">{t.train.rest}</span>
              {/each}
            </span>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <p class="text-body text-ink-2">{t.aiProgram.lead}</p>
    <textarea bind:value={draft} rows="3" maxlength="300" placeholder={t.aiProgram.placeholder} aria-label={t.aiProgram.title} class="input-field mt-4 w-full resize-none py-3" disabled={phase.kind === 'asking'} data-testid="program-ai-field"></textarea>
    {#if phase.kind === 'asking'}
      <div class="mt-4 flex flex-col gap-2" aria-busy="true" aria-label={t.ask.thinking}>
        <Skeleton class="h-4 w-3/4 rounded-xs" />
        <Skeleton class="h-10 w-full rounded-sm" />
        <Skeleton class="h-10 w-full rounded-sm" />
      </div>
    {:else}
      {#if phase.kind === 'failed'}<p class="text-callout text-attention mt-3" role="alert">{phase.message}</p>{/if}
      <div class="mt-4 flex flex-col items-start gap-2" data-testid="program-ai-chips">
        {#each t.aiProgram.chips as c (c)}
          <button type="button" class="bg-surface-2 active:bg-surface-3 text-callout min-h-11 rounded-full px-4 py-2 text-left font-semibold transition-[background-color,transform] duration-[var(--d-press)] active:scale-[0.97]" onclick={() => ask(c)} data-testid="program-ai-chip">{c}</button>
        {/each}
      </div>
    {/if}
  {/if}
</Sheet>
