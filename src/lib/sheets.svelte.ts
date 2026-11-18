// Which app-wide sheet is open. Mounted once in App.svelte, opened from anywhere (the avatar, the plus, a meal row).
import type { MealItem, Workout } from '../../shared/records';
import type { Muscle } from '$lib/model/engine';

/** What the workout's finish screen shows (R2): all of it computed by the engine when the workout is saved. */
export type WorkoutDone = {
  name: string;
  seconds: number;
  sets: number;
  reps: number;
  volumeKg: number;
  bests: { name: string; text: string; gain: string | null }[];
  levels: Partial<Record<Muscle, 1 | 2 | 3>>;
  week: { done: number; planned: number };
  workout: Workout;
  date: string;
  key: string;
};

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
  /** the workout being logged set by set (R1): the day and the session in the program */
  workout: null as { date: string; key: string } | null,
  /** R2: the finished workout's full screen moment (Strava's "Nice work"), until Continue */
  done: null as WorkoutDone | null,
  /** every saved meal (R1), over Add */
  saved: false,
  /** the Scan sheet (B1, F22) */
  scan: false,
  /** what the Add sheet's camera hands the Scan sheet: a barcode read, or a label photo */
  scanFrom: null as { code: string } | { label: Blob } | null,
  /** what the Review sheet analyses: a photo just taken, or a description */
  review: null as { kind: 'photo'; file: Blob } | { kind: 'text'; text: string } | null,
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
  /** Your profile, over the map; `then` runs once it is saved (a friend request waiting for a profile) */
  profile: null as { then?: () => void } | null,
  /** Search picks an item for the open meal instead of logging one (Replace, Add an item) */
  pick: null as ((item: MealItem) => void) | null,
});

/** The sheets the logging flow owns, loaded together. */
export const logOpen = () => sheets.add || sheets.saved || sheets.workout !== null || sheets.done !== null || sheets.scan || sheets.search || sheets.quick || sheets.how || sheets.describe || sheets.review !== null || sheets.meal !== null || sheets.session !== null || sheets.supplement !== null;
