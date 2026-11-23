// The food table's own usual serving for a food: its first portion that is not a measure (tbsp, 100 g). The prompt
// prints it in the catalog and the resolver checks the model's grams against it (docs/AI-THAI.md, R5).
import foods from '../../src/lib/data/foods.json' with { type: 'json' };

const MEASURE = /^(g|ml|oz|tbsp|tsp)\b/;
const VESSEL = /^(plate|bowl|small bowl|serving|cup|glass|can|bottle|pot|pack|packet|bag|small bag|handful|scoop|set|shot|shake|ladle)s?\b/;
// a weight or a measure in a note ("150 g", "2 tbsp") is never a count of pieces or vessels
const UNIT = /^(g|gm|grams?|kg|mg|ml|l|lit(?:re|er)s?|oz|ounces?|lbs?|pounds?|tbsp|tsp|tablespoons?|teaspoons?|kcal|cal|calories)$/;
const NUMBER: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

/** `grams` for one `unit` (a plate, a bowl, a cup) or, when `piece`, for one piece (an egg, a skewer). */
export type Serving = { grams: number; unit: string; piece: boolean };
export const SERVING = new Map<string, Serving>();
for (const f of foods) {
  for (const p of f.portions) {
    const m = p.label.match(/^(\d+(?:\.\d+)?)(?:\/(\d+))?\s+(.+)$/);
    if (!m || MEASURE.test(m[3])) continue;
    SERVING.set(f.id, { grams: Math.round(p.grams / (Number(m[1]) / Number(m[2] ?? 1))), unit: m[3], piece: !VESSEL.test(m[3]) });
    break;
  }
}

/**
 * What the model's grams for this food should be near, from its portion note: one serving of a plate, bowl or cup food;
 * for a piece food only when the note counts ("2 eggs", count 2) as then the prior is the count times one piece.
 * A vessel food whose note counts that vessel ("2 plates") scales too; a count of another unit ("2 cups" of a plate
 * dish) does not.
 */
export function portionPrior(id: string, note: string): { grams: number; count?: number; each?: number } | null {
  const s = SERVING.get(id);
  if (!s) return null;
  const m = note.trim().toLowerCase().match(/^(?:about |around )?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+([a-z]+)/);
  const count = m ? NUMBER[m[1]] ?? Number(m[1]) : 0;
  const counted = count > 0 && !UNIT.test(m![2]) && (s.piece ? !VESSEL.test(m![2]) : m![2].startsWith(s.unit.split(' ')[0]));
  if (counted) return { grams: count * s.grams, ...(s.piece ? { count, each: s.grams } : {}) };
  return s.piece ? null : { grams: s.grams };
}
