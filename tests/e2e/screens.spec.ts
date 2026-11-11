// Visual review: every screen in its main states -> screenshots/<screen>/<state>-<theme>-<device>.png
//   pnpm screenshots -- --grep "shell"
import { test, type Page } from '@playwright/test';
import { open, signIn, space, useSpace, withPrefs } from './helpers';

const SECTIONS = ['prefs', 'buttons', 'track', 'hero', 'rows', 'chips', 'sheets', 'week', 'feedback', 'states'];

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

      // the component gallery, one shot per section with the section at the top, then the interaction states
      test('gallery', async ({ page }) => {
        await open(page, '/gallery');
        for (const s of SECTIONS) {
          await page.locator(`[data-section="${s}"]`).evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 52));
          await shot(page, 'gallery', s);
        }
        const at = async (s: string) => page.locator(`[data-section="${s}"]`).evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 52));

        await at('buttons');
        const search = page.getByRole('button', { name: 'Search' });
        await search.hover();
        await page.mouse.down();
        await page.waitForTimeout(200);
        await page.screenshot({ path: `screenshots/gallery/pressed-button-${theme}-${d.name}.png` });
        await page.mouse.up();

        await at('hero');
        const add = page.getByRole('button', { name: 'Add 250 kcal' });
        await add.click();
        await add.click();
        await shot(page, 'gallery', 'hero-reached');
        await add.click();
        await add.click();
        await shot(page, 'gallery', 'hero-over');

        await at('sheets');
        await page.getByRole('button', { name: 'Open a sheet' }).click();
        await page.getByTestId('sample-sheet').waitFor();
        await shot(page, 'gallery', 'sheet');
        await page.keyboard.press('Escape');
        await page.getByTestId('sample-sheet').waitFor({ state: 'detached' });

        await page.getByRole('button', { name: 'Open the keypad' }).click();
        await page.getByTestId('keypad').waitFor();
        await shot(page, 'gallery', 'keypad-empty');
        for (const k of ['2', '5', '0', '+', '1', '8', '0']) await page.locator(`[data-key="${k}"]`).click();
        await shot(page, 'gallery', 'keypad-sum');
        await page.getByTestId('keypad-save').click();
        await page.getByTestId('keypad').waitFor({ state: 'detached' });

        await at('feedback');
        await page.getByRole('button', { name: 'Show an undo toast' }).click();
        await shot(page, 'gallery', 'toast-undo');
      });

      // SCREENS.md sections 5, 11 (account) and 12 (session expired, first load)
      test('signin', async ({ page }) => {
        const s = space('screens');
        await useSpace(page, s);
        await open(page);
        await page.getByTestId('avatar').click();
        await page.getByTestId('signin-send').waitFor();
        await shot(page, 'signin', 'email');
        await page.getByTestId('signin-email').fill('me@example.com');
        await page.getByTestId('signin-send').click();
        await page.getByTestId('signin-code').waitFor();
        await page.getByTestId('signin-code').fill('12');
        await shot(page, 'signin', 'code');
        await page.getByTestId('signin-code').fill('000000');
        await page.getByText('That code did not match').waitFor();
        await page.waitForTimeout(400);
        await shot(page, 'signin', 'wrong-code');
        await page.getByTestId('signin-code').fill('123456');
        await page.getByTestId('signin-sheet').waitFor({ state: 'detached' });

        await page.getByTestId('avatar').click();
        await page.getByTestId('account-sheet').waitFor();
        await shot(page, 'account', 'main');
        await page.getByTestId('account-delete').click();
        await page.getByTestId('delete-confirm').fill('me@');
        await shot(page, 'account', 'delete');
        await page.keyboard.press('Escape');
        await page.getByTestId('account-sheet').waitFor({ state: 'detached' });

        await page.request.post('/__mock/expire', { headers: { 'x-mock-space': s } });
        await page.evaluate(() => (window as unknown as { ontrack: { sync: { run(): Promise<void> } } }).ontrack.sync.run());
        await page.getByTestId('session-expired').waitFor();
        await shot(page, 'today', 'session-expired');
      });

      test('first load', async ({ page }) => {
        await useSpace(page, space('first-load'));
        // hold the first pull so the first load state stays on screen
        await page.route('**/__mock/pull', () => {});
        await open(page);
        await signIn(page);
        await page.getByTestId('bringing').waitFor();
        await shot(page, 'today', 'bringing');
      });

      // Today composed from the real components, next to the static reference mock
      test('today composed', async ({ page }) => {
        await open(page, '/gallery/today');
        await shot(page, 'today', 'composed');
        await page.goto(`/design/reference-today.html#${theme}`);
        await shot(page, 'today', 'reference');
      });
    });
  }
}

// the largest text size on the smallest phone: the composed Today, the keypad, and every gallery section
for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} se xl`, () => {
    test.use({ colorScheme: theme, viewport: { width: 375, height: 667 } });
    test('largest text', async ({ page }) => {
      await withPrefs(page, { theme: 'system', fontSize: 'xl' });
      await open(page, '/gallery/today');
      await page.waitForTimeout(450);
      await page.screenshot({ path: `screenshots/xl/today-${theme}-se.png` });
      await open(page, '/gallery');
      for (const s of SECTIONS) {
        await page.locator(`[data-section="${s}"]`).evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 52));
        if (theme === 'light') await page.screenshot({ path: `screenshots/xl/${s}-${theme}-se.png` });
      }
      await page.getByRole('button', { name: 'Open the keypad' }).click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `screenshots/xl/keypad-${theme}-se.png` });
    });
  });
}

test.describe('wide', () => {
  test.use({ viewport: { width: 1280, height: 900 }, isMobile: false, hasTouch: false });
  test('shell on a wide screen', async ({ page }) => {
    await open(page);
    await page.screenshot({ path: 'screenshots/shell/today-light-desktop.png' });
  });
});
