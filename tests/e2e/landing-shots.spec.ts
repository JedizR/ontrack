// The landing page's phone screens (L1): real screens of the app on the mock backend, in the light theme, as a 390 by
// 844 iPhone shows them, as WebP (cwebp, from Homebrew's webp). Run after a change to the look, and commit the images:
//   LANDING_SHOTS=1 pnpm exec playwright test --project=shots
import { execFileSync } from 'node:child_process';
import { expect, test, type Page } from '@playwright/test';
import { MEALS, SUPPLEMENTS, open, openSeeded, vision, withPrefs } from './helpers';

test.skip(!process.env.LANDING_SHOTS, 'writes src/flows/landing/shots/; set LANDING_SHOTS=1');
test.use({ colorScheme: 'light', viewport: { width: 390, height: 844 }, deviceScaleFactor: 1.6 });

const shot = async (page: Page, name: string) => {
  await page.waitForTimeout(500); // sheets and fades settle
  const png = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path: png });
  execFileSync('cwebp', ['-quiet', '-q', '82', png, '-o', `src/flows/landing/shots/${name}.webp`]);
};
const settled = (page: Page, id: string) => expect(page.getByTestId(id)).toHaveCSS('transform', 'none');

test('today', async ({ page }) => {
  await open(page, '/', MEALS);
  await expect(page.getByTestId('meals')).toHaveCSS('opacity', '1');
  await shot(page, 'today');
});

test('photo', async ({ page }) => {
  await withPrefs(page, { photoOk: true });
  const s = await open(page);
  await vision(page, s, { fixture: 'basil-pork' });
  await page.getByTestId('add').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('add-photo').click();
  await (await chooser).setFiles('tests/fixtures/meal.jpg');
  await expect(page.getByTestId('meal-item')).toHaveCount(3);
  await settled(page, 'review-sheet');
  await shot(page, 'photo');
});

test('scan', async ({ page }) => {
  // no camera in the shot: the typed barcode finds the Open Food Facts fixture
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new DOMException('camera', 'NotAllowedError'); } } }));
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('add-scan').click();
  await page.getByTestId('barcode-field').fill('8850987101021');
  await page.getByTestId('barcode-find').click();
  await expect(page.getByTestId('product')).toBeVisible();
  await settled(page, 'scan-sheet');
  await shot(page, 'scan');
});

test('thai', async ({ page }) => {
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('add-search').click();
  await page.getByTestId('search-field').fill('ก๋วยเตี๋ยว');
  await expect(page.getByTestId('result').first()).toBeVisible();
  await page.getByTestId('search-field').blur();
  await settled(page, 'search-sheet');
  await shot(page, 'thai');
});

test('supplement', async ({ page }) => {
  await open(page, '/', [...MEALS, ...SUPPLEMENTS]);
  await page.getByTestId('add').click();
  await page.getByTestId('supplement').filter({ hasText: 'Whey' }).click();
  await expect(page.getByTestId('supplement-milk')).toBeVisible();
  await settled(page, 'supplement-sheet');
  await shot(page, 'supplement');
});

test('train', async ({ page }) => {
  await open(page);
  await page.getByTestId('tab-1').click();
  await expect(page.getByTestId('train-week')).toBeVisible();
  await shot(page, 'train');
});

// vector F of the seeder: four weeks of a hardgainer whose weight held, so the check-in raises the target
test('progress and check-in', async ({ page }) => {
  await openSeeded(page, 'raise');
  await page.getByTestId('checkin-open').click();
  await settled(page, 'checkin-sheet');
  await page.getByTestId('checkin-next').click();
  await page.getByTestId('checkin-next').click();
  await shot(page, 'checkin');
  await page.keyboard.press('Escape');
  await page.getByTestId('checkin-sheet').waitFor({ state: 'detached' });
  await page.getByTestId('tab-2').click();
  await expect(page.getByTestId('tab-progress')).toBeVisible();
  await shot(page, 'progress');
});
