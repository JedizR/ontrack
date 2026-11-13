import { describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => [] as string[]);
vi.mock('@google/genai', () => ({
  ThinkingLevel: { MINIMAL: 'MINIMAL' },
  GoogleGenAI: class {
    models = {
      generateContent: async ({ model }: { model: string }) => {
        calls.push(model);
        const status = { spent: 429, busy: 503, bad: 400 }[model];
        if (status) throw Object.assign(new Error(model), { status });
        return { text: '{"ok":true}' };
      },
    };
  },
}));
const { geminiProvider } = await import('../../server/vision/gemini');

describe('gemini fallback', () => {
  it.each(['spent', 'busy'])('a %s model hands the photo to the fallback, which is recorded', async (first) => {
    calls.length = 0;
    const p = geminiProvider('key', first, 'lite');
    expect(await p.analyze({ text: 'rice', locale: 'en' })).toEqual({ ok: true });
    expect(calls).toEqual([first, 'lite']);
    expect(p.model).toBe('lite');
  });
  it('any other failure, or no fallback, is thrown as before', async () => {
    calls.length = 0;
    await expect(geminiProvider('key', 'bad', 'lite').analyze({ text: 'rice', locale: 'en' })).rejects.toMatchObject({ status: 400 });
    await expect(geminiProvider('key', 'busy').analyze({ text: 'rice', locale: 'en' })).rejects.toMatchObject({ status: 503 });
    expect(calls).toEqual(['bad', 'busy']);
  });
});
