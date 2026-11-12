// Which app-wide sheet is open. Mounted once in App.svelte, opened from anywhere (the avatar, the plus, a meal row).
import type { MealItem } from '../../shared/records';

export const sheets = $state({
  signin: false,
  account: false,
  add: false,
  search: false,
  quick: false,
  how: false,
  describe: false,
  /** the Scan sheet (B1, F22) */
  scan: false,
  /** what the Review sheet analyses: a photo just taken, or a description */
  review: null as { kind: 'photo'; file: Blob } | { kind: 'text'; text: string } | null,
  /** the session whose menu is open: Skip today */
  session: null as { date: string; key: string; name: string } | null,
  /** the Supplement sheet (N2): `id` null sets one up; `meal` edits a logged entry */
  supplement: null as { id: string | null; meal?: string } | null,
  /** the meal open in the Meal sheet */
  meal: null as string | null,
  /** the date of the check-in open in the Check-in sheet: today's, or a stored one */
  checkin: null as string | null,
  /** Search picks an item for the open meal instead of logging one (Replace, Add an item) */
  pick: null as ((item: MealItem) => void) | null,
});

/** The sheets the logging flow owns, loaded together. */
export const logOpen = () => sheets.add || sheets.scan || sheets.search || sheets.quick || sheets.how || sheets.describe || sheets.review !== null || sheets.meal !== null || sheets.session !== null || sheets.supplement !== null;
