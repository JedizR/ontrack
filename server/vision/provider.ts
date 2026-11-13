// Photo and text analysis behind one interface (ARCHITECTURE A10): `gemini` in production, `mock` for dev and tests.
import { env } from '../env.js';

/** `label`: read a nutrition label (B1) instead of naming a meal's food */
export type VisionInput = { image?: Uint8Array; text?: string; locale: string; hint?: string; label?: true; signal?: AbortSignal };
export interface VisionProvider {
  /** the model id recorded with each analysis */
  model: string;
  /** the model's reply, parsed but not yet validated. Throws `{ status }` on an HTTP failure. */
  analyze(input: VisionInput): Promise<unknown>;
}

/** The provider `VISION_PROVIDER` names. The mock's fixtures load only when it is chosen. */
export async function visionProvider(): Promise<VisionProvider> {
  if (env('VISION_PROVIDER') === 'mock') return (await import('./mock.js')).mockProvider;
  return (await import('./gemini.js')).geminiProvider(env('GEMINI_API_KEY'), env('GEMINI_MODEL'), env('GEMINI_FALLBACK_MODEL'));
}
