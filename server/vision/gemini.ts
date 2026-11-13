// Gemini Flash through @google/genai (ARCHITECTURE A10). The model id comes from GEMINI_MODEL (gemini-3.6-flash, see
// docs/EVAL-NOTES.md); JSON output is constrained by the schema; thinking is minimal, which gemini-3.8-flash refuses.
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { VisionProvider } from './provider.js';
import { MODEL_JSON_SCHEMA } from './schema.js';
import { SYSTEM_PROMPT, userText } from './prompt.js';
import { LABEL_JSON_SCHEMA, LABEL_PROMPT, LABEL_TEXT } from './label.js';

export function geminiProvider(apiKey: string, model: string, fallback = ''): VisionProvider {
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
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          abortSignal: i.signal,
        },
      });
      provider.model = model;
      let res;
      try {
        res = await call(model);
      } catch (e) {
        // spent (429) or busy (503): the fallback (Flash-Lite) has its own free daily quota, docs/EVAL-NOTES.md 13 November
        if (!fallback || ![429, 503].includes((e as { status?: number }).status ?? 0)) throw e;
        res = await call((provider.model = fallback));
      }
      return JSON.parse(res.text ?? 'null');
    },
  };
  return provider;
}
