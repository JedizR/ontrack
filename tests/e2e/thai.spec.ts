// N1 on the mock backend, through the real /api/analyze handler: Thai dishes from the table (F14) and remembered
// nutrition (F15). Fixture pad-thai: pad thai with shrimp, 350 g (FNDDS, 147 kcal in 100 g, so 515), and Thai milk tea,
// 400 g (SG FoodID, 69 kcal in 100 g, so 276).
import { expect, test, type Page } from '@playwright/test';
import { open, takePhoto, vision, withPrefs } from './helpers';

const review = (page: Page) => page.getByTestId('review-sheet');
const item = (page: Page, n: number, sheet = 'review-sheet') => page.getByTestId(sheet).getByTestId('meal-item').nth(n);
const search = async (page: Page, q: string) => {
  await page.getByTestId('add').click();
  await page.getByTestId('add-search').click();
  await page.getByTestId('search-field').fill(q);
  await page.getByTestId('result').first().click();
};
/** Open an item's row, then Correct, and type a value into one of its steppers. */
async function correct(page: Page, n: number, key: 'kcal' | 'protein', value: string, sheet = 'review-sheet') {
  await item(page, n, sheet).locator('button[aria-expanded]').click();
  await item(page, n, sheet).getByTestId('item-correct-open').click();
  const field = item(page, n, sheet).getByTestId(`correct-${key}`).getByRole('textbox');
  await field.fill(value);
  await field.press('Enter');
}

test('F14: a Thai script alias finds a Thai dish, which shows its source and logs from the table', async ({ page }) => {
  await open(page);
  await search(page, 'ข้าวมันไก่');
  await expect(page.getByTestId('search-sheet')).toContainText('Khao man kai');
  await expect(page.getByTestId('portion-kcal')).toHaveText('515');
  await expect(page.getByTestId('portion-source')).toHaveText('Database');
  await expect(page.getByTestId('portion-cite')).toContainText('Values from SG FoodID, Health Promotion Board, Singapore, read on 12 November 2026.');
  await expect(page.getByTestId('portion-cite').getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', 'https://go.gov.sg/termsofuse-hpbsgfoodid');
  await page.getByTestId('search-add').click();
  await expect(page.getByTestId('meal').first()).toContainText('Khao man kai');
});

test('F14: a Thai dish in a photo comes from the table and reads Database', async ({ page }) => {
  await withPrefs(page, { photoOk: true });
  const s = await open(page);
  await vision(page, s, { fixture: 'pad-thai' });
  await takePhoto(page);
  await expect(item(page, 0)).toContainText('Pad thai with shrimp');
  await expect(item(page, 0)).toContainText('Database');
  await expect(item(page, 0)).toContainText('515');
  await expect(item(page, 1)).toContainText('Thai milk tea');
  await expect(item(page, 1)).toContainText('276');
  await expect(page.getByTestId('review-add')).toHaveText('Add 791 kcal');
});

test('F15: a corrected food comes back as Yours in photos and search, until Use default values forgets it', async ({ page }) => {
  await withPrefs(page, { photoOk: true });
  const s = await open(page);
  await vision(page, s, { fixture: 'pad-thai' });

  // correct the pad thai in the review, and log it
  await takePhoto(page);
  await correct(page, 0, 'kcal', '600');
  await expect(item(page, 0)).toContainText('Yours');
  await expect(item(page, 0)).toContainText('600');
  await expect(page.getByTestId('item-correct')).toContainText('Ontrack remembers your numbers for this food.');
  await expect(page.getByTestId('review-add')).toHaveText('Add 876 kcal');
  await page.getByTestId('review-add').click();
  await expect(review(page)).toBeHidden();

  // search uses the remembered numbers: 600 for 350 g
  await search(page, 'pad thai with shrimp');
  await expect(page.getByTestId('portion-kcal')).toHaveText('600');
  await expect(page.getByTestId('portion-source')).toHaveText('Yours');
  await page.keyboard.press('Escape');

  // the next photo of it is Yours too; Use default values puts the table back and forgets
  await takePhoto(page);
  await expect(item(page, 0)).toContainText('Yours');
  await expect(item(page, 0)).toContainText('600');
  await expect(item(page, 1)).toContainText('Database');
  await item(page, 0).locator('button[aria-expanded]').click();
  await item(page, 0).getByTestId('item-default').click();
  await expect(item(page, 0)).toContainText('Database');
  await expect(item(page, 0)).toContainText('515');
  await page.keyboard.press('Escape');
  await expect(review(page)).toBeHidden();

  await takePhoto(page);
  await expect(item(page, 0)).toContainText('Database');
  await expect(item(page, 0)).toContainText('515');
});

test('F15: correcting a logged meal remembers it too, and search can forget it', async ({ page }) => {
  await withPrefs(page, { photoOk: true });
  const s = await open(page);
  await vision(page, s, { fixture: 'pad-thai' });
  await takePhoto(page);
  await page.getByTestId('review-add').click();
  await expect(review(page)).toBeHidden();

  await page.getByTestId('meal').first().click();
  await expect(page.getByTestId('meal-sheet')).toBeVisible();
  await correct(page, 1, 'kcal', '200', 'meal-sheet');
  await expect(item(page, 1, 'meal-sheet')).toContainText('Yours');
  await page.getByTestId('meal-save').click();
  await expect(page.getByTestId('meal-sheet')).toBeHidden();

  // 200 kcal for 400 g is 50 in 100 g, so a 400 g cup is 200
  await search(page, 'thai milk tea');
  await expect(page.getByTestId('portion-kcal')).toHaveText('200');
  await expect(page.getByTestId('portion-source')).toHaveText('Yours');
  await page.getByTestId('portion-default').click();
  await expect(page.getByTestId('portion-kcal')).toHaveText('276');
  await expect(page.getByTestId('portion-source')).toHaveText('Database');
  await expect(page.getByTestId('portion-default')).toBeHidden();
});
