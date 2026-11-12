// Gemini Flash through @google/genai (ARCHITECTURE A10). The model id comes from GEMINI_MODEL (gemini-3.6-flash, see
// docs/EVAL-NOTES.md); JSON output is constrained by the schema; thinking is minimal, which gemini-3.8-flash refuses.
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { VisionProvider } from './provider.js';
import { MODEL_JSON_SCHEMA } from './schema.js';
import { SYSTEM_PROMPT, userText } from './prompt.js';

export function geminiProvider(apiKey: string, model: string): VisionProvider {
  const ai = new GoogleGenAI({ apiKey });
  return {
    model,
    async analyze(i) {
      if (!apiKey || !model) throw Object.assign(new Error('Gemini is not configured'), { status: 500 });
      const parts = [
        ...(i.image ? [{ inlineData: { mimeType: 'image/jpeg', data: Buffer.from(i.image).toString('base64') } }] : []),
        { text: userText(i) },
      ];
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseJsonSchema: MODEL_JSON_SCHEMA,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
          abortSignal: i.signal,
        },
      });
      return JSON.parse(res.text ?? 'null');
    },
  };
}
