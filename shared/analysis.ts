// POST /api/analyze on the wire (TECH-SPEC section 7). The handler validates requests with this schema; the app
// builds them and reads the response types.
import * as z from 'zod/mini';

/** Base64 of a 1024 px JPEG at quality 0.8 is about 200 to 400 KB; the whole body is capped at 900 KB. */
export const MAX_BODY_BYTES = 900_000;
export const MAX_TEXT = 500;
/** R7, voice: a WAV of 16 kHz mono 16-bit speech, at most 15 s (480 KB, 640 KB as base64), written down by the provider */
export const VOICE_RATE = 16_000;
export const MAX_VOICE_SECONDS = 15;
export const MAX_VOICE_BYTES = 44 + VOICE_RATE * 2 * MAX_VOICE_SECONDS;

const date = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/));
const image = z.string().check(z.minLength(1), z.regex(/^[A-Za-z0-9+/]+={0,2}$/));
export const analyzeRequest = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('photo'), image, localDate: date, locale: z.literal('en'), hint: z.optional(z.string().check(z.maxLength(MAX_TEXT))) }),
  z.object({ kind: z.literal('text'), text: z.string().check(z.minLength(1), z.maxLength(MAX_TEXT)), localDate: date, locale: z.literal('en') }),
  /** a pack's nutrition label (B1, F22): read, never estimated */
  z.object({ kind: z.literal('label'), image, localDate: date, locale: z.literal('en') }),
  /** R7: what was said about a meal, in Thai, English or both, back as words for the Describe field */
  z.object({ kind: z.literal('voice'), audio: image, locale: z.literal('en') }),
]);
export type AnalyzeRequest = z.infer<typeof analyzeRequest>;

export type Macros = { kcal: number; protein: number; carbs: number; fat: number };
export type AnalysisItem = Macros & {
  name: string;
  grams: number;
  portionNote: string;
  foodId: string | null;
  source: 'db' | 'estimate';
  per100: Macros;
  confidence: 'high' | 'medium' | 'low';
  hiddenFat: boolean;
  /** R5: up to 3 other table foods it may be (kcal at this item's grams), only when one differs from this by over 15 percent */
  alternatives?: { foodId: string; name: string; kcal: number }[];
};
export type Analysis = { title: string; items: AnalysisItem[]; model: string; raw: unknown };
/** pro_only (R5): a Pro feature asked for on the free plan */
export type AnalyzeError = 'bad_request' | 'unauthorized' | 'too_large' | 'not_food' | 'daily_limit' | 'busy' | 'provider_error' | 'timeout' | 'pro_only';
/** `plan` (R5): which plan's limit this is, so the app can offer Pro when a free limit is reached */
type Usage = { usedToday: number; limit: number; plan?: 'free' | 'pro' };
export type AnalyzeResponse = { ok: true; analysis: Analysis; usage: Usage } | { ok: false; error: AnalyzeError; usage?: Usage };

/**
 * What a nutrition label prints (B1): each column it has (per serving, per 100 g or ml) or null, the serving's weight
 * or volume, how many scoops make a serving (supplements) and servings in the pack, each null when not printed.
 * `name` is empty when the photo shows none; a column's nutrient the photo does not show is null, never 0. A label that is not one answers `not_food`.
 */
export type LabelRead = {
  name: string;
  unit: 'g' | 'ml';
  servingG: number | null;
  scoops: number | null;
  servingsPerPack: number | null;
  perServing: LabelMacros | null;
  per100: LabelMacros | null;
};
/** A label's column: protein, carbs or fat the photo does not show is null, for the user to fill in (M9a). */
export type LabelMacros = { kcal: number; protein: number | null; carbs: number | null; fat: number | null };
/** R7: the words said, in the script they were said in; empty when nothing was */
export type VoiceResponse = { ok: true; text: string; model: string } | { ok: false; error: AnalyzeError };
export type LabelResponse = { ok: true; label: LabelRead; model: string; usage: Usage } | { ok: false; error: AnalyzeError; usage?: Usage };
