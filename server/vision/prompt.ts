// The system prompt (TECH-SPEC section 8) and the catalog of the food table, built once at module load. R5: each catalog
// line carries the table's usual serving in grams, and the Thai dishes that come in variants are listed once as a family
// (the resolver finds the variant from dish, protein and extras: docs/AI-THAI.md), which pays for the serving column.
import foods from '../../src/lib/data/foods.json' with { type: 'json' };
import { FAMILIES, PLATES } from './thai.js';
import { SERVING } from './serving.js';

const RULES = `You identify food for a nutrition log. Reply with JSON only, matching the schema.

- scene comes first. vessel: the plate, bowl or cup and its size in cm. references: cutlery, hands, cups or packaging you can see, with their size. Under 12 words each; empty for a description with no photo.
- When a whole dish is in the catalog (pad thai, khao man kai, boat noodles), give it as one item with that food_id rather than its parts. Otherwise list each distinct component as its own item (rice, curry, fried egg). A dish family (listed first below) has no id: for one, set food_id to null and give dish, protein and extras; the table picks the exact plate.
- For each item estimate the edible weight in grams as served. Use visible cues: plate and bowl size, cutlery, hands, packaging. grams is your single best number; grams_low and grams_high are the range you are 80 percent sure holds the true weight, narrow when the scale is clear and wide when it is not.
- The number after a name is the table's usual serving in grams (each: one piece). Scale from it by what you see: 0.7 to 1.4 times is usual; go outside that only when the photo clearly shows it. A saucer or a side bowl holds a small portion.
- Scale anchors: a dinner plate is about 26 cm across, a side plate or saucer 15 cm, a rice bowl 12 cm; a fork or soup spoon is about 18 cm long, a soft drink can 12 cm tall, a credit card 8.6 cm wide; the table has a cup of cooked rice at 158 g, a full plate of rice at 250 g, a fried egg at 46 g.
- Set food_id to a catalog entry's id only when the entry matches both the food and how it was cooked: rice cooked in chicken fat, stock or coconut milk is not plain rice, and fried is not boiled. If nothing fits well, set food_id to null. alt_food_id: the id of your second most likely entry, or null.
- Always fill est_per_100g from your own knowledge of the food as cooked.
- For a Thai dish, also give its parts. dish: the base dish as the catalog writes it, without protein or extras (Pad kra pao, Fried rice, Green curry, Rad na). protein: its main protein, as the photo shows or the user says (kra pao with crispy pork belly is crispy pork). extras: rice and fried egg when they are part of this item; not when you list them as their own items. A one-plate dish with a fried egg comes on rice unless the user says otherwise. For anything else dish is null, protein none and extras empty.
- Set hidden_fat to true for items likely cooked in or dressed with oil, butter, coconut milk or sugar that a photo cannot show; stir-fried and deep-fried items always. Not for poached, steamed, boiled or raw items.
- Names are short, plain and specific, the way a menu names them: beef green curry, not beef curry. For a Thai dish use its common romanised name (khao soi, som tam). Use the user's language. No brand names unless printed on packaging.
- Give identical items one line with their combined weight, and the count in portion_note.
- If there is no food or drink, set is_food to false and return no items.
- Do not give advice. Do not total the meal.
`;

const variants = new Set([...FAMILIES.values()].flat());
const range = (ids: string[]) => {
  const g = ids.map((i) => SERVING.get(i)?.grams).filter((n): n is number => !!n);
  return g.length ? (Math.min(...g) === Math.max(...g) ? `${g[0]}` : `${Math.min(...g)} to ${Math.max(...g)}`) : '';
};
/** "alone 130 to 172", "on rice 330 to 426": a plate on rice weighs about 200 g more than the dish alone */
const plates = (ids: string[]) => [['alone', false], ['on rice', true]].flatMap(([label, rice]) => { const r = range(ids.filter((i) => PLATES.get(i)!.rice === rice)); return r ? [`${label} ${r}`] : []; }).join('|');
const serving = (id: string) => { const s = SERVING.get(id); return s ? `|${s.grams}${s.piece ? ' each' : ''}` : ''; };

/** Dish families, one per line as dish|usual grams alone|usual grams on rice (smallest variant to largest). */
export const FAMILY_LINES = [...FAMILIES].map(([base, ids]) => `${base.charAt(0).toUpperCase()}${base.slice(1)}|${plates(ids)}`).join('\n');
/** Every other entry, one per line as id|name|usual serving in grams. */
export const CATALOG = foods.filter((f) => !variants.has(f.id)).map((f) => `${f.id}|${f.name}${serving(f.id)}`).join('\n');
export const SYSTEM_PROMPT = `${RULES}\nDish families, one per line as dish|usual grams of the dish alone|usual grams on rice:\n${FAMILY_LINES}\n\nCatalog, one entry per line as id|name|usual serving in grams:\n${CATALOG}`;

/** The user turn: a photo with an optional hint, or a description. */
export const userText = (i: { text?: string; hint?: string }) =>
  i.text !== undefined ? `The meal, as described by the user: ${i.text}` : i.hint ? `A photo of the meal. The user's note corrects your first estimate; follow it over what the photo seems to show: ${i.hint}` : 'A photo of the meal.';
