// Visual review: every screen in its main states -> screenshots/<screen>/<state>-<theme>-<device>.png
//   pnpm screenshots -- --grep "shell"
import { test, type Page } from '@playwright/test';
import { open } from './helpers';

const DEVICES = [
  { name: '390', width: 390, height: 844 },
  { name: 'se', width: 375, height: 667 },
  { name: 'promax', width: 430, height: 932 },
];

for (const theme of ['light', 'dark'] as const) {
  for (const d of DEVICES) {
    test.describe(`${theme} ${d.name}`, () => {
      test.use({ colorScheme: theme, viewport: { width: d.width, height: d.height } });
      const shot = async (page: Page, screen: string, state: string) => {
        await page.waitForTimeout(450); // let slides settle
        await page.screenshot({ path: `screenshots/${screen}/${state}-${theme}-${d.name}.png` });
      };

      test('shell', async ({ page }) => {
        await open(page);
        await shot(page, 'shell', 'today');
        await page.getByTestId('tab-1').click();
        await shot(page, 'shell', 'train');
        await page.getByTestId('tab-2').click();
        await shot(page, 'shell', 'progress');
      });
    });
  }
}

test.describe('wide', () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });
  test('shell on a wide screen', async ({ page }) => {
    await open(page);
    await page.screenshot({ path: 'screenshots/shell/today-light-desktop.png' });
  });
});
