// The only place that touches Date (TECH-SPEC section 11). Days are the device's calendar date as YYYY-MM-DD,
// captured at write time; never derived from a UTC timestamp. M5 adds addDays, weekStart and formatting.
const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = () => isoDate(new Date());
export const nowIso = () => new Date().toISOString();
export const yearOf = (date: string) => Number(date.slice(0, 4));
/** Monday 0 to Sunday 6. Noon, so a daylight saving change cannot move the day. */
export const weekdayOf = (date: string) => (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
