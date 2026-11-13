// L1, PRD F18: the landing page a signed-out visitor with no onboarding draft sees (SCREENS.md section 3). Each test is a
// fresh browser in its own mock space.
import { expect, test, type Page } from '@playwright/test';
import { open, openFresh, seedAccount, signIn, space, startPlan, toLanding, useSpace, withPrefs, choose } from './helpers';

const SECTIONS = ['landing-hero', 'landing-statement', 'landing-log', 'landing-train', 'landing-checkin', 'landing-sources', 'landing-cta'];

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
  const shots = page.getByTestId('landing').locator('img');
  await expect(shots).toHaveCount(8);
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
  test('everything shows at once, without animation', async ({ page }) => {
    await openFresh(page);
    const still = () => page.evaluate(() => ({
      animations: document.getAnimations().length,
      // every element that animates in when motion is welcome is already at rest
      hidden: [...document.querySelectorAll<HTMLElement>('[data-testid="landing"] [data-reveal], [data-testid="landing"] [data-reveal] *, h1 span')]
        .filter((el) => { const cs = getComputedStyle(el); return cs.opacity !== '1' || cs.scale !== 'none' || cs.filter !== 'none'; })
        .map((el) => el.textContent?.trim().slice(0, 20)),
    }));
    expect(await still()).toEqual({ animations: 0, hidden: [] });
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await toLanding(page);
    expect(await still()).toEqual({ animations: 0, hidden: [] });
  });
});
