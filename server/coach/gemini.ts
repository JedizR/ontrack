// Gemini Flash for the coach: text in, JSON out. The model ids and the fallback are vision's (GEMINI_MODEL,
// GEMINI_FALLBACK_MODEL, server/call.ts); thinking is minimal, which gemini-3.8-flash refuses.
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { withFallback } from '../call.js';
import type { CoachProvider } from './provider.js';
import { ASK_PROMPT, COACH_JSON_SCHEMA, SYSTEM_PROMPT, userText } from './prompt.js';
import { PROGRAM_JSON_SCHEMA, PROGRAM_PROMPT, programText } from './program.js';

export function geminiCoach(apiKey: string, model: string, fallback = ''): CoachProvider {
  const ai = new GoogleGenAI({ apiKey });
  const provider: CoachProvider = {
    model,
    async write(i) {
      if (!apiKey || !model) throw Object.assign(new Error('Gemini is not configured'), { status: 500 });
      const [system, text, schema] = i.kind === 'program' ? [PROGRAM_PROMPT, programText(i), PROGRAM_JSON_SCHEMA] : [i.kind === 'ask' ? ASK_PROMPT : SYSTEM_PROMPT, userText(i), COACH_JSON_SCHEMA];
      const call = (m: string) => ai.models.generateContent({
        model: m,
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          systemInstruction: system,
          responseMimeType: 'application/json',
          responseJsonSchema: schema,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          abortSignal: i.signal,
        },
      });
      provider.model = model;
      const { res, model: used } = await withFallback(model, fallback, call);
      provider.model = used;
      // JSON that does not parse is a reply that fails validation, which the handler retries once
      try { return JSON.parse(res.text ?? 'null'); } catch { return null; }
    },
  };
  return provider;
}
