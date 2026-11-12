// What the model returns (TECH-SPEC section 8). The same schema validates the reply and, as JSON Schema, constrains it.
import * as z from 'zod/mini';

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
    }),
  ),
});
export type ModelOutput = z.infer<typeof modelOutput>;

/** For Gemini's responseJsonSchema, which does not take the `$schema` key. */
const { $schema: _, ...jsonSchema } = z.toJSONSchema(modelOutput);
export const MODEL_JSON_SCHEMA = jsonSchema;
