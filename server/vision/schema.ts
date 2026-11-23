// What the model returns (TECH-SPEC section 8). The same schema validates the reply and, as JSON Schema, constrains it.
import * as z from 'zod/mini';

/** A Thai dish's main protein (docs/AI-THAI.md); `none` for anything that is not a Thai dish. */
export const PROTEINS = ['pork', 'minced pork', 'crispy pork', 'chicken', 'beef', 'duck', 'shrimp', 'squid', 'seafood', 'fish', 'tofu', 'egg', 'none'] as const;
/** What comes on the plate with a Thai dish. */
export const EXTRAS = ['rice', 'fried egg'] as const;

const n = z.number();
// R5: `scene` comes before `items` so the model reasons about scale before it writes grams. The fields below marked
// "asked for" are optional here (an older reply, a fixture, a replay lacks them) and required in the JSON Schema.
export const modelOutput = z.object({
  is_food: z.boolean(),
  title: z.string(),
  /** the vessel and its size, and what else in the photo gives the scale; empty for a text description */
  scene: z.optional(z.object({ vessel: z.string(), references: z.string() })),
  items: z.array(
    z.object({
      name: z.string().check(z.minLength(1)),
      grams: n,
      /** the range the model is about 80 percent sure holds the true weight */
      grams_low: z.optional(n),
      grams_high: z.optional(n),
      portion_note: z.string(),
      food_id: z.nullable(z.string()),
      /** the catalog id of its second most likely food, or null */
      alt_food_id: z.optional(z.nullable(z.string())),
      est_per_100g: z.object({ kcal: n, protein_g: n, carbs_g: n, fat_g: n }),
      confidence: z.enum(['high', 'medium', 'low']),
      hidden_fat: z.boolean(),
      dish: z.nullable(z.string()),
      protein: z.enum(PROTEINS),
      extras: z.array(z.enum(EXTRAS)),
    }),
  ),
});
export type ModelOutput = z.infer<typeof modelOutput>;
export type ModelItem = ModelOutput['items'][number];

/** For Gemini's responseJsonSchema, which does not take the `$schema` key. Property order is the order above. */
const { $schema: _, ...jsonSchema } = z.toJSONSchema(modelOutput);
// asked for: optional to parse, required to ask
const asked = (o: { required?: string[] }, ...keys: string[]) => { o.required = [...(o.required ?? []), ...keys]; };
asked(jsonSchema, 'scene');
asked((jsonSchema.properties as Record<string, { items: { required?: string[] } }>).items.items, 'grams_low', 'grams_high', 'alt_food_id');
export const MODEL_JSON_SCHEMA = jsonSchema;
