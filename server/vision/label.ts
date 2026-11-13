// Reading a pack's nutrition label (B1, F22, TECH-SPEC section 8): the prompt, the schema the model answers in, and the
// answer turned into what the app shows. It copies printed values and never estimates; a column the label lacks is null.
import * as z from 'zod/mini';
import { V } from '../../src/lib/model/engine/constants.js';
import type { LabelMacros, LabelRead } from '../../shared/analysis.js';

export const LABEL_PROMPT = `You read the nutrition facts panel on a food or supplement package for a nutrition log. Reply with JSON only, matching the schema.

- Copy only numbers printed on the label. Never estimate, calculate or fill in a value that is not printed: use null.
- per_serving is the column for one serving and per_100 the column for 100 g or 100 ml, as printed. Fill each column the label prints; set a column it does not print to null.
- kcal is energy in kilocalories (kcal, Calories, or กิโลแคลอรี). kj is energy in kilojoules when printed, otherwise null.
- protein_g, carbs_g (total carbohydrate) and fat_g (total fat) are in grams.
- serving_size is the weight or volume of one serving as a number in the unit below, or null when the label gives none.
- unit is "ml" when the serving or the column is measured in millilitres, otherwise "g".
- scoops_per_serving is how many scoops make one serving when the serving size is given in scoops, otherwise null.
- servings_per_pack is the number of servings in the pack when printed, otherwise null.
- name is the product's name when it is printed in the photo, otherwise an empty string.
- Thai labels: หนึ่งหน่วยบริโภค is the serving size, จำนวนหน่วยบริโภคต่อ is servings per pack, พลังงานทั้งหมด is energy, โปรตีน is protein, คาร์โบไฮเดรตทั้งหมด is total carbohydrate, ไขมันทั้งหมด is total fat.
- If the photo shows no nutrition label you can read, set is_label to false.`;

export const LABEL_TEXT = 'A photo of a nutrition label.';

const n = z.nullable(z.number());
const column = z.nullable(z.object({ kcal: n, kj: n, protein_g: n, carbs_g: n, fat_g: n }));
export const labelOutput = z.object({
  is_label: z.boolean(),
  name: z.string(),
  unit: z.enum(['g', 'ml']),
  serving_size: n,
  scoops_per_serving: n,
  servings_per_pack: n,
  per_serving: column,
  per_100: column,
});
export type LabelOutput = z.infer<typeof labelOutput>;
const { $schema: _, ...jsonSchema } = z.toJSONSchema(labelOutput);
export const LABEL_JSON_SCHEMA = jsonSchema;

const r1 = (x: number) => Math.round(x * 10) / 10;
const grams = (x: number | null) => (x == null ? null : r1(Math.min(1000, Math.max(0, x))));
/** A column as the app takes it: kcal from kilojoules when only those are printed, a macro not printed (or cut off in
 * the photo) as null, so the app asks for it rather than logging 0 (M9a, the SunnyD read in docs/EVAL-NOTES.md). */
function columnOf(c: z.infer<typeof column>): LabelMacros | null {
  const kcal = c?.kcal ?? (c?.kj != null ? c.kj / V.kjPerKcal : null);
  if (!c || kcal == null || kcal < 0 || kcal > 5000) return null;
  return { kcal: Math.round(kcal), protein: grams(c.protein_g), carbs: grams(c.carbs_g), fat: grams(c.fat_g) };
}
const positive = (x: number | null, max: number) => (x != null && x > 0 && x <= max ? r1(x) : null);

/** The label as the app shows it, or null when there is no column with energy to read. */
export function toLabel(o: LabelOutput): LabelRead | null {
  const perServing = columnOf(o.per_serving);
  const read100 = columnOf(o.per_100);
  const per100 = read100 && read100.kcal <= 1000 ? read100 : null; // past 1,000 kcal in 100 g is a misread
  if (!o.is_label || (!perServing && !per100)) return null;
  return {
    name: o.name.trim().slice(0, 120),
    unit: o.unit,
    servingG: positive(o.serving_size, 5000),
    scoops: positive(o.scoops_per_serving, 20),
    servingsPerPack: positive(o.servings_per_pack, 100),
    perServing,
    per100,
  };
}
