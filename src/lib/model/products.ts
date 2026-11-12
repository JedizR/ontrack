// Scanned products (B1, F22): what an amount of one puts on the day, its portion chips, and the label step's numbers.
// Every value comes from Open Food Facts, the pack's label or the user; nothing is estimated.
import type { MealItem, Product } from '../../../shared/records';

export type Macros = Product['per100'];
export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Values per 100 g scaled to an amount: whole kcal, macros to one decimal. */
export const scaleTo = (per100: Macros, grams: number): Macros => {
  const k = grams / 100;
  return { kcal: Math.round(per100.kcal * k), protein: r1(per100.protein * k), carbs: r1(per100.carbs * k), fat: r1(per100.fat * k) };
};
/** Values for an amount back to 100 g, to two decimals so the same amount gives back the same numbers. */
export const per100From = (v: Macros, grams: number): Macros => {
  const k = 100 / grams;
  return { kcal: r2(v.kcal * k), protein: r2(v.protein * k), carbs: r2(v.carbs * k), fat: r2(v.fat * k) };
};

/** The product at an amount, as a meal item that remembers its barcode. */
export const productItem = (code: string, p: Product, grams: number): MealItem => ({ name: p.name, grams, ...scaleTo(p.per100, grams), source: p.source, barcode: code });

/** The chips: one serving, the whole pack when it differs, and 100. */
export const MAX_AMOUNT = 10000; // a meal item's grams
export function portionsOf(p: Pick<Product, 'servingG' | 'packG'>) {
  const out: { key: 'serving' | 'pack' | 'hundred'; grams: number }[] = [];
  if (p.servingG) out.push({ key: 'serving', grams: p.servingG });
  if (p.packG && p.packG !== p.servingG && p.packG <= MAX_AMOUNT) out.push({ key: 'pack', grams: p.packG });
  if (!out.some((o) => o.grams === 100)) out.push({ key: 'hundred', grams: 100 });
  return out;
}
/** Where the amount starts: the last amount logged, else a serving, else the pack, else 100. */
export const startOf = (p: Pick<Product, 'lastG' | 'servingG' | 'packG'>) => Math.min(MAX_AMOUNT, p.lastG ?? p.servingG ?? p.packG ?? 100);

/** What stops a label from being saved: no serving to weigh the values by, macros heavier than the serving, or more
 * calories than any food has in that weight (pure fat is about 900 kcal in 100 g; past 1,000 is a typo). */
export function labelProblem(servingG: number, v: Macros): 'serving' | 'heavy' | 'kcal' | null {
  if (!servingG) return 'serving';
  if (v.protein + v.carbs + v.fat > servingG) return 'heavy';
  return (v.kcal * 100) / servingG > 1000 ? 'kcal' : null;
}
