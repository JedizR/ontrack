// Visual review: every screen in its main states -> screenshots/<screen>/<state>-<theme>-<device>.png
//   pnpm screenshots -- --grep "shell"
import { expect, test, type Page } from '@playwright/test';
import { EMAIL, MEALS, SUPPLEMENTS, TODAY, fieldFill, onboard, open, openFresh, openSeeded, seedAccount, signIn, takePhoto, vision, wheelType, withPrefs } from './helpers';
import { openMap, quietTiles, raise, scene } from './social';

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
        await expect(page.getByTestId('tab-progress')).toBeVisible();
        await shot(page, 'shell', 'progress');
        // Progress's training card with no sessions planned (the plan began today, so clearing the program clears today)
        await page.evaluate(() => (window as unknown as { ontrack: { actions: { saveProgram(p: object): void } } }).ontrack.actions.saveProgram({ name: '', sessions: [] }));
        await page.getByTestId('progress-training').evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 60));
        await expect(page.getByTestId('progress-training')).toContainText('Plan your week');
        await shot(page, 'progress', 'training-empty');
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
        await page.getByTestId('landing-signin').click();
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

      // SCREENS.md section 3, the landing page (L1): the first view after the hero's entrance, each view as a visitor
      // scrolls, and the whole page once everything has played
      test('landing', async ({ page }) => {
        test.slow(); // about twenty views on the SE
        await openFresh(page);
        await page.waitForTimeout(2600);
        await shot(page, 'landing', 'scroll-00');
        const step = Math.round(d.height * 0.85);
        const total = await page.evaluate(() => document.documentElement.scrollHeight);
        for (let y = step, i = 1; y < total; y += step, i++) {
          await page.evaluate((y) => scrollTo(0, y), y);
          await page.waitForTimeout(600);
          await shot(page, 'landing', `scroll-${String(i).padStart(2, '0')}`);
        }
        await page.screenshot({ path: `screenshots/landing/full-${theme}-${d.name}.png`, fullPage: true });
      });

      // S1b: the landing's 04 Friends section whole, at rest (reduced motion shows each reveal's end state)
      test('landing friends', async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await openFresh(page);
        const section = page.getByTestId('landing-friends');
        await section.scrollIntoViewIfNeeded();
        await expect(section.locator('img')).toHaveJSProperty('complete', true);
        await section.screenshot({ path: `screenshots/landing/friends-${theme}-${d.name}.png` });
      });

      // SCREENS.md section 4: every question and its guardrail screens, Your plan
      test('onboarding', async ({ page }) => {
        const go = (id: string) => page.getByTestId(id).click();
        const at = async (id: string, state: string) => { await page.getByTestId(id).waitFor(); await shot(page, 'onboarding', state); };
        await openFresh(page);
        await go('landing-start');
        await at('step-goal', 'goal');
        await go('goal-more');
        await go('choice-recomp');
        await at('step-goal', 'goal-more-picked');
        await go('choice-lose'); await go('continue');
        await at('step-screening', 'screening');
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
        await go('screen-eatingDisorder');
        await go('screen-none'); await go('continue');
        await at('step-sex', 'sex');
        await go('choice-female'); await go('continue');
        await at('step-born', 'born');
        await wheelType(page, 'wheel-year', '2012');
        await go('continue');
        await at('step-young', 'young');
        await go('back');
        await wheelType(page, 'wheel-year', '1994');
        await go('continue');
        await page.getByRole('radio', { name: 'Metric' }).click();
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
        await at('step-move', 'move-picked');
        await go('continue');
        await at('step-days', 'days');
        await go('days-3'); await go('continue');
        await at('step-kind', 'kind');
        await go('choice-lifting'); await go('continue');
        // straight away: the screen is gone 2.15 s after it opens
        await page.getByTestId('build-row').nth(1).and(page.locator('[data-done="true"]')).waitFor();
        await page.screenshot({ path: `screenshots/onboarding/building-${theme}-${d.name}.png` });
        await at('your-plan', 'plan-lose');
        await page.getByTestId('plan-pace').getByRole('radio', { name: 'Faster' }).click();
        await shot(page, 'onboarding', 'plan-lose-faster');
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
        await onboard(page, { goal: 'gain', weight: '48' });
        await page.getByTestId('back').click();
        await page.getByTestId('step-experience').waitFor();
        await shot(page, 'onboarding', 'experience');
        await page.getByTestId('choice-beginner').click();
        await page.getByTestId('continue').click();
        await page.getByTestId('your-plan').waitFor();
        await shot(page, 'onboarding', 'plan-gain-doctor');
        await page.getByTestId('plan-pace').getByRole('radio', { name: 'Faster' }).click();
        await page.getByTestId('pace-faster').scrollIntoViewIfNeeded();
        await shot(page, 'onboarding', 'plan-gain-faster');
        await page.screenshot({ path: `screenshots/onboarding/plan-gain-full-${theme}-${d.name}.png`, fullPage: true });
        await page.getByTestId('tune-goalweight').click();
        await wheelType(page, 'picker-wheel', '50');
        await shot(page, 'onboarding', 'plan-goal-weight-refused');
      });

      // SCREENS.md sections 6 and 7: Today empty, typical and on a past day, then every logging sheet
      test('today', async ({ page }) => {
        test.slow(); // every logging sheet in turn: past 30 s on CI
        const sheet = async (id: string, state: string) => {
          await expect(page.getByTestId(id)).toHaveCSS('transform', 'none');
          await shot(page, 'today', state);
        };
        await open(page, '/', [...MEALS, { collection: 'weight', id: `weight:${TODAY}`, updatedAt: 2, deleted: true, data: { date: TODAY, kg: 60 } }]);
        await shot(page, 'today', 'typical');
        await page.evaluate(() => scrollTo(0, document.body.scrollHeight));
        await shot(page, 'today', 'typical-end');
        await page.evaluate(() => scrollTo(0, 0));
        await page.getByTestId('weigh-open').click();
        await sheet('picker', 'weigh');
        await page.keyboard.press('Escape');
        await page.getByTestId('picker').waitFor({ state: 'detached' });
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

      // SCREENS.md section 4, after onboarding (O1): Today's Getting started card on the day the plan was saved
      test('today first day', async ({ page }) => {
        await withPrefs(page, { firstDay: TODAY });
        await open(page);
        await page.getByTestId('first-day').waitFor();
        await shot(page, 'today', 'first-day');
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

        // a hybrid (F20): the two templates with cardio, the week, and the lifting and cardio points with a source open
        await page.evaluate(() => scrollTo(0, 0));
        await page.getByTestId('train-change').click();
        await settled('templates-sheet');
        await page.getByTestId('template-full-body-cardio-3').scrollIntoViewIfNeeded();
        await shot(page, 'train', 'templates-hybrid');
        await page.getByTestId('template-full-body-cardio-3').getByTestId('template-use').click();
        await settled('template-confirm-sheet');
        await page.getByTestId('template-confirm').click();
        await page.getByTestId('templates-sheet').waitFor({ state: 'detached' });
        await page.locator('[data-sonner-toast]').waitFor({ state: 'detached', timeout: 10_000 }); // the Undo toast
        await top('train-week');
        await shot(page, 'train', 'hybrid-week');
        await top('train-hybrid');
        await page.getByTestId('train-hybrid').getByTestId('rec-why').nth(1).click();
        await shot(page, 'train', 'hybrid');

        await page.evaluate(() => (window as unknown as { ontrack: { actions: { saveProgram(p: object): void } } }).ontrack.actions.saveProgram({ name: '', sessions: [] }));
        await page.evaluate(() => scrollTo(0, 0));
        await shot(page, 'train', 'empty');
      });

      // SCREENS.md section 7, photo logging: the first photo notice, the review loading and loaded, the oil control,
      // the logged meal with its thumbnail, two errors, and Describe
      test('thai', async ({ page }) => {
        const settled = (id: string) => expect(page.getByTestId(id)).toHaveCSS('transform', 'none');
        const searchFor = async (q: string) => {
          await page.getByTestId('add').click();
          await page.getByTestId('add-search').click();
          await page.getByTestId('search-field').fill(q);
          await expect(page.getByTestId('result').first()).toBeVisible();
          await settled('search-sheet');
        };
        const row = () => page.getByTestId('meal-item').first();
        await withPrefs(page, { photoOk: true });
        const s = await open(page);
        await searchFor('ก๋วยเตี๋ยว');
        await shot(page, 'thai', 'search-thai-script');
        await page.getByTestId('search-field').fill('ข้าวมันไก่');
        await page.getByTestId('result').first().click();
        await shot(page, 'thai', 'search-portion');
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('search-sheet')).toBeHidden();

        await vision(page, s, { fixture: 'pad-thai' });
        await takePhoto(page);
        await expect(page.getByTestId('meal-item')).toHaveCount(2);
        await settled('review-sheet');
        await shot(page, 'thai', 'review');
        await row().locator('button[aria-expanded]').click();
        await row().getByTestId('item-correct-open').click();
        const kcal = row().getByTestId('correct-kcal').getByRole('textbox');
        await kcal.fill('600');
        await kcal.press('Enter');
        await row().getByTestId('item-correct').scrollIntoViewIfNeeded();
        await shot(page, 'thai', 'review-correct');
        await page.getByTestId('review-add').click();
        await expect(page.getByTestId('review-sheet')).toBeHidden();
        await expect(page.getByRole('button', { name: 'Undo' })).toBeHidden({ timeout: 8000 });

        await takePhoto(page);
        await expect(row()).toContainText('Yours');
        await settled('review-sheet');
        await row().locator('button[aria-expanded]').click();
        await row().getByTestId('item-default').scrollIntoViewIfNeeded();
        await shot(page, 'thai', 'review-yours');
        await page.keyboard.press('Escape');
        await expect(page.getByTestId('review-sheet')).toBeHidden();
        await searchFor('pad thai with shrimp');
        await page.getByTestId('result').first().click();
        await shot(page, 'thai', 'search-yours');
      });

      // SCREENS.md sections 6 and 7, supplements (N2): the entry, the kinds, the label (a preset, no calories, the error),
      // the Add sheet with supplements, the amount with milk, taken, an entry in edit mode, the milk not loaded, and Today
      const supplementSheet = (page: Page) => ({
        settled: () => expect(page.getByTestId('supplement-sheet')).toHaveCSS('transform', 'none'),
        close: async () => { await page.keyboard.press('Escape'); await expect(page.getByTestId('supplement-sheet')).toBeHidden(); },
      });
      test('supplements setup', async ({ page }) => {
        const { settled, close } = supplementSheet(page);
        const typeIn = async (id: string, v: string) => { const f = page.getByTestId(id).getByRole('textbox'); await f.fill(v); await f.press('Enter'); };
        await open(page);
        await page.getByTestId('add').click();
        await expect(page.getByTestId('add-sheet')).toHaveCSS('transform', 'none');
        await shot(page, 'supplements', 'add-entry');
        await page.getByTestId('supplement-entry').click();
        await settled();
        await shot(page, 'supplements', 'kinds');
        await page.getByTestId('kind-whey').click();
        await expect(page.getByTestId('supplement-source')).toBeVisible();
        await shot(page, 'supplements', 'source-whey');
        await page.getByTestId('tub-typical').click();
        await expect(page.getByTestId('supplement-label')).toBeVisible();
        await shot(page, 'supplements', 'label-whey');
        await page.getByTestId('supplement-save').click();
        await expect(page.getByTestId('supplement-typical')).toBeVisible();
        await shot(page, 'supplements', 'amount-typical');
        await page.getByTestId('supplement-edit').click();
        await typeIn('supplement-protein', '40');
        await page.getByTestId('supplement-heavy').scrollIntoViewIfNeeded();
        await shot(page, 'supplements', 'label-heavy');
        await close();
        await page.getByTestId('add').click();
        await expect(page.getByTestId('add-sheet')).toHaveCSS('transform', 'none');
        await shot(page, 'supplements', 'add-typical');
        await page.getByTestId('supplement-new').click();
        await page.getByTestId('kind-creatine').click();
        await page.getByTestId('tub-type').click();
        await page.getByTestId('supplement-zero').scrollIntoViewIfNeeded();
        await shot(page, 'supplements', 'label-creatine');
        await close();
      });

      test('supplements logged', async ({ page }) => {
        const { settled, close } = supplementSheet(page);
        await open(page, '/', [...MEALS, ...SUPPLEMENTS]);
        await expect(page.getByTestId('meals')).toHaveCSS('opacity', '1'); // the first paint's fade has finished
        await shot(page, 'supplements', 'today');
        await page.getByTestId('taken').scrollIntoViewIfNeeded();
        await shot(page, 'supplements', 'today-taken');
        await page.getByTestId('add').click();
        await expect(page.getByTestId('add-sheet')).toHaveCSS('transform', 'none');
        await expect(page.getByTestId('supplement').filter({ hasText: 'Whey' })).toContainText('393');
        await shot(page, 'supplements', 'add');
        await page.getByTestId('supplement').filter({ hasText: 'Whey' }).click();
        await settled();
        await expect(page.getByTestId('supplement-milk')).toBeVisible();
        await shot(page, 'supplements', 'amount-milk');
        await page.getByTestId('supplement-edit').click();
        await shot(page, 'supplements', 'label-edit');
        await close();
        await page.getByTestId('add').click();
        await page.getByTestId('supplement').filter({ hasText: 'Creatine' }).click();
        await settled();
        await shot(page, 'supplements', 'amount-taken');
        await close();
        await page.getByTestId('meal').filter({ hasText: 'Whey protein' }).getByRole('button').first().click();
        await settled();
        await shot(page, 'supplements', 'edit');
        await close();
      });

      // the milk values not loaded: water still works
      test('supplements milk not loaded', async ({ page }) => {
        const { settled } = supplementSheet(page);
        await page.route('**/foods.json*', (r) => r.abort());
        await open(page, '/', SUPPLEMENTS);
        await page.getByTestId('add').click();
        await page.getByTestId('supplement').filter({ hasText: 'Whey' }).click();
        await expect(page.getByText('The milk values did not load. Water still works.')).toBeVisible();
        await settled();
        await shot(page, 'supplements', 'milk-failed');
      });

      // SCREENS.md section 7, Scan sheet (B1): the Add sheet, the camera, typing (no camera, denied, wrong digits),
      // finding, a product from Open Food Facts, a new product, reading the label and its errors, the Label step and its
      // problem, a product read from its label, lookup offline, and the scanned row on Today
      test('scan', async ({ page, context }) => {
        test.slow(); // seventeen shots and five flows: past the default 30 s on CI's shared runners
        const settled = () => expect(page.getByTestId('scan-sheet')).toHaveCSS('transform', 'none');
        const close = async () => { await page.keyboard.press('Escape'); await expect(page.getByTestId('scan-sheet')).toBeHidden(); };
        const typeIn = async (id: string, v: string) => { const f = page.getByTestId(id).getByRole('textbox'); await f.fill(v); await f.press('Enter'); };
        // a camera that shows a plain grey scene, so the viewfinder is live and reads nothing; then none at all. A reader
        // that finds nothing keeps the shot off the WebAssembly (camera.spec.ts and the unit tests cover that)
        await page.addInitScript(() => {
          const w = window as unknown as { cameraError?: string; BarcodeDetector?: unknown };
          w.BarcodeDetector = class { static async getSupportedFormats() { return ['ean_13', 'ean_8', 'upc_a', 'upc_e']; } async detect() { return []; } };
          Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
            if (w.cameraError) throw new DOMException('camera', w.cameraError);
            const c = Object.assign(document.createElement('canvas'), { width: 640, height: 480 });
            const g = c.getContext('2d')!;
            g.fillStyle = '#8a8378';
            g.fillRect(0, 0, 640, 480);
            setInterval(() => g.fillRect(0, 0, 1, 1), 100);
            return c.captureStream(10);
          } } });
        });
        const s = await open(page);
        await page.getByTestId('add').click();
        await expect(page.getByTestId('add-sheet')).toHaveCSS('transform', 'none');
        await shot(page, 'scan', 'add');
        await page.getByTestId('add-scan').click();
        await settled();
        await expect(page.getByTestId('scanner-hint')).toHaveText('Hold the barcode inside the frame. It reads by itself.', { timeout: 15_000 });
        await shot(page, 'scan', 'camera');
        await page.getByTestId('scanner-type').click();
        await page.getByTestId('barcode-field').fill('8850987101022');
        await page.getByTestId('barcode-find').click();
        await shot(page, 'scan', 'type-wrong');
        // back from typing brings the camera back
        await page.getByTestId('sheet-back').click();
        await expect(page.getByTestId('scanner-hint')).toHaveText('Hold the barcode inside the frame. It reads by itself.', { timeout: 15_000 });
        await close();
        await page.evaluate(() => { (window as unknown as { cameraError?: string }).cameraError = 'NotAllowedError'; });
        await page.getByTestId('add').click();
        await page.getByTestId('add-scan').click();
        await settled();
        await expect(page.getByTestId('scanner-problem')).toBeVisible();
        await shot(page, 'scan', 'type-denied');

        // finding, held, then a product from Open Food Facts
        let release = () => {};
        const held = new Promise<void>((r) => (release = r));
        await page.route('**/__mock/off/**', async (route) => { await held; await route.continue(); });
        await page.getByTestId('barcode-field').fill('8850987101021');
        await page.getByTestId('barcode-find').click();
        await expect(page.getByText('Finding the product')).toBeVisible();
        await shot(page, 'scan', 'finding');
        release();
        await expect(page.getByTestId('product')).toBeVisible();
        await page.unroute('**/__mock/off/**');
        await shot(page, 'scan', 'product-off');
        await page.getByTestId('product-cite').scrollIntoViewIfNeeded();
        await shot(page, 'scan', 'product-off-end');
        await close();

        // a new product, its label read (held), then the Label step and a product from its label
        await page.getByTestId('add').click();
        await page.getByTestId('add-scan').click();
        await page.getByTestId('barcode-field').fill('8850999220017');
        await page.getByTestId('barcode-find').click();
        await expect(page.getByTestId('product-new')).toBeVisible();
        await settled();
        await shot(page, 'scan', 'new');
        let readIt = () => {};
        const reading = new Promise<void>((r) => (readIt = r));
        await page.route('**/api/analyze', async (route) => { await reading; await route.continue(); });
        await page.getByTestId('label-photo').click();
        await expect(page.getByTestId('photo-notice')).toBeVisible();
        await settled();
        await shot(page, 'scan', 'notice');
        const chooser = page.waitForEvent('filechooser');
        await page.getByTestId('photo-continue').click();
        await (await chooser).setFiles('tests/fixtures/meal.jpg');
        await expect(page.getByText('Reading the label')).toBeVisible();
        await shot(page, 'scan', 'reading');
        readIt();
        await expect(page.getByTestId('label')).toBeVisible();
        await page.unroute('**/api/analyze');
        await shot(page, 'scan', 'label');
        await typeIn('label-protein', '30');
        await page.getByTestId('label-problem').scrollIntoViewIfNeeded();
        await shot(page, 'scan', 'label-heavy');
        await typeIn('label-protein', '2');
        await page.getByTestId('label-save').click();
        await expect(page.getByTestId('product-source')).toHaveText('Label');
        await shot(page, 'scan', 'product-label');
        await page.getByTestId('product-add').click();
        await expect(page.getByTestId('scan-sheet')).toBeHidden();
        await expect(page.getByTestId('meals')).toHaveCSS('opacity', '1');
        await shot(page, 'scan', 'today');

        // a label photo that is not one
        await vision(page, s, { fixture: 'not-label' });
        await page.getByTestId('add').click();
        await page.getByTestId('add-scan').click();
        await page.getByTestId('barcode-field').fill('8851234567898');
        await page.getByTestId('barcode-find').click();
        await expect(page.getByTestId('product-new')).toBeVisible();
        const again = page.waitForEvent('filechooser');
        await page.getByTestId('label-photo').click();
        await (await again).setFiles('tests/fixtures/meal.jpg');
        await expect(page.getByTestId('label-failed')).toBeVisible();
        await settled();
        await shot(page, 'scan', 'read-failed');
        await close();

        // offline: a barcode never scanned
        await context.setOffline(true);
        await page.getByTestId('add').click();
        await page.getByTestId('add-scan').click();
        await page.getByTestId('barcode-field').fill('8851717040016');
        await page.getByTestId('barcode-find').click();
        await expect(page.getByTestId('product-failed')).toBeVisible();
        await settled();
        await shot(page, 'scan', 'offline');
        await context.setOffline(false);
      });

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

      // SCREENS.md sections 9 and 10 on the seeder's vector F account: Today's check-in card, the three steps, Progress
      // from the top down and History; then the adherence step and a stored check-in. shell shoots Progress with too little data
      test('progress', async ({ page }) => {
        test.slow();
        const settled = (id: string) => expect(page.getByTestId(id)).toHaveCSS('transform', 'none');
        const top = (id: string) => page.getByTestId(id).evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 60));
        await openSeeded(page, 'raise');
        await expect(page.getByTestId('checkin-open')).toBeVisible();
        await shot(page, 'progress', 'today-card');
        await page.getByTestId('checkin-open').click();
        await settled('checkin-sheet');
        await shot(page, 'progress', 'checkin-numbers');
        await page.getByTestId('checkin-next').click();
        await shot(page, 'progress', 'checkin-meaning');
        await page.getByTestId('checkin-next').click();
        await shot(page, 'progress', 'checkin-proposal');
        await page.keyboard.press('Escape');
        await page.getByTestId('checkin-sheet').waitFor({ state: 'detached' });

        await page.getByTestId('tab-2').click();
        await shot(page, 'progress', 'typical');
        await top('progress-intake');
        await shot(page, 'progress', 'intake');
        await top('progress-training');
        await shot(page, 'progress', 'training');
        await top('progress-checkins');
        await shot(page, 'progress', 'checkins');
        await page.getByTestId('progress-history').click();
        await settled('history-sheet');
        await shot(page, 'progress', 'history');
        await page.keyboard.press('Escape');
        await page.getByTestId('history-sheet').waitFor({ state: 'detached' });
      });

      test('progress adherence', async ({ page }) => {
        const settled = (id: string) => expect(page.getByTestId(id)).toHaveCSS('transform', 'none');
        const top = (id: string) => page.getByTestId(id).evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 60));
        await openSeeded(page, 'adherence');
        await page.getByTestId('checkin-open').click();
        await page.getByTestId('checkin-next').click();
        await settled('checkin-sheet');
        await shot(page, 'progress', 'checkin-adherence');
        await page.getByTestId('checkin-next').click();
        await page.getByTestId('checkin-done').click();
        await page.getByTestId('tab-2').click();
        await top('progress-checkins');
        await shot(page, 'progress', 'checkin-stored');
      });

      // SCREENS.md section 13 (S1b): the map button's badge, the map, the friends panel, search, a pin, a friend, your
      // profile, Share to map in the Review and Meal sheets, and the map offline. E2E_REAL_TILES=1 draws OpenFreeMap's tiles
      test('friends', async ({ page, context }) => {
        test.slow();
        const settled = (id: string) => expect(page.getByTestId(id)).toHaveCSS('transform', 'none');
        const tiles = () => page.waitForTimeout(process.env.E2E_REAL_TILES ? 3000 : 300);
        await context.grantPermissions(['geolocation']);
        await context.setGeolocation({ latitude: 13.7466, longitude: 100.5393 });
        const s = await scene(page);
        await expect(page.getByTestId('friends-badge')).toHaveText('1');
        await shot(page, 'friends', 'today-badge');
        // Share to map in the Review sheet, then the Meal sheet's switch
        await vision(page, s, { fixture: 'basil-pork' });
        await takePhoto(page, true);
        await expect(page.getByTestId('meal-item')).toHaveCount(3);
        await page.getByTestId('review-share-switch').click();
        await page.getByTestId('review-share').scrollIntoViewIfNeeded();
        await settled('review-sheet');
        await shot(page, 'friends', 'review-ask');
        await page.getByTestId('review-share-locate').click();
        await expect(page.getByTestId('review-share-note')).toHaveText('Placed where you are now, rounded to about 100 m.');
        await shot(page, 'friends', 'review-shared');
        await page.getByTestId('review-add').click();
        await expect(page.getByTestId('review-sheet')).toBeHidden();
        await page.getByTestId('meal').first().getByRole('button').click();
        await settled('meal-sheet');
        await page.getByTestId('meal-share').scrollIntoViewIfNeeded();
        await shot(page, 'friends', 'meal-share');
        await page.keyboard.press('Escape');
        await page.getByTestId('meal-sheet').waitFor({ state: 'detached' });
        await expect(page.getByRole('button', { name: 'Undo' })).toBeHidden({ timeout: 8000 });
        await openMap(page);
        await expect(page.getByTestId('pin')).toHaveCount(4);
        await tiles();
        await shot(page, 'friends', 'map');
        await raise(page);
        await shot(page, 'friends', 'panel');
        await page.getByTestId('friend-search').fill('t');
        await expect(page.getByTestId('search-results')).toBeVisible();
        await shot(page, 'friends', 'search');
        await page.getByTestId('friend-search').fill('zz');
        await expect(page.getByTestId('search-none')).toBeVisible();
        await shot(page, 'friends', 'search-none');
        await page.getByTestId('friend-search').fill('');
        await page.getByTestId('friend-list').getByTestId('friend').filter({ hasText: 'Rin' }).click();
        await settled('friend-sheet');
        await shot(page, 'friends', 'friend');
        await page.getByTestId('friend-remove').click();
        await shot(page, 'friends', 'friend-remove');
        await page.keyboard.press('Escape');
        await page.getByTestId('friend-sheet').waitFor({ state: 'detached' });
        await page.getByTestId('friend-list').getByTestId('friend').filter({ hasText: 'Kai' }).click();
        await expect(page.getByTestId('friend-program-hidden')).toBeVisible();
        await settled('friend-sheet');
        await shot(page, 'friends', 'friend-private');
        await page.keyboard.press('Escape');
        await page.getByTestId('friend-sheet').waitFor({ state: 'detached' });
        await page.getByTestId('panel-me').click();
        await settled('profile-sheet');
        await shot(page, 'friends', 'profile');
        await page.keyboard.press('Escape');
        await page.getByTestId('profile-sheet').waitFor({ state: 'detached' });
        await page.getByTestId('map-fit').click();
        await expect(page.getByTestId('friends-panel')).toHaveAttribute('data-raised', 'false');
        await page.getByRole('button', { name: /^Rin, Khao man kai/ }).click();
        await settled('pin-sheet');
        await expect(page.getByTestId('pin-sheet').getByTestId('shared-photo')).toBeVisible();
        await shot(page, 'friends', 'pin');
        await page.keyboard.press('Escape');
        await page.getByTestId('pin-sheet').waitFor({ state: 'detached' });
        // located once already, by the Review sheet: no note this time
        await page.getByTestId('map-locate').click();
        await expect(page.getByTestId('map-here')).toBeVisible();
        await tiles();
        await shot(page, 'friends', 'here');
        await page.getByTestId('map-back').click();


        // no connection
        await context.setOffline(true);
        await page.getByTestId('friends').click();
        await expect(page.getByTestId('map-message')).toBeVisible();
        await shot(page, 'friends', 'offline');
        await context.setOffline(false);
      });

      // a new account's first visit: no profile, nothing shared
      test('friends empty', async ({ page }) => {
        await quietTiles(page);
        await open(page);
        await openMap(page);
        await shot(page, 'friends', 'empty');
        await page.getByTestId('map-locate').click();
        await shot(page, 'friends', 'locate-note');
        await page.getByRole('button', { name: 'Not now' }).click();
        await raise(page);
        await shot(page, 'friends', 'empty-raised');
        await page.getByTestId('panel-setup-open').click();
        await expect(page.getByTestId('profile-sheet')).toHaveCSS('transform', 'none');
        await shot(page, 'friends', 'profile-setup');
      });

      // Today composed from the real components
      test('today composed', async ({ page }) => {
        await open(page, '/gallery/today');
        await shot(page, 'today', 'composed');
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

// the landing page on a desktop browser (L1): the first view, each view as it scrolls, and the whole page
for (const theme of ['light', 'dark'] as const) {
  test.describe(`${theme} desktop`, () => {
    test.use({ colorScheme: theme, viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false });
    test('landing on a desktop', async ({ page }) => {
      test.slow();
      await openFresh(page);
      await page.waitForTimeout(2600);
      await page.screenshot({ path: `screenshots/landing/scroll-00-${theme}-desktop.png` });
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 680, i = 1; y < total; y += 680, i++) {
        await page.evaluate((y) => scrollTo(0, y), y);
        await page.waitForTimeout(1000);
        await page.screenshot({ path: `screenshots/landing/scroll-${String(i).padStart(2, '0')}-${theme}-desktop.png` });
      }
      await page.screenshot({ path: `screenshots/landing/full-${theme}-desktop.png`, fullPage: true });
    });
  });
}
