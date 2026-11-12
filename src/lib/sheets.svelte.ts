// Which app-wide sheet is open. Mounted once in App.svelte, opened from anywhere (the avatar, the plus, a meal row).
import type { MealItem } from '../../shared/records';

export const sheets = $state({
  signin: false,
  account: false,
  add: false,
  search: false,
  quick: false,
  how: false,
  /** the session whose menu is open: Skip today */
  session: null as { date: string; key: string; name: string } | null,
  /** the meal open in the Meal sheet */
  meal: null as string | null,
  /** Search picks an item for the open meal instead of logging one (Replace, Add an item) */
  pick: null as ((item: MealItem) => void) | null,
});

/** The sheets the logging flow owns, loaded together. */
export const logOpen = () => sheets.add || sheets.search || sheets.quick || sheets.how || sheets.meal !== null || sheets.session !== null;
