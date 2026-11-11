// Sample data for the gallery: the content of design/reference-today.html. Not app logic; the engine (M2) owns real targets.
import meal1 from './thumbs/meal-1.svg';
import meal2 from './thumbs/meal-2.svg';
import meal3 from './thumbs/meal-3.svg';

export const TODAY = '2026-11-11';
export const WEEK = ['09', '10', '11', '12', '13', '14', '15'].map((d) => ({ date: `2026-11-${d}`, onTrack: d === '09' || d === '10' }));

/** a gain day: target 2,460 kcal, on track from 2,340 */
export const KCAL = { target: 2460, zone: [2340, 2830] as [number, number] };
export const PROTEIN_ZONE: [number, number] = [97.2, Infinity];

/** newest first, as SCREENS.md section 6 asks (the reference lists them out of order); the stand-in photos are flat colour squares, as in the reference */
export const MEALS = [
  { name: 'Basil pork with fried egg', time: '19:05', source: 'estimate', kcal: 510, photo: meal3 },
  { name: 'Chicken rice bowl', time: '12:40', source: 'database', kcal: 720, photo: meal1 },
  { name: 'Oats, banana and whey', time: '08:10', source: 'database', kcal: 610, photo: meal2 },
] as const;
