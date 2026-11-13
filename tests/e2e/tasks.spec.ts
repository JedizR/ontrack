// U1c's UX walk: the eight main tasks from Today, each from its first tap to the moment Today shows it. Prints one JSON
// line per task: taps, characters typed, the app's own time (wall clock in the scripted run: sheets, waits, motion) and
// a modelled total, which adds 1.75 s a tap (1.35 s to decide, 0.4 s to tap, as O1's measure) and 0.3 s a character.
// Not a gate. With TASK_VIDEO=1 it films each task in light and dark for the owner (pr-assets, u1/u1c/), with photo and
// text analysis held for 3 s so the wait is seen as Gemini's would be.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { MEALS, SUPPLEMENTS, TODAY, open, vision, withPrefs } from './helpers';

const VIDEO = !!process.env.TASK_VIDEO;

function walk(page: Page) {
  const r = { taps: 0, chars: 0, t0: 0 };
  return {
    r,
    async tap(target: string | Locator) {
      if (!r.taps) r.t0 = Date.now();
      r.taps++;
      await (typeof target === 'string' ? page.getByTestId(target) : target).click();
    },
    async type(testid: string, text: string) {
      r.chars += text.length;
      await page.getByTestId(testid).fill(text);
    },
    report(task: string) {
      const app = (Date.now() - r.t0) / 1000;
      console.log(JSON.stringify({ task, taps: r.taps, chars: r.chars, appS: +app.toFixed(1), totalS: +(app + r.taps * 1.75 + r.chars * 0.3).toFixed(1) }));
    },
  };
}
const hero = (page: Page) => page.getByTestId('hero-value');
const slowVision = (page: Page) => VIDEO && page.route('**/api/analyze', async (route) => { await new Promise((ok) => setTimeout(ok, 3000)); await route.continue(); });
// a breath at the end so the video shows where the task landed
const settle = (page: Page) => page.waitForTimeout(VIDEO ? 1200 : 0);

for (const theme of VIDEO ? (['light', 'dark'] as const) : (['light'] as const)) {
  test.describe(theme, () => {
    test.use({ colorScheme: theme });

    test('photo', async ({ page }) => {
      await withPrefs(page, { photoOk: true });
      const s = await open(page);
      await vision(page, s, { fixture: 'basil-pork' });
      await slowVision(page);
      const w = walk(page);
      await w.tap('add');
      const chooser = page.waitForEvent('filechooser');
      await w.tap('add-photo');
      await (await chooser).setFiles('tests/fixtures/meal.jpg');
      await w.tap('review-add');
      await expect(page.getByTestId('meal')).toHaveCount(1);
      w.report('photo');
      await settle(page);
    });

    test('scan', async ({ page }) => {
      // WebKit has no camera here: the number is typed, as on a phone whose camera cannot open
      await page.addInitScript(() => Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(new DOMException('camera', 'NotFoundError')) } }));
      await open(page);
      const w = walk(page);
      await w.tap('add');
      await w.tap('add-scan');
      await w.type('barcode-field', '8850987101021');
      await w.tap('barcode-find');
      await w.tap('product-add');
      await expect(hero(page)).toHaveText('260');
      w.report('scan');
      await settle(page);
    });

    test('search', async ({ page }) => {
      await open(page);
      const w = walk(page);
      await w.tap('add');
      await w.tap('add-search');
      await w.type('search-field', 'banana');
      await w.tap(page.getByTestId('result').first());
      await w.tap('search-add');
      await expect(page.getByTestId('meal')).toHaveCount(1);
      w.report('search');
      await settle(page);
    });

    test('describe', async ({ page }) => {
      const s = await open(page);
      await vision(page, s, { fixture: 'oats-banana' });
      await slowVision(page);
      const w = walk(page);
      await w.tap('add');
      await w.tap('add-describe');
      await w.type('describe-text', 'Oats with a banana and a glass of milk');
      await w.tap('describe-analyse');
      await w.tap('review-add');
      await expect(hero(page)).toHaveText('454');
      w.report('describe');
      await settle(page);
    });

    test('quick add', async ({ page }) => {
      await open(page);
      const w = walk(page);
      await w.tap('add');
      await w.tap('add-quick');
      await w.type('quick-kcal', '450');
      await w.tap('quick-add');
      await expect(hero(page)).toHaveText('450');
      w.report('quick add');
      await settle(page);
    });

    test('a supplement', async ({ page }) => {
      await open(page, '/', SUPPLEMENTS.slice(0, 2));
      const w = walk(page);
      await w.tap('add');
      await w.tap(page.getByTestId('supplement').filter({ hasText: 'Whey' }));
      await w.tap('supplement-add');
      await expect(page.getByTestId('meal')).toHaveCount(1);
      w.report('a supplement');
      await settle(page);
    });

    test('a weigh-in', async ({ page }) => {
      // the last weigh-in is four days old, so Today asks for one
      await open(page, '/', [{ collection: 'weight', id: `weight:${TODAY}`, updatedAt: 2, deleted: true, data: { date: TODAY, kg: 60 } }, { collection: 'weight', id: 'weight:2026-11-07', updatedAt: 1, data: { date: '2026-11-07', kg: 60.4 } }]);
      const w = walk(page);
      await w.tap('weigh-open');
      // one flick of the tenths column, as a keyboard press here
      const tenths = page.getByTestId('picker-wheel').getByRole('slider').nth(1);
      w.r.taps++;
      await tenths.focus();
      await page.keyboard.press('ArrowUp');
      await w.tap('picker-save');
      await expect(page.getByTestId('weigh-card')).toHaveCount(0);
      w.report('a weigh-in');
      await settle(page);
    });

    test('a session done', async ({ page }) => {
      await open(page, '/', MEALS);
      const w = walk(page);
      await w.tap(page.getByTestId('training').getByTestId('session-done'));
      await expect(page.getByTestId('training')).toContainText('Done');
      w.report('a session done');
      await settle(page);
    });
  });
}
