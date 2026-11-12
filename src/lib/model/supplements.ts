// Supplements (N2, PRD F21): the presets, and what a logged amount puts on the day. Ontrack logs what the user takes; it
// never suggests a supplement or an amount. Every number comes from the tub's label or the food table.
import { itemFor, type Food } from '$lib/data/foods';
import type { FoodMemory, MealItem, Supplement } from '../../../shared/records';

export type Kind = Supplement['kind'];
/** The setup's list, in its order: the two the food table has first. */
export const KINDS: Kind[] = ['whey', 'plant', 'casein', 'gainer', 'creatine', 'other'];
/** The food table's food a preset starts from, where USDA has one. The others start at 0 and ask for the label. */
export const PRESET_FOOD: Partial<Record<Kind, string>> = { whey: 'whey-protein', plant: 'soy-protein-powder' };
/** What a shake can be mixed with besides water, from the food table. */
export const MILKS = ['milk-whole', 'milk-2', 'milk-skim', 'soy-milk', 'almond-milk'];
export const MAX_SCOOPS = 10;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** The table's scoop for a preset's food, 0 (not known) when it lists none. */
export const scoopOf = (f?: Food) => f?.portions.find((p) => p.label === '1 scoop')?.grams ?? 0;

/** A preset's values for one scoop of this many grams: the food's values per 100 g, scaled. */
export function perScoopOf(f: Food | undefined, grams: number): Supplement['perScoop'] {
  if (!f) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const k = grams / 100;
  return { kcal: Math.round(f.per100.kcal * k), protein: r1(f.per100.protein * k), carbs: r1(f.per100.carbs * k), fat: r1(f.per100.fat * k) };
}

/** A supplement with no calories (creatine) is logged as taken and shown compactly. */
export const noCalories = (s: Pick<Supplement, 'perScoop'>) => s.perScoop.kcal === 0;

export type Milk = { food: Food; grams: number; mine?: FoodMemory['per100'] };

/** What an amount puts on the day: the supplement at its scoops, labelled Yours (the user's label), then the milk it was
 * mixed with, from the table or the user's remembered numbers for it (F15). */
export function supplementItems(id: string, s: Supplement, scoops: number, milk?: Milk): MealItem[] {
  const p = s.perScoop;
  const item: MealItem = { name: s.name, kcal: Math.round(p.kcal * scoops), protein: r1(p.protein * scoops), carbs: r1(p.carbs * scoops), fat: r1(p.fat * scoops), source: 'yours', supplementId: id, scoops };
  if (s.scoopG) item.grams = r1(s.scoopG * scoops);
  return milk ? [item, itemFor(milk.food, milk.grams, milk.mine)] : [item];
}
