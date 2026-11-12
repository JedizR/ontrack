// B1 barcode scanning (F22) and supplements set from the tub (F21) on the mock backend, in WebKit, which has no camera:
// barcodes are typed, as on a phone whose camera cannot open. tests/e2e/camera.spec.ts scans one through Chromium's fake
// camera. Open Food Facts answers from tests/fixtures/off/ (dev/mock-backend.ts); labels from tests/fixtures/vision/.
// "Today" is 2026-11-11. Mama tom yum, 8850987101021: 472.73 kcal in 100 g, a 55 g serving, so 260 kcal.
import { expect, test, type Page } from '@playwright/test';
import { open, vision } from './helpers';

const hero = (page: Page) => page.getByTestId('hero-value');
const sheet = (page: Page) => page.getByTestId('scan-sheet');
/** The phone's camera answers with this error, as getUserMedia would. */
const camera = (page: Page, error: string) =>
  page.addInitScript((name) => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: () => Promise.reject(new DOMException('camera', name)) } });
  }, error);
/** Plus, Scan, then the number on the number pad. */
async function scan(page: Page, code: string, plus = true) {
  if (plus) {
    await page.getByTestId('add').click();
    await page.getByTestId('add-scan').click();
  }
  await page.getByTestId('barcode-field').fill(code);
  await page.getByTestId('barcode-find').click();
}
/** A label photo; the first one shows the photo notice. */
async function photo(page: Page, button: string, notice = false) {
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId(button).click();
  if (notice) {
    await expect(page.getByTestId('photo-notice')).toHaveText("Your photo of the label is sent to Google's Gemini to read its numbers, then discarded. Ontrack keeps only the numbers.");
    await page.getByTestId('photo-continue').click();
  }
  await (await chooser).setFiles('tests/fixtures/meal.jpg');
}
async function type(page: Page, testid: string, value: string) {
  const field = page.getByTestId(testid).getByRole('textbox');
  await field.fill(value);
  await field.press('Enter');
}

test('F22: a known barcode is found in Open Food Facts and logged, credited, with the amount kept for next time', { tag: '@smoke' }, async ({ page }) => {
  await camera(page, 'NotFoundError');
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('add-scan').click();
  await expect(page.getByTestId('scanner-problem')).toHaveText('This browser cannot open a camera here. Type the number instead.');
  await scan(page, '8850987101021', false);

  const product = page.getByTestId('product');
  await expect(product).toBeVisible();
  await expect(sheet(page).locator('[data-slot="drawer-title"]')).toHaveText('Mama Instant Noodles - Shrimp Tom Yum 1X60G');
  await expect(page.getByTestId('product-kcal')).toHaveText('260');
  await expect(page.getByTestId('product-source')).toHaveText('Open Food Facts');
  await expect(page.getByTestId('product-cite')).toContainText('Values from Open Food Facts, open data under the ODbL.');
  await expect(page.getByTestId('product-grams').getByRole('textbox')).toHaveValue('55');
  await expect(product.getByRole('button', { name: '1 serving' })).toBeVisible();
  await product.getByRole('button', { name: '100 g' }).click();
  await expect(page.getByTestId('product-kcal')).toHaveText('473');
  await product.getByRole('button', { name: '1 serving' }).click();
  await page.getByTestId('product-add').click();

  await expect(sheet(page)).toBeHidden();
  await expect(page.getByText('Added Mama Instant Noodles - Shrimp Tom Yum 1X60G')).toBeVisible();
  await expect(hero(page)).toHaveText('260');
  const row = page.getByTestId('meal').first();
  await expect(row).toContainText('Open Food Facts');
  await expect(row).toContainText('260');
  // the Meal sheet shows the item's source
  await row.click();
  await expect(page.getByTestId('meal-item')).toContainText('Open Food Facts');
});

test('F22: an unknown barcode is read from a label photo, saved, then scanned again offline', async ({ page, context }) => {
  await camera(page, 'NotFoundError');
  await open(page);
  await scan(page, '8850999220017');
  await expect(page.getByTestId('product-new')).toContainText('This barcode is not in Open Food Facts yet. Photograph the nutrition label and Ontrack keeps it for your next scan.');
  await expect(page.getByTestId('product-new')).toContainText('Barcode 8850999220017');
  await photo(page, 'label-photo', true);

  // the label as read: confirm it
  await expect(page.getByTestId('label')).toBeVisible();
  await expect(sheet(page).locator('[data-slot="drawer-title"]')).toHaveText('Check the label');
  await expect(page.getByTestId('label-name')).toHaveValue('Rice crackers, seaweed');
  await expect(page.getByTestId('label-serving').getByRole('textbox')).toHaveValue('25');
  await expect(page.getByTestId('label-kcal').getByRole('textbox')).toHaveValue('120');
  await expect(page.getByTestId('label-fat').getByRole('textbox')).toHaveValue('4.5');
  await page.getByTestId('label-save').click();

  await expect(page.getByTestId('product-source')).toHaveText('Label');
  await expect(page.getByTestId('product-kcal')).toHaveText('120');
  await expect(page.getByTestId('product-cite')).toHaveCount(0);
  // the pack holds two servings
  await page.getByTestId('product').getByRole('button', { name: 'Whole pack' }).click();
  await expect(page.getByTestId('product-kcal')).toHaveText('240');
  await page.getByTestId('product-add').click();
  await expect(hero(page)).toHaveText('240');

  // offline, the saved product is found at once and starts at the last amount
  await context.setOffline(true);
  await scan(page, '8850999220017');
  await expect(page.getByTestId('product-kcal')).toHaveText('240');
  await expect(page.getByTestId('product-source')).toHaveText('Label');
  await page.getByTestId('product-add').click();
  await expect(hero(page)).toHaveText('480');

  // a barcode never scanned needs the connection, and says so with a way forward
  await scan(page, '8851717040016');
  await expect(page.getByTestId('product-failed')).toContainText('Finding a new product needs a connection. Products you scanned before work offline.');
  await expect(page.getByTestId('label-type')).toBeVisible();
});

test('F22: camera denied falls back to typing; wrong digits are caught', async ({ page }) => {
  await camera(page, 'NotAllowedError');
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('add-scan').click();
  await expect(page.getByTestId('scanner-problem')).toHaveText("Camera access is off for Ontrack. Type the number, or allow the camera for this site in your browser's settings.");
  await expect(page.getByTestId('barcode-field')).toBeFocused();
  await expect(page.getByTestId('barcode-field')).toHaveAttribute('inputmode', 'numeric');
  await scan(page, '8850987101022', false);
  await expect(page.getByTestId('barcode-wrong')).toHaveText('Those digits do not make a barcode. Check them against the pack.');
  await scan(page, '8850987101021', false);
  await expect(page.getByTestId('product-kcal')).toHaveText('260');
});

test('F22: no nutrition and a photo that is not a label lead to typing the numbers; a correction reads Yours', async ({ page }) => {
  const space = await open(page);
  await camera(page, 'NotFoundError');
  await page.reload();
  await vision(page, space, { fixture: 'not-label' });
  await scan(page, '8851234567898');
  await expect(page.getByTestId('product-new')).toContainText('Open Food Facts has this product without its nutrition.');
  await photo(page, 'label-photo', true);
  await expect(page.getByTestId('label-failed')).toContainText('We could not read a nutrition label in that photo. Take it straight on and close enough to read.');
  await page.getByTestId('label-type').click();

  await expect(page.getByTestId('label-name')).toHaveValue('Green tea, honey lemon');
  await expect(page.getByTestId('label-save')).toBeDisabled();
  await type(page, 'label-kcal', '90');
  await expect(page.getByTestId('label-problem')).toHaveText('Add the serving size from the label.');
  await type(page, 'label-serving', '420');
  await type(page, 'label-carbs', '22');
  await expect(page.getByTestId('label-problem')).toHaveCount(0);
  await page.getByTestId('label-save').click();
  await expect(page.getByTestId('product-source')).toHaveText('Yours');
  await expect(page.getByTestId('product-kcal')).toHaveText('90');

  // Correct the numbers: a changed value stays the user's
  await page.getByTestId('product-correct').click();
  await expect(sheet(page).locator('[data-slot="drawer-title"]')).toHaveText('Correct the numbers');
  await type(page, 'label-kcal', '100');
  await page.getByTestId('label-save').click();
  await expect(page.getByTestId('product-kcal')).toHaveText('100');
  await page.getByTestId('product-add').click();
  await expect(hero(page)).toHaveText('100');
  await expect(page.getByTestId('meal').first()).toContainText('Yours');
});

test('F21 (B1): whey set up by scanning its tub', async ({ page }) => {
  await camera(page, 'NotFoundError');
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('supplement-entry').click();
  await expect(page.getByTestId('kind-whey')).toContainText("Set from your tub's label");
  await page.getByTestId('kind-whey').click();
  await page.getByTestId('tub-scan').click();
  await page.getByTestId('barcode-field').fill('0748927028669');
  await page.getByTestId('barcode-find').click();

  await expect(page.getByTestId('supplement-label')).toBeVisible();
  await expect(page.getByTestId('supplement-name')).toHaveValue('100% Whey Gold Standard');
  await expect(page.getByTestId('supplement-scoop').getByRole('textbox')).toHaveValue('30.4');
  await expect(page.getByTestId('supplement-kcal').getByRole('textbox')).toHaveValue('120');
  await expect(page.getByTestId('supplement-protein').getByRole('textbox')).toHaveValue('24');
  await expect(page.getByTestId('supplement-why')).toHaveText('From Open Food Facts. Check them against your tub.');
  await page.getByTestId('supplement-save').click();
  await expect(page.getByTestId('supplement-add')).toHaveText('Add 120 kcal');
  await expect(page.getByTestId('supplement-typical')).toHaveCount(0);
});

test('F21 (B1): a mass gainer set up from a photo of its label', async ({ page }) => {
  const space = await open(page);
  await vision(page, space, { fixture: 'label-whey' });
  await page.getByTestId('add').click();
  await page.getByTestId('supplement-entry').click();
  await page.getByTestId('kind-gainer').click();
  await expect(page.getByTestId('tub-typical')).toHaveCount(0);
  await photo(page, 'tub-photo', true);
  await expect(page.getByTestId('supplement-label')).toBeVisible();
  await expect(page.getByTestId('supplement-scoop').getByRole('textbox')).toHaveValue('31');
  await expect(page.getByTestId('supplement-kcal').getByRole('textbox')).toHaveValue('120');
  await expect(page.getByTestId('supplement-fat').getByRole('textbox')).toHaveValue('1.5');
  await expect(page.getByTestId('supplement-why')).toHaveText("Read from your tub's label. Check each number.");
  await page.getByTestId('supplement-save').click();
  await expect(page.getByTestId('supplement-typical')).toHaveCount(0);
});

test('F21 (B1): typical values say Typical, with one quiet way to set them from the tub', async ({ page }) => {
  await camera(page, 'NotFoundError');
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('supplement-entry').click();
  await page.getByTestId('kind-whey').click();
  await page.getByTestId('tub-typical').click();
  await expect(page.getByTestId('supplement-kcal').getByRole('textbox')).toHaveValue('106');
  // a typical value follows the scoop and stays typical
  await type(page, 'supplement-scoop', '32');
  await page.getByTestId('supplement-save').click();
  await expect(page.getByTestId('supplement-typical')).toContainText('Typical');
  await page.getByTestId('supplement-add').click();

  // on Today, in Add, and in the logged item
  await expect(page.getByTestId('meal').first()).toContainText('Typical');
  await page.getByTestId('add').click();
  await expect(page.getByTestId('supplement')).toContainText('Typical');
  await page.getByTestId('supplement').click();
  await page.getByTestId('supplement-define').click();
  await expect(page.getByTestId('supplement-source')).toBeVisible();
  await expect(page.getByTestId('tub-typical')).toHaveCount(0);
  await page.getByTestId('tub-scan').click();
  await page.getByTestId('barcode-field').fill('0748927028669');
  await page.getByTestId('barcode-find').click();
  // setting it from the tub keeps the user's own name
  await expect(page.getByTestId('supplement-name')).toHaveValue('Whey protein');
  await page.getByTestId('supplement-save').click();
  await expect(page.getByTestId('supplement-amount')).toBeVisible();
  await expect(page.getByTestId('supplement-typical')).toHaveCount(0);
  await expect(page.getByTestId('supplement-add')).toHaveText('Add 120 kcal');
  await page.keyboard.press('Escape');
  await page.getByTestId('add').click();
  await expect(page.getByTestId('supplement')).not.toContainText('Typical');
});
