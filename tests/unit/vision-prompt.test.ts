// The prompt's size and claims, and the schema's shape (R5, docs/AI-THAI.md).
import { describe, expect, test } from 'vitest';
import foods from '../../src/lib/data/foods.json';
import { CATALOG, FAMILY_LINES, SYSTEM_PROMPT } from '../../server/vision/prompt';
import { SERVING } from '../../server/vision/serving';
import { FAMILIES } from '../../server/vision/thai';
import { MODEL_JSON_SCHEMA, modelOutput } from '../../server/vision/schema';
import { fixture } from '../../server/vision/mock';

// the rules and the catalog before R5 (id|name only, every Thai variant a line): 2,126 + 29,067 characters
const BEFORE_R5 = 31_193;

describe('the system prompt', () => {
  test('is not larger than before: the family lines pay for the serving column', () => {
    expect(SYSTEM_PROMPT.length).toBeLessThan(BEFORE_R5);
  });

  test('lists every table entry once: a family as a dish, anything else as id|name|serving', () => {
    const variants = new Set([...FAMILIES.values()].flat());
    const ids = CATALOG.split('\n').map((l) => l.split('|')[0]);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(foods.length - variants.size);
    expect(ids.some((i) => variants.has(i))).toBe(false);
    expect(FAMILY_LINES.split('\n')).toHaveLength(FAMILIES.size);
    expect(FAMILY_LINES).toContain('Pad kra pao|alone');
  });

  test('a serving number is the table\'s own, and "each" marks a piece', () => {
    expect(CATALOG).toContain('rice-white|White rice|158');
    expect(CATALOG).toContain('egg-fried|Fried egg|46 each');
    for (const l of CATALOG.split('\n')) {
      const [id, , grams] = l.split('|');
      expect(grams ? Number.parseInt(grams, 10) : null, id).toBe(SERVING.get(id)?.grams ?? null);
    }
  });

  test('the scale anchors that quote the table match the table', () => {
    const portion = (id: string, label: string) => foods.find((f) => f.id === id)!.portions.find((p) => p.label === label)!.grams;
    expect(SYSTEM_PROMPT).toContain(`a cup of cooked rice at ${portion('rice-white', '1 cup')} g, a full plate of rice at ${portion('rice-white', '1 plate')} g, a fried egg at ${portion('egg-fried', '1 large')} g`);
    expect(SYSTEM_PROMPT.split('\n').filter((l) => /anchor/i.test(l))).toHaveLength(1);
  });

  test('has no em or en dash', () => {
    expect(SYSTEM_PROMPT).not.toMatch(/[–—]/);
  });
});

describe('the reply schema', () => {
  type Schema = { properties: Record<string, { items?: { properties: Record<string, unknown>; required: string[] } }>; required: string[] };
  const schema = MODEL_JSON_SCHEMA as unknown as Schema;

  test('asks for the scene before the items, and the range, second guess and the rest of an item in order', () => {
    expect(Object.keys(schema.properties)).toEqual(['is_food', 'title', 'scene', 'items']);
    expect(Object.keys(schema.properties.items.items!.properties).slice(0, 6)).toEqual(['name', 'grams', 'grams_low', 'grams_high', 'portion_note', 'food_id']);
    expect(schema.required).toContain('scene');
    expect(schema.properties.items.items!.required).toEqual(expect.arrayContaining(['grams_low', 'grams_high', 'alt_food_id']));
  });

  test('still reads a reply without them, as old fixtures and saved replies are', () => {
    for (const name of ['basil-pork', 'chicken-rice', 'oats-banana']) expect(modelOutput.safeParse(fixture(name)).success, name).toBe(true);
    const without = { is_food: true, title: 't', items: [{ name: 'Rice', grams: 100, portion_note: '', food_id: null, est_per_100g: { kcal: 1, protein_g: 0, carbs_g: 0, fat_g: 0 }, confidence: 'high', hidden_fat: false, dish: null, protein: 'none', extras: [] }] };
    expect(modelOutput.safeParse(without).success).toBe(true);
    expect(modelOutput.safeParse({ ...without, scene: { vessel: 'plate' } }).success).toBe(false);
  });
});
