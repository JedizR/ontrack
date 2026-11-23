// Today and logging without a photo (F3, F5, F6), on the mock backend. "Today" is frozen at 2026-11-11, a Wednesday
// and a training day for the seeded plan: 2,460 kcal, 2,220 on rest days.
import { expect, test, type Page } from '@playwright/test';
import { MEALS, TODAY, fieldFill, open, pickerSave, swipeAt, wheelType } from './helpers';

const hero = (page: Page) => page.getByTestId('hero-value');
const meals = (page: Page) => page.getByTestId('meal');
const pending = (page: Page) => page.evaluate(() => (window as unknown as { ontrack: { db: { pending: number } } }).ontrack.db.pending);
const kcalOf = (page: Page) => page.getByTestId('hero').getByText(/^of [\d,]+ kcal$/);

test('search a food, pick a portion and add it: Today updates at once', { tag: '@smoke' }, async ({ page }) => {
  await open(page);
  await expect(hero(page)).toHaveText('0');
  await expect(kcalOf(page)).toHaveText('of 2,460 kcal');
  await expect(page.getByTestId('first-meal')).toContainText('Log your first meal');

  await page.getByTestId('add').click();
  await page.getByTestId('add-search').click();
  await expect(page.getByTestId('search-field')).toBeFocused();
  await page.getByTestId('search-field').fill('white rice');
  await page.getByTestId('result').first().click();
  await expect(page.getByTestId('portion')).toBeVisible();
  await page.getByRole('button', { name: '1 plate' }).click();
  await expect(page.getByTestId('portion-kcal')).toHaveText('340');
  // grams on the stepper: typed, then nudged by 10
  const grams = page.getByTestId('portion-grams').getByRole('textbox');
  await grams.fill('190');
  await grams.press('Enter');
  await page.getByTestId('portion-grams').getByRole('button', { name: 'More grams' }).click();
  await expect(grams).toHaveValue('200');
  await expect(page.getByTestId('search-add')).toHaveText('Add 272 kcal');
  await page.getByTestId('search-add').click();

  await expect(page.getByTestId('search-sheet')).toBeHidden();
  await expect(hero(page)).toHaveText('272');
  await expect(meals(page)).toHaveCount(1);
  await expect(meals(page).first()).toContainText('White rice');
  await expect(meals(page).first()).toContainText('Database');

  // an empty field offers the food again with the grams used last time
  await page.getByTestId('add').click();
  await page.getByTestId('add-search').click();
  await expect(page.getByTestId('recent-foods').getByTestId('result')).toHaveText(/White rice\s*200 g\s*272/);
});

test('quick add with macros and a name, then log it again from Recent in two taps', async ({ page }) => {
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('add-quick').click();
  await expect(page.getByTestId('quick-kcal')).toBeFocused(); // the number pad comes up for calories
  await expect(page.getByTestId('quick-add')).toBeDisabled();
  await fieldFill(page, 'quick-kcal', '12000');
  await expect(page.getByTestId('quick-error')).toHaveText('Enter up to 10,000 kcal at a time.');
  await expect(page.getByTestId('quick-add')).toBeDisabled();
  await fieldFill(page, 'quick-kcal', '450');
  await fieldFill(page, 'quick-protein', '30');
  await page.getByTestId('quick-name').fill('Protein shake');
  await expect(page.getByTestId('quick-add')).toHaveText('Add 450 kcal');
  await page.getByTestId('quick-add').click();
  await expect(hero(page)).toHaveText('450');
  await expect(page.getByTestId('macro-protein')).toContainText('30');
  await expect(meals(page).first()).toContainText('Quick add');

  // two taps: the plus, then the plus on the recent meal
  await page.getByTestId('add').click();
  await page.getByTestId('recent').getByRole('button', { name: 'Add Protein shake again' }).click();
  await expect(hero(page)).toHaveText('900');
  await expect(page.getByTestId('meal-count')).toHaveText('2 logged');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(hero(page)).toHaveText('450');
});

test('a meal opens, edits grams, saves, keeps as a saved meal and deletes with undo', async ({ page }) => {
  await open(page, '/', MEALS);
  await expect(hero(page)).toHaveText('1,840');
  await expect(page.getByTestId('meal-count')).toHaveText('3 logged');
  await expect(meals(page).first()).toContainText('Snack'); // newest first

  await meals(page).filter({ hasText: 'Chicken rice bowl' }).getByRole('button').click();
  const sheet = page.getByTestId('meal-sheet');
  await expect(sheet.getByTestId('meal-item')).toHaveCount(2);
  await sheet.getByRole('button', { name: 'Less grams' }).first().click();
  await expect(sheet.getByTestId('meal-total')).toHaveText('707 kcal, 70 g protein');
  await sheet.getByTestId('meal-item').nth(1).getByRole('button').first().click();
  await sheet.getByRole('button', { name: 'Half', exact: true }).click();
  await expect(sheet.getByTestId('meal-total')).toHaveText('542 kcal, 39 g protein');
  await sheet.getByTestId('meal-keep').click();
  await sheet.getByTestId('meal-save').click();
  await expect(hero(page)).toHaveText('1,662');

  await page.getByTestId('add').click();
  await expect(page.getByTestId('recent').getByRole('button', { name: 'Add Chicken rice bowl again' })).toBeVisible();
  await page.getByRole('radio', { name: 'Saved' }).click(); // Recent and Saved are one list with a switch (R1)
  await page.getByTestId('saved').getByRole('button', { name: 'Add Usual breakfast again' }).click();
  await expect(hero(page)).toHaveText('1,965');
  // the Add sheet (taller since B1) must be gone before the swipe, or the swipe lands on it as it slides away
  await expect(page.getByTestId('add-sheet')).toBeHidden();

  // a long swipe left deletes, with undo (U1c: past half the row)
  const row = meals(page).filter({ hasText: 'Snack' });
  const box = (await row.boundingBox())!;
  await swipeAt(page, -260, { x: box.x + box.width - 40, y: box.y + box.height / 2 });
  await expect(meals(page)).toHaveCount(3);
  await expect(hero(page)).toHaveText('1,455');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today'); // the swipe deleted, it did not change tab
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(meals(page)).toHaveCount(4);
});

test('done keeps the training target, skip returns to rest; a past day shows its own meals', async ({ page }) => {
  await open(page, '/', MEALS);
  const training = page.getByTestId('training');
  await expect(training).toContainText('Strength');
  await expect(training).toContainText('60 min, -240 kcal'); // the type is not repeated when it is the name; ui-flat: a burn reads negative
  await expect(page.getByTestId('day-kind')).toHaveText('Training day');
  await training.getByTestId('session-done').click();
  await expect(training.getByTestId('session-tick')).toBeVisible(); // R2: the green check says done
  await expect(kcalOf(page)).toHaveText('of 2,460 kcal');
  await training.getByTestId('session-undo').click();
  await training.getByTestId('session-more').click();
  await page.getByTestId('session-skip').click();
  await expect(kcalOf(page)).toHaveText('of 2,220 kcal');
  await expect(page.getByTestId('day-kind')).toHaveText('Rest day');

  await page.getByTestId('hero-open').click();
  await expect(page.getByTestId('how-sheet')).toContainText('For a rest day');
  await expect(page.getByTestId('line-total')).toContainText('2,220 kcal');
  await page.keyboard.press('Escape');

  // yesterday: 2,300 kcal on a rest day is in the gain band, so its dot shows; the title becomes its date
  const week = page.getByTestId('week');
  await expect(week.getByRole('button', { name: 'Tuesday, November 10, on track' })).toBeVisible();
  await week.getByRole('button', { name: /Tuesday, November 10/ }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tue, Nov 10');
  await expect(hero(page)).toHaveText('2,300');
  await expect(page.getByTestId('hero')).toContainText('On track');
  await page.getByTestId('week-today').click(); // the anchored Today chip (R1)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Today');
});

test('the weigh-in prompt shows after three days and goes once you weigh in', async ({ page }) => {
  // the seeded weigh-in on TODAY is deleted; the last one left is four days old
  await open(page, '/', [{ collection: 'weight', id: `weight:${TODAY}`, updatedAt: 2, deleted: true, data: { date: TODAY, kg: 60 } }, { collection: 'weight', id: 'weight:2026-11-07', updatedAt: 1, data: { date: '2026-11-07', kg: 60.4 } }]);
  const card = page.getByTestId('weigh-card');
  // R2: the weigh-in is a box in the day's card: what to do, and how long since the last one
  await expect(card).toContainText('Weigh in');
  await expect(card).toContainText('4 days ago');
  await card.getByTestId('weigh-open').click();
  // the wheel starts at the last weigh-in
  await expect(page.getByTestId('picker-save')).toHaveText('Save 60.4 kg');
  await expect(page.getByTestId('picker-hint')).toHaveText('One a day. A new one replaces it.');
  // a flick of the tenths column: two rows down
  const tenths = page.getByTestId('picker-wheel').getByRole('slider').nth(1);
  await tenths.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('picker-save')).toHaveText('Save 60.6 kg');
  await wheelType(page, 'picker-wheel', '9'); // too light: brought inside the range, and said why
  await expect(page.getByTestId('picker-hint')).toHaveText('Enter a weight from 30 kg to 300 kg.');
  await expect(page.getByTestId('picker-save')).toHaveText('Save 30 kg');
  await pickerSave(page, '61.2');
  await expect(page.getByText('Weigh-in saved, 61.2 kg')).toBeVisible();
  await expect(card).toContainText('61.2 kg'); // a standing card: it shows the weight and Edit now (R1)
  await expect(card.getByTestId('weigh-open')).toHaveAccessibleName('Edit'); // R2: the box shows the weight, a tap edits it
});

test('logging works offline and reaches the account once the network is back', { tag: '@smoke' }, async ({ page, context }) => {
  await open(page);
  // the dev server serves code on demand: load Search and the food table once, as the service worker has them in a build
  await page.getByTestId('add').click();
  await page.getByTestId('add-search').click();
  await page.getByTestId('search-field').fill('banana');
  await expect(page.getByTestId('result').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('search-sheet')).toBeHidden();
  await context.setOffline(true);
  await expect(page.getByTestId('sync-mark')).toHaveAttribute('data-state', 'offline');
  await page.getByTestId('add').click();
  await page.getByTestId('add-search').click();
  await page.getByTestId('search-field').fill('banana');
  await page.getByTestId('result').first().click();
  await page.getByTestId('search-add').click();
  await expect(meals(page)).toHaveCount(1);
  await expect(hero(page)).not.toHaveText('0');
  await page.waitForTimeout(2000); // past the 1.5 s debounce: nothing can leave while offline
  expect(await pending(page)).toBe(1);

  await context.setOffline(false);
  await expect.poll(() => pending(page)).toBe(0);
  await expect(page.getByTestId('sync-mark')).toBeHidden();
});

// Safari with its toolbars showing: the hero card is whole above the dock, on a 390 by 844 phone and on the SE
for (const [name, viewport] of [['390 by 664', { width: 390, height: 664 }], ['SE, 375 by 548', { width: 375, height: 548 }]] as const) {
  test(`the hero sits above the dock in Safari, ${name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await open(page, '/', MEALS);
    const hero = (await page.getByTestId('hero').boundingBox())!;
    const dock = (await page.getByTestId('add').boundingBox())!;
    expect(hero.y + hero.height).toBeLessThanOrEqual(dock.y);
  });
}

test('a rest day takes an activity for that day only (R5): the box asks, the target grows, Undo takes it back', async ({ page }) => {
  await open(page);
  await page.getByTestId('week').getByRole('button', { name: /Tuesday, November 10/ }).click();
  await expect(kcalOf(page)).toHaveText('of 2,220 kcal');
  await page.getByTestId('rest-add').click();
  const sheet = page.getByTestId('activity-sheet');
  await expect(sheet).toContainText('Any activity today?');
  await expect(sheet.getByTestId('activity-walk')).toHaveAttribute('aria-checked', 'true'); // prefilled: one tap to add
  await sheet.getByTestId('activity-run').click();
  await expect(page.getByTestId('activity-kcal')).toHaveText('Adds 174 kcal to today'); // the engine's moderate cardio for 30 min at 60 kg
  await page.getByTestId('activity-add').click();
  await expect(page.getByTestId('session-done')).toHaveCount(0);
  await expect(page.getByTestId('training')).toContainText('Run');
  await expect(kcalOf(page)).not.toHaveText('of 2,220 kcal');
  // Undo takes it back, and the day is a rest day again
  await page.locator('[data-sonner-toast]').getByRole('button', { name: 'Undo' }).click();
  await expect(kcalOf(page)).toHaveText('of 2,220 kcal');
  await expect(page.getByTestId('rest-add')).toBeVisible();
});
