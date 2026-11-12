// From the model's items to what the review sheet shows (TECH-SPEC section 8): nutrition per 100 g from the food
// table when the model names a catalog entry, else the model's estimate, clamped and checked against Atwater.
import foods from '../../src/lib/data/foods.json' with { type: 'json' };
import { V } from '../../src/lib/model/engine/constants.js';
import type { AnalysisItem, Macros } from '../../shared/analysis.js';
import type { ModelOutput } from './schema.js';

export const MAX_ITEMS = 12;
const GRAMS = { min: 1, max: 2000 };
const MACRO_MAX = 100; // grams in 100 g

const byId = new Map(foods.map((f) => [f.id, f.per100]));
const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);
const r1 = (n: number) => Math.round(n * 10) / 10;

/** The model's estimate, clamped; kcal recomputed from the macros when it disagrees with them by more than 25 percent. */
export function estimate(e: ModelOutput['items'][number]['est_per_100g']): Macros {
  const protein = clamp(e.protein_g, 0, MACRO_MAX);
  const carbs = clamp(e.carbs_g, 0, MACRO_MAX);
  const fat = clamp(e.fat_g, 0, MACRO_MAX);
  const atwater = V.atwater.protein * protein + V.atwater.carbs * carbs + V.atwater.fat * fat;
  const kcal = clamp(e.kcal, 0, V.estimateKcalMax);
  const off = Math.abs(kcal - atwater) > V.estimateKcalTolerance * atwater;
  return { kcal: off ? Math.min(V.estimateKcalMax, Math.round(atwater)) : kcal, protein, carbs, fat };
}

/** At most 12 items; an item whose name is blank is dropped, since a meal item needs a name. */
export function resolveItems(items: ModelOutput['items']): AnalysisItem[] {
  return items.filter((it) => it.name.trim()).slice(0, MAX_ITEMS).map((it) => {
    const grams = Math.round(clamp(it.grams, GRAMS.min, GRAMS.max));
    const table = it.food_id ? byId.get(it.food_id) : undefined;
    const per100 = table ? { kcal: table.kcal, protein: table.protein, carbs: table.carbs, fat: table.fat } : estimate(it.est_per_100g);
    const k = grams / 100;
    return {
      name: it.name.trim().slice(0, 120),
      grams,
      portionNote: it.portion_note,
      foodId: table ? it.food_id : null,
      source: table ? 'db' : 'estimate',
      per100,
      kcal: Math.round(per100.kcal * k),
      protein: r1(per100.protein * k),
      carbs: r1(per100.carbs * k),
      fat: r1(per100.fat * k),
      confidence: it.confidence,
      hiddenFat: it.hidden_fat,
    };
  });
}
