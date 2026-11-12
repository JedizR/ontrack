// Visual review: every screen in its main states -> screenshots/<screen>/<state>-<theme>-<device>.png
//   pnpm screenshots -- --grep "shell"
import { expect, test, type Page } from '@playwright/test';
import { EMAIL, MEALS, TODAY, fieldFill, onboard, open, openFresh, seedAccount, signIn, takePhoto, vision, wheelType, withPrefs } from './helpers';

const SECTIONS = ['prefs', 'buttons', 'track', 'hero', 'rows', 'chips', 'sheets', 'wheel', 'week', 'feedback', 'states'];

// Safari with its toolbars showing on a 390 by 844 phone, the SE and the Pro Max
const DEVICES = [
  { name: '390', width: 390, height: 664 },
  { name: 'se', width: 375, height: 548 },
  { name: 'promax', width: 430, height: 739 },
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

        await page.getByRole('button', { name: 'Open the wheel sheet' }).click();
        await expect(page.getByTestId('picker')).toHaveCSS('transform', 'none');
        await shot(page, 'gallery', 'wheel-sheet');
        await page.getByTestId('picker-wheel').locator('[data-selected]').first().click();
        await shot(page, 'gallery', 'wheel-typing');
        await page.keyboard.press('Escape');
        await page.getByTestId('picker-save').click();
        await page.getByTestId('picker').waitFor({ state: 'detached' });

        await at('feedback');
        await page.getByRole('button', { name: 'Show an undo toast' }).click();
        await shot(page, 'gallery', 'toast-undo');
      });

      // SCREENS.md sections 5, 11 (account) and 12 (session expired, first load)
      test('signin', async ({ page }) => {
        const s = await seedAccount(page, { signedIn: false });
        await openFresh(page, s);
        await page.getByTestId('welcome-signin').click();
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
        const s = await seedAccount(page, { signedIn: false });
        // hold the first pull so the first load state stays on screen
        await page.route('**/__mock/pull', () => {});
        await openFresh(page, s);
        await signIn(page, EMAIL, { shell: false });
        await page.getByTestId('bringing').waitFor();
        await shot(page, 'today', 'bringing');
      });

      // SCREENS.md sections 3 and 4: Welcome, every question and its guardrail screens, Your plan
      test('onboarding', async ({ page }) => {
        const go = (id: string) => page.getByTestId(id).click();
        const at = async (id: string, state: string) => { await page.getByTestId(id).waitFor(); await shot(page, 'onboarding', state); };
        await openFresh(page);
        await at('welcome', 'welcome');
        await go('welcome-start');
        await at('step-goal', 'goal');
        await go('choice-lose');
        await go('screen-medical');
        await at('step-screening', 'screening-ticked');
        await go('continue');
        await at('step-advice', 'advice');
        await go('back');
        await go('screen-medical');
        await go('screen-eatingDisorder');
        await go('continue');
        await at('step-advice', 'advice-eating-disorder');
        await go('back');
        await go('screen-none');
        await go('continue');
        await at('step-sex', 'sex');
        await go('choice-female');
        await at('step-born', 'born');
        await wheelType(page, 'wheel-year', '2012');
        await go('continue');
        await at('step-young', 'young');
        await go('back');
        await wheelType(page, 'wheel-year', '1994');
        await go('continue');
        await at('step-body', 'body-start');
        await wheelType(page, 'wheel-height', '165');
        await wheelType(page, 'wheel-weight', '82');
        await at('step-body', 'body-filled');
        await page.getByRole('radio', { name: 'Imperial' }).click();
        await at('step-body', 'body-imperial');
        await page.getByRole('radio', { name: 'Metric' }).click();
        await go('continue');
        await at('step-move', 'move');
        await go('choice-light');
        await at('step-train', 'train');
        await go('train-choose');
        await page.getByTestId('templates-sheet').waitFor();
        await shot(page, 'onboarding', 'templates');
        await page.keyboard.press('Escape');
        await page.getByTestId('templates-sheet').waitFor({ state: 'detached' });
        await go('continue');
        await at('step-experience', 'experience');
        await go('choice-beginner');
        await at('step-pace', 'pace-lose');
        await go('choice-0.75');
        await at('your-plan', 'plan-lose');
        await page.screenshot({ path: `screenshots/onboarding/plan-lose-full-${theme}-${d.name}.png`, fullPage: true });
        await go('line-goal');
        await page.getByTestId('plan-breakdown').scrollIntoViewIfNeeded();
        await shot(page, 'onboarding', 'plan-source-open');
        await go('plan-save');
        await page.getByTestId('signin-sheet').waitFor();
        await shot(page, 'onboarding', 'save-signin');
      });

      test('onboarding gain', async ({ page }) => {
        await openFresh(page);
        await onboard(page, { goal: 'gain', weight: '48', train: 4 });
        await page.getByTestId('back').click();
        await page.getByTestId('step-pace').waitFor();
        await shot(page, 'onboarding', 'pace-gain');
        await page.getByTestId('continue').click();
        await page.getByTestId('your-plan').waitFor();
        await shot(page, 'onboarding', 'plan-gain-doctor');
        await page.screenshot({ path: `screenshots/onboarding/plan-gain-full-${theme}-${d.name}.png`, fullPage: true });
        await page.getByTestId('tune-goalweight').click();
        await wheelType(page, 'picker-wheel', '50');
        await shot(page, 'onboarding', 'plan-goal-weight-refused');
      });

      // SCREENS.md sections 6 and 7: Today empty, typical and on a past day, then every logging sheet
      test('today', async ({ page }) => {
        const sheet = async (id: string, state: string) => {
          await expect(page.getByTestId(id)).toHaveCSS('transform', 'none');
          await shot(page, 'today', state);
        };
        await open(page, '/', [...MEALS, { collection: 'weight', id: `weight:${TODAY}`, updatedAt: 2, deleted: true, data: { date: TODAY, kg: 60 } }]);
        await shot(page, 'today', 'typical');
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        await shot(page, 'today', 'typical-end');
        await page.evaluate(() => scrollTo(0, 0));
        await page.getByTestId('session-done').click();
        await page.getByTestId('week').getByRole('button', { name: /November 10/ }).click();
        await shot(page, 'today', 'past-day');
        await page.getByTestId('week').getByRole('button', { name: /November 8/ }).click();
        await shot(page, 'today', 'empty-day');
        await page.getByRole('button', { name: 'Back to today' }).click();

        await page.getByTestId('hero-open').click();
        await sheet('how-sheet', 'how');
        await page.keyboard.press('Escape');
        await page.getByTestId('add').click();
        await sheet('add-sheet', 'add');
        await page.getByTestId('add-search').click();
        await sheet('search-sheet', 'search-recent');
        await page.getByTestId('search-field').fill('chicken');
        await shot(page, 'today', 'search-results');
        await page.getByTestId('result').first().click();
        await shot(page, 'today', 'search-portion');
        await page.keyboard.press('Escape');
        await page.getByTestId('search-sheet').waitFor({ state: 'detached' });

        await page.getByTestId('add').click();
        await page.getByTestId('add-quick').click();
        await fieldFill(page, 'quick-kcal', '350');
        await fieldFill(page, 'quick-fat', '12');
        await sheet('quick-sheet', 'quick');
        await page.keyboard.press('Escape');
        await page.getByTestId('quick-sheet').waitFor({ state: 'detached' });

        await page.getByTestId('meal').filter({ hasText: 'Chicken rice bowl' }).getByRole('button').click();
        await sheet('meal-sheet', 'meal');
        await page.getByTestId('meal-item').first().getByRole('button').first().click();
        await shot(page, 'today', 'meal-item-open');
        await page.keyboard.press('Escape');
        await page.getByTestId('meal-sheet').waitFor({ state: 'detached' });

        await page.getByTestId('session-undo').click();
        await page.getByTestId('session-more').click();
        await sheet('session-sheet', 'session-menu');
      });

      // SCREENS.md section 8, Train: no exercises listed, the Session sheet and picker, recommendations with a source,
      // Templates and the confirm, a template's analysis, and no program at all
      test('train', async ({ page }) => {
        const settled = (id: string) => expect(page.getByTestId(id)).toHaveCSS('transform', 'none');
        const top = (id: string) => page.getByTestId(id).evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 60));
        await open(page);
        await page.getByTestId('tab-1').click();
        await shot(page, 'train', 'no-exercises');
        await page.getByTestId('train-session').first().click();
        await settled('train-session-sheet');
        await shot(page, 'train', 'session');
        await page.getByTestId('exercise-add').click();
        await settled('exercise-picker');
        await shot(page, 'train', 'picker');
        await page.getByTestId('exercise-option').filter({ hasText: 'Bench press' }).first().click();
        await page.getByTestId('exercise-picker').waitFor({ state: 'detached' });
        await page.getByTestId('session-exercise').scrollIntoViewIfNeeded();
        await shot(page, 'train', 'session-exercise');
        await page.getByTestId('session-save').click();
        await page.getByTestId('train-session-sheet').waitFor({ state: 'detached' });
        await top('train-recs');
        await page.getByTestId('rec-why').first().click();
        await shot(page, 'train', 'recommendations');

        await page.evaluate(() => scrollTo(0, 0));
        await page.getByTestId('train-change').click();
        await settled('templates-sheet');
        await shot(page, 'train', 'templates');
        await page.getByTestId('template-upper-lower-4').getByTestId('template-use').click();
        await settled('template-confirm-sheet');
        await shot(page, 'train', 'template-confirm');
        await page.getByTestId('template-confirm').click();
        await page.getByTestId('templates-sheet').waitFor({ state: 'detached' });
        await shot(page, 'train', 'typical');
        await top('train-balance');
        await shot(page, 'train', 'analysis');

        await page.evaluate(() => (window as unknown as { ontrack: { actions: { saveProgram(p: object): void } } }).ontrack.actions.saveProgram({ name: '', sessions: [] }));
        await page.evaluate(() => scrollTo(0, 0));
        await shot(page, 'train', 'empty');
      });

      // SCREENS.md section 7, photo logging: the first photo notice, the review loading and loaded, the oil control,
      // the logged meal with its thumbnail, two errors, and Describe
      test('photo', async ({ page }) => {
        const settled = (id: string) => expect(page.getByTestId(id)).toHaveCSS('transform', 'none');
        const s = await open(page);
        await vision(page, s, { fixture: 'basil-pork' });
        await page.getByTestId('add').click();
        await page.getByTestId('add-photo').click();
        await settled('add-sheet');
        await shot(page, 'photo', 'notice');
        let release = () => {};
        const held = new Promise<void>((r) => (release = r));
        await page.route('**/api/analyze', async (route) => { await held; await route.continue(); });
        const chooser = page.waitForEvent('filechooser');
        await page.getByTestId('photo-continue').click();
        await (await chooser).setFiles('tests/fixtures/meal.jpg');
        await expect(page.getByTestId('review-photo')).toBeVisible();
        await settled('review-sheet');
        await shot(page, 'photo', 'looking');
        release();
        await expect(page.getByTestId('meal-item')).toHaveCount(3);
        await page.unroute('**/api/analyze');
        await shot(page, 'photo', 'review');
        await page.getByRole('radio', { name: '1 tsp' }).click();
        await page.getByTestId('review-oil').scrollIntoViewIfNeeded();
        await shot(page, 'photo', 'review-oil');
        await page.getByTestId('review-add').click();
        await expect(page.getByTestId('thumb')).toBeVisible();
        await shot(page, 'photo', 'today');
        await page.getByTestId('meal').first().getByRole('button').click();
        await settled('meal-sheet');
        await shot(page, 'photo', 'meal');
        await page.keyboard.press('Escape');
        await page.getByTestId('meal-sheet').waitFor({ state: 'detached' });

        await vision(page, s, { fixture: 'not-food' });
        await takePhoto(page);
        await expect(page.getByTestId('review-error')).toBeVisible();
        await shot(page, 'photo', 'not-food');
        await vision(page, s, { fixture: null, used: 40 });
        await page.getByTestId('review-retry').click();
        await expect(page.getByTestId('review-retry')).toBeHidden();
        await shot(page, 'photo', 'limit');
        await page.keyboard.press('Escape');
        await page.getByTestId('review-sheet').waitFor({ state: 'detached' });
        await page.getByTestId('add').click();
        await page.getByTestId('add-describe').click();
        await page.getByTestId('describe-text').fill('Two eggs, toast with butter and a latte');
        await settled('describe-sheet');
        await shot(page, 'photo', 'describe');
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

// the largest text size on the smallest phone: the composed Today, the wheel sheet, and every gallery section
for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} se xl`, () => {
    test.use({ colorScheme: theme, viewport: { width: 375, height: 548 } });
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
      await page.getByRole('button', { name: 'Open the wheel sheet' }).click();
      await page.waitForTimeout(600);
      await page.screenshot({ path: `screenshots/xl/wheel-sheet-${theme}-se.png` });
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
