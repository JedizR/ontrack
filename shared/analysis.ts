// POST /api/analyze on the wire (TECH-SPEC section 7). The handler validates requests with this schema; the app
// builds them and reads the response types.
import * as z from 'zod/mini';

/** Base64 of a 1024 px JPEG at quality 0.8 is about 200 to 400 KB; the whole body is capped at 900 KB. */
export const MAX_BODY_BYTES = 900_000;
export const MAX_TEXT = 500;

const date = z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/));
export const analyzeRequest = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('photo'),
    image: z.string().check(z.minLength(1), z.regex(/^[A-Za-z0-9+/]+={0,2}$/)),
    localDate: date,
    locale: z.literal('en'),
    hint: z.optional(z.string().check(z.maxLength(MAX_TEXT))),
  }),
  z.object({ kind: z.literal('text'), text: z.string().check(z.minLength(1), z.maxLength(MAX_TEXT)), localDate: date, locale: z.literal('en') }),
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
};
export type Analysis = { title: string; items: AnalysisItem[]; model: string; raw: unknown };
export type AnalyzeError = 'bad_request' | 'unauthorized' | 'too_large' | 'not_food' | 'daily_limit' | 'busy' | 'provider_error' | 'timeout';
export type AnalyzeResponse =
  | { ok: true; analysis: Analysis; usage: { usedToday: number; limit: number } }
  | { ok: false; error: AnalyzeError; usage?: { usedToday: number; limit: number } };
