// POST /api/coach on the wire (TECH-SPEC section 7b). The handler validates requests with this schema; the app builds
// them and reads the response types. The model never writes a digit: it refers to a number as `{{slot}}`, one of the
// request's fact ids, and the app fills each slot from the engine's own value.
import * as z from 'zod/mini';
import type { AnalyzeError } from './analysis.js';
import { programSchema, type Program } from './records.js';

export const MAX_BODY_BYTES = 16_384;
export const MAX_FACTS = 30;
export const MAX_CANDIDATES = 12;
export const MAX_QUESTION = 200;
export const MAX_PROGRAM_QUESTION = 300;
/** Ask Ontrack (27 Nov): the earlier turns of the chat it is sent, so a follow up makes sense */
export const MAX_HISTORY = 3;
export const MAX_ANSWER = 400;
/** A slot id: lower case letters and underscores, so it can never be mistaken for a number */
export const SLOT = /^[a-z_]{1,24}$/;
export const COACH_KINDS = ['week', 'checkin', 'session', 'gap', 'ask'] as const;
export type CoachKind = (typeof COACH_KINDS)[number];

const str = (min: number, max: number) => z.string().check(z.minLength(min), z.maxLength(max));
/** A fact as the app formats it: a label, and a value with its unit ("2,310 kcal", "+0.3 kg") */
const fact = z.object({ label: str(0, 60), value: str(0, 40) });
/** A food that could close the protein gap, at the grams it would be eaten at */
const candidate = z.object({ id: str(1, 80), name: str(1, 120), grams: z.number(), kcal: z.number(), protein: z.number() });

export const coachRequest = z.object({
  kind: z.enum(COACH_KINDS),
  facts: z.record(z.string().check(z.regex(SLOT)), fact).check(z.refine((f) => Object.keys(f).length <= MAX_FACTS)),
  localDate: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/)),
  /** ask only */
  question: z.optional(str(1, MAX_QUESTION)),
  /** ask only: the chat so far, oldest first, each answer as the user saw it */
  history: z.optional(z.array(z.object({ q: str(1, MAX_QUESTION), a: str(0, MAX_ANSWER) })).check(z.maxLength(MAX_HISTORY))),
  /** gap only: at least one, so there is something to pick */
  candidates: z.optional(z.array(candidate).check(z.maxLength(MAX_CANDIDATES))),
}).check(z.refine((r) => (r.kind !== 'ask' || !!r.question) && (r.kind !== 'gap' || !!r.candidates?.length)));
export type CoachRequest = z.infer<typeof coachRequest>;
export type CoachFacts = CoachRequest['facts'];
export type CoachCandidate = NonNullable<CoachRequest['candidates']>[number];

/** The program kind: the current program and what the user wants changed. The model never sees facts, so it is its own
 * branch, not a sixth text kind. */
export const programRequest = z.object({
  kind: z.literal('program'),
  question: str(1, MAX_PROGRAM_QUESTION),
  program: programSchema,
  profile: z.object({ goal: z.enum(['lose', 'maintain', 'gain']), experience: z.enum(['beginner', 'intermediate', 'advanced']) }),
  localDate: z.string().check(z.regex(/^\d{4}-\d{2}-\d{2}$/)),
});
export type ProgramRequest = z.infer<typeof programRequest>;
/** What the endpoint accepts */
export const coachBody = z.union([coachRequest, programRequest]);

/** Text with its slots still in it, as `{{id}}` */
export type CoachText = { headline?: string; lines: string[] };
export type CoachPick = { id: string; reason: string };
/** Pro counts by the day; the free plan's advice (Ask and Adjust with AI) by the month (27 Nov) */
export type CoachUsage = { usedToday: number; limit: number } | { usedThisMonth: number; limit: number };
type Usage = CoachUsage;
export type CoachTextResponse = { ok: true; kind: CoachKind; text: CoachText; picks?: CoachPick[]; model: string; usage: Usage };
/** `summary` is plain words with no digits; `program` has passed `programSchema` */
export type ProgramResponse = { ok: true; kind: 'program'; program: Program; summary: string; model: string; usage: Usage };
export type CoachResponse = CoachTextResponse | ProgramResponse | { ok: false; error: AnalyzeError; usage?: Usage };
