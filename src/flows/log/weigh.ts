// F6: one weigh-in a day, typed on the keypad in the user's units. Logging again replaces that day's value.
import { toast } from 'svelte-sonner';
import { db } from '$lib/db/store.svelte';
import { keypad } from '$lib/keypad.svelte';
import { logWeight } from '$lib/actions';
import { kgToLb, lbToKg, weightText } from '$lib/model/units';
import { t } from '$lib/i18n';
import { LIMITS } from '../onboarding/draft';

export async function weighIn(date: string) {
  const units = db.get('profile', 'profile')?.units ?? 'metric';
  const metric = units === 'metric';
  const last = db.live('weight').map((r) => r.data).filter((w) => w.date <= date).sort((a, b) => a.date.localeCompare(b.date)).at(-1);
  const [min, max] = LIMITS.weightKg;
  let hint: string = t.weigh.hint;
  let value: number | null = last ? Math.round((metric ? last.kg : kgToLb(last.kg)) * 10) / 10 : null;
  // an out of range weight asks again, saying why, with what was typed
  for (;;) {
    const v = await keypad.ask({ title: t.weigh.title, unit: metric ? t.after.kg : t.after.lb, decimal: true, value, hint });
    if (v === null) return;
    const kg = metric ? v : lbToKg(v);
    if (kg >= min && kg <= max) {
      logWeight(date, Math.round(kg * 100) / 100);
      toast(t.weigh.saved(weightText(kg, units)));
      return;
    }
    value = v;
    hint = t.body.weightRange(weightText(min, units, 0), weightText(max, units, 0));
  }
}
