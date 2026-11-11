// Record types and their zod schemas (TECH-SPEC section 3). Used by the app, the mock backend and the tests.
// Weekdays are 0 for Monday to 6 for Sunday. Dates are YYYY-MM-DD strings in the device's calendar.
import { z } from 'zod';

export const COLLECTIONS = ['profile', 'plan', 'weight', 'meal', 'saved', 'program', 'slog', 'checkin', 'day'] as const;
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

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const weekday = z.number().int().min(0).max(6);
const kcal = z.number().min(0).max(100000);
const grams = z.number().min(0).max(10000);

export const profileSchema = z.object({
  sex: z.enum(['male', 'female', 'unspecified']),
  birthYear: z.number().int().min(1900).max(2100),
  heightCm: z.number().min(50).max(272),
  bodyFatPct: z.number().min(2).max(70).optional(),
  neat: z.enum(['seated', 'light', 'moving', 'physical']),
  experience: z.enum(['beginner', 'intermediate', 'advanced']),
  units: z.enum(['metric', 'imperial']),
  calorieMode: z.enum(['matched', 'even']),
  checkinWeekday: weekday,
  screening: z.object({ pregnant: z.boolean(), medical: z.boolean(), eatingDisorder: z.boolean(), at: z.string() }),
  onboardedAt: z.string(),
});

export const planSchema = z.object({
  effectiveFrom: date,
  goal: z.enum(['lose', 'maintain', 'gain']),
  ratePctPerWeek: z.number().min(0).max(5),
  goalWeightKg: z.number().min(20).max(400).optional(),
  weightKg: z.number().min(20).max(400),
  bmr: kcal,
  baseline: kcal,
  eeeByWeekday: z.array(kcal).length(7),
  delta: z.number().min(-5000).max(5000),
  proteinG: grams,
  fatG: grams,
  flags: z.array(z.enum(['floor', 'deficitCap', 'surplusCap', 'maintainOnly'])),
  tdeeSource: z.enum(['formula', 'measured']),
  engineVersion: z.number().int().min(1),
  source: z.enum(['onboarding', 'checkin', 'edit']),
});

export const weightSchema = z.object({ date, kg: z.number().min(20).max(400) });

export const mealItemSchema = z.object({
  name: z.string().min(1).max(120),
  grams: z.number().min(0).max(10000).optional(),
  kcal,
  protein: grams,
  carbs: grams,
  fat: grams,
  source: z.enum(['db', 'estimate', 'manual']),
  foodId: z.string().max(80).optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
});

export const mealSchema = z.object({
  date,
  at: z.string(),
  title: z.string().max(120),
  method: z.enum(['photo', 'text', 'search', 'quick', 'saved']),
  items: z.array(mealItemSchema).max(30),
  thumb: z.literal(true).optional(),
  ai: z.object({ model: z.string().max(80), raw: z.unknown().optional() }).optional(),
});

export const savedSchema = z.object({
  title: z.string().min(1).max(120),
  items: z.array(mealItemSchema).min(1).max(30),
  uses: z.number().int().min(0),
  lastUsedAt: z.string(),
});

export const sessionSchema = z.object({
  key: z.string().min(1).max(20),
  weekday,
  name: z.string().min(1).max(60),
  type: z.enum(['strength', 'circuit', 'cardio', 'sport', 'mobility', 'walk']),
  minutes: z.number().int().min(1).max(600),
  intensity: z.enum(['light', 'moderate', 'hard']),
  exercises: z
    .array(z.object({ exerciseId: z.string().min(1).max(80), sets: z.number().int().min(1).max(20), repsMin: z.number().int().min(1).max(100), repsMax: z.number().int().min(1).max(100) }))
    .max(20)
    .optional(),
});

export const programSchema = z.object({ name: z.string().max(60), sessions: z.array(sessionSchema).max(28) });

export const sessionLogSchema = z.object({ date, sessionKey: z.string().min(1).max(20), status: z.enum(['done', 'skipped']) });

export const checkinSchema = z.object({
  date,
  stats: z.object({
    days: z.number().int().min(0),
    weighIns: z.number().int().min(0),
    completeDays: z.number().int().min(0),
    ratePctPerWeek: z.number().nullable(),
    meanIntake: z.number().nullable(),
    meanTarget: z.number(),
    tdeeObserved: z.number().nullable(),
  }),
  proposal: z.object({ kcalChange: z.number(), reason: z.enum(['on_track', 'raise', 'lower', 'adherence', 'need_data']) }),
  decision: z.enum(['accepted', 'kept']).optional(),
  planId: z.string().max(80).optional(),
});

export const daySchema = z.object({ date, closed: z.literal(true).optional() });

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
} satisfies Record<Collection, z.ZodType>;

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
  id: z.string().min(1).max(MAX_ID),
  updatedAt: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  deleted: z.literal(true).optional(),
  data: z.record(z.string(), z.unknown()).refine((d) => new TextEncoder().encode(JSON.stringify(d)).length <= MAX_DATA_BYTES, 'too_large'),
});
