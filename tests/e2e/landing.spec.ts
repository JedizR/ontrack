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

/** To the end of the page, where the footer is. */
async function toEnd(page: Page) {
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => innerHeight + scrollY >= document.documentElement.scrollHeight - 2)).toBe(true);
}
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
  // motion plays when it is welcome; L4: a loop runs only while its section is on screen
  expect(await page.evaluate(() => document.getAnimations().length)).toBeGreaterThan(0);
  const play = (sel: string) => page.evaluate((s) => getComputedStyle(document.querySelector(s)!).animationPlayState, sel);
  await expect.poll(() => play('[data-testid="landing-hero"] .bob')).toBe('running');
  expect(await play('[data-testid="landing-friends"] .wiggle')).toBe('paused');

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
    // L4: the bar turns dark over the dark run at once; app.css's 0.01 ms transitions still list for a frame
    await expect.poll(still, { timeout: 5000 }).toEqual({ animations: 0, hidden: [] });
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
    ['feature-light', ['night'], []],
    ['call', ['night'], []],
    ['sky-light', ['night'], ['violet']],
    ['panel', ['night'], []],
    ['wash-1', ['night'], []],
    ['wash-2', ['night'], []],
    ['wash-3', ['night'], []],
    ['wash-4', ['night'], []],
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

// L5, the owner: a short footer. "Keep your calories" over the wordmark, both lines the same width, then the essentials:
// contact, Privacy, Terms, the year (far left), the version (far right) and the small print
test('the footer is the line over the wordmark and the essentials', async ({ page }) => {
  await openFresh(page);
  await toEnd(page);
  const footer = page.getByTestId('landing-footer');
  await expect(footer.getByRole('heading', { name: 'Keep your calories' })).toBeVisible();
  await expect(footer.getByText('Ontrack gives general wellness guidance, not medical advice.', { exact: true })).toBeVisible();
  for (const name of ['team.ontrackapp@gmail.com', 'Privacy', 'Terms']) await expect(footer.getByRole('link', { name })).toBeInViewport();
  // the two lines are as wide as each other, and the line fits its column
  const w = await footer.evaluate((f) => { const h = f.querySelector('.keep')!; const r = document.createRange(); r.selectNodeContents(h); return [r.getBoundingClientRect().width, f.querySelector('svg')!.getBoundingClientRect().width, h.clientWidth]; });
  expect(w[0]).toBeLessThanOrEqual(w[2] + 1);
  expect(Math.abs(w[0] - w[1])).toBeLessThan(w[1] * 0.03);
  // the year at the far left and the version at the far right, on a phone as well
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 664 }]) {
    await page.setViewportSize(size);
    await toEnd(page);
    const at = await footer.evaluate((f) => { const bar = f.querySelector('.border-t')!.getBoundingClientRect(); const [year, version] = [...f.querySelectorAll('.border-t > span')].map((s) => s.getBoundingClientRect()); const nav = f.querySelector('nav')!.getBoundingClientRect(); return { left: year.left - bar.left, right: bar.right - version.right, sameLine: Math.abs(year.top - version.top) < 4, belowLinks: year.top >= nav.bottom - 1 }; });
    expect(at.left, `year at ${size.width}`).toBeLessThan(2);
    expect(at.right, `version at ${size.width}`).toBeLessThan(2);
    if (size.width < 500) { expect(at.sameLine).toBe(true); expect(at.belowLinks).toBe(true); }
  }
});

// L4, the owner's bars (DECISIONS L4, from WebKit's source): Safari 26 fills its top or bottom bar with a solid colour only
// for a fixed or sticky element at the middle of that edge, 4 px in, so nothing fixed is ever there, the floating action
// included; and it draws its own soft edge, and the strips above and below the page, in the page's background (the
// body's over the root's), so both follow the section under the top of the screen. The app keeps its canvas
test('nothing fixed touches the bars, and the page takes the colour of the section at the top', async ({ page }) => {
  await openFresh(page);
  const colour = (token: string, scope = 'body') => page.evaluate(([v, s]) => { const d = document.createElement('i'); d.style.color = `var(${v})`; document.querySelector(s)!.append(d); const c = getComputedStyle(d).color; d.remove(); return c; }, [token, scope]);
  const bg = () => page.evaluate(() => [document.documentElement, document.body].map((e) => getComputedStyle(e).backgroundColor));
  // anything fixed or sticky at the middle of the top or the bottom edge, 6 px in (WebKit samples 4 px in, a strip to 6)
  const atEdges = () => page.evaluate(() => [6, innerHeight - 6].flatMap((y) => document.elementsFromPoint(innerWidth / 2, y)
    .filter((el) => { for (let e: Element | null = el; e; e = e.parentElement) if (/fixed|sticky/.test(getComputedStyle(e).position)) return true; return false; })
    .map((el) => `${y}: ${el.tagName.toLowerCase()}.${String(el.className).slice(0, 30)}`)));
  const to = async (id: string) => {
    await page.evaluate((id) => { const el = document.querySelector(`[data-testid="${id}"]`)!; scrollTo(0, el.getBoundingClientRect().top + scrollY + 200); }, id);
    await page.waitForTimeout(150);
  };
  const sky = await colour('--sky-top');
  await expect.poll(bg).toEqual([sky, sky]);
  expect(await atEdges()).toEqual([]);
  await to('landing-log');
  await expect(page.getByTestId('landing-float')).toHaveAttribute('data-shown');
  const surface = await colour('--surface');
  await expect.poll(bg).toEqual([surface, surface]);
  expect(await atEdges()).toEqual([]);
  // the floating action is the ink pill on light, and the white one over a dark section (ink means act, white on dark)
  await expect(page.getByTestId('landing-float')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => { const el = document.querySelector('[data-testid="landing-train"]')!; scrollTo(0, el.getBoundingClientRect().top + scrollY + 400); });
  await expect(page.getByTestId('landing-float')).toHaveAttribute('data-theme', 'dark');
  // a dark section in the light theme: its own canvas, and the bar turns dark over it
  await to('landing-sources');
  const night = await colour('--canvas', '[data-testid="landing-sources"]');
  await expect.poll(bg).toEqual([night, night]);
  await expect(page.getByTestId('landing').locator('header')).toHaveAttribute('data-theme', 'dark');
  expect(await atEdges()).toEqual([]);
  await toEnd(page);
  await expect.poll(bg).toEqual([night, night]);
  expect(await atEdges()).toEqual([]);
  // the bar: 8 below the top as before; the owner: Sign in is the ink pill, in a bar as wide as the page
  const bar = page.getByTestId('landing').locator('header');
  await expect.poll(() => bar.evaluate((h) => [h.getBoundingClientRect().top, h.querySelector('nav')!.getBoundingClientRect().top])).toEqual([8, 8]);
  await page.evaluate(() => scrollTo(0, 0));
  const ink = await colour('--action');
  await expect.poll(() => page.getByTestId('landing-signin').evaluate((b) => getComputedStyle(b.querySelector('span') ?? b).backgroundColor)).toBe(ink);
  await page.setViewportSize({ width: 1440, height: 900 });
  expect(await page.getByTestId('landing-bar').evaluate((n) => n.getBoundingClientRect().width)).toBe(1440 - 72);
  await page.setViewportSize({ width: 390, height: 664 });
  await startPlan(page);
  const canvas = await colour('--canvas');
  expect(await bg()).toEqual([canvas, canvas]);
});

// L4 and U2, the owner's corners: a box inside a rounded box, near its corner, has the corner the outer one leaves it
// (the outer radius less the inset), so the two curves run side by side; checked on every pair on the page at rest
test('every nested corner on the landing page runs with its outer one', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width < 500 ? 664 : 900 });
    await openFresh(page);
    // at rest and untilted: a tilt or a lean only turns a pair, so measure their boxes as laid out
    await page.addStyleTag({ content: '[data-testid="landing"] * { rotate: none !important; transform: none !important; translate: none !important; scale: none !important; }' });
    const bad = await page.evaluate(() => {
      const radius = (el: Element) => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return Math.min(parseFloat(cs.borderTopLeftRadius) || 0, r.width / 2, r.height / 2); };
      const out: string[] = [];
      for (const el of document.querySelectorAll('[data-testid="landing"] *')) {
        const r = radius(el);
        // decoration that floats over a section (aria-hidden) is placed, not nested
        if (!r || el.closest('svg, [aria-hidden="true"]')) continue;
        // the nearest rounded box around it that is drawn: a fill, an image or a clip
        let a = el.parentElement;
        for (; a && a.matches('[data-testid="landing"] *'); a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (radius(a) && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none' || cs.overflow !== 'visible' || /liquid/.test(String(a.className)))) break;
        }
        if (!a || !a.matches('[data-testid="landing"] *')) continue;
        const ra = radius(a), o = a.getBoundingClientRect(), b = el.getBoundingClientRect();
        // each corner of the inner box that sits inside the outer box's corner curve, inset alike on both sides
        for (const [dx, dy] of [[b.left - o.left, b.top - o.top], [o.right - b.right, b.top - o.top], [b.left - o.left, o.bottom - b.bottom], [o.right - b.right, o.bottom - b.bottom]]) {
          if (dx < 0 || dy < 0 || dx >= ra || dy >= ra || Math.abs(dx - dy) > 2) continue;
          const want = ra - dx;
          if (Math.abs(r - want) > 2) out.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} ${Math.round(r)} in ${Math.round(ra)} at ${Math.round(dx)}: want ${Math.round(want)}`);
        }
      }
      return [...new Set(out)];
    });
    expect(bad, `at ${width}`).toEqual([]);
  }
});
