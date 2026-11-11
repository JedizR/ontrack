// The bundled exercise library (TECH-SPEC section 10). Muscles drive the program analysis: a set counts 1 for each
// primary muscle and 0.5 for each secondary one.
import type { Muscle } from '$lib/model/engine';

export type Equipment = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'other';
export type Exercise = { id: string; name: string; primary: Muscle[]; secondary: Muscle[]; equipment: Equipment };

const x = (id: string, name: string, primary: Muscle[], secondary: Muscle[], equipment: Equipment): Exercise => ({
  id,
  name,
  primary,
  secondary,
  equipment,
});

export const EXERCISES: Exercise[] = [
  // Chest
  x('bench-press', 'Bench press', ['chest'], ['triceps', 'shoulders'], 'barbell'),
  x('incline-bench-press', 'Incline bench press', ['chest'], ['shoulders', 'triceps'], 'barbell'),
  x('db-bench-press', 'Dumbbell bench press', ['chest'], ['triceps', 'shoulders'], 'dumbbell'),
  x('incline-db-press', 'Incline dumbbell press', ['chest'], ['shoulders', 'triceps'], 'dumbbell'),
  x('machine-chest-press', 'Machine chest press', ['chest'], ['triceps', 'shoulders'], 'machine'),
  x('cable-fly', 'Cable fly', ['chest'], [], 'cable'),
  x('db-fly', 'Dumbbell fly', ['chest'], [], 'dumbbell'),
  x('pec-deck', 'Pec deck', ['chest'], [], 'machine'),
  x('push-up', 'Push-up', ['chest'], ['triceps', 'shoulders', 'core'], 'bodyweight'),
  x('dip', 'Dip', ['chest', 'triceps'], ['shoulders'], 'bodyweight'),
  // Back
  x('deadlift', 'Deadlift', ['back', 'glutes', 'hamstrings'], ['quads', 'core'], 'barbell'),
  x('barbell-row', 'Barbell row', ['back'], ['biceps', 'shoulders'], 'barbell'),
  x('db-row', 'One-arm dumbbell row', ['back'], ['biceps'], 'dumbbell'),
  x('t-bar-row', 'T-bar row', ['back'], ['biceps'], 'barbell'),
  x('chest-supported-row', 'Chest-supported row', ['back'], ['biceps', 'shoulders'], 'machine'),
  x('seated-cable-row', 'Seated cable row', ['back'], ['biceps'], 'cable'),
  x('lat-pulldown', 'Lat pulldown', ['back'], ['biceps'], 'cable'),
  x('straight-arm-pulldown', 'Straight-arm pulldown', ['back'], [], 'cable'),
  x('pull-up', 'Pull-up', ['back'], ['biceps'], 'bodyweight'),
  x('chin-up', 'Chin-up', ['back', 'biceps'], [], 'bodyweight'),
  x('shrug', 'Shrug', ['back'], [], 'barbell'),
  // Shoulders
  x('overhead-press', 'Overhead press', ['shoulders'], ['triceps'], 'barbell'),
  x('db-shoulder-press', 'Dumbbell shoulder press', ['shoulders'], ['triceps'], 'dumbbell'),
  x('machine-shoulder-press', 'Machine shoulder press', ['shoulders'], ['triceps'], 'machine'),
  x('lateral-raise', 'Lateral raise', ['shoulders'], [], 'dumbbell'),
  x('cable-lateral-raise', 'Cable lateral raise', ['shoulders'], [], 'cable'),
  x('rear-delt-fly', 'Rear delt fly', ['shoulders'], ['back'], 'dumbbell'),
  x('face-pull', 'Face pull', ['shoulders'], ['back'], 'cable'),
  // Biceps
  x('barbell-curl', 'Barbell curl', ['biceps'], [], 'barbell'),
  x('db-curl', 'Dumbbell curl', ['biceps'], [], 'dumbbell'),
  x('hammer-curl', 'Hammer curl', ['biceps'], [], 'dumbbell'),
  x('incline-db-curl', 'Incline dumbbell curl', ['biceps'], [], 'dumbbell'),
  x('cable-curl', 'Cable curl', ['biceps'], [], 'cable'),
  x('preacher-curl', 'Preacher curl', ['biceps'], [], 'machine'),
  // Triceps
  x('close-grip-bench', 'Close-grip bench press', ['triceps', 'chest'], ['shoulders'], 'barbell'),
  x('skull-crusher', 'Skull crusher', ['triceps'], [], 'barbell'),
  x('triceps-pushdown', 'Triceps pushdown', ['triceps'], [], 'cable'),
  x('overhead-cable-extension', 'Overhead cable extension', ['triceps'], [], 'cable'),
  x('db-overhead-extension', 'Overhead dumbbell extension', ['triceps'], [], 'dumbbell'),
  // Quads
  x('back-squat', 'Back squat', ['quads', 'glutes'], ['core'], 'barbell'),
  x('front-squat', 'Front squat', ['quads'], ['glutes', 'core'], 'barbell'),
  x('goblet-squat', 'Goblet squat', ['quads'], ['glutes', 'core'], 'dumbbell'),
  x('leg-press', 'Leg press', ['quads', 'glutes'], [], 'machine'),
  x('hack-squat', 'Hack squat', ['quads'], ['glutes'], 'machine'),
  x('leg-extension', 'Leg extension', ['quads'], [], 'machine'),
  x('bulgarian-split-squat', 'Bulgarian split squat', ['quads', 'glutes'], [], 'dumbbell'),
  x('walking-lunge', 'Walking lunge', ['quads', 'glutes'], [], 'dumbbell'),
  x('step-up', 'Step-up', ['quads', 'glutes'], [], 'dumbbell'),
  // Hamstrings
  x('romanian-deadlift', 'Romanian deadlift', ['hamstrings', 'glutes'], ['back'], 'barbell'),
  x('db-romanian-deadlift', 'Dumbbell Romanian deadlift', ['hamstrings', 'glutes'], ['back'], 'dumbbell'),
  x('good-morning', 'Good morning', ['hamstrings'], ['glutes', 'back'], 'barbell'),
  x('lying-leg-curl', 'Lying leg curl', ['hamstrings'], [], 'machine'),
  x('seated-leg-curl', 'Seated leg curl', ['hamstrings'], [], 'machine'),
  x('nordic-curl', 'Nordic curl', ['hamstrings'], [], 'bodyweight'),
  // Glutes
  x('hip-thrust', 'Hip thrust', ['glutes'], ['hamstrings'], 'barbell'),
  x('glute-bridge', 'Glute bridge', ['glutes'], ['hamstrings'], 'bodyweight'),
  x('cable-kickback', 'Cable kickback', ['glutes'], [], 'cable'),
  x('hip-abduction', 'Hip abduction', ['glutes'], [], 'machine'),
  x('kettlebell-swing', 'Kettlebell swing', ['glutes', 'hamstrings'], ['back', 'core'], 'other'),
  // Calves
  x('standing-calf-raise', 'Standing calf raise', ['calves'], [], 'machine'),
  x('seated-calf-raise', 'Seated calf raise', ['calves'], [], 'machine'),
  x('leg-press-calf-raise', 'Leg press calf raise', ['calves'], [], 'machine'),
  x('db-calf-raise', 'Dumbbell calf raise', ['calves'], [], 'dumbbell'),
  x('single-leg-calf-raise', 'Single-leg calf raise', ['calves'], [], 'bodyweight'),
  // Core
  x('plank', 'Plank', ['core'], [], 'bodyweight'),
  x('side-plank', 'Side plank', ['core'], [], 'bodyweight'),
  x('dead-bug', 'Dead bug', ['core'], [], 'bodyweight'),
  x('hanging-leg-raise', 'Hanging leg raise', ['core'], [], 'bodyweight'),
  x('cable-crunch', 'Cable crunch', ['core'], [], 'cable'),
  x('pallof-press', 'Pallof press', ['core'], [], 'cable'),
  x('ab-wheel', 'Ab wheel rollout', ['core'], [], 'other'),
];

/** Muscles by exercise id, the shape the program analysis takes. */
export const LIBRARY = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));
