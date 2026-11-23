// Gemini Flash through @google/genai (ARCHITECTURE A10). The model id comes from GEMINI_MODEL (gemini-3.6-flash, see
// docs/EVAL-NOTES.md); JSON output is constrained by the schema; thinking is minimal unless GEMINI_THINKING says low or
// medium (gemini-3.8-flash refuses minimal). A reply from the fallback model is capped at medium confidence (R5).
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { withFallback } from '../call.js';
import type { VisionProvider } from './provider.js';
import { MODEL_JSON_SCHEMA } from './schema.js';
import { SYSTEM_PROMPT, userText } from './prompt.js';
import { LABEL_JSON_SCHEMA, LABEL_PROMPT, LABEL_TEXT } from './label.js';

const THINKING = { minimal: ThinkingLevel.MINIMAL, low: ThinkingLevel.LOW, medium: ThinkingLevel.MEDIUM };

export function geminiProvider(apiKey: string, model: string, fallback = '', thinking = ''): VisionProvider {
  const level = THINKING[thinking.trim().toLowerCase() as keyof typeof THINKING] ?? ThinkingLevel.MINIMAL;
  const ai = new GoogleGenAI({ apiKey });
  const provider: VisionProvider = {
    model,
    async analyze(i) {
      if (!apiKey || !model) throw Object.assign(new Error('Gemini is not configured'), { status: 500 });
      const parts = [
        ...(i.image ? [{ inlineData: { mimeType: 'image/jpeg', data: Buffer.from(i.image).toString('base64') } }] : []),
        { text: i.label ? LABEL_TEXT : userText(i) },
      ];
      const call = (m: string) => ai.models.generateContent({
        model: m,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: i.label ? LABEL_PROMPT : SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: i.label ? LABEL_JSON_SCHEMA : MODEL_JSON_SCHEMA,
          thinkingConfig: { thinkingLevel: level },
          abortSignal: i.signal,
        },
      });
      provider.model = model;
      const { res, model: used } = await withFallback(model, fallback, call);
      provider.model = used;
      // what the call cost, and whether the catalog prefix was cached (the handler's own line has no tokens)
      const u = res.usageMetadata;
      if (u) console.info('gemini', { model: used, thinking: thinking || 'minimal', prompt: u.promptTokenCount, cached: u.cachedContentTokenCount, thoughts: u.thoughtsTokenCount, out: u.candidatesTokenCount });
      const out = JSON.parse(res.text ?? 'null');
      // the fallback's portions and dishes were never checked (docs/EVAL-NOTES.md): it is never "high"
      if (used !== model && Array.isArray(out?.items)) for (const it of out.items) if (it?.confidence === 'high') it.confidence = 'medium';
      return out;
    },
  };
  return provider;
}
