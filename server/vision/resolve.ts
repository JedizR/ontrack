// From the model's items to what the review sheet shows (TECH-SPEC section 8): nutrition per 100 g from the food
// table when the item resolves to a catalog entry (a Thai plate by its dish, protein and extras, docs/AI-THAI.md), else
// the model's estimate, clamped and checked against Atwater. R5 checks the reply against the table: the row against
// the model's own density, the grams against the table's usual serving, other plausible foods offered.
import foods from '../../src/lib/data/foods.json' with { type: 'json' };
import { V } from '../../src/lib/model/engine/constants.js';
import type { AnalysisItem, Macros } from '../../shared/analysis.js';
import type { ModelItem, ModelOutput } from './schema.js';
import { foodIdFor, otherProteins, siblings } from './thai.js';
import { portionPrior } from './serving.js';

export const MAX_ITEMS = 12;
const GRAMS = { min: 1, max: 2000 };
const MACRO_MAX = 100; // grams in 100 g

const byId = new Map(foods.map((f) => [f.id, f]));
const clamp = (v: number, lo: number, hi: number) => (Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo);
const r1 = (n: number) => Math.round(n * 10) / 10;
/** The model sometimes writes names in lower case; the app shows them in sentence case. */
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

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

const ORDER = ['low', 'medium', 'high'] as const;
/** The lower of two confidences. */
const atMost = (c: ModelItem['confidence'], cap: ModelItem['confidence']) => ORDER[Math.min(ORDER.indexOf(c), ORDER.indexOf(cap))];

/** At most 12 items; an item whose name is blank is dropped, since a meal item needs a name. The grams are checked
 * against the table's usual serving only for a `photo`: a described meal keeps the user's own amounts. */
export function resolveItems(items: ModelOutput['items'], o: { photo?: boolean } = {}): AnalysisItem[] {
  return items.filter((it) => it.name.trim()).slice(0, MAX_ITEMS).map((it) => resolveItem(it, o.photo ?? false));
}

function resolveItem(it: ModelItem, photo: boolean): AnalysisItem {
  let grams = Math.round(clamp(it.grams, GRAMS.min, GRAMS.max));
  let confidence = it.confidence;
  // the range's middle replaces grams only when grams falls outside it; a wide range caps confidence
  const { grams_low: lo = 0, grams_high: hi = 0 } = it;
  if (lo > 0 && hi >= lo) {
    if (grams < lo || grams > hi) grams = Math.round(clamp(Math.sqrt(lo * hi), GRAMS.min, GRAMS.max));
    confidence = atMost(confidence, hi / lo > V.rangeWidth.low ? 'low' : hi / lo > V.rangeWidth.medium ? 'medium' : 'high');
  }

  const est = estimate(it.est_per_100g);
  let id = foodIdFor(it, (i) => byId.has(i));
  let food = id ? byId.get(id) : undefined;
  if (id && food) {
    // the row against the model's own density: a closer sibling plate, else the row stays and confidence drops
    const gap = (f: { per100: Macros }) => Math.abs(f.per100.kcal - est.kcal);
    const off = (f: { per100: Macros }) => gap(f) > Math.max(V.rowKcalGap.estimateShare * est.kcal, V.rowKcalGap.kcal);
    if (off(food)) {
      const closest = siblings(id).map((s) => byId.get(s)!).sort((a, b) => gap(a) - gap(b))[0];
      if (closest && gap(closest) < gap(food)) [id, food] = [closest.id, closest];
      if (off(food)) confidence = 'low';
    }
    if (photo) {
      const prior = portionPrior(id, it.portion_note);
      if (prior?.count && prior.each && (grams / prior.count < V.countBand.min * prior.each || grams / prior.count > V.countBand.max * prior.each)) grams = prior.grams;
      else if (prior) {
        const r = grams / prior.grams;
        if (r < V.portionBand.min || r > V.portionBand.max) {
          grams = Math.round(prior.grams * clamp(r, V.portionBand.min, V.portionBand.max));
          confidence = 'low';
        } else {
          const w = V.portionShrink[confidence];
          grams = Math.round(grams ** (1 - w) * prior.grams ** w);
        }
      }
    }
    grams = Math.round(clamp(grams, GRAMS.min, GRAMS.max));
  }
  const per100 = food ? { kcal: food.per100.kcal, protein: food.per100.protein, carbs: food.per100.carbs, fat: food.per100.fat } : est;
  const k = grams / 100;
  const kcal = Math.round(per100.kcal * k);
  return {
    name: sentence(it.name.trim()).slice(0, 120),
    grams,
    portionNote: it.portion_note,
    foodId: food ? id : null,
    source: food ? 'db' : 'estimate',
    per100,
    kcal,
    protein: r1(per100.protein * k),
    carbs: r1(per100.carbs * k),
    fat: r1(per100.fat * k),
    confidence,
    // a table entry's values already hold its cooking oil, so the oil question stays only when the model's own fat is well above the row's
    hiddenFat: food ? it.hidden_fat && est.fat - food.per100.fat > V.rowFatGap : it.hidden_fat,
    ...alternatives(id && food ? id : null, it, est, k, kcal),
  };
}

/** Other foods the item may be: the model's second guess, then the same plate with each other protein, nearest its own
 * density first. Only when one of them differs from the choice by more than the threshold, so most meals show none. */
function alternatives(id: string | null, it: ModelItem, est: Macros, k: number, kcal: number) {
  const ids = [...new Set([it.alt_food_id, ...(id ? otherProteins(id).sort((a, b) => Math.abs(byId.get(a)!.per100.kcal - est.kcal) - Math.abs(byId.get(b)!.per100.kcal - est.kcal)) : [])])]
    .filter((a): a is string => !!a && a !== id && byId.has(a));
  const list = ids.slice(0, V.altMax).map((a) => ({ foodId: a, name: byId.get(a)!.name, kcal: Math.round(byId.get(a)!.per100.kcal * k) }));
  return list.some((a) => Math.abs(a.kcal - kcal) > V.altKcalGap * kcal) ? { alternatives: list } : {};
}
