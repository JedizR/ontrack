import { afterEach, describe, expect, test } from 'vitest';
import { authorized, keepalive } from '../../server/handlers/keepalive';

const call = (auth?: string) => keepalive(new Request('http://x/api/cron/keepalive', { headers: auth ? { authorization: auth } : {} }));

describe('keepalive', () => {
  afterEach(() => { delete process.env.CRON_SECRET; });

  test('an unset secret never authorizes', () => {
    expect(authorized('Bearer ', '')).toBe(false);
    expect(authorized('Bearer', '')).toBe(false);
    expect(authorized(null, '')).toBe(false);
  });

  test('only the exact bearer secret authorizes', () => {
    expect(authorized('Bearer right-secret', 'right-secret')).toBe(true);
    expect(authorized('Bearer wrong-secret', 'right-secret')).toBe(false);
    expect(authorized('right-secret', 'right-secret')).toBe(false);
  });

  test('the handler refuses before touching the database', async () => {
    process.env.CRON_SECRET = 'right-secret';
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong-secret')).status).toBe(401);
  });
});
