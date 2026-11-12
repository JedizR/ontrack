// The system prompt (TECH-SPEC section 8) and the catalog of the food table, built once at module load.
import foods from '../../src/lib/data/foods.json' with { type: 'json' };

const RULES = `You identify food for a nutrition log. Reply with JSON only, matching the schema.

- List each distinct component of the meal as its own item (rice, curry, fried egg), not the dish as one line, unless the dish itself is in the catalog.
- For each item estimate the edible weight in grams as served. Use visible cues: plate and bowl size, cutlery, hands, packaging. Give your single best number.
- If an item matches a catalog entry, set food_id to that entry's id. Match the food and how it was cooked. If nothing fits well, set food_id to null.
- Always fill est_per_100g from your own knowledge of the food as cooked.
- Set hidden_fat to true for items likely cooked in or dressed with oil, butter, coconut milk or sugar that a photo cannot show.
- Names are short and plain, in the user's language. No brand names unless printed on packaging.
- If there is no food or drink, set is_food to false and return no items.
- Do not give advice. Do not total the meal.

Catalog, one entry per line as id|name:
`;

export const CATALOG = foods.map((f) => `${f.id}|${f.name}`).join('\n');
export const SYSTEM_PROMPT = RULES + CATALOG;

/** The user turn: a photo with an optional hint, or a description. */
export const userText = (i: { text?: string; hint?: string }) =>
  i.text !== undefined ? `The meal, as described by the user: ${i.text}` : i.hint ? `A photo of the meal. The user adds: ${i.hint}` : 'A photo of the meal.';
