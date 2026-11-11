// The shell: header, three tabs, the dock. Runs in the light and dark projects (WebKit, 390 by 844).
import { test, expect } from '@playwright/test';
import { open, swipeOn } from './helpers';

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

test('swiping moves between tabs and wraps around', async ({ page }) => {
  await open(page);
  await swipeOn(page, 'tab-today', -120);
  await expect(title(page)).toHaveText('Train');
  await swipeOn(page, 'tab-train', 120);
  await expect(title(page)).toHaveText('Today');
  await swipeOn(page, 'tab-today', 120);
  await expect(title(page)).toHaveText('Progress');
  // a short drag is not a swipe
  await swipeOn(page, 'tab-progress', -30);
  await expect(title(page)).toHaveText('Progress');
});

test('the app sits in a 480 px column on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await open(page);
  const box = await page.getByTestId('header').boundingBox();
  expect(box!.width).toBeLessThanOrEqual(480);
  expect(box!.x).toBeGreaterThan(200);
});
