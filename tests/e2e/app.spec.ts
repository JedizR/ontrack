// The shell: header, three tabs, the dock. Runs in the light and dark projects (WebKit, 390 by 844).
import { test, expect } from '@playwright/test';
import { open, swipeAt, wheelType, withPrefs } from './helpers';

const title = (page: import('@playwright/test').Page) => page.getByRole('heading', { level: 1 });

test('the shell opens on Today with the header and dock', { tag: '@smoke' }, async ({ page }) => {
  await open(page);
  await expect(title(page)).toHaveText('Today');
  await expect(page.getByTestId('tab-0')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('tab-today')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add a meal' })).toBeVisible();
  // the theme follows the system before first paint
  const scheme = test.info().project.use.colorScheme;
  await expect(page.locator('html')).toHaveAttribute('data-theme', scheme === 'dark' ? 'dark' : 'light');
});

test('tabs switch from the dock and the last tab is remembered', { tag: '@smoke' }, async ({ page }) => {
  await open(page);
  await page.getByTestId('tab-1').click();
  await expect(title(page)).toHaveText('Train');
  await expect(page.getByTestId('tab-train')).toBeVisible();
  await page.getByTestId('tab-2').click();
  await expect(title(page)).toHaveText('Progress');
  await expect(page.getByTestId('tab-2')).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(title(page)).toHaveText('Progress');
});

test('swiping anywhere between header and dock moves between tabs and wraps around', async ({ page }) => {
  await open(page);
  await swipeAt(page, -120); // the empty middle of the screen, below the tab's content
  await expect(title(page)).toHaveText('Train');
  await swipeAt(page, 120, { y: 140 }); // on the content
  await expect(title(page)).toHaveText('Today');
  await swipeAt(page, 120);
  await expect(title(page)).toHaveText('Progress');
  // a short drag is not a swipe
  await swipeAt(page, -30);
  await expect(title(page)).toHaveText('Progress');
});

test('theme and text size are set before the app runs', { tag: '@smoke' }, async ({ page }) => {
  // block the app bundle (dev source or built asset), so only the inline pre-paint script can set them
  await page.route(/\/src\/main\.ts|\/assets\/index-.*\.js/, (r) => r.abort());
  await withPrefs(page, { theme: 'dark', fontSize: 'xl' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect(html).toHaveAttribute('data-fs', 'xl');
  expect(await html.evaluate((h) => h.style.getPropertyValue('--fs'))).toBe('1.3');
  await expect(page.getByTestId('dock')).toHaveCount(0);
});

test('the app sits in a 480 px column on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await open(page);
  const box = await page.getByTestId('header').boundingBox();
  expect(box!.width).toBeLessThanOrEqual(480);
  expect(box!.x).toBeGreaterThan(200);
});

// M1: the component gallery (dev and previews only)
test('a wheel takes keys and typing, and the wheel sheet saves its value', { tag: '@smoke' }, async ({ page }) => {
  await open(page, '/gallery');
  const height = page.getByTestId('wheel-height').getByRole('slider');
  await expect(height).toHaveAttribute('aria-valuenow', '170');
  await expect(height).toHaveAttribute('aria-valuetext', '170 cm');
  await height.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowUp');
  await expect(height).toHaveAttribute('aria-valuenow', '173');
  await page.keyboard.press('End');
  await expect(height).toHaveAttribute('aria-valuenow', '250');
  await page.keyboard.press('Home');
  await expect(height).toHaveAttribute('aria-valuenow', '100');
  await wheelType(page, 'wheel-height', '182');
  await expect(height).toHaveAttribute('aria-valuenow', '182');
  await wheelType(page, 'wheel-height', '400'); // kept inside the range
  await expect(height).toHaveAttribute('aria-valuenow', '250');

  // a decimal wheel: whole and tenths columns, one field for the whole value
  const weight = page.getByTestId('wheel-weight').getByRole('slider');
  await wheelType(page, 'wheel-weight', '82,4');
  await expect(weight.first()).toHaveAttribute('aria-valuenow', '82');
  await expect(weight.nth(1)).toHaveAttribute('aria-valuenow', '4');
  await expect(weight.nth(1)).toHaveAttribute('aria-valuetext', '82.4 kg');

  await page.getByRole('button', { name: 'Open the wheel sheet' }).click();
  await expect(page.getByTestId('picker-save')).toHaveText('Save 82.4 kg');
  await wheelType(page, 'picker-wheel', '83.1');
  await expect(page.getByTestId('picker-save')).toHaveText('Save 83.1 kg');
  await page.getByTestId('picker-save').click();
  await expect(page.getByTestId('picker')).toHaveCount(0);
  await expect(page.getByText('Weigh-in saved, 83.1 kg')).toBeVisible();
});

test('a sheet opens with its main action and closes', async ({ page }) => {
  await open(page, '/gallery');
  await page.getByRole('button', { name: 'Open a sheet' }).click();
  const sheet = page.getByTestId('sample-sheet');
  await expect(sheet.getByRole('heading', { name: 'Chicken rice bowl' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Add 648 kcal' })).toBeInViewport();
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toHaveCount(0);
});

test('the track turns green in its zone and the counterpart follows', async ({ page }) => {
  await open(page, '/gallery');
  const hero = page.locator('[data-section="hero"]');
  const track = hero.getByRole('progressbar');
  await expect(track).toHaveAttribute('data-reached', 'false');
  await expect(hero.getByText('620')).toBeVisible();
  const add = page.getByRole('button', { name: 'Add 250 kcal' });
  await add.click();
  await add.click();
  await expect(track).toHaveAttribute('data-reached', 'true');
  await expect(hero.getByText('On track')).toBeVisible();
  await expect(hero.getByTestId('hero-value')).toHaveText('2,340');
  await add.click();
  await add.click();
  await expect(track).toHaveAttribute('data-reached', 'false');
  await expect(hero.getByText('over')).toBeVisible();
});

test('holding the stepper repeats, an undo toast undoes, the sync mark explains itself', async ({ page }) => {
  await open(page, '/gallery');
  const more = page.getByRole('button', { name: 'More grams' });
  await more.hover();
  await page.mouse.down();
  await page.waitForTimeout(900);
  await page.mouse.up();
  const field = page.getByRole('textbox', { name: 'grams' });
  expect(Number(await field.inputValue())).toBeGreaterThan(200); // one press is 190; holding repeats
  // the number can be typed; it is kept, not rounded to the step, and the buttons go on from it
  await field.fill('125');
  await field.press('Enter');
  await expect(field).toHaveValue('125');
  await more.click();
  await expect(field).toHaveValue('135');
  // a whole number counter: a comma groups thousands, a fraction rounds
  await field.fill('1,250');
  await field.press('Enter');
  await expect(field).toHaveValue('1250');
  await field.fill('12.6');
  await field.press('Enter');
  await expect(field).toHaveValue('13');

  await page.getByRole('button', { name: 'Show an undo toast' }).click();
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(page.getByText('Meal restored')).toBeVisible();

  await page.getByRole('button', { name: /^Offline/ }).click();
  await expect(page.getByText('Offline. Changes stay in this browser until you reconnect')).toBeVisible();
});

test('the theme and text size change from the gallery and are remembered', async ({ page }) => {
  await open(page, '/gallery');
  await page.getByRole('radio', { name: 'Dark' }).click();
  await page.getByRole('button', { name: 'Larger' }).click();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-fs', 'xl');
});
