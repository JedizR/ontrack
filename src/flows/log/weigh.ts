// F6: one weigh-in a day, on a wheel in the user's units that starts at the last weigh-in. Logging again replaces that
// day's value.
import { toast } from 'svelte-sonner';
import { db } from '$lib/db/store.svelte';
import { picker } from '$lib/picker.svelte';
import { logWeight } from '$lib/actions';
import { kgToLb, lbToKg, weightText } from '$lib/model/units';
import { t } from '$lib/i18n';
import { LIMITS, START, weightWheel } from '../onboarding/draft';

export async function weighIn(date: string) {
  const units = db.get('profile', 'profile')?.units ?? 'metric';
  const metric = units === 'metric';
  const last = db.live('weight').map((r) => r.data).filter((w) => w.date <= date).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const { min, max } = weightWheel(units);
  const kgOf = (v: number) => (metric ? v : lbToKg(v));
  const shown = Math.round((metric ? (last?.kg ?? START.weightKg) : kgToLb(last?.kg ?? START.weightKg)) * 10) / 10;
  const v = await picker.ask({
    title: t.weigh.title,
    value: Math.min(max, Math.max(min, shown)),
    min,
    max,
    decimals: 1,
    unit: metric ? t.after.kg : t.after.lb,
    hint: t.weigh.hint,
    saveLabel: (v) => t.weigh.save(weightText(kgOf(v), units)),
    range: t.body.weightRange(weightText(LIMITS.weightKg[0], units, 0), weightText(LIMITS.weightKg[1], units, 0)),
  });
  if (v === null) return;
  const kg = Math.round(kgOf(v) * 100) / 100;
  logWeight(date, kg);
  toast(t.weigh.saved(weightText(kg, units)));
}
