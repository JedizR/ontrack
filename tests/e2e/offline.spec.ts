// M9b, the offline pass (PRD section 8): every feature but photo and text analysis works in airplane mode and syncs
// within 10 s of reconnecting. Needs a production build with its service worker, as the dev server serves code on demand:
//   VITE_BACKEND=mock VISION_PROVIDER=mock pnpm vite build --outDir <dir> --emptyOutDir
//   VITE_BACKEND=mock VISION_PROVIDER=mock pnpm vite preview --outDir <dir> --port 5297 --strictPort
//   E2E_BASE_URL=http://localhost:5297 pnpm exec playwright test --project=offline
// "Today" is Wednesday 2026-11-11 at 10:00, a training day; the times of day cards (easy adds, Finish day) are not here.
import { expect, test, type Page } from '@playwright/test';
import { EMAIL, MEALS, SUPPLEMENTS, TODAY, pickerSave, seedAccount, space, takePhoto, withPrefs } from './helpers';

const hero = (page: Page) => page.getByTestId('hero-value');
const meals = (page: Page) => page.getByTestId('meal');
const mark = (page: Page) => page.getByTestId('sync-mark');
// a second weigh-in, so Progress has a trend to chart; a profile for friends, so Friends has a list to fail to load
const EXTRA = [
  { collection: 'weight', id: 'weight:2026-11-07', updatedAt: 1, data: { date: '2026-11-07', kg: 60.4 } },
  { collection: 'social', id: 'social', updatedAt: 1, data: { handle: 'nan_eats', name: 'Nan' } },
];

async function openAt(page: Page, s: string, onboarded = true) {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await seedAccount(page, { space: s, email: EMAIL, onboarded, records: [...MEALS, ...SUPPLEMENTS, ...EXTRA] });
  await page.goto('/');
  await expect(page.getByTestId('dock')).toBeVisible();
}

test('airplane mode: a cold start and every feature work offline, and sync within 10 s of reconnecting', async ({ page, context, browser }) => {
  test.slow();
  // no share sheet, so the export is a download; the photo notice already accepted
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined }));
  await withPrefs(page, { photoOk: true });
  const s = space('offline');
  await openAt(page, s);
  for (const tab of ['tab-1', 'tab-2', 'tab-0']) await page.getByTestId(tab).click();
  // the service worker precaches on install but takes control only of pages loaded after it
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await expect(mark(page)).toBeHidden(); // everything seeded is on the phone

  await test.step('F13: a cold start offline reaches Today with its number', async () => {
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByTestId('dock')).toBeVisible();
    await expect(mark(page)).toHaveAttribute('data-state', 'offline');
    await expect(hero(page)).toHaveText('2,233');
    await expect(meals(page).filter({ hasText: 'Chicken rice bowl' })).toHaveCount(1);
  });

  await test.step('F5, F14: a Thai dish from Search', async () => {
    await page.getByTestId('add').click();
    await page.getByTestId('add-search').click();
    await page.getByTestId('search-field').fill('ข้าวมันไก่');
    await page.getByTestId('result').first().click();
    await expect(page.getByTestId('portion-kcal')).toHaveText('693');
    await page.getByTestId('search-add').click();
    await expect(hero(page)).toHaveText('2,926');
    await expect(meals(page).filter({ hasText: 'Khao man kai' })).toHaveCount(1);
  });

  await test.step('F5: a quick add', async () => {
    await page.getByTestId('add').click();
    await page.getByTestId('add-quick').click();
    await page.getByTestId('quick-kcal').fill('450');
    await page.getByTestId('quick-name').fill('Protein shake');
    await page.getByTestId('quick-add').click();
    await expect(hero(page)).toHaveText('3,376');
  });

  await test.step('F21: a supplement in three taps', async () => {
    await page.getByTestId('add').click();
    await page.getByTestId('supplement').filter({ hasText: 'Whey' }).click();
    await page.getByTestId('supplement-add').click();
    await expect(hero(page)).toHaveText('3,769'); // 2 scoops with 250 g whole milk, as last time
  });

  await test.step('F7: today\'s session done on Today, a new one on Train', async () => {
    const training = page.getByTestId('training');
    await training.getByTestId('session-done').click();
    await expect(training).toContainText('60 min, Done');
    await page.getByTestId('tab-1').click();
    await page.getByTestId('train-day-1').getByTestId('train-rest').click();
    const sheet = page.getByTestId('train-session-sheet');
    await sheet.getByTestId('session-name').fill('Run');
    await sheet.getByRole('button', { name: 'Cardio' }).click();
    await sheet.getByTestId('session-save').click();
    await expect(page.getByTestId('train-day-1')).toContainText('Cardio, 60 min');
  });

  await test.step('F6, F11: a weigh-in from Progress, and its charts', async () => {
    await page.getByTestId('tab-2').click();
    await expect(page.getByTestId('weight-chart')).toBeVisible();
    await expect(page.getByTestId('progress-intake')).toBeVisible();
    await expect(page.getByTestId('progress-consistency')).toBeVisible();
    await page.getByTestId('progress-log-weight').click();
    await pickerSave(page, '61.2');
    await expect(page.getByText('Weigh-in saved, 61.2 kg')).toBeVisible();
  });

  await test.step('F12: a setting and an export', async () => {
    await page.getByTestId('avatar').click();
    const sheet = page.getByTestId('account-sheet');
    await sheet.getByTestId('set-checkin').click();
    await sheet.getByTestId('set-checkin-day').getByRole('radio', { name: 'Thursday' }).click();
    await sheet.getByTestId('sheet-back').click();
    await expect(sheet.getByTestId('set-checkin')).toContainText('Thursday');
    const download = page.waitForEvent('download');
    await sheet.getByTestId('set-export-all').click();
    expect((await download).suggestedFilename()).toBe(`ontrack-${TODAY}.json`);
    await sheet.getByRole('button', { name: 'Close' }).click();
    await expect(sheet).toBeHidden();
  });

  await test.step('F16, F17: Friends and the food map say they need a connection', async () => {
    await page.getByTestId('friends').click();
    await expect(page.getByTestId('map-message')).toHaveText('The map needs a connection. Meals you share go on it when you are back online.');
    const panel = page.getByTestId('friends-panel');
    if ((await panel.getAttribute('data-raised')) !== 'true') await page.getByTestId('panel-grabber').click();
    await expect(page.getByTestId('panel-message')).toContainText('Friends need a connection.');
    await page.getByTestId('map-back').click();
    await expect(page.getByTestId('food-map')).toBeHidden();
  });

  await test.step('F4, outside the bar: a photo says it waits for a connection', async () => {
    await page.getByTestId('tab-0').click();
    await takePhoto(page);
    await expect(page.getByTestId('review-error')).toContainText('Photo analysis needs a connection.');
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('review-sheet')).toBeHidden();
    await expect(hero(page)).toHaveText('3,769');
  });

  await test.step('reconnecting syncs within 10 s', async () => {
    // done means the account on the server holds what was logged offline (the mark also hides between rounds)
    const { token } = await (await page.request.post('/__mock/auth/verify', { headers: { 'x-mock-space': s }, data: { email: EMAIL, code: '123456' } })).json();
    const held = async () => {
      const res = await page.request.post('/__mock/pull', { headers: { 'x-mock-space': s, authorization: `Bearer ${token}` }, data: { after: null, limit: 1000 } });
      const text = JSON.stringify(await res.json());
      return ['Khao man kai', 'Protein shake', '"kg":61.2', '"checkinWeekday":3', '"name":"Run"'].every((x) => text.includes(x));
    };
    await expect(mark(page)).toHaveAttribute('data-state', 'offline');
    expect(await held()).toBe(false); // nothing left the phone while offline
    const start = Date.now();
    await context.setOffline(false);
    await expect(mark(page)).toBeHidden({ timeout: 20_000 });
    await expect.poll(held, { timeout: 20_000, intervals: [100] }).toBe(true);
    const seconds = Math.round((Date.now() - start) / 10) / 100;
    console.log(JSON.stringify({ task: 'offline reconnect', seconds }));
    expect(seconds).toBeLessThan(10);
  });

  await test.step('a second phone on the account sees what was logged offline', async () => {
    const other = await browser.newContext({ ...test.info().project.use });
    const two = await other.newPage();
    await openAt(two, s, false); // pushes nothing: all it shows comes from the first phone
    await expect(hero(two)).toHaveText('3,769');
    await expect(meals(two).filter({ hasText: 'Khao man kai' })).toHaveCount(1);
    await expect(meals(two).filter({ hasText: 'Protein shake' })).toHaveCount(1);
    await expect(two.getByTestId('training')).toContainText('60 min, Done');
    await two.getByTestId('tab-1').click();
    await expect(two.getByTestId('train-day-1')).toContainText('Cardio, 60 min');
    await two.getByTestId('tab-2').click();
    await two.getByTestId('progress-log-weight').click();
    await expect(two.getByTestId('picker-save')).toHaveText('Save 61.2 kg'); // the wheel starts at the last weigh-in
    await other.close();
  });
});
