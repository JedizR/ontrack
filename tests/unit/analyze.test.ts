import { describe, expect, test, vi } from 'vitest';
import { analyze, type Deps } from '../../server/handlers/analyze';
import { fixture, mockProvider } from '../../server/vision/mock';
import type { VisionProvider } from '../../server/vision/provider';
import { MAX_BODY_BYTES } from '../../shared/analysis';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]).toString('base64');
const photo = { kind: 'photo', image: JPEG, localDate: new Date().toISOString().slice(0, 10), locale: 'en' };
const text = { kind: 'text', text: 'Two eggs and toast', localDate: photo.localDate, locale: 'en' };

function deps(o: Partial<Deps> & { provider?: () => Promise<VisionProvider> } = {}): Deps {
  let used = 0;
  return {
    caller: async (r) => (r.headers.get('authorization') === 'Bearer good' ? { id: 'u1' } : null),
    bump: async (_u, _d, limit) => { used++; return { allowed: used <= limit, used, total: used }; },
    provider: async () => mockProvider,
    limit: 40,
    cap: 400,
    ...o,
  };
}
const post = (body: unknown, d = deps(), auth = 'Bearer good') =>
  analyze(new Request('http://x/api/analyze', { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: typeof body === 'string' ? body : JSON.stringify(body) }), d);
const read = async (r: Response) => ({ status: r.status, body: await r.json() });

describe('POST /api/analyze', () => {
  test('refuses a missing or wrong token before reading the body', async () => {
    const bump = vi.fn();
    expect((await read(await post(photo, deps({ bump }), ''))).status).toBe(401);
    expect((await read(await post(photo, deps({ bump }), 'Bearer bad'))).body).toEqual({ ok: false, error: 'unauthorized' });
    expect(bump).not.toHaveBeenCalled();
  });

  test('refuses an oversized body with 413', async () => {
    const big = { ...photo, image: 'A'.repeat(MAX_BODY_BYTES) };
    expect(await read(await post(big))).toEqual({ status: 413, body: { ok: false, error: 'too_large' } });
  });

  test('refuses a body that does not match the schema, without counting it', async () => {
    const bump = vi.fn();
    for (const bad of ['not json', {}, { ...photo, kind: 'video' }, { ...photo, image: 'not base64!' }, { ...text, text: 'x'.repeat(501) }, { ...photo, localDate: '12/11/2026' }, { ...photo, image: Buffer.from('GIF89a').toString('base64') }]) {
      expect(await read(await post(bad, deps({ bump })))).toEqual({ status: 400, body: { ok: false, error: 'bad_request' } });
    }
    expect(bump).not.toHaveBeenCalled();
  });

  test('a photo comes back as resolved items with usage', async () => {
    const r = await read(await post(photo));
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.usage).toEqual({ usedToday: 1, limit: 40 });
    expect(r.body.analysis.model).toBe('mock');
    expect(r.body.analysis.items.length).toBeGreaterThan(0);
    for (const it of r.body.analysis.items) expect(['db', 'estimate']).toContain(it.source);
  });

  test('not food is 422; over the limit and over the global cap are 429', async () => {
    expect((await read(await post({ ...text, text: 'this is not food' }))).body.error).toBe('not_food');
    const d = deps({ limit: 1 });
    await post(text, d);
    expect(await read(await post(text, d))).toEqual({ status: 429, body: { ok: false, error: 'daily_limit', usage: { usedToday: 1, limit: 1 } } });
    expect((await read(await post(text, deps({ cap: 0 })))).body.error).toBe('busy');
  });

  test('a 5xx is retried once, then reported as a provider error', async () => {
    const analyze = vi.fn(async () => fixture('fail'));
    expect(await read(await post(text, deps({ provider: async () => ({ model: 'm', analyze }) })))).toEqual({ status: 502, body: { ok: false, error: 'provider_error' } });
    expect(analyze).toHaveBeenCalledTimes(2);
    const flaky = vi.fn().mockRejectedValueOnce(Object.assign(new Error('x'), { status: 503 })).mockResolvedValueOnce(fixture('oats-banana'));
    expect((await post(text, deps({ provider: async () => ({ model: 'm', analyze: flaky }) }))).status).toBe(200);
    const refused = vi.fn(async () => { throw Object.assign(new Error('x'), { status: 400 }); });
    expect((await post(text, deps({ provider: async () => ({ model: 'm', analyze: refused }) }))).status).toBe(502);
    expect(refused).toHaveBeenCalledTimes(1);
  });

  test('a provider that does not answer in time is retried once, then 504', async () => {
    const analyze = vi.fn((i: { signal?: AbortSignal }) => new Promise((_, reject) => i.signal?.addEventListener('abort', () => reject(new Error('aborted')))));
    expect(await read(await post(text, deps({ timeoutMs: 20, provider: async () => ({ model: 'm', analyze }) })))).toEqual({ status: 504, body: { ok: false, error: 'timeout' } });
    expect(analyze).toHaveBeenCalledTimes(2);
  });

  test('a reply that breaks the schema is a provider error', async () => {
    const analyze = async () => ({ is_food: true, title: 'x', items: [{ name: 'Rice' }] });
    expect((await read(await post(text, deps({ provider: async () => ({ model: 'm', analyze }) })))).body.error).toBe('provider_error');
  });

  test('the quota counts on the server day, whatever date the phone sends', async () => {
    const days: string[] = [];
    const d = deps({ bump: async (_u, day) => { days.push(day); return { allowed: true, used: 1, total: 1 }; } });
    await post({ ...text, localDate: '2030-01-01' }, d);
    expect(days).toEqual([new Date().toISOString().slice(0, 10)]);
  });

  test('items with blank names are dropped; none left is not food', async () => {
    const reply = (names: string[]) => async () => ({ is_food: true, title: 't', items: names.map((name) => ({ ...(fixture('oats-banana') as { items: object[] }).items[0], name })) });
    const ok = await read(await post(text, deps({ provider: async () => ({ model: 'm', analyze: reply(['Oats', '  ']) }) })));
    expect(ok.body.analysis.items.map((i: { name: string }) => i.name)).toEqual(['Oats']);
    expect((await read(await post(text, deps({ provider: async () => ({ model: 'm', analyze: reply([' ']) }) })))).body.error).toBe('not_food');
  });
});
