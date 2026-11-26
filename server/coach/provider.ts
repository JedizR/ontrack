// The coach's text writer behind one interface, as vision's: `gemini` in production, `mock` for dev and tests.
import { env } from '../env.js';
import type { CoachRequest, ProgramRequest } from '../../shared/coach.js';

export type CoachInput = Pick<CoachRequest, 'kind' | 'facts' | 'question' | 'candidates' | 'history'> & { signal?: AbortSignal };
export type ProgramInput = Pick<ProgramRequest, 'kind' | 'question' | 'program' | 'profile'> & { signal?: AbortSignal };
export interface CoachProvider {
  /** the model id returned with each answer */
  model: string;
  /** the model's reply, parsed but not yet validated (server/coach/validate.ts). Throws `{ status }` on an HTTP failure. */
  write(input: CoachInput | ProgramInput): Promise<unknown>;
}

/** The provider `VISION_PROVIDER` names: the one switch for both vision and coach. */
export async function coachProvider(): Promise<CoachProvider> {
  if (env('VISION_PROVIDER') === 'mock') return (await import('./mock.js')).mockCoach;
  return (await import('./gemini.js')).geminiCoach(env('GEMINI_API_KEY'), env('GEMINI_MODEL'), env('GEMINI_FALLBACK_MODEL'));
}
