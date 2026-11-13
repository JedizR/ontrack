// Gain mode's easy adds (PRD F10, SCREENS.md section 6): in the evening, three calorie dense foods sized so that
// together they close the day's gap, each logged in one tap. Pure: Today passes the foods and the meals in.
import { V } from '$lib/model/engine';
import { itemFor, type Food } from '$lib/data/foods';
import type { FoodMemory, MealItem } from '../../../shared/records';

/** Calorie dense foods most people have at hand, after the user's own (food table ids, data like food names) */
export const EASY_DEFAULTS = ['peanut-butter', 'trail-mix', 'granola-bar'];
const COUNT = 3;
const STEP_G = 5;

/** Due with a gain goal from 18:00 while more than a quarter of the target is left, on a day not finished. */
export const easyDue = (o: { goal: string; time: string; eaten: number; target: number; closed: boolean }) =>
  o.goal === 'gain' && !o.closed && Number(o.time.slice(0, 2)) >= V.easyAdds.fromHour && o.target - o.eaten > V.easyAdds.minShare * o.target;

/**
 * Three foods, each sized to a third of the gap and rounded to 5 g: the user's calorie dense foods from recent meals
 * first (`recent`, newest first), then the defaults. Oils are dense but not something to eat by the spoon.
 */
export function easyAdds(foods: Food[], recent: string[], gap: number, mine: (id: string) => FoodMemory['per100'] | undefined): MealItem[] {
  const byId = new Map(foods.map((f) => [f.id, f]));
  const ok = (f: Food | undefined): f is Food => !!f && f.tags.includes('dense') && !f.tags.includes('oil') && (mine(f.id) ?? f.per100).kcal > 0;
  const picked = [...new Set([...recent, ...EASY_DEFAULTS])].map((id) => byId.get(id)).filter(ok).slice(0, COUNT);
  return picked.map((f) => {
    const per100 = mine(f.id);
    const kcal = (per100 ?? f.per100).kcal;
    const grams = Math.max(STEP_G, Math.round(gap / picked.length / kcal * 100 / STEP_G) * STEP_G);
    return itemFor(f, grams, per100);
  });
}
