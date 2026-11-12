<!-- DESIGN.md section 7, Week strip: seven equal cells, a weekday letter, the date, and a dot when the day was on track.
     Today is an ink pill. Days after today cannot be picked. Today passes the seven days ending today (F3). -->
<script lang="ts">
  import { t } from '$lib/i18n';
  import { weekdayOf } from '$lib/model/dates';

  let {
    days,
    today,
    selected = today,
    onselect,
  }: {
    /** seven consecutive YYYY-MM-DD local days */
    days: { date: string; onTrack: boolean }[];
    today: string;
    selected?: string;
    onselect?: (date: string) => void;
  } = $props();

  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
  // a YYYY-MM-DD string is a local calendar day: read it at local noon, never as UTC
  const local = (d: string) => {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day, 12);
  };
</script>

<nav class="grid grid-cols-7" aria-label={t.week.label} data-testid="week">
  {#each days as d (d.date)}
    {@const isToday = d.date === today}
    {@const picked = d.date === selected && !isToday}
    {@const name = fmt.format(local(d.date))}
    <button
      type="button"
      class="group grid min-w-0"
      disabled={d.date > today || !onselect}
      aria-label={d.onTrack ? t.week.onTrackDay(name) : name}
      aria-current={isToday ? 'date' : undefined}
      aria-pressed={onselect ? d.date === selected : undefined}
      onclick={() => onselect?.(d.date)}
    >
      <!-- the pill is inset 2 px a side, so neighbouring pills keep a 4 px gap while each button fills its cell -->
      <span
        class="text-caption mx-0.5 grid h-16 content-center justify-items-center gap-0.5 rounded-md transition-colors duration-[var(--d-ui)] ease-[var(--spring-default)]
          {isToday ? 'bg-ink text-canvas' : picked ? 'bg-surface text-ink-2' : 'text-ink-2 group-enabled:group-active:bg-surface-2'}"
      >
        {t.week.letters[weekdayOf(d.date)]}
        <b class="text-body num font-semibold {isToday ? 'text-canvas' : 'text-ink'}">{local(d.date).getDate()}</b>
        <i class="size-1.25 rounded-full {d.onTrack ? (isToday ? 'bg-success' : 'bg-success-ink') : ''}"></i>
      </span>
    </button>
  {/each}
</nav>
