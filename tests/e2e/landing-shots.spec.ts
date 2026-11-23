// The landing page's phone screens (L1): real screens of the app on the mock backend, in the light theme, as an iPhone 16
// shows them under its status bar (393 by 798), as WebP (cwebp, from Homebrew's webp). Run after a change to the look, commit the images, and
// update t.landing.alt where a number changed:
//   LANDING_SHOTS=1 E2E_REAL_TILES=1 pnpm exec playwright test --project=shots
// (E2E_REAL_TILES draws the food map with OpenFreeMap's real tiles, so the map shot needs the network)
// 21 Nov, the owner: Today and Train may show a real account's day and program instead of the fixtures, for a realistic
// program. LANDING_SEED=<file> names a JSON { today, time, records } exported from Supabase with the owner's leave; the
// file stays out of the repo, only the shots are committed.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { MEALS, SUPPLEMENTS, open, openSeeded, seedAccount, vision, withPrefs } from './helpers';
import { openMap, scene } from './social';

test.skip(!process.env.LANDING_SHOTS, 'writes src/flows/landing/shots/; set LANDING_SHOTS=1');
test.use({ colorScheme: 'light', viewport: { width: 393, height: 798 }, deviceScaleFactor: 1.6 });

// the whole screen under the status bar, 393 by 798 points (an iPhone 16's 393 by 852 less its 54 point status bar)
// 21 Nov, the owner: in the phone pictures the dock is the earlier landing shots' glass (white at 80 percent over a 24 px
// blur, U1b's bar), so the rows under it do not read through at that size; the app itself keeps Tray's clearer glass
const DEMO_CSS = '[data-testid="dock"] nav { --liquid-tint-share: 80% !important; --liquid-clear: blur(24px) !important; }';
const shot = async (page: Page, name: string) => {
  await page.addStyleTag({ content: DEMO_CSS });
  await page.waitForTimeout(500); // sheets and fades settle
  const png = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path: png, clip: { x: 0, y: 0, width: 393, height: 798 } });
  execFileSync('cwebp', ['-quiet', '-q', '80', png, '-o', `src/flows/landing/shots/${name}.webp`]);
};
const settled = (page: Page, id: string) => expect(page.getByTestId(id)).toHaveCSS('transform', 'none');

type Real = { today: string; time: string; records: NonNullable<Parameters<typeof seedAccount>[1]>['account'] };
const real: Real | null = process.env.LANDING_SEED ? JSON.parse(readFileSync(process.env.LANDING_SEED, 'utf8')) : null;
// the real account's day at its own clock, without the day's reminder cards (the shot is the day itself)
async function openReal(page: Page, r: Real) {
  await page.clock.setFixedTime(new Date(`${r.today}T${r.time}:00+07:00`));
  await withPrefs(page, { remind: { meal: true, mealAt: '13:00', checkin: false, easy: false } });
  await seedAccount(page, { account: r.records });
  await page.goto('/');
  await expect(page.getByTestId('dock')).toBeVisible();
}

test('today', async ({ page }) => {
  if (real) await openReal(page, real);
  else await open(page, '/', MEALS);
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
  await (await chooser).setFiles('tests/fixtures/krapao.jpg'); // L2: the owner's pad kra pao with fried eggs
  await expect(page.getByTestId('meal-item')).toHaveCount(3);
  await settled(page, 'review-sheet');
  await shot(page, 'photo');
});

test('scan', async ({ page }) => {
  // no camera in the shot: the typed barcode finds the Open Food Facts fixture
  await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new DOMException('camera', 'NotAllowedError'); } } }));
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('scanner-type').click();
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
  await withPrefs(page, { suggestOff: true, liftAsked: true }); // the week itself, without O1's suggestion card or the experience question
  if (real) await openReal(page, real);
  else await open(page);
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

// S1b: Nan's food map around Bangkok, the friends panel lowered
test('map', async ({ page }) => {
  await scene(page);
  await openMap(page);
  await expect(page.getByTestId('pin').first()).toBeVisible();
  await page.waitForTimeout(3000); // the tiles draw
  await shot(page, 'map');
});
