// The dev mock's default space has people to find, so one phone can try the whole friends loop (the owner's `pnpm dev`):
// Rin, Kai and Mai say yes a few seconds after you ask, and Ploy asks you once you have a profile. Test spaces stay empty.
import { afterEach, expect, test, vi } from 'vitest';
import { createMockServer, MOCK_CODE } from '../../dev/mock-backend';
import { createMockBackend } from '../../src/lib/backend/mock';

afterEach(() => vi.useRealTimers());

async function phone(space: string, email: string) {
  const server = createMockServer();
  const b = createMockBackend({ base: 'http://mock', fetch: (u, i) => server(new Request(u, i)), space });
  await b.auth.sendEmailCode(email);
  await b.auth.verifyEmailCode(email, MOCK_CODE);
  return b;
}

test('the default space: find Rin, ask, Rin says yes after a few seconds; Ploy asks once you have a profile', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  const me = await phone('default', 'me@example.com');
  expect((await me.social.search('ri')).map((p) => p.handle)).toEqual(['rin']);
  expect(await me.social.friends()).toEqual([]);
  // a profile first, as the database needs one on both sides to take a request
  await me.social.request((await me.social.search('rin'))[0].id).then(() => expect.unreachable(), (e) => expect(e.kind).toBe('bad_request'));
  await me.push([{ collection: 'social', id: 'social', updatedAt: 1, data: { handle: 'nan_eats', name: 'Nan' } }]);
  expect((await me.social.friends()).map((f) => [f.handle, f.status])).toEqual([['ploy', 'incoming']]);
  const rin = (await me.social.search('rin'))[0];
  await me.social.request(rin.id);
  expect((await me.social.friends()).find((f) => f.handle === 'rin')?.status).toBe('outgoing');
  vi.advanceTimersByTime(5000);
  expect((await me.social.friends()).find((f) => f.handle === 'rin')?.status).toBe('friend');
});

test('any other space starts with nobody in it', async () => {
  const me = await phone('demo-test-empty', 'me@example.com');
  expect(await me.social.search('ri')).toEqual([]);
  await me.push([{ collection: 'social', id: 'social', updatedAt: 1, data: { handle: 'nan_eats', name: 'Nan' } }]);
  expect(await me.social.friends()).toEqual([]);
});
