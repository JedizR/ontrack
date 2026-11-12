// Photo logging (F4) and Describe (F5) on the mock backend, through the real /api/analyze handler with the mock
// provider. Each test names the fixture the provider answers with. Fixture numbers: basil pork is 712 kcal, 37 g protein (rice from the Thai FCD since N3).
import { expect, test, type Page } from '@playwright/test';
import { open, takePhoto, vision, withPrefs } from './helpers';

const hero = (page: Page) => page.getByTestId('hero-value');
const review = (page: Page) => page.getByTestId('review-sheet');
const items = (page: Page) => review(page).getByTestId('meal-item');
const error = (page: Page) => page.getByTestId('review-error');

test('a photo becomes a reviewed meal with its thumbnail, oil included', { tag: '@smoke' }, async ({ page }) => {
  const s = await open(page);
  await vision(page, s, { fixture: 'basil-pork' });
  await page.getByTestId('add').click();
  await page.getByTestId('add-photo').click();
  await expect(page.getByTestId('photo-notice')).toHaveText("Your photo is sent to Google's Gemini to identify the food, then discarded. Ontrack keeps only a small thumbnail.");
  await page.keyboard.press('Escape');
  await takePhoto(page, true);

  await expect(page.getByTestId('review-photo')).toBeVisible();
  await expect(items(page)).toHaveCount(3);
  await expect(items(page).nth(0)).toContainText('White rice');
  await expect(items(page).nth(0)).toContainText('Database');
  await expect(items(page).nth(1)).toContainText('Estimate');
  await expect(page.getByTestId('review-total')).toHaveText('712 kcal, 37 g protein');
  await page.getByRole('radio', { name: '1 tsp' }).click();
  await expect(page.getByTestId('review-oil-adds')).toHaveText('Adds 40 kcal of oil as its own item');
  await expect(page.getByTestId('review-add')).toHaveText('Add 752 kcal');
  await page.getByTestId('review-keep').click();
  await page.getByTestId('review-add').click();

  await expect(review(page)).toBeHidden();
  await expect(hero(page)).toHaveText('752');
  const row = page.getByTestId('meal').first();
  await expect(row).toContainText('Basil pork with rice and fried egg');
  await expect(row.getByTestId('thumb')).toBeVisible();
  // the meal is saved for later, and the notice does not come back
  await page.getByTestId('add').click();
  await expect(page.getByTestId('saved')).toContainText('Basil pork with rice and fried egg');
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('add-photo').click();
  await chooser;
});

test('not food, a provider failure and the daily limit each say so and offer another way', async ({ page }) => {
  await withPrefs(page, { photoOk: true });
  const s = await open(page);
  await vision(page, s, { fixture: 'not-food' });
  await takePhoto(page);
  await expect(error(page)).toContainText('We could not find food in that photo.');

  await vision(page, s, { fixture: 'fail' });
  await page.getByTestId('review-retry').click();
  await expect(error(page)).toContainText('Could not analyse the photo. Try again or add it by hand.');

  await vision(page, s, { fixture: null, used: 40 });
  await page.getByTestId('review-retry').click();
  await expect(error(page)).toContainText("You have used today's 40 photo analyses. Search and quick add still work.");
  await expect(page.getByTestId('review-retry')).toBeHidden();

  // by hand keeps the photo and builds the meal from Search
  await page.getByTestId('review-by-hand').click();
  await page.getByTestId('search-field').fill('banana');
  await page.getByTestId('result').first().click();
  await page.getByTestId('search-add').click();
  await expect(items(page)).toHaveCount(1);
  await page.getByTestId('review-add').click();
  await expect(page.getByTestId('meal').first().getByTestId('thumb')).toBeVisible();
});

test('offline, the photo waits for a connection, then Try again works', async ({ page, context }) => {
  await withPrefs(page, { photoOk: true });
  const s = await open(page);
  await vision(page, s, { fixture: 'chicken-rice' });
  // the dev server serves code on demand: open the logging sheets once while online
  await page.getByTestId('add').click();
  await expect(page.getByTestId('add-photo')).toBeVisible();
  await page.keyboard.press('Escape');
  await context.setOffline(true);
  await takePhoto(page);
  await expect(error(page)).toContainText('Photo analysis needs a connection.');
  await context.setOffline(false);
  await page.getByTestId('review-retry').click();
  await expect(items(page)).toHaveCount(3);
  await page.getByTestId('review-add').click();
  await expect(page.getByTestId('meal').first()).toContainText('Chicken rice');
});

test('describe a meal and get the same review, without a photo', async ({ page }) => {
  const s = await open(page);
  await vision(page, s, { fixture: 'oats-banana' });
  await page.getByTestId('add').click();
  await page.getByTestId('add-describe').click();
  await expect(page.getByTestId('describe-text')).toBeFocused();
  await page.getByTestId('describe-text').fill('Oats with a banana and a glass of milk');
  await page.getByTestId('describe-analyse').click();
  await expect(items(page)).toHaveCount(3);
  await expect(page.getByTestId('review-photo')).toHaveCount(0);
  await expect(page.getByTestId('review-oil')).toHaveCount(0);
  await page.getByTestId('review-add').click();
  await expect(hero(page)).toHaveText('454');
  await expect(page.getByTestId('meal').first().getByTestId('thumb')).toHaveCount(0);
});
