// U1c's gate: each animation reaches its end state, and with reduced motion none is left running. Svelte's transitions
// and CSS animations and transitions all show in document.getAnimations(). "Today" is 2026-11-11; the seeded plan's
// target is 2,460 kcal on this training day, 108 g protein.
import { expect, test, type Page } from '@playwright/test';
import { MEALS, open, swipeAt, takePhoto, vision, withPrefs } from './helpers';

const hero = (page: Page) => page.getByTestId('hero-value');
const meals = (page: Page) => page.getByTestId('meal');
/** Animations still playing, named so a failure says which; with `moving`, only those that last over 1 ms or loop. */
const running = (page: Page, moving = false) =>
  page.evaluate((moving) =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .filter((a) => {
        const t = a.effect!.getComputedTiming();
        return !moving || t.iterations === Infinity || Number(t.duration) > 1;
      })
      .map((a) => {
        const el = (a.effect as KeyframeEffect)?.target;
        const what = (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'svelte';
        return `${what} on ${el?.closest('[data-testid]')?.getAttribute('data-testid') ?? el?.tagName} (${String(a.effect?.getTiming().duration)} ms)`;
      }),
  moving);
/** Everything settles: no animation left running (the skeleton's pulse and the photo's sweep only run while waiting). */
const settled = (page: Page) => expect.poll(() => running(page), { timeout: 3000 }).toEqual([]);
async function quickAdd(page: Page, kcal: string, protein?: string) {
  await page.getByTestId('add').click();
  await page.getByTestId('add-quick').click();
  await page.getByTestId('quick-kcal').fill(kcal);
  if (protein) await page.getByTestId('quick-protein').fill(protein);
  await page.getByTestId('quick-add').click();
  await expect(page.getByTestId('quick-add')).toBeHidden();
}
const rowAt = async (page: Page, title: string) => {
  const box = (await meals(page).filter({ hasText: title }).boundingBox())!;
  return { x: box.x + box.width - 40, y: box.y + box.height / 2 };
};

test('swipe to delete as iOS Mail: a short swipe opens a full height action inside the card, a long one deletes', async ({ page }) => {
  await open(page, '/', MEALS);
  await settled(page);
  await expect(meals(page)).toHaveCount(3);

  // a short swipe on the top row: it stays open on Delete, which fills the row's height and the card's padding above
  await swipeAt(page, -100, await rowAt(page, 'Snack'));
  const top = meals(page).first();
  await expect(top).toHaveAttribute('data-open', 'true');
  await settled(page);
  const action = (await top.getByTestId('swipe-delete').locator('..').boundingBox())!;
  const card = (await page.getByTestId('meals').boundingBox())!;
  const row = (await top.boundingBox())!;
  expect(Math.abs(action.y - card.y)).toBeLessThanOrEqual(1); // no white edge above
  expect(action.y + action.height).toBeGreaterThanOrEqual(row.y + row.height - 1); // none below
  expect(Math.abs(action.x + action.width - (card.x + card.width))).toBeLessThanOrEqual(1);
  expect(action.width).toBeCloseTo(88, 0);

  // a tap on the open row closes it, and does not open the meal
  await top.click({ position: { x: 60, y: 30 } });
  await expect(top).not.toHaveAttribute('data-open');
  await expect(page.getByTestId('meal-sheet')).toBeHidden();

  // opened again, its Delete button deletes
  await swipeAt(page, -100, await rowAt(page, 'Snack'));
  await top.getByTestId('swipe-delete').click();
  await expect(meals(page)).toHaveCount(2);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(meals(page)).toHaveCount(3);
  await settled(page);

  // a long swipe deletes: the row slides out, collapses, and Undo stays
  await swipeAt(page, -260, await rowAt(page, 'Chicken rice bowl'));
  await expect(meals(page)).toHaveCount(2);
  await expect(meals(page).filter({ hasText: 'Chicken rice bowl' })).toHaveCount(0);
  await settled(page);
  await expect(hero(page)).toHaveText('1,120');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(meals(page)).toHaveCount(3);
  await settled(page);
  await expect(hero(page)).toHaveText('1,840');
});

test('logging moves the numbers to their end; reaching protein turns its track green with a check and a pulse', async ({ page }) => {
  await open(page);
  await settled(page);
  await expect(page.getByTestId('macro-protein').getByRole('progressbar')).toHaveAttribute('data-reached', 'false');
  await quickAdd(page, '900', '100');
  await expect(meals(page)).toHaveCount(1);
  await settled(page);
  await expect(hero(page)).toHaveText('900');
  const protein = page.getByTestId('macro-protein');
  await expect(protein).toContainText('100');
  await expect(protein.getByRole('progressbar')).toHaveAttribute('data-reached', 'true');
  await expect(protein.locator('svg.lucide-check')).toBeVisible();
  // the pulse has played and gone
  await expect(protein.getByRole('progressbar')).not.toHaveAttribute('data-pulse');
  // reaching the calorie zone: On track, with its check
  await quickAdd(page, '1560');
  await settled(page);
  await expect(page.getByTestId('hero')).toContainText('On track');
  await expect(page.getByTestId('hero-reached')).toBeVisible();
});

test('a finished session ticks off; the week pill and the dock pill move to what was picked', async ({ page }) => {
  await open(page, '/', MEALS);
  const training = page.getByTestId('training');
  await training.getByTestId('session-done').click();
  await expect(training.getByTestId('session-tick')).toBeVisible();
  // it pops in: tapping Done plays its transition (a check already there on arrival would not)
  await expect.poll(() => running(page), { timeout: 500, intervals: [16] }).toContainEqual(expect.stringMatching(/on session-tick/));
  await settled(page);

  const pill = page.getByTestId('week-pill');
  const cells = page.getByTestId('week').getByRole('button');
  await cells.nth(5).click();
  await settled(page);
  const [p, c] = [(await pill.boundingBox())!, (await cells.nth(5).boundingBox())!];
  expect(Math.abs(p.x + p.width / 2 - (c.x + c.width / 2))).toBeLessThanOrEqual(1);
  await expect(hero(page)).toHaveText('2,300');

  await page.getByTestId('tab-2').click();
  await settled(page);
  const [d, t] = [(await page.getByTestId('dock-pill').boundingBox())!, (await page.getByTestId('tab-2').boundingBox())!];
  expect(Math.abs(d.x + d.width / 2 - (t.x + t.width / 2))).toBeLessThanOrEqual(1);
  // Progress's figures count up to their values, its bars grow and its line draws
  await expect(page.getByTestId('progress-intake-avg')).not.toHaveText('0');
  await settled(page);
});

test('a photo is read under a sweeping light with its steps in words, which stop when the answer comes', async ({ page }) => {
  await withPrefs(page, { photoOk: true });
  const s = await open(page);
  await vision(page, s, { fixture: 'basil-pork' });
  await page.route('**/api/analyze', async (route) => { await new Promise((ok) => setTimeout(ok, 4000)); await route.continue(); });
  await takePhoto(page);
  await expect(page.getByTestId('review-sweep')).toBeVisible();
  await expect(page.getByTestId('review-looking')).toHaveText('Looking at your meal');
  await expect(page.getByTestId('review-looking')).toHaveText('Finding each food', { timeout: 3000 });
  await expect(page.getByTestId('review-add')).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId('review-sweep')).toHaveCount(0);
  await settled(page);
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('nothing keeps moving: every change lands at once, and a wait shows words, not motion', async ({ page }) => {
    await withPrefs(page, { photoOk: true });
    const s = await open(page, '/', MEALS);
    await vision(page, s, { fixture: 'basil-pork' });
    // nothing moves: every animation there is is already instant (0.01 ms) and none loops; then they are all gone. A
    // slow machine may not have ticked the instant ones yet, so only those wait
    const now = async () => {
      expect(await running(page, true)).toEqual([]);
      await settled(page);
    };
    await now();
    await quickAdd(page, '450');
    await now();
    await expect(hero(page)).toHaveText('2,290');
    await swipeAt(page, -260, await rowAt(page, 'Snack'));
    await expect(meals(page)).toHaveCount(3);
    await now();
    await page.getByTestId('week').getByRole('button').nth(5).click();
    await now();
    await page.getByTestId('tab-2').click();
    await now();
    await page.getByTestId('tab-0').click();
    // while a photo is read: the words, no sweep and no pulsing skeleton
    await page.route('**/api/analyze', async (route) => { await new Promise((ok) => setTimeout(ok, 3000)); await route.continue(); });
    await takePhoto(page);
    await expect(page.getByTestId('review-looking')).toBeVisible();
    await expect(page.getByTestId('review-sweep')).toBeHidden();
    await now();
  });
});
