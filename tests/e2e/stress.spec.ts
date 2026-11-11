// Device and text size matrix: layout checks on every screen.
//   pnpm exec playwright test --project=stress   -> screenshots/stress/<device>/*.png
import { test, expect, type Page } from '@playwright/test';
import { open, withPrefs } from './helpers';

const DEVICES = [
  { name: 'iphone-15-pwa', width: 393, height: 793, mobile: true }, // home screen app: 852 minus the status bar
  { name: 'iphone-15-safari', width: 393, height: 659, mobile: true }, // Safari with its toolbars
  { name: 'iphone-15-pro-max', width: 430, height: 873, mobile: true },
  { name: 'iphone-se', width: 375, height: 647, mobile: true },
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
  .filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.opacity !== '0' && (r.width < 44 || r.height < 44); })
  .map((el) => `${(el.getAttribute('aria-label') || el.textContent || el.tagName).trim().slice(0, 24)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`));

/** Text cut off inside a box (truncate or overflow hidden). */
const clipped = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('main *, header *, nav *, [data-vaul-drawer] *')]
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
  expect(await page.getByTestId('header').evaluate((h) => h.scrollWidth - h.clientWidth), `${name}: header`).toBeLessThanOrEqual(1);
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
  { name: 'iphone-15-pwa', width: 393, height: 793 },
  { name: 'iphone-se', width: 375, height: 647 },
  { name: 'iphone-15-pro-max', width: 430, height: 873 },
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
