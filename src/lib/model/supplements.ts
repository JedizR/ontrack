// Supplements (N2, PRD F21): the presets, and what a logged amount puts on the day. Ontrack logs what the user takes; it
// never suggests a supplement or an amount. Every number comes from the tub's label or the food table.
import { itemFor, type Food } from '$lib/data/foods';
import { per100From } from './products';
import { ML_PER_CUP } from './units';
import type { Goal } from './engine';
import type { FoodMemory, MealItem, Supplement } from '../../../shared/records';

export type Kind = Supplement['kind'];
/** The setup's list, in its order: the two the food table has first. */
export const KINDS: Kind[] = ['whey', 'plant', 'casein', 'gainer', 'creatine', 'other'];
/** The list for a goal (O1): gaining puts whey and mass gainer first. An order, never a recommendation. */
export const kindsFor = (goal?: Goal): Kind[] => (goal === 'gain' ? ['whey', 'gainer', 'plant', 'casein', 'creatine', 'other'] : KINDS);
/** The food table's food a preset starts from, where USDA has one. The others start at 0 and ask for the label. */
export const PRESET_FOOD: Partial<Record<Kind, string>> = { whey: 'whey-protein', plant: 'soy-protein-powder' };
/** What a shake can be mixed with besides water, from the food table. */
export const MILKS = ['milk-whole', 'milk-2', 'milk-skim', 'soy-milk', 'almond-milk'];
export const MAX_SCOOPS = 10;
/** Where the milk stepper starts the first time: a glass, in millilitres (an interface default). */
export const GLASS_ML = 250;
/** Grams in a millilitre of a drink, from the food table's own cup of it (USDA weighs a cup of whole milk at 244 g). */
const gPerMl = (f: Pick<Food, 'portions'>) => (f.portions.find((p) => p.label === '1 cup')?.grams ?? ML_PER_CUP) / ML_PER_CUP;
/** A drink's grams as the millilitres shown (owner, after N2: milk in ml), and back. */
export const mlOf = (f: Pick<Food, 'portions'> | undefined, grams: number) => (f ? Math.round(grams / gPerMl(f)) : grams);
export const gramsOf = (f: Pick<Food, 'portions'> | undefined, ml: number) => (f ? r1(ml * gPerMl(f)) : ml);

const r1 = (n: number) => Math.round(n * 10) / 10;

/** The table's scoop for a preset's food, 0 (not known) when it lists none. */
export const scoopOf = (f?: Food) => f?.portions.find((p) => p.label === '1 scoop')?.grams ?? 0;

/** A preset's values for one scoop of this many grams: the food's values per 100 g, scaled. */
export function perScoopOf(f: Pick<Food, 'per100'> | undefined, grams: number): Supplement['perScoop'] {
  if (!f) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const k = grams / 100;
  return { kcal: Math.round(f.per100.kcal * k), protein: r1(f.per100.protein * k), carbs: r1(f.per100.carbs * k), fat: r1(f.per100.fat * k) };
}

/** A supplement with no calories (creatine) is logged as taken and shown compactly. */
export const noCalories = (s: Pick<Supplement, 'perScoop'>) => s.perScoop.kcal === 0;

export type Milk = { food: Food; grams: number; mine?: FoodMemory['per100'] };

/** What an amount puts on the day: the supplement at its scoops, labelled Yours (the user's label) or Typical (still on
 * the table's typical values, B1), then the milk it was mixed with, from the table or the user's remembered numbers for
 * it (F15). */
export function supplementItems(id: string, s: Supplement, scoops: number, milk?: Milk): MealItem[] {
  const p = s.perScoop;
  const item: MealItem = { name: s.name, kcal: Math.round(p.kcal * scoops), protein: r1(p.protein * scoops), carbs: r1(p.carbs * scoops), fat: r1(p.fat * scoops), source: s.typical ? 'typical' : 'yours', supplementId: id, scoops };
  if (s.scoopG) item.grams = r1(s.scoopG * scoops);
  return milk ? [item, itemFor(milk.food, milk.grams, milk.mine)] : [item];
}

type Macros = Supplement['perScoop'];
/** How many scoops a printed serving is ("2 scoops (60 g)"), 1 when it does not say. */
export function scoopsIn(serving?: string) {
  const m = /(\d+(?:[.,]\d+)?)\s*(?:level\s+)?scoops?\b/i.exec(serving ?? '');
  const n = m ? Number(m[1].replace(',', '.')) : 1;
  return n > 0 && n <= 20 ? n : 1;
}
/**
 * A tub's label or Open Food Facts entry as the setup's starting point (B1), in the label's own terms (owner, after N2):
 * the serving as printed, the scoops in it, and values per 100 g (`base`) that the serving's values follow. A label that
 * prints a serving with no weight gives that serving's values directly (`own`) and leaves its weight unknown (0).
 */
export function fromServing(o: { per100?: Macros | null; perServing?: Macros | null; servingG?: number | null; scoops?: number | null }) {
  const scoops = o.scoops && o.scoops > 0 ? o.scoops : 1;
  const servingG = o.servingG ?? 0;
  const base = o.perServing && o.servingG ? per100From(o.perServing, o.servingG) : (o.per100 ?? undefined);
  return { servingG, scoops, base, own: base ? null : (o.perServing ?? { kcal: 0, protein: 0, carbs: 0, fat: 0 }) };
}
/** What a supplement keeps: one scoop, a serving divided by the scoops in it. */
export function oneScoop(servingG: number, scoops: number, v: Macros) {
  return { scoopG: r1(servingG / scoops), perScoop: { kcal: Math.round(v.kcal / scoops), protein: r1(v.protein / scoops), carbs: r1(v.carbs / scoops), fat: r1(v.fat / scoops) } };
}
