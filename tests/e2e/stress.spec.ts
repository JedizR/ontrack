// Device and text size matrix: layout checks on every screen.
//   pnpm exec playwright test --project=stress   -> screenshots/stress/<device>/*.png
import { devices, expect, test, type Page } from '@playwright/test';
import { MEALS, SUPPLEMENTS, fieldFill, open, openSeeded, signIn, takePhoto, wheelType, withPrefs } from './helpers';
import { openMap, raise, scene } from './social';

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

/** Visible tap targets smaller than 44 px in either direction. The map's credit line (S1b) is text links, as OpenFreeMap asks. */
const smallTargets = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button, a[href], input, [role="radio"], [role="switch"]')]
  .filter((el) => !el.closest('.maplibregl-ctrl-attrib'))
  .filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0' && (r.width < 43.5 || r.height < 43.5); }) // sub-pixel layout can draw a 44 px box at 43.9
  .map((el) => `${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));

/** Text cut off inside a box (truncate or overflow hidden). */
const clipped = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main *, header *, nav *, [data-vaul-drawer] *, [data-onboarding] *')]
  // screen reader only text is a 1 px box on purpose
  .filter((el) => el.childElementCount === 0 && (el.textContent ?? '').trim() && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible' && !el.closest('.sr-only'))
  .map((el) => (el.textContent ?? '').trim().slice(0, 20)));

/** Text spilling out of a button (its box is narrower than its label). */
const spill = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('button')]
  .filter((el) => el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1)
  .map((el) => (el.textContent ?? '').trim().slice(0, 20)));

const SCREENS = [['today', 'tab-0'], ['train', 'tab-1'], ['progress', 'tab-2']] as const;
/** pages opened by path: the component gallery and Today composed from it */
const PAGES = [['gallery', '/gallery'], ['today-composed', '/gallery/today']] as const;

/** Every finite animation has ended: a lazy tab that loads slowly under load is still sliding in 40 px after a fixed wait. */
const settled = (page: Page) => page.evaluate(() =>
  Promise.all(document.getAnimations().filter((a) => a.effect?.getComputedTiming().endTime !== Infinity).map((a) => a.finished.catch(() => {}))));

async function checkPage(page: Page, name: string, dir: string) {
  await settled(page);
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
  // the wheel sheet: its whole wheel and its main action fit without scrolling
  await open(page, '/gallery');
  await page.getByRole('button', { name: 'Open the wheel sheet' }).click();
  await expect(page.getByTestId('picker')).toHaveCSS('transform', 'none'); // the sheet has finished sliding up
  await expect(page.getByTestId('picker-save')).toBeInViewport({ ratio: 1 });
  // portrait only: in landscape (not supported, the manifest locks portrait) the wheel scrolls under the pinned action
  if (page.viewportSize()!.height > page.viewportSize()!.width) await expect(page.getByTestId('picker-wheel')).toBeInViewport({ ratio: 1 });
  expect(await smallTargets(page), 'wheel sheet: tap targets under 44 px').toEqual([]);
  await page.screenshot({ path: `${dir}/wheel-sheet.png` });

  // the sign in and account sheets: their main action is on screen without scrolling. Signed out, sign in opens from
  // the landing page; the account in this test's space already has a plan, so signing in lands on Today
  await open(page, '/gallery');
  await page.evaluate(() => {
    localStorage.removeItem('ontrack:mock-session');
    localStorage.setItem('ot-ui', JSON.stringify({ ...JSON.parse(localStorage.getItem('ot-ui') ?? '{}'), lastUser: null }));
  });
  // L1: the landing page top to bottom, at rest: reduced motion shows every animation's end state at once
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByTestId('landing')).toBeVisible();
  await checkPage(page, 'landing', dir);
  await page.getByTestId('landing-signin').click();
  await expect(page.getByTestId('signin-sheet')).toHaveCSS('transform', 'none');
  await expect(page.getByTestId('signin-send')).toBeInViewport({ ratio: 1 });
  await checkPage(page, 'signin', dir);
  await signIn(page);
  await page.getByTestId('avatar').click();
  await expect(page.getByTestId('account-sheet')).toHaveCSS('transform', 'none');
  // Settings (M9a) is a long list: its last row, Delete account, is reached by scrolling the sheet
  await page.getByTestId('account-delete').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('account-delete')).toBeInViewport({ ratio: 1 });
  await checkPage(page, 'account', dir);
  // Settings' pages (M9a)
  for (const [testid, name] of [['set-profile', 'settings-profile'], ['set-goal-open', 'settings-goal'], ['set-science', 'settings-science']] as const) {
    await page.getByTestId(testid).click();
    await expect(page.getByTestId('sheet-back')).toBeVisible();
    await checkPage(page, name, dir);
    await page.getByTestId('sheet-back').click();
  }
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

/** Every onboarding screen in order, with a check at each. The landing page's Build your plan to Your plan, with the advice, age and sheet stops. */
async function walkOnboarding(page: Page, dir: string) {
  const go = (id: string) => page.getByTestId(id).click();
  const check = async (id: string, name: string) => { await page.getByTestId(id).waitFor(); await page.waitForTimeout(300); await checkPage(page, name, dir); };
  await page.clock.setFixedTime(new Date('2026-11-11T10:00:00+07:00'));
  await page.goto('/');
  await page.getByTestId('landing').waitFor(); // checked at rest in checkAll
  await go('landing-start');
  await check('step-goal', 'goal');
  await go('goal-more');
  await go('choice-recomp');
  await check('step-goal', 'goal-more');
  await go('choice-lose'); await go('continue');
  await go('screen-medical');
  await check('step-screening', 'screening');
  await go('continue');
  await check('step-advice', 'advice');
  await go('back');
  await go('screen-medical');
  await go('screen-none'); await go('continue');
  await check('step-sex', 'sex');
  await go('choice-female'); await go('continue');
  await check('step-born', 'born');
  await wheelType(page, 'wheel-year', '2012');
  await go('continue');
  await check('step-young', 'young');
  await go('back');
  await wheelType(page, 'wheel-year', '1994');
  await go('continue');
  await page.getByRole('radio', { name: 'Metric' }).click();
  await wheelType(page, 'wheel-height', '165');
  await wheelType(page, 'wheel-weight', '82');
  await check('step-body', 'body');
  await go('continue');
  await check('step-move', 'move');
  await go('choice-light'); await go('continue');
  await check('step-days', 'days');
  await go('days-3'); await go('continue');
  await check('step-kind', 'kind');
  await go('choice-lifting'); await go('continue');
  await check('your-plan', 'plan');
  await page.getByTestId('plan-pace').getByRole('radio', { name: 'Faster' }).click();
  await checkPage(page, 'plan-faster', dir);
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
  await open(page, '/', [...MEALS, ...SUPPLEMENTS]);
  await checkPage(page, 'today-meals', dir);
  await page.getByTestId('add').click();
  await sheet('add-sheet', 'add');
  // supplements (N2): the amount with milk, the label, and the kinds
  await page.getByTestId('supplement').filter({ hasText: 'Whey' }).click();
  await expect(page.getByTestId('supplement-milk')).toBeVisible();
  await sheet('supplement-sheet', 'supplement-amount', 'supplement-add');
  await page.getByTestId('supplement-edit').click();
  await sheet('supplement-sheet', 'supplement-label', 'supplement-save');
  await close('supplement-sheet');
  await page.getByTestId('add').click();
  await page.getByTestId('supplement-new').click();
  await sheet('supplement-sheet', 'supplement-kinds');
  await page.getByTestId('kind-whey').click();
  await checkPage(page, 'supplement-source', dir);
  await close('supplement-sheet');
  // the Scan sheet (B1): no camera here, so the typed number, then the product and its label
  await page.getByTestId('add').click();
  await page.getByTestId('add-scan').click();
  await expect(page.getByTestId('barcode-field')).toBeVisible();
  await sheet('scan-sheet', 'scan-type', 'barcode-find');
  await page.getByTestId('barcode-field').fill('8850987101021');
  await page.getByTestId('barcode-find').click();
  await expect(page.getByTestId('product')).toBeVisible();
  await sheet('scan-sheet', 'scan-product', 'product-add');
  await page.getByTestId('product-correct').click();
  await sheet('scan-sheet', 'scan-label', 'label-save');
  await close('scan-sheet');
  await page.getByTestId('add').click();
  await page.getByTestId('add-search').click();
  await page.getByTestId('search-field').fill('chicken');
  await sheet('search-sheet', 'search');
  await page.getByTestId('result').first().click();
  await sheet('search-sheet', 'portion', 'search-add');
  await close('search-sheet');
  await page.getByTestId('add').click();
  await page.getByTestId('add-quick').click();
  await fieldFill(page, 'quick-kcal', '350');
  await sheet('quick-sheet', 'quick', 'quick-add');
  await close('quick-sheet');
  await page.getByTestId('meal').first().getByRole('button').click();
  await sheet('meal-sheet', 'meal', 'meal-save');
  await close('meal-sheet');
  await takePhoto(page, true);
  await expect(page.getByTestId('meal-item').first()).toBeVisible();
  await sheet('review-sheet', 'review', 'review-add');
  // an item open with Correct: four steppers in rows (N1)
  await page.getByTestId('meal-item').first().locator('button[aria-expanded]').click();
  await page.getByTestId('item-correct-open').click();
  await page.getByTestId('item-correct').scrollIntoViewIfNeeded();
  await checkPage(page, 'review-correct', dir);
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

/** Train with a hybrid template's analysis, then the Session sheet with an exercise open, the picker, Templates and the confirm. */
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
  await page.getByTestId('template-full-body-cardio-3').getByTestId('template-use').click();
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

/** Progress with four weeks of the seeder's logs, History, and each step of the check-in with its action on screen. */
async function walkProgress(page: Page, dir: string) {
  const sheet = async (id: string, name: string, action?: string) => {
    await expect(page.getByTestId(id)).toHaveCSS('transform', 'none'); // the sheet has finished sliding up
    if (action && page.viewportSize()!.height > page.viewportSize()!.width) await expect(page.getByTestId(action)).toBeInViewport({ ratio: 1 });
    await checkPage(page, name, dir);
  };
  await openSeeded(page, 'raise');
  await checkPage(page, 'today-checkin-card', dir);
  await page.getByTestId('checkin-open').click();
  await sheet('checkin-sheet', 'checkin-numbers', 'checkin-next');
  await page.getByTestId('checkin-next').click();
  await sheet('checkin-sheet', 'checkin-meaning', 'checkin-next');
  await page.getByTestId('checkin-next').click();
  await sheet('checkin-sheet', 'checkin-proposal', 'checkin-keep');
  await page.keyboard.press('Escape');
  await page.getByTestId('checkin-sheet').waitFor({ state: 'detached' });
  await page.getByTestId('tab-2').click();
  await page.waitForTimeout(300);
  await checkPage(page, 'progress-data', dir);
  await page.getByTestId('progress-history').click();
  await sheet('history-sheet', 'history');
}
for (const d of DEVICES.filter((x) => x.mobile)) {
  test.describe(d.name, () => {
    test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test('progress layout holds', async ({ page }) => {
      await walkProgress(page, `screenshots/stress/${d.name}/progress`);
    });
  });
}
for (const d of PHONES) {
  test.describe(`font xl ${d.name}`, () => {
    test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test('progress holds at the largest text', async ({ page }) => {
      await withPrefs(page, { theme: 'light', fontSize: 'xl' });
      await walkProgress(page, `screenshots/fonts/${d.name}-xl/progress`);
    });
  });
}

/** S1b: the food map, the raised friends panel, a pin's meals, a friend and your profile. Without WebGL the map says so and the rest still holds. */
async function walkFriends(page: Page, dir: string) {
  const sheet = async (id: string, name: string, action?: string) => {
    await expect(page.getByTestId(id)).toHaveCSS('transform', 'none');
    if (action && page.viewportSize()!.height > page.viewportSize()!.width) await expect(page.getByTestId(action)).toBeInViewport({ ratio: 1 });
    await checkPage(page, name, dir);
  };
  await scene(page);
  await checkPage(page, 'today-badge', dir);
  await openMap(page);
  await checkPage(page, 'map', dir);
  const pins = await page.getByTestId('pin').count();
  if (pins) {
    await page.getByTestId('pin').first().click();
    await sheet('pin-sheet', 'pin');
    await page.keyboard.press('Escape');
    await page.getByTestId('pin-sheet').waitFor({ state: 'detached' });
  }
  await raise(page);
  await page.waitForTimeout(450);
  await checkPage(page, 'panel', dir);
  await page.getByTestId('friend-list').getByTestId('friend').first().click();
  await sheet('friend-sheet', 'friend');
  await page.getByTestId('friend-remove').click();
  await sheet('friend-sheet', 'friend-remove', 'friend-remove-confirm');
  await page.keyboard.press('Escape');
  await page.getByTestId('friend-sheet').waitFor({ state: 'detached' });
  await page.getByTestId('panel-me').click();
  await sheet('profile-sheet', 'profile', 'profile-save');
}
for (const d of DEVICES.filter((x) => x.mobile)) {
  test.describe(d.name, () => {
    test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test('friends layout holds', async ({ page }) => {
      await walkFriends(page, `screenshots/stress/${d.name}/friends`);
    });
  });
}
for (const d of PHONES) {
  test.describe(`font xl ${d.name}`, () => {
    test.use({ viewport: { width: d.width, height: d.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    test('friends hold at the largest text', async ({ page }) => {
      await withPrefs(page, { theme: 'light', fontSize: 'xl' });
      await walkFriends(page, `screenshots/fonts/${d.name}-xl/friends`);
    });
  });
}
