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
  /** the mic on Add: Describe opens already listening (R1) */
  listen: false,
  /** every saved meal (R1), over Add */
  saved: false,
  /** the Scan sheet (B1, F22) */
  scan: false,
  /** what the Add sheet's camera hands the Scan sheet: a barcode read, or a label photo */
  scanFrom: null as { code: string } | { label: Blob } | null,
  /** what the Review sheet analyses: a photo just taken, or a description */
  review: null as { kind: 'photo'; file: Blob } | { kind: 'text'; text: string } | null,
  /** R5: the date a rest day's activity is added to */
  activity: null as string | null,
  /** R5: the session key just added from a sheet, inked in on Today as Done is, once the sheet has gone */
  inked: null as string | null,
  /** the session whose menu is open: Skip today */
  session: null as { date: string; key: string; name: string } | null,
  /** the Supplement sheet (N2): `id` null sets one up; `meal` edits a logged entry */
  supplement: null as { id: string | null; meal?: string; kind?: 'whey' | 'plant' | 'casein' | 'gainer' | 'creatine' | 'other' } | null,
  /** the meal open in the Meal sheet */
  meal: null as string | null,
  /** the date of the check-in open in the Check-in sheet: today's, or a stored one */
  checkin: null as string | null,
  /** the food map and friends (S1b), full screen over the tab */
  friends: false,
  /** R5: the plans: after onboarding, at a free limit, from a Pro feature or Settings; welcome back from Checkout */
  paywall: null as { from: 'onboarding' | 'limit' | 'ask' | 'adjust' | 'settings' | 'welcome' } | null,
  /** R5: the goal, its pace and goal weight, from Progress's Goal box and Profile's goal */
  goal: false,
  /** the Profile page, from the header's person button; Settings is a button at its foot */
  me: false,
  /** Edit profile, over the Profile page or the map; `then` runs once it is saved (a friend request waiting for a profile) */
  profile: null as { then?: () => void } | null,
  /** Search picks an item for the open meal instead of logging one (Replace, Add an item) */
  pick: null as ((item: MealItem) => void) | null,
});

/** The sheets the logging flow owns, loaded together. */
export const logOpen = () => sheets.add || sheets.saved || sheets.scan || sheets.search || sheets.quick || sheets.how || sheets.describe || sheets.review !== null || sheets.meal !== null || sheets.session !== null || sheets.supplement !== null || sheets.activity !== null;
