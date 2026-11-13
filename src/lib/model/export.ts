// Settings' exports (PRD F12): every record as JSON, and meals as CSV with one line per food. Pure: the caller passes
// the records in and shares the text.
import { timeOf } from './dates';
import type { Collection, Meal } from '../../../shared/records';

type Rec = { id: string; updatedAt: number; data: unknown };

/** Every live record by collection, with what made the file. Meal photos stay out: they are pictures, not data. */
export const allJson = (records: Partial<Record<Collection, Rec[]>>, o: { version: string; exportedAt: string }) =>
  JSON.stringify({ app: 'Ontrack', version: o.version, exportedAt: o.exportedAt, records }, null, 2);

const HEAD = ['date', 'time', 'meal', 'food', 'grams', 'kcal', 'protein_g', 'carbs_g', 'fat_g', 'source', 'method'];
/** A field as a spreadsheet reads it: quoted when it holds a comma, a quote or a line break; a leading = + - @ is
 * neutralised so the cell is text, never a formula. */
function cell(v: string | number | undefined) {
  if (v === undefined) return '';
  const s = typeof v === 'number' ? String(Math.round(v * 10) / 10) : /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
/** One line per item, oldest first, in the time of this device. */
export function mealsCsv(meals: Meal[]) {
  const rows = [...meals].sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at))
    .flatMap((m) => m.items.map((i) => [m.date, timeOf(m.at), m.title || i.name, i.name, i.grams, i.kcal, i.protein, i.carbs, i.fat, i.source, m.method].map(cell).join(',')));
  return [HEAD.join(','), ...rows].join('\r\n') + '\r\n';
}
