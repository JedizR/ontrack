// Sign in, sync, session expiry, sign out and account deletion against the mock backend. Each test has its own
// server space; two browser contexts in one space are two phones on one account. Data is logged through the real
// actions (window.ontrack, dev only) until the logging screens exist.
import { expect, test, type Browser, type Page } from '@playwright/test';
import { EMAIL, signIn, space, useSpace } from './helpers';

type Hook = { ontrack: { actions: Record<string, (...a: unknown[]) => unknown>; db: { pending: number; ready: boolean; get(c: string, id: string): unknown }; sync: { status: string } } };

/** A phone: a fresh browser context in the given space, on Today. */
async function phone(browser: Browser, s: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await useSpace(page, s);
  await page.goto('/');
  await expect(page.getByTestId('dock')).toBeVisible();
  await expect.poll(() => page.evaluate(() => 'ontrack' in window)).toBe(true);
  return { context, page };
}

const pending = (page: Page) => page.evaluate(() => (window as unknown as Hook).ontrack.db.pending);
const weigh = (page: Page, date: string, kg: number) => page.evaluate(([d, k]) => (window as unknown as Hook).ontrack.actions.logWeight(d, k), [date, kg] as const);
const weight = (page: Page, date: string) => page.evaluate((d) => (window as unknown as Hook).ontrack.db.get('weight', `weight:${d}`), date);

test('a weigh-in logged offline reaches a second phone after reconnecting', { tag: '@smoke' }, async ({ browser }) => {
  const s = space('offline');
  const a = await phone(browser, s);
  await signIn(a.page);

  await a.context.setOffline(true);
  await expect(a.page.getByTestId('sync-mark')).toHaveAttribute('data-state', 'offline');
  await weigh(a.page, '2026-11-11', 81.4);
  await a.page.waitForTimeout(2000); // past the 1.5 s debounce: nothing can leave while offline
  expect(await pending(a.page)).toBe(1);

  await a.context.setOffline(false);
  await expect.poll(() => pending(a.page)).toBe(0);
  await expect(a.page.getByTestId('sync-mark')).toBeHidden();

  const b = await phone(browser, s);
  await signIn(b.page);
  await expect.poll(() => weight(b.page, '2026-11-11')).toEqual({ date: '2026-11-11', kg: 81.4 });
  await a.context.close();
  await b.context.close();
});

test('a wrong code says so and clears, the right one signs in', { tag: '@smoke' }, async ({ browser }) => {
  const { page, context } = await phone(browser, space('code'));
  await page.getByTestId('avatar').click();
  await expect(page.getByTestId('signin-send')).toBeDisabled();
  await page.getByTestId('signin-email').fill(EMAIL);
  await page.getByTestId('signin-send').click();
  await expect(page.getByTestId('signin-resend')).toBeDisabled();
  await page.getByTestId('signin-code').fill('000000');
  await expect(page.getByTestId('signin-error')).toHaveText('That code did not match. Check the email and try again.');
  await expect(page.getByTestId('signin-code')).toHaveValue('');
  await page.getByTestId('signin-code').fill('123456');
  await expect(page.getByTestId('signin-sheet')).toBeHidden();
  await context.close();
});

test('Google sign in leaves the app and comes back signed in', async ({ browser }) => {
  const { page, context } = await phone(browser, space('google'));
  await page.getByTestId('avatar').click();
  await page.getByTestId('signin-google').click();
  await expect(page.getByTestId('avatar')).toHaveAttribute('aria-label', 'Account');
  expect(new URL(page.url()).hash).toBe('');
  await page.getByTestId('avatar').click();
  await expect(page.getByTestId('account-sheet')).toContainText('google.user@example.com');
  await context.close();
});

test('an expired session asks to sign in again and keeps what was logged', async ({ browser }) => {
  const s = space('expired');
  const { page, context } = await phone(browser, s);
  await signIn(page);
  await page.request.post('/__mock/expire', { headers: { 'x-mock-space': s } });
  await weigh(page, '2026-11-10', 80);
  await expect(page.getByTestId('session-expired')).toBeVisible();
  await expect(page.getByTestId('sync-mark')).toHaveAttribute('data-state', 'attention');
  expect(await pending(page)).toBe(1);

  // a reload keeps the data and the card
  await page.reload();
  await expect(page.getByTestId('session-expired')).toBeVisible();
  expect(await weight(page, '2026-11-10')).toEqual({ date: '2026-11-10', kg: 80 });

  await page.getByTestId('session-signin').click();
  await expect(page.getByTestId('signin-sheet')).toBeVisible();
  await signIn(page);
  await expect(page.getByTestId('session-expired')).toBeHidden();
  await expect.poll(() => pending(page)).toBe(0);
  await context.close();
});

test('another account cannot take over a phone that holds unsent changes', async ({ browser }) => {
  const s = space('wrong-account');
  const { page, context } = await phone(browser, s);
  await signIn(page);
  await page.request.post('/__mock/expire', { headers: { 'x-mock-space': s } });
  await weigh(page, '2026-11-07', 77);
  await expect(page.getByTestId('session-expired')).toBeVisible();

  await page.getByTestId('session-signin').click();
  await expect(page.getByTestId('signin-sheet')).toBeVisible();
  await signIn(page, 'someone.else@example.com').catch(() => undefined); // refused: the avatar stays on Sign in
  await expect(page.getByTestId('session-expired')).toContainText('The changes on this phone belong to me@example.com');
  expect(await weight(page, '2026-11-07')).toEqual({ date: '2026-11-07', kg: 77 });

  await page.getByTestId('session-signin').click();
  await expect(page.getByTestId('signin-sheet')).toBeVisible();
  await signIn(page);
  await expect.poll(() => pending(page)).toBe(0);
  await context.close();
});

test('signing out sends what is waiting, then deletes the data from the phone', async ({ browser }) => {
  const { page, context } = await phone(browser, space('signout'));
  await signIn(page);
  await weigh(page, '2026-11-09', 79);
  const userId = await page.evaluate(() => JSON.parse(localStorage.getItem('ot-ui')!).lastUser as string);

  // offline, it stops and says what would be lost
  await context.setOffline(true);
  await page.getByTestId('avatar').click();
  await page.getByTestId('account-signout').click();
  await expect(page.getByTestId('account-unsent')).toBeVisible();
  await context.setOffline(false);
  await page.getByTestId('account-sheet').getByRole('button', { name: 'Close' }).click();

  await expect.poll(() => pending(page)).toBe(0);
  await page.getByTestId('avatar').click();
  await page.getByTestId('account-signout').click();
  await expect(page.getByTestId('avatar')).toHaveAttribute('aria-label', 'Sign in');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ot-ui')!).lastUser)).toBeNull();
  const left = await page.evaluate(
    (id) => new Promise<number>((done) => {
      const req = indexedDB.open(`ontrack-${id}`);
      req.onsuccess = () => {
        const tx = req.result.transaction('kv', 'readonly').objectStore('kv').count();
        tx.onsuccess = () => done(tx.result);
      };
    }),
    userId,
  );
  expect(left).toBe(0);
  await context.close();
});

test('deleting the account removes its data everywhere', async ({ browser }) => {
  const s = space('delete');
  const { page, context } = await phone(browser, s);
  await signIn(page);
  await weigh(page, '2026-11-08', 78);
  await expect.poll(() => pending(page)).toBe(0);

  await page.getByTestId('avatar').click();
  await page.getByTestId('account-delete').click();
  await expect(page.getByTestId('delete-confirm-button')).toBeDisabled();
  await page.getByTestId('delete-confirm').fill(EMAIL);
  await page.getByTestId('delete-confirm-button').click();
  await expect(page.getByTestId('avatar')).toHaveAttribute('aria-label', 'Sign in');

  const b = await phone(browser, s);
  await signIn(b.page);
  await expect.poll(() => b.page.evaluate(() => (window as unknown as Hook).ontrack.sync.status)).toBe('idle');
  expect(await weight(b.page, '2026-11-08')).toBeUndefined();
  await context.close();
  await b.context.close();
});
