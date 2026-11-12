// Device and text size matrix: layout checks on every screen.
//   pnpm exec playwright test --project=stress   -> screenshots/stress/<device>/*.png
import { devices, expect, test, type Page } from '@playwright/test';
import { MEALS, keypadEnter, open, signIn, takePhoto, withPrefs } from './helpers';

const DEVICES = [
  // phones in Safari with its toolbars showing: what a browser tab gets
  { name: 'iphone-15-safari', width: 393, height: 659, mobile: true },
  { name: 'iphone-15-pro-max', width: 430, height: 739, mobile: true },
  { name: 'iphone-se', width: 375, height: 548, mobile: true }, // an assumption until the owner's SE reports its own

  { name: 'android-small', width: 360, height: 740, mobile: true },
  { name: 'landscape-phone', width: 852, height: 393, mobile: true },
  { name: 'ipad', width: 768, height: 1024, mobile: true },
  { name: 'desktop', width: 1280, height: 800, mobile: false },
];

/** Elements that stick out of the viewport sideways (ignoring intentional horizontal scrollers). */
const overflow = (page: Page) => page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const bad: string[] = [];
  if (document.documentElement.scrollWidth > vw + 1) bad.push(`page scrollWidth ${document.documentElement.scrollWidth} > ${vw}`);
  for (const el of document.querySelectorAll<HTMLElement>('body *')) {
    const r = el.getBoundingClientRect();
    if (!r.width || r.right <= vw + 1) continue;
    let p: HTMLElement | null = el.parentElement, scroller = false;
    while (p) { if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) { scroller = true; break; } p = p.parentElement; }
    if (!scroller) bad.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} right=${Math.round(r.right)}`);
  }
  return bad.slice(0, 5);
});

/** Visible tap targets smaller than 44 px in either direction. */
const smallTargets = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, a[href], input, [role="radio"], [role="switch"]')]
  .filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0' && (r.width < 43.5 || r.height < 43.5); }) // sub-pixel layout can draw a 44 px box at 43.9
  .map((el) => `${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));

/** Text cut off inside a box (truncate or overflow hidden). */
const clipped = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main *, header *, nav *, [data-vaul-drawer] *, [data-onboarding] *')]
  .filter((el) => el.childElementCount === 0 && (el.textContent ?? '').trim() && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible')
  .map((el) => (el.textContent ?? '').trim().slice(0, 20)));

/** Text spilling out of a button (its box is narrower than its label). */
const spill = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button')]
  .filter((el) => el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1)
  .map((el) => (el.textContent ?? '').trim().slice(0, 20)));

const SCREENS = [['today', 'tab-0'], ['train', 'tab-1'], ['progress', 'tab-2']] as const;
/** pages opened by path: the component gallery and Today composed from it */
const PAGES = [['gallery', '/gallery'], ['today-composed', '/gallery/today']] as const;

async function checkPage(page: Page, name: string, dir: string) {
  expect(await overflow(page), `${name}: horizontal overflow`).toEqual([]);
  const header = page.getByTestId('header');
  if (await header.count()) expect(await header.evaluate((h) => h.scrollWidth - h.clientWidth), `${name}: header`).toBeLessThanOrEqual(1);
  expect(await spill(page), `${name}: text spills out of a control`).toEqual([]);
  expect(await clipped(page), `${name}: clipped text`).toEqual([]);
  expect(await smallTargets(page), `${name}: tap targets under 44 px`).toEqual([]);
  await page.screenshot({ path: `${dir}/${name}.png`, fullPage: true });
}

async function checkAll(page: Page, dir: string) {
  for (const [name, tab] of SCREENS) {
    await page.getByTestId(tab).click();
    await page.waitForTimeout(300);
    await checkPage(page, name, dir);
  }
  for (const [name, path] of PAGES) {
    await open(page, path);
    await checkPage(page, name, dir);
  }
  // the keypad is the tallest sheet: its keys and its main action fit without scrolling
  await open(page, '/gallery');
  await page.getByRole('button', { name: 'Open the keypad' }).click();
  await expect(page.getByTestId('keypad')).toHaveCSS('transform', 'none'); // the sheet has finished sliding up
  await expect(page.getByTestId('keypad-save')).toBeInViewport({ ratio: 1 });
  // portrait only: in landscape (not supported, the manifest locks portrait) the keys scroll under the pinned action
  if (page.viewportSize()!.height > page.viewportSize()!.width) await expect(page.locator('[data-key="00"]')).toBeInViewport({ ratio: 1 });
  expect(await smallTargets(page), 'keypad: tap targets under 44 px').toEqual([]);
  await page.screenshot({ path: `${dir}/keypad.png` });

  // the sign in and account sheets: their main action is on screen without scrolling. Signed out, sign in opens from
  // Welcome; the account in this test's space already has a plan, so signing in lands on Today
  await open(page, '/gallery');
  await page.evaluate(() => {
    localStorage.removeItem('ontrack:mock-session');
    localStorage.setItem('ot-ui', JSON.stringify({ ...JSON.parse(localStorage.getItem('ot-ui') ?? '{}'), lastUser: null }));
  });
  await page.goto('/');
  await page.getByTestId('welcome-signin').click();
  await expect(page.getByTestId('signin-sheet')).toHaveCSS('transform', 'none');
  await expect(page.getByTestId('signin-send')).toBeInViewport({ ratio: 1 });
  await checkPage(page, 'signin', dir);
  await signIn(page);
  await page.getByTestId('avatar').click();
  await expect(page.getByTestId('account-sheet')).toHaveCSS('transform', 'none');
  if (page.viewportSize()!.height > page.viewportSize()!.width) await expect(page.getByTestId('account-delete')).toBeInViewport({ ratio: 1 });
  await checkPage(page, 'account', dir);
}

for (const d of DEVICES) {
  test.describe(d.name, () => {
    test.use({ viewport: { width: d.width, height: d.height }, isMobile: d.mobile, hasTouch: d.mobile, deviceScaleFactor: 2 });
    test('shell layout holds', async ({ page }) => {
      await open(page);
      await checkAll(page, `screenshots/stress/${d.name}`);
    });
  });
}

const PHONES = [
  { name: 'iphone-15-safari', width: 393, height: 659 },
  { name: 'iphone-se', width: 375, height: 548 },
  { name: 'iphone-15-pro-max', width: 430, height: 739 },
];
for (const d of PHONES) {
  for (const fs of ['m', 'l', 'xl'] as const) {
    test.describe(`font ${fs} ${d.name}`, () => {
      test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      test('shell holds at this text size', async ({ page }) => {
        await withPrefs(page, { theme: 'light', fontSize: fs });
        await open(page);
        expect(await page.evaluate(() => document.documentElement.dataset.fs)).toBe(fs);
        await checkAll(page, `screenshots/fonts/${d.name}-${fs}`);
      });
    });
  }
}

/** Every onboarding screen in order, with a check at each. Welcome to Your plan, with the advice, age and sheet stops. */
async function walkOnboarding(page: Page, dir: string) {
  const go = (id: string) => page.getByTestId(id).click();
  const check = async (id: string, name: string) => { await page.getByTestId(id).waitFor(); await page.waitForTimeout(300); await checkPage(page, name, dir); };
  await page.clock.setFixedTime(new Date('2026-11-11T10:00:00+07:00'));
  await page.goto('/');
  await check('welcome', 'welcome');
  await go('welcome-start');
  await check('step-goal', 'goal');
  await go('choice-lose');
  await go('screen-medical');
  await check('step-screening', 'screening');
  await go('continue');
  await check('step-advice', 'advice');
  await go('back');
  await go('screen-none');
  await go('continue');
  await check('step-sex', 'sex');
  await go('choice-female');
  await keypadEnter(page, '2012');
  await check('step-young', 'young');
  await go('back');
  await go('field-year');
  await keypadEnter(page, '1994');
  await page.keyboard.press('Escape');
  await page.getByTestId('keypad').waitFor({ state: 'detached' });
  await go('field-height');
  await keypadEnter(page, '165');
  await keypadEnter(page, '82');
  await check('step-body', 'body');
  await go('continue');
  await check('step-move', 'move');
  await go('choice-light');
  await check('step-train', 'train');
  await go('train-choose');
  await expect(page.getByTestId('templates-sheet')).toHaveCSS('transform', 'none');
  await checkPage(page, 'templates', dir);
  await page.keyboard.press('Escape');
  await page.getByTestId('templates-sheet').waitFor({ state: 'detached' });
  await go('continue');
  await check('step-experience', 'experience');
  await go('choice-beginner');
  await check('step-pace', 'pace');
  await go('choice-0.75');
  await check('your-plan', 'plan');
  // the main action of every step stays on screen
  await expect(page.getByTestId('plan-save')).toBeInViewport({ ratio: 1 });
}

const IPHONE_UA = devices['iPhone 13'].userAgent;
for (const d of DEVICES.filter((x) => x.mobile && x.width < x.height)) {
  test.describe(d.name, () => {
    test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: IPHONE_UA });
    test('onboarding layout holds', async ({ page }) => {
      await walkOnboarding(page, `screenshots/stress/${d.name}/onboarding`);
    });
  });
}
for (const d of PHONES) {
  for (const fs of ['m', 'l', 'xl'] as const) {
    test.describe(`font ${fs} ${d.name}`, () => {
      test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: IPHONE_UA });
      test('onboarding holds at this text size', async ({ page }) => {
        await withPrefs(page, { theme: 'light', fontSize: fs });
        await walkOnboarding(page, `screenshots/fonts/${d.name}-${fs}/onboarding`);
      });
    });
  }
}

/** Today with meals and every logging sheet, with a check at each: the main action is on screen without scrolling. */
async function walkLogging(page: Page, dir: string) {
  const sheet = async (id: string, name: string, action?: string) => {
    await expect(page.getByTestId(id)).toHaveCSS('transform', 'none'); // the sheet has finished sliding up
    if (action && page.viewportSize()!.height > page.viewportSize()!.width) await expect(page.getByTestId(action)).toBeInViewport({ ratio: 1 });
    await checkPage(page, name, dir);
  };
  const close = async (id: string) => {
    await page.keyboard.press('Escape');
    await page.getByTestId(id).waitFor({ state: 'detached' });
  };
  await open(page, '/', MEALS);
  await checkPage(page, 'today-meals', dir);
  await page.getByTestId('add').click();
  await sheet('add-sheet', 'add');
  await page.getByTestId('add-search').click();
  await page.getByTestId('search-field').fill('chicken');
  await sheet('search-sheet', 'search');
  await page.getByTestId('result').first().click();
  await sheet('search-sheet', 'portion', 'search-add');
  await close('search-sheet');
  await page.getByTestId('add').click();
  await page.getByTestId('add-quick').click();
  await keypadEnter(page, '350');
  await sheet('quick-sheet', 'quick', 'quick-add');
  await close('quick-sheet');
  await page.getByTestId('meal').first().getByRole('button').click();
  await sheet('meal-sheet', 'meal', 'meal-save');
  await close('meal-sheet');
  await takePhoto(page, true);
  await expect(page.getByTestId('meal-item').first()).toBeVisible();
  await sheet('review-sheet', 'review', 'review-add');
}
for (const d of DEVICES.filter((x) => x.mobile)) {
  test.describe(d.name, () => {
    test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test('logging layout holds', async ({ page }) => {
      await walkLogging(page, `screenshots/stress/${d.name}/logging`);
    });
  });
}
for (const d of PHONES) {
  test.describe(`font xl ${d.name}`, () => {
    test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test('logging holds at the largest text', async ({ page }) => {
      await withPrefs(page, { theme: 'light', fontSize: 'xl' });
      await walkLogging(page, `screenshots/fonts/${d.name}-xl/logging`);
    });
  });
}

/** Train with a template's analysis, then the Session sheet with an exercise open, the picker, Templates and the confirm. */
async function walkTraining(page: Page, dir: string) {
  const sheet = async (id: string, name: string, action?: string) => {
    await expect(page.getByTestId(id)).toHaveCSS('transform', 'none'); // the sheet has finished sliding up
    if (action && page.viewportSize()!.height > page.viewportSize()!.width) await expect(page.getByTestId(action)).toBeInViewport({ ratio: 1 });
    await checkPage(page, name, dir);
  };
  await open(page);
  await page.getByTestId('tab-1').click();
  await page.getByTestId('train-change').click();
  await sheet('templates-sheet', 'templates');
  await page.getByTestId('template-upper-lower-4').getByTestId('template-use').click();
  await sheet('template-confirm-sheet', 'template-confirm', 'template-confirm');
  await page.getByTestId('template-confirm').click();
  await page.getByTestId('templates-sheet').waitFor({ state: 'detached' });
  await checkPage(page, 'train-analysis', dir);
  await page.getByTestId('train-session').first().click();
  await page.getByTestId('session-exercise').first().getByRole('button').first().click();
  await sheet('train-session-sheet', 'session', 'session-save');
  await page.getByTestId('exercise-add').click();
  await sheet('exercise-picker', 'picker');
}
for (const d of DEVICES.filter((x) => x.mobile)) {
  test.describe(d.name, () => {
    test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test('training layout holds', async ({ page }) => {
      await walkTraining(page, `screenshots/stress/${d.name}/training`);
    });
  });
}
for (const d of PHONES) {
  test.describe(`font xl ${d.name}`, () => {
    test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test('training holds at the largest text', async ({ page }) => {
      await withPrefs(page, { theme: 'light', fontSize: 'xl' });
      await walkTraining(page, `screenshots/fonts/${d.name}-xl/training`);
    });
  });
}
