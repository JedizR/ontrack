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

/** L3: to the end of the page, where the footer's teaser is. A pull counts only once the page has rested at the end. */
async function toEnd(page: Page) {
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 2)).toBe(true);
}
/** Scroll intent past the end, as a wheel or trackpad sends it. */
const wheel = (page: Page, ...deltas: number[]) => page.evaluate((ds) => ds.forEach((d) => dispatchEvent(new WheelEvent('wheel', { deltaY: d }))), deltas);

test('a new visitor sees the landing page, and Build your plan starts onboarding', { tag: '@smoke' }, async ({ page }) => {
  await openFresh(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Eat for the body you are training for.');
  for (const id of SECTIONS) await expect(page.getByTestId(id)).toBeAttached();
  // every feature shows a real screen of the app, each described
  const shots = page.getByTestId('landing').locator('img');
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
  // L2, the owner's footer-glow-bug, and L3's footer: the glow's middle sits on the wordmark's foot, below the end of the
  // page while the footer is closed, behind the opened panel's upper part; its edges fade, so no edge of it shows
  test('the footer glow rises from the wordmark', async ({ page }) => {
    await openFresh(page);
    await toEnd(page);
    const glow = page.getByTestId('landing-glow');
    const mark = page.getByTestId('landing-footer').locator('svg').first();
    const mid = async () => { const g = (await glow.boundingBox())!; return g.y + g.height / 2; };
    const foot = async () => { const m = (await mark.boundingBox())!; return m.y + m.height; };
    expect(Math.abs((await mid()) - (await foot()))).toBeLessThanOrEqual(2);
    expect(await mid()).toBeGreaterThan(await page.evaluate(() => innerHeight));
    expect(await glow.evaluate((e) => getComputedStyle(e).backgroundImage)).toMatch(/glow-?[\w-]*\.webp/);
    await page.getByTestId('landing-more-open').evaluate((b: HTMLElement) => b.click());
    await expect(page.getByTestId('landing-panels')).toBeInViewport();
    const panel = (await page.getByTestId('landing-panels').boundingBox())!;
    expect(await mid()).toBeGreaterThan(panel.y);
    expect(Math.abs((await mid()) - (await foot()))).toBeLessThanOrEqual(2);
  });
  // L3, the bend Safari can draw: each lens draws the gradient behind its glass exactly where that gradient is
  test('the lenses line up with the gradients behind the glass', async ({ page }) => {
    await openFresh(page);
    await toEnd(page);
    const off = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-testid="landing"] .lens')].map((l) => {
      const src = (l.parentElement!.closest('[data-lens]') ?? document.querySelector('[data-testid="landing-glow"]'))!.getBoundingClientRect();
      const box = l.getBoundingClientRect(), cs = getComputedStyle(l, '::before');
      return [box.left + parseFloat(cs.left) - src.left, box.top + parseFloat(cs.top) - src.top, parseFloat(cs.width) - src.width].map((v) => Math.round(Math.abs(v)));
    }));
    expect(off.length).toBe(7);
    for (const o of off) expect(Math.max(...o)).toBeLessThanOrEqual(1);
  });
  test('a pull at the end opens the footer at once, with no rubber band', async ({ page }) => {
    await openFresh(page);
    await toEnd(page);
    const footer = page.getByTestId('landing-footer');
    await wheel(page, 10);
    await expect(footer).toHaveAttribute('data-open');
    expect(await footer.evaluate((f) => f.style.translate)).toBe('');
    await expect(page.getByTestId('landing-panels')).toBeInViewport();
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
    // polled: the page's first frame can still list animations that end at once under reduced motion; CI's runner draws
    // without a GPU, and L2's glass and grain make that first frame slow there (once 6 s), so it gets 15
    await expect.poll(still, { timeout: 15_000 }).toEqual({ animations: 0, hidden: [] });
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await toLanding(page);
    expect(await still()).toEqual({ animations: 0, hidden: [] });
  });
});

// L2, P1: every photo gradient keeps its words at 4.5 to 1 (3 to 1 for large words: the hero's violet words, the haze's
// reached figure), measured on the images themselves in 8 px blocks under the grain's mean (9.5 percent toward mid grey),
// as the eye reads through the grain. Their eight colours are in contrast.test.ts.
test('the photo gradients keep their words readable', async ({ page }) => {
  // [colour, alpha]: words with alpha (ink-2 on the haze, the dark ink-2) take the colour of the block under them
  const words: Record<string, [string, number]> = {
    night: ['#121214', 1], ink2: ['#121214', 0.73], success: ['#006644', 1], violet: ['#381ac9', 1],
    white: ['#ffffff', 1], white80: ['#ffffff', 0.8], successDark: ['#19dba8', 1], violetDark: ['#a9a9ff', 1],
  };
  const CASES: [string, string[], string[]][] = [
    // image, words that need 4.5 to 1, words that need 3 to 1
    ['haze-light', ['night', 'ink2'], ['success']],
    ['haze-dark', ['white', 'white80'], ['successDark']],
    ['feature-light', ['white'], []],
    ['feature-dark', ['white'], []],
    ['call', ['white'], []],
    ['sky-light', ['night'], ['violet']],
    ['sky-dark', ['white'], ['violetDark']],
    ['glow', ['white'], []],
    ['panel', ['night'], []],
    ['wash-ink', ['white'], []],
    ['wash-steel', ['white'], []],
    ['wash-clay', ['white'], []],
    ['wash-sand', ['night'], []],
  ];
  const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = (c: number[]) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  await page.goto('about:blank');
  for (const [name, strong, large] of CASES) {
    const b64 = readFileSync(`design/gradients/${name}.webp`).toString('base64');
    const blocks = await page.evaluate(async (src) => {
      const img = new Image();
      img.src = `data:image/webp;base64,${src}`;
      await img.decode();
      const w = Math.floor(img.width / 8), h = Math.floor(img.height / 8);
      const c = Object.assign(document.createElement('canvas'), { width: w, height: h });
      const g = c.getContext('2d')!;
      g.imageSmoothingQuality = 'high';
      g.drawImage(img, 0, 0, w, h);
      return Array.from(g.getImageData(0, 0, w, h).data);
    }, b64);
    for (const [bar, list] of [[4.5, strong], [3, large]] as const) for (const w of list) {
      const [hex, a] = words[w];
      const fg = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      let worst = Infinity;
      for (let i = 0; i < blocks.length; i += 4) {
        const bg = [0, 1, 2].map((k) => blocks[i + k] * 0.905 + 127.5 * 0.095);
        const [x, y] = [lum(fg.map((v, k) => v * a + bg[k] * (1 - a))), lum(bg)];
        worst = Math.min(worst, (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05));
      }
      expect(worst, `${w} on ${name}`).toBeGreaterThanOrEqual(bar);
    }
  }
});

// L3, the owner's footer in two states: the page ends on the teaser; a pull past the end resists, then opens it; it
// closes once it has left the screen, so it has to be pulled open again
test.describe('the footer', () => {
  test('a short pull springs back, a long one opens it, and leaving closes it', async ({ page }) => {
    await openFresh(page);
    await toEnd(page);
    const footer = page.getByTestId('landing-footer');
    await expect(footer).not.toHaveAttribute('data-open');
    await expect(page.getByTestId('landing-panels')).not.toBeInViewport();
    // the teaser follows a third of the pull, then springs back when it stops short
    await wheel(page, 60);
    expect(await footer.evaluate((f) => f.style.translate)).toBe('0px -20px');
    await expect(footer).not.toHaveAttribute('data-pulling');
    await expect(footer).not.toHaveAttribute('data-open');
    expect(await footer.evaluate((f) => f.style.translate)).toBe('');
    // past 120 px it gives way, and the page scrolls to show it
    await wheel(page, 50, 50, 50);
    await expect(footer).toHaveAttribute('data-open');
    await expect(page.getByTestId('landing-panels')).toBeInViewport();
    // up the page until it has left the screen: closed again, and the page ends on the teaser
    await page.getByTestId('landing-cta').evaluate((e) => e.scrollIntoView());
    await page.evaluate(() => scrollBy(0, -innerHeight));
    await expect(footer).not.toHaveAttribute('data-open');
    await toEnd(page);
    await expect(page.getByTestId('landing-panels')).not.toBeInViewport();
  });
  test('More about Ontrack opens it for a keyboard, and so does focus moving in', async ({ page }) => {
    await openFresh(page);
    const footer = page.getByTestId('landing-footer');
    const more = page.getByRole('button', { name: 'More about Ontrack' });
    await more.focus();
    await expect(more).toBeInViewport();
    await page.keyboard.press('Enter');
    await expect(footer).toHaveAttribute('data-open');
    await expect(page.getByTestId('landing-panels').getByRole('button', { name: 'Build your plan' })).toBeFocused();
    await expect(page.getByTestId('landing-panels')).toBeInViewport();
    // a Learn link takes focus to its section, and the footer, now off screen, closes
    await page.getByTestId('landing-panels').getByRole('button', { name: 'Training' }).click();
    await expect(page.locator('#training')).toBeFocused();
    await expect(footer).not.toHaveAttribute('data-open');
    await page.getByTestId('landing-panels').getByRole('link', { name: 'Privacy' }).focus();
    await expect(footer).toHaveAttribute('data-open');
  });
});

// L3: a sheet over the page takes the wheel; once it has closed, the pull works again
test('a pull behind the sign in sheet does not open the footer', async ({ page }) => {
  await openFresh(page);
  await toEnd(page);
  await page.getByTestId('landing-cta').getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByTestId('signin-sheet')).toBeVisible();
  await page.waitForTimeout(300);
  await wheel(page, 100, 100);
  await expect(page.getByTestId('landing-footer')).not.toHaveAttribute('data-open');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('signin-sheet')).toBeHidden();
  await toEnd(page);
  await wheel(page, 100, 100);
  await expect(page.getByTestId('landing-footer')).toHaveAttribute('data-open');
});

// L3, the owner's white bar: Safari 26 takes the status bar's colour from the page (the body's background over the
// root's) and from anything fixed at the top edge. On the landing both backgrounds are the sky's top and the bar starts
// below the status bar, in the same place as before; the app keeps its canvas
test('the status bar continues the sky, and the bar keeps its place', async ({ page }) => {
  await openFresh(page);
  const colour = (token: string) => page.evaluate((v) => { const d = document.createElement('i'); d.style.color = `var(${v})`; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, token);
  const page_ = () => page.evaluate(() => [document.documentElement, document.body].map((e) => getComputedStyle(e).backgroundColor));
  const sky = await colour('--sky-top');
  expect(await page_()).toEqual([sky, sky]);
  // once the bar has dropped in (M1): its box starts 8 below the top, where its glass did before
  const bar = page.getByTestId('landing').locator('header');
  await expect.poll(() => bar.evaluate((h) => [h.getBoundingClientRect().top, h.querySelector('nav')!.getBoundingClientRect().top])).toEqual([8, 8]);
  // the owner: Sign in is the ink pill
  expect(await page.getByTestId('landing-signin').evaluate((b) => getComputedStyle(b.querySelector('span') ?? b).backgroundColor)).toBe(await colour('--action'));
  await startPlan(page);
  const canvas = await colour('--canvas');
  expect(await page_()).toEqual([canvas, canvas]);
});
