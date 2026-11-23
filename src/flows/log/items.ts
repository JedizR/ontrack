// Editing a meal's items (the Review layout, SCREENS.md section 7): each line keeps the item as it came and a factor,
// so grams, portion chips and the stepper scale calories and macros from the original numbers, never compounding.
import { db } from '$lib/db/store.svelte';
import { foodKey, withMine } from '$lib/data/foods';
import type { MealItem } from '../../../shared/records';

/** `original`: the item as the table or the model gave it, before the user's own numbers (F15), so they can be undone.
 * `corrected`: the user changed its numbers here, so saving remembers them. */
/** `alts` (R5): what the AI thinks it may also be, offered as one tap swaps until the line is changed by hand */
export type Line = { base: MealItem; factor: number; original?: MealItem; corrected?: true; alts?: { foodId: string; name: string; kcal: number }[] };
export const lineOf = (base: MealItem): Line => ({ base, factor: 1 });
/** A new item's line with the user's remembered numbers for its food, when there are any (F15). */
export function lineWithMine(item: MealItem): Line {
  const mine = item.grams ? db.get('food', foodKey(item)) : undefined;
  return mine ? { base: withMine(item, mine.per100), factor: 1, original: item } : lineOf(item);
}

const r1 = (n: number) => Math.round(n * 10) / 10;
export function scaled({ base, factor }: Line): MealItem {
  if (factor === 1) return base;
  const out: MealItem = { ...base, kcal: Math.round(base.kcal * factor), protein: r1(base.protein * factor), carbs: r1(base.carbs * factor), fat: r1(base.fat * factor) };
  if (base.grams !== undefined) out.grams = Math.round(base.grams * factor);
  return out;
}

/** Half, Same, One and a half, Double. */
export const PORTIONS = [['half', 0.5], ['same', 1], ['more', 1.5], ['double', 2]] as const;

/** R5: what tells dish names apart, the words left once the words they all start and end with are taken off ("Pad kra
 * pao crispy pork with rice", "Pad kra pao tofu with rice" give "crispy pork" and "tofu"); a whole name when nothing
 * would be left. For the Review's alternatives, so a chip says only what would change. */
export function differ(names: string[]): string[] {
  const words = names.map((n) => n.split(' '));
  const short = Math.min(...words.map((w) => w.length));
  const same = (pick: (w: string[]) => string) => words.every((w) => pick(w).toLowerCase() === pick(words[0]).toLowerCase());
  let i = 0;
  while (i < short && same((w) => w[i])) i++;
  let j = 0;
  while (j < short - i && same((w) => w[w.length - 1 - j])) j++;
  return words.map((w, k) => w.slice(i, w.length - j).join(' ') || names[k]);
}
