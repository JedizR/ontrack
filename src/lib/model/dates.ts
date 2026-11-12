// The only place that touches Date (TECH-SPEC section 11). Days are the device's calendar date as YYYY-MM-DD,
// captured at write time; never derived from a UTC timestamp.
const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** A YYYY-MM-DD day at local noon, so a daylight saving change cannot move it. */
const local = (date: string) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

export const today = () => isoDate(new Date());
export const nowIso = () => new Date().toISOString();
export const yearOf = (date: string) => Number(date.slice(0, 4));
/** Monday 0 to Sunday 6. */
export const weekdayOf = (date: string) => (local(date).getDay() + 6) % 7;
export function addDays(date: string, n: number) {
  const d = local(date);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
/** Whole days from a to b. */
export const daysBetween = (a: string, b: string) => Math.round((local(b).getTime() - local(a).getTime()) / 86400000);
/** The seven days ending on `date`, oldest first. */
export const lastWeek = (date: string) => [6, 5, 4, 3, 2, 1, 0].map((n) => addDays(date, -n));

/** The phone's calendar day of a timestamp, to say when a friend's meal was shared ("Today, 12:40"). Display only:
 * a day's records are still bucketed by the date captured at write time. */
export const localDayOf = (iso: string) => isoDate(new Date(iso));
/** "08:10": the local clock time of an ISO timestamp, 24 hour. */
export function timeOf(iso: string) {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
/** The ISO timestamp of a local day at "HH:MM". */
export function atTime(date: string, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = local(date);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
}

const TITLE = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
/** "Monday, Nov 9": a day as a screen title. */
export const dayTitle = (date: string) => TITLE.format(local(date));
/** When something logged now on `date` happened: now, or this clock time on a past day. */
export const stampOn = (date: string) => (date === today() ? nowIso() : atTime(date, timeOf(nowIso())));
const SHORT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
/** "Nov 9": a day on a chart axis or in a list. */
export const shortDate = (date: string) => SHORT.format(local(date));
const MONTH = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
/** "November 2026": a month heading. */
export const monthTitle = (date: string) => MONTH.format(local(date));
