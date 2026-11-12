// Record types and their zod schemas (TECH-SPEC section 3). Used by the app, the mock backend and the tests.
// Weekdays are 0 for Monday to 6 for Sunday. Dates are YYYY-MM-DD strings in the device's calendar.
// zod/mini: the same schemas at a fraction of the bundle, because actions.ts ships in the first chunk
import * as z from 'zod/mini';

export const COLLECTIONS = ['profile', 'plan', 'weight', 'meal', 'saved', 'program', 'slog', 'checkin', 'day', 'food'] as const;
export type Collection = (typeof COLLECTIONS)[number];

/** The database checks id at 1 to 80 characters and data at 64 KB as jsonb text, which spaces out JSON.stringify's
 * output; half of that keeps a record the device accepted from ever being refused by the server. */
export const MAX_ID = 80;
export const MAX_DATA_BYTES = 32768;

export type Rec<T = unknown> = {
  collection: Collection;
  id: string;
  /** ms since epoch on the editing device. Set only by the store, through actions.ts */
  updatedAt: number;
  /** tombstone */
  deleted?: true;
  data: T;
};

const num = (min: number, max: number) => z.number().check(z.gte(min), z.lte(max));
const int = (min: number, max = Number.MAX_SAFE_INTEGER) => z.int().check(z.gte(min), z.lte(max));
const str = (min: number, max: number) => z.string().check(z.minLength(min), z.maxLength(max));
const date = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/));
const weekday = int(0, 6);
const kcal = num(0, 100000);
const grams = num(0, 10000);

export const profileSchema = z.object({
  sex: z.enum(['male', 'female', 'unspecified']),
  birthYear: int(1900, 2100),
  heightCm: num(50, 272),
  bodyFatPct: z.optional(num(2, 70)),
  neat: z.enum(['seated', 'light', 'moving', 'physical']),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  units: z.enum(['metric', 'imperial']),
  calorieMode: z.enum(['matched', 'even']),
  checkinWeekday: weekday,
  screening: z.object({ pregnant: z.boolean(), medical: z.boolean(), eatingDisorder: z.boolean(), at: z.string() }),
  onboardedAt: z.string(),
});

export const sessionSchema = z.object({
  key: str(1, 20),
  weekday,
  name: str(1, 60),
  type: z.enum(['strength', 'circuit', 'cardio', 'sport', 'mobility', 'walk']),
  minutes: int(1, 600),
  intensity: z.enum(['light', 'moderate', 'hard']),
  exercises: z.optional(
    z.array(z.object({ exerciseId: str(1, 80), sets: int(1, 20), repsMin: int(1, 100), repsMax: int(1, 100) })).check(z.maxLength(20)),
  ),
});

export const programSchema = z.object({ name: str(0, 60), sessions: z.array(sessionSchema).check(z.maxLength(28)) });

export const planSchema = z.object({
  effectiveFrom: date,
  goal: z.enum(['lose', 'maintain', 'gain']),
  ratePctPerWeek: num(0, 5),
  goalWeightKg: z.optional(num(20, 400)),
  weightKg: num(20, 400),
  bmr: kcal,
  baseline: kcal,
  eeeByWeekday: z.array(kcal).check(z.length(7)),
  delta: num(-5000, 5000),
  proteinG: grams,
  fatG: grams,
  flags: z.array(z.enum(['floor', 'deficitCap', 'surplusCap', 'maintainOnly'])),
  tdeeSource: z.enum(['formula', 'measured']),
  engineVersion: int(1),
  source: z.enum(['onboarding', 'checkin', 'edit']),
  /** The program's sessions, without exercises, as they were when the plan was made: a past day keeps its sessions
   * after the program changes. Plans from before M7 have none and use the program. */
  sessions: z.optional(z.array(z.omit(sessionSchema, { exercises: true })).check(z.maxLength(28))),
});

export const weightSchema = z.object({ date, kg: num(20, 400) });

export const mealItemSchema = z.object({
  name: str(1, 120),
  grams: z.optional(num(0, 10000)),
  kcal,
  protein: grams,
  carbs: grams,
  fat: grams,
  /** yours: the user's own numbers for this food (F15) */
  source: z.enum(['db', 'estimate', 'manual', 'yours']),
  foodId: z.optional(str(0, 80)),
  confidence: z.optional(z.enum(['high', 'medium', 'low'])),
});

export const mealSchema = z.object({
  date,
  at: z.string(),
  title: str(0, 120),
  method: z.enum(['photo', 'text', 'search', 'quick', 'saved']),
  items: z.array(mealItemSchema).check(z.maxLength(30)),
  thumb: z.optional(z.literal(true)),
  ai: z.optional(z.object({ model: str(0, 80), raw: z.optional(z.unknown()) })),
});

export const savedSchema = z.object({
  title: str(1, 120),
  items: z.array(mealItemSchema).check(z.minLength(1), z.maxLength(30)),
  uses: int(0),
  lastUsedAt: z.string(),
});

export const sessionLogSchema = z.object({ date, sessionKey: str(1, 20), status: z.enum(['done', 'skipped']) });

export const checkinSchema = z.object({
  date,
  stats: z.object({
    days: int(0),
    weighIns: int(0),
    completeDays: int(0),
    ratePctPerWeek: z.nullable(z.number()),
    meanIntake: z.nullable(z.number()),
    meanTarget: z.number(),
    tdeeObserved: z.nullable(z.number()),
  }),
  proposal: z.object({ kcalChange: z.number(), reason: z.enum(['on_track', 'raise', 'lower', 'adherence', 'need_data']) }),
  decision: z.optional(z.enum(['accepted', 'kept'])),
  planId: z.optional(str(0, 80)),
});

export const daySchema = z.object({ date, closed: z.optional(z.literal(true)) });

/** Remembered nutrition (F15): the values a user corrected a food to, per 100 g. The id is the food's table id, or
 * `name:` and its normalised name when it has none (`foodKey` in src/lib/data/foods.ts). 900 kcal is pure fat. */
export const foodSchema = z.object({
  name: str(1, 120),
  per100: z.object({ kcal: num(0, 900), protein: num(0, 100), carbs: num(0, 100), fat: num(0, 100) }),
});

export const SCHEMAS = {
  profile: profileSchema,
  plan: planSchema,
  weight: weightSchema,
  meal: mealSchema,
  saved: savedSchema,
  program: programSchema,
  slog: sessionLogSchema,
  checkin: checkinSchema,
  day: daySchema,
  food: foodSchema,
} satisfies Record<Collection, z.ZodMiniType>;

export type Profile = z.infer<typeof profileSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Weight = z.infer<typeof weightSchema>;
export type MealItem = z.infer<typeof mealItemSchema>;
export type Meal = z.infer<typeof mealSchema>;
export type Saved = z.infer<typeof savedSchema>;
export type Session = z.infer<typeof sessionSchema>;
export type Program = z.infer<typeof programSchema>;
export type SessionLog = z.infer<typeof sessionLogSchema>;
export type Checkin = z.infer<typeof checkinSchema>;
export type Day = z.infer<typeof daySchema>;
export type FoodMemory = z.infer<typeof foodSchema>;
export type DataOf = { [C in Collection]: z.infer<(typeof SCHEMAS)[C]> };

/** Deterministic ids for one-per-user and one-per-day records, so two devices converge instead of duplicating. */
export const ids = {
  profile: () => 'profile',
  program: () => 'program',
  weight: (date: string) => `weight:${date}`,
  slog: (date: string, key: string) => `slog:${date}:${key}`,
  checkin: (date: string) => `checkin:${date}`,
  day: (date: string) => `day:${date}`,
};

/** The record envelope as the database accepts it. Both backends check it before a write. */
export const recSchema = z.object({
  collection: z.enum(COLLECTIONS),
  id: str(1, MAX_ID),
  updatedAt: int(0),
  deleted: z.optional(z.literal(true)),
  data: z.record(z.string(), z.unknown()).check(z.refine((d) => new TextEncoder().encode(JSON.stringify(d)).length <= MAX_DATA_BYTES, 'too_large')),
});
