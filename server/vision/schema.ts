// What the model returns (TECH-SPEC section 8). The same schema validates the reply and, as JSON Schema, constrains it.
import * as z from 'zod/mini';

/** A Thai dish's main protein (docs/AI-THAI.md); `none` for anything that is not a Thai dish. */
export const PROTEINS = ['pork', 'minced pork', 'crispy pork', 'chicken', 'beef', 'duck', 'shrimp', 'squid', 'seafood', 'fish', 'tofu', 'egg', 'none'] as const;
/** What comes on the plate with a Thai dish. */
export const EXTRAS = ['rice', 'fried egg'] as const;

const n = z.number();
export const modelOutput = z.object({
  is_food: z.boolean(),
  title: z.string(),
  items: z.array(
    z.object({
      name: z.string().check(z.minLength(1)),
      grams: n,
      portion_note: z.string(),
      food_id: z.nullable(z.string()),
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

/** For Gemini's responseJsonSchema, which does not take the `$schema` key. */
const { $schema: _, ...jsonSchema } = z.toJSONSchema(modelOutput);
export const MODEL_JSON_SCHEMA = jsonSchema;
