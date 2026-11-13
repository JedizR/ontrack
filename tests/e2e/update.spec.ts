// U2, the update flow: a new deploy takes over without a worker left waiting, "A new version is ready" shows once,
// Update loads the new version, and a refresh does not bring the prompt back. Needs a production build with its
// service worker (E2E_BASE_URL, see offline.spec.ts). A deploy is a changed sw.js: a small proxy in front of the
// build appends a line to it, since an update check bypasses Playwright's routing.
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, test, type Page } from '@playwright/test';

test.skip(!process.env.E2E_BASE_URL, 'needs a production build, see offline.spec.ts');

let server: Server;
let origin = '';
let deployed = false;

test.beforeAll(async () => {
  const base = process.env.E2E_BASE_URL!;
  server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const c of req) chunks.push(c as Buffer);
    const r = await fetch(new URL(req.url!, base), { method: req.method, headers: { 'content-type': req.headers['content-type'] ?? '' }, body: chunks.length ? Buffer.concat(chunks) : undefined });
    let body = Buffer.from(await r.arrayBuffer());
    if (deployed && req.url === '/sw.js') body = Buffer.concat([body, Buffer.from('\n// the next deploy\n')]);
    const headers = Object.fromEntries([...r.headers].filter(([k]) => !['content-encoding', 'content-length', 'transfer-encoding'].includes(k)));
    res.writeHead(r.status, headers).end(body);
  });
  await new Promise<void>((done) => server.listen(0, 'localhost', done));
  origin = `http://localhost:${(server.address() as AddressInfo).port}`;
});
test.afterAll(() => new Promise<void>((done) => server.close(() => done())));

// the registration's workers once an update check has finished
const workers = (page: Page) =>
  page.evaluate(async () => {
    const r = (await navigator.serviceWorker.getRegistration())!;
    await r.update();
    while (r.installing) await new Promise((done) => setTimeout(done, 100));
    return { controlled: !!navigator.serviceWorker.controller, waiting: !!r.waiting };
  });

test('a new version takes over, shows the prompt once, and Update loads it', async ({ page }) => {
  test.slow();
  const prompt = page.getByText('A new version is ready');
  await page.goto(origin);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await workers(page)).toEqual({ controlled: true, waiting: false });
  await expect(prompt).toHaveCount(0);

  deployed = true;
  await page.reload();
  // the new worker never waits for the page: the cause of the prompt that kept coming back
  await expect(prompt).toBeVisible({ timeout: 15_000 });
  expect(await workers(page)).toEqual({ controlled: true, waiting: false });

  await Promise.all([page.waitForEvent('load'), page.getByRole('button', { name: 'Update' }).click()]);
  expect(await workers(page)).toEqual({ controlled: true, waiting: false });
  await expect(prompt).toHaveCount(0);

  await page.reload();
  expect(await workers(page)).toEqual({ controlled: true, waiting: false });
  await expect(prompt).toHaveCount(0);
});
