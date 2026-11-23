import { afterEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => [] as { model: string; level: string }[]);
// `blip` answers 503 once and then well; `busy` and `spent` never do
const seen = vi.hoisted(() => ({ blip: 0 }));
vi.mock('@google/genai', () => ({
  ThinkingLevel: { MINIMAL: 'MINIMAL', LOW: 'LOW', MEDIUM: 'MEDIUM' },
  GoogleGenAI: class {
    models = {
      generateContent: async ({ model, config }: { model: string; config: { thinkingConfig: { thinkingLevel: string } } }) => {
        calls.push({ model, level: config.thinkingConfig.thinkingLevel });
        const status = { spent: 429, busy: 503, bad: 400 }[model] ?? (model === 'blip' && seen.blip++ === 0 ? 503 : 0);
        if (status) throw Object.assign(new Error(model), { status });
        const text = model === 'lite' ? '{"items":[{"confidence":"high"},{"confidence":"low"}]}' : '{"ok":true}';
        return { text, usageMetadata: { promptTokenCount: 7000, cachedContentTokenCount: 6500, thoughtsTokenCount: 0, candidatesTokenCount: 240 } };
      },
    };
  },
}));
const { geminiProvider } = await import('../../server/vision/gemini');
const models = () => calls.map((c) => c.model);
// the retry waits 700 ms: run it on a fake clock
const answer = async <T>(p: Promise<T>) => { await vi.advanceTimersByTimeAsync(700); return p; };

afterEach(() => { vi.useRealTimers(); calls.length = 0; seen.blip = 0; });

describe('gemini fallback', () => {
  it('a spent model hands the photo straight to the fallback, which is recorded', async () => {
    const p = geminiProvider('key', 'spent', 'lite');
    expect((await p.analyze({ text: 'rice', locale: 'en' }) as { items: unknown[] }).items).toHaveLength(2);
    expect(models()).toEqual(['spent', 'lite']);
    expect(p.model).toBe('lite');
  });

  it('a busy model is tried once more after 700 ms, then the fallback answers', async () => {
    vi.useFakeTimers();
    const p = geminiProvider('key', 'busy', 'lite');
    const done = p.analyze({ text: 'rice', locale: 'en' });
    await vi.advanceTimersByTimeAsync(699);
    expect(models()).toEqual(['busy']);
    await answer(done);
    expect(models()).toEqual(['busy', 'busy', 'lite']);
    expect(p.model).toBe('lite');
  });

  it('a blip is not a reason for the weaker model: the retry answers and the model stays', async () => {
    vi.useFakeTimers();
    const p = geminiProvider('key', 'blip', 'lite');
    expect(await answer(p.analyze({ text: 'rice', locale: 'en' }))).toEqual({ ok: true });
    expect(models()).toEqual(['blip', 'blip']);
    expect(p.model).toBe('blip');
  });

  it('what the fallback says is never high confidence', async () => {
    const out = await geminiProvider('key', 'spent', 'lite').analyze({ text: 'rice', locale: 'en' }) as { items: { confidence: string }[] };
    expect(out.items.map((i) => i.confidence)).toEqual(['medium', 'low']);
  });

  it('any other failure, or no fallback, is thrown as before (a 503 with no fallback is the handler\'s retry to make)', async () => {
    await expect(geminiProvider('key', 'bad', 'lite').analyze({ text: 'rice', locale: 'en' })).rejects.toMatchObject({ status: 400 });
    await expect(geminiProvider('key', 'busy').analyze({ text: 'rice', locale: 'en' })).rejects.toMatchObject({ status: 503 });
    expect(models()).toEqual(['bad', 'busy']);
  });
});

describe('thinking and usage', () => {
  it.each([['', 'MINIMAL'], ['minimal', 'MINIMAL'], ['low', 'LOW'], [' Medium ', 'MEDIUM'], ['high', 'MINIMAL'], ['nonsense', 'MINIMAL']])('GEMINI_THINKING "%s" asks for %s', async (value, level) => {
    await geminiProvider('key', 'm', '', value).analyze({ text: 'rice', locale: 'en' });
    expect(calls[0].level).toBe(level);
  });

  it('logs the token counts the provider reports, in its own line', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    await geminiProvider('key', 'm', '', 'low').analyze({ text: 'rice', locale: 'en' });
    expect(info).toHaveBeenCalledWith('gemini', { model: 'm', thinking: 'low', prompt: 7000, cached: 6500, thoughts: 0, out: 240 });
    info.mockRestore();
  });
});
