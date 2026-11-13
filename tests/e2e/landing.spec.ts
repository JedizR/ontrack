// L1, PRD F18: the landing page a signed-out visitor with no onboarding draft sees (SCREENS.md section 3). Each test is a
// fresh browser in its own mock space.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { open, openFresh, seedAccount, signIn, space, startPlan, toLanding, useSpace, withPrefs, choose } from './helpers';

const SECTIONS = ['landing-hero', 'landing-statement', 'landing-log', 'landing-train', 'landing-checkin', 'landing-friends', 'landing-sources', 'landing-cta'];

/** Marks the window if the landing page is ever on screen, even for a moment. */
const watchForLanding = (page: Page) => page.addInitScript(() => {
  new MutationObserver(() => {
    if (document.querySelector('[data-testid="landing"]')) (window as unknown as { flashed: boolean }).flashed = true;
  }).observe(document, { childList: true, subtree: true });
});
const flashed = (page: Page) => page.evaluate(() => (window as unknown as { flashed?: boolean }).flashed ?? false);

test('a new visitor sees the landing page, and Build your plan starts onboarding', { tag: '@smoke' }, async ({ page }) => {
  await openFresh(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eat for the body you are training for.');
  for (const id of SECTIONS) await expect(page.getByTestId(id)).toBeAttached();
  // every feature shows a real screen of the app, each described
  const shots = page.getByTestId('landing').locator('img:not([alt=""])'); // L2: each status bar repeats its screen's top, unnamed
  await expect(shots).toHaveCount(9);
  for (const alt of await shots.evaluateAll((imgs) => imgs.map((i) => i.getAttribute('alt') ?? ''))) expect(alt.length).toBeGreaterThan(20);
  // the browser is the app: nothing asks to install it
  expect(await page.getByTestId('landing').innerText()).not.toMatch(/install|home screen|download|app store/i);
  // motion plays when it is welcome
  expect(await page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);

  await startPlan(page);
  await expect(page.getByTestId('landing')).toHaveCount(0);
  // back from the first question is the landing page again, and Build your plan keeps the answer
  await choose(page, 'choice-gain');
  await expect(page.getByTestId('step-screening')).toBeVisible();
  await page.getByTestId('back').click();
  await page.getByTestId('back').click();
  await expect(page.getByTestId('landing')).toBeVisible();
  await startPlan(page);
  await expect(page.getByTestId('choice-gain')).toHaveAttribute('aria-checked', 'true');
});

test('Build your plan floats in once the hero has scrolled away, and starts onboarding from there too', async ({ page }) => {
  await openFresh(page);
  const float = page.getByTestId('landing-float');
  await expect(float).toHaveAttribute('inert');
  await page.getByTestId('landing-log').scrollIntoViewIfNeeded();
  await expect(float).not.toHaveAttribute('inert');
  await float.getByRole('button').click();
  await expect(page.getByTestId('step-goal')).toBeVisible();
});

test('Sign in opens the sign in sheet, and an account with a plan lands on Today', async ({ page }) => {
  const s = await seedAccount(page, { signedIn: false });
  await openFresh(page, s);
  await page.getByTestId('landing-signin').click();
  await expect(page.getByTestId('signin-sheet')).toBeVisible();
  await expect(page.getByTestId('signin-sheet')).toContainText('Welcome back');
  await signIn(page);
  await expect(page.getByTestId('tab-today')).toBeVisible();
  await expect(page.getByTestId('landing')).toHaveCount(0);
});

test('a returning user with a session skips it', async ({ page }) => {
  await open(page);
  await watchForLanding(page); // from the next load on: this browser now knows its last user, as a returning one does
  await page.reload();
  await expect(page.getByTestId('tab-today')).toBeVisible();
  expect(await flashed(page)).toBe(false);
});

test('a visitor with a draft skips it, back on the question they left', async ({ page }) => {
  await watchForLanding(page);
  await useSpace(page, space('draft'));
  await withPrefs(page, { draft: { at: 'screening', units: 'metric', goal: 'gain' } });
  await page.goto('/');
  await expect(page.getByTestId('step-screening')).toBeVisible({ timeout: 15_000 });
  expect(await flashed(page)).toBe(false);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });
  // L2, the owner's footer-glow-bug: the glow is brightest where the panels begin, not inside the wordmark's band, and
  // runs on behind them, so no edge of it shows
  test('the footer glow rises from the panels', async ({ page }) => {
    await openFresh(page);
    const panels = page.getByTestId('landing-panels');
    await panels.scrollIntoViewIfNeeded();
    const glow = (await page.getByTestId('landing-glow').boundingBox())!;
    const top = (await panels.boundingBox())!.y;
    expect(Math.abs(glow.y + glow.height / 2 - top)).toBeLessThanOrEqual(2);
    expect(await page.getByTestId('landing-glow').evaluate((e) => getComputedStyle(e).backgroundImage)).toMatch(/glow-?[\w-]*\.webp/);
  });
  test('everything shows at once, without animation', async ({ page }) => {
    await openFresh(page);
    const still = () => page.evaluate(() => ({
      animations: document.getAnimations().length,
      // every element that animates in when motion is welcome is already at rest
      hidden: [...document.querySelectorAll<HTMLElement>('[data-testid="landing"] [data-reveal], [data-testid="landing"] [data-reveal] *, h1 span')]
        .filter((el) => { const cs = getComputedStyle(el); return cs.opacity !== '1' || cs.scale !== 'none' || cs.filter !== 'none'; })
        .map((el) => el.textContent?.trim().slice(0, 20)),
    }));
    // polled: the page's first frame can still list animations that end at once under reduced motion
    await expect.poll(still).toEqual({ animations: 0, hidden: [] });
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await toLanding(page);
    expect(await still()).toEqual({ animations: 0, hidden: [] });
  });
});

// L2: every photo gradient keeps its words at 4.5 to 1 (3 to 1 for the hero's large violet words), measured on the images
// themselves in 8 px blocks, as the eye reads through the grain. The CSS gradients beneath are in contrast.test.ts.
test('the photo gradients keep their words readable', async ({ page }) => {
  const words = { night: '#121214', ink2: '#525252', success: '#006644', violet: '#381ac9', white: '#ffffff', white80: '#cccccc', violetDark: '#a9a9ff' };
  const CASES: [string, (keyof typeof words)[], (keyof typeof words)[]][] = [
    // image, words that need 4.5 to 1, words that need 3 to 1
    ['haze-light', ['night', 'ink2', 'success'], []],
    ['haze-dark', ['white', 'white80'], []],
    ['feature-light', ['white'], []],
    ['feature-dark', ['white'], []],
    ['sky-light', ['night'], ['violet']],
    ['sky-dark', ['white'], ['violetDark']],
    ['panel', ['night'], []],
    ['wash-ink', ['white'], []],
    ['wash-blue', ['white'], []],
    ['wash-magenta', ['white'], []],
    ['wash-lavender', ['night'], []],
  ];
  await page.goto('about:blank');
  for (const [name, strong, large] of CASES) {
    const b64 = readFileSync(`design/gradients/${name}.webp`).toString('base64');
    const [lo, hi] = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = `data:image/webp;base64,${src}`;
      await img.decode();
      const w = Math.floor(img.width / 8), h = Math.floor(img.height / 8);
      const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
      const g = c.getContext('2d')!;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, w, h);
      const d = g.getImageData(0, 0, w, h).data;
      const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
      let lo = 1, hi = 0;
      for (let i = 0; i < d.length; i += 4) {
        const l = 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
        lo = Math.min(lo, l); hi = Math.max(hi, l);
      }
      return [lo, hi];
    }, b64);
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // the worst block for a word is the one closest to it in lightness
    const worst = (hex: string) => { const l = lum(hex); if (l >= lo && l <= hi) return 1; return Math.min((Math.max(l, lo) + 0.05) / (Math.min(l, lo) + 0.05), (Math.max(l, hi) + 0.05) / (Math.min(l, hi) + 0.05)); };
    for (const w of strong) expect(worst(words[w]), `${w} on ${name}`).toBeGreaterThanOrEqual(4.5);
    for (const w of large) expect(worst(words[w]), `${w} on ${name}`).toBeGreaterThanOrEqual(3);
  }
});
