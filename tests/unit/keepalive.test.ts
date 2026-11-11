import { afterEach, describe, expect, test } from 'vitest';
import { keepalive } from '../../server/handlers/keepalive';

const call = (auth?: string) => keepalive(new Request('http://x/api/cron/keepalive', { headers: auth ? { authorization: auth } : {} }));

describe('keepalive', () => {
  afterEach(() => { delete process.env.CRON_SECRET; });

  test('refuses every caller while CRON_SECRET is unset', async () => {
    expect((await call('Bearer ')).status).toBe(401);
    expect((await call()).status).toBe(401);
  });

  test('refuses a missing or wrong secret', async () => {
    process.env.CRON_SECRET = 'right-secret';
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong-secret')).status).toBe(401);
    expect((await call('right-secret')).status).toBe(401);
  });
});
