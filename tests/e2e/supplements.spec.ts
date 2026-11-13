// N2 supplements (F21) on the mock backend. "Today" is 2026-11-11, a training day for the seeded plan (2,460 kcal).
// Whey from the gate's label: a 32 g scoop with 120 kcal, 24 g protein, 3 g carbs and 1.5 g fat. Whole milk is the food
// table's (61 kcal in 100 g, so 153 for 250 g).
import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers';

const hero = (page: Page) => page.getByTestId('hero-value');
const sheet = (page: Page) => page.getByTestId('supplement-sheet');
const pending = (page: Page) => page.evaluate(() => (window as unknown as { ontrack: { db: { pending: number } } }).ontrack.db.pending);
/** Type a value into one of the sheet's steppers. */
async function type(page: Page, testid: string, value: string) {
  const field = page.getByTestId(testid).getByRole('textbox');
  await field.fill(value);
  await field.press('Enter');
}
const WHEY = { collection: 'supplement', id: 'sup-whey', updatedAt: 1, data: { name: 'Whey protein', kind: 'whey', scoopG: 32, perScoop: { kcal: 120, protein: 24, carbs: 3, fat: 1.5 }, lastScoops: 2 } };

test('F21: whey set up from its label, then 2 scoops in three taps from the plus, and Today updates', { tag: '@smoke' }, async ({ page }) => {
  await open(page);
  await expect(hero(page)).toHaveText('0');

  // set up: the entry under the ways, the kind, then the label
  await page.getByTestId('add').click();
  // O1: a lifter's entry row asks the question, and gaining lists whey and mass gainer first
  await expect(page.getByTestId('supplement-entry')).toContainText('Have a shake most days? Set up your tub once, then log it in three taps.');
  await page.getByTestId('supplement-entry').click();
  await expect(sheet(page)).toContainText('Ontrack logs what you take. It does not recommend supplements or amounts.');
  await expect(page.locator('[data-testid^="kind-"]')).toHaveText([/Whey protein/, /Mass gainer/, /Plant protein/, /Casein/, /Creatine/, /Something else/]);
  await page.getByTestId('kind-whey').click();
  // B1: the tub first, typical values second
  await expect(page.getByTestId('supplement-source')).toContainText("Brands differ a lot. Copy your tub's numbers in seconds.");
  await page.getByTestId('tub-typical').click();
  await expect(page.getByTestId('supplement-name')).toHaveValue('Whey protein');
  // USDA's average to start, following the scoop
  await expect(page.getByTestId('supplement-serving').getByRole('textbox')).toHaveValue('30');
  await expect(page.getByTestId('supplement-kcal').getByRole('textbox')).toHaveValue('106');
  await expect(page.getByTestId('supplement-why')).toHaveText('Brands differ, so the label on your tub is more accurate than this average from USDA FoodData Central, SR Legacy.');
  await type(page, 'supplement-serving', '32');
  await expect(page.getByTestId('supplement-kcal').getByRole('textbox')).toHaveValue('113');
  // the label's numbers; a typo heavier than the scoop is caught
  await type(page, 'supplement-kcal', '120');
  await type(page, 'supplement-protein', '40');
  await type(page, 'supplement-carbs', '3');
  await type(page, 'supplement-fat', '1.5');
  await expect(page.getByTestId('supplement-heavy')).toHaveText('Protein, carbs and fat add up to more than the serving. Check the label.');
  await expect(page.getByTestId('supplement-save')).toBeDisabled();
  await type(page, 'supplement-protein', '24');
  await expect(page.getByTestId('supplement-heavy')).toBeHidden();
  await type(page, 'supplement-usual', '2');
  await page.getByTestId('supplement-save').click();
  // saved: its amount step, at the scoops the user takes
  await expect(page.getByTestId('supplement-amount')).toBeVisible();
  await expect(page.getByTestId('supplement-add')).toHaveText('Add 240 kcal');
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();

  // three taps: the plus, the supplement, Add
  await page.getByTestId('add').click();
  await expect(page.getByTestId('supplement')).toContainText('Whey protein');
  await expect(page.getByTestId('supplement')).toContainText('2 scoops');
  await expect(page.getByTestId('supplement')).toContainText('240');
  await expect(page.getByTestId('recent')).toHaveCount(0);
  await page.getByTestId('supplement').click();
  await expect(page.getByTestId('supplement-kcal')).toHaveText('240');
  await expect(page.getByTestId('supplement-macros')).toHaveText('48 g protein, 6 g carbs, 3 g fat');
  await page.getByTestId('supplement-add').click();

  await expect(sheet(page)).toBeHidden();
  await expect(page.getByText('Added Whey protein')).toBeVisible();
  await expect(hero(page)).toHaveText('240');
  await expect(page.getByTestId('macro-protein')).toContainText('48');
  const row = page.getByTestId('meal').first();
  await expect(row).toContainText('Whey protein');
  await expect(row).toContainText('2 scoops');
  await expect(row).toContainText('240');
  // not repeated under Recent: it sits at the top
  await page.getByTestId('add').click();
  await expect(page.getByTestId('recent')).toHaveCount(0);
  await expect(page.getByTestId('recent-empty')).toBeVisible();
});

test('F21: creatine is logged as taken, a chip on Today with no 0 kcal row, and deleted with undo', async ({ page }) => {
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('supplement-entry').click();
  await page.getByTestId('kind-creatine').click();
  await expect(page.getByTestId('tub-typical')).toHaveCount(0); // no typical values for creatine
  await page.getByTestId('tub-type').click();
  await expect(page.getByTestId('supplement-name')).toHaveValue('Creatine');
  await expect(page.getByTestId('supplement-why')).toHaveText('Copy the numbers from the label on your tub.');
  await expect(page.getByTestId('supplement-serving').getByRole('textbox')).toHaveValue('0');
  await expect(page.getByTestId('supplement-zero')).toHaveText('No calories, so Today shows it as taken.');
  await type(page, 'supplement-serving', '5');
  await page.getByTestId('supplement-save').click();

  await expect(page.getByTestId('supplement-zero')).toBeVisible();
  await expect(page.getByTestId('supplement-kcal')).toHaveCount(0);
  await expect(page.getByTestId('supplement-mix')).toHaveCount(0);
  await page.getByTestId('supplement-add').click();
  await expect(page.getByText('Creatine taken')).toBeVisible();

  await expect(page.getByTestId('taken-chip')).toHaveText('Creatine');
  await expect(page.getByTestId('meal')).toHaveCount(0);
  await expect(page.getByTestId('meal-count')).toHaveCount(0);
  await expect(hero(page)).toHaveText('0');

  // the chip opens the entry: Delete, then Undo
  await page.getByTestId('taken-chip').click();
  await expect(page.getByTestId('supplement-add')).toHaveText('Save changes');
  await page.getByTestId('supplement-delete').click();
  await expect(page.getByTestId('taken')).toHaveCount(0);
  await expect(page.getByText('Creatine deleted')).toBeVisible();
  await expect(page.getByText('Creatine taken')).toBeHidden(); // one undo at a time
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('taken-chip')).toHaveText('Creatine');
});

test("F21, O1: a mass gainer set up as its label prints it: 4 scoops in a 165 g serving", async ({ page }) => {
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('supplement-entry').click();
  await page.getByTestId('kind-gainer').click();
  await page.getByTestId('tub-type').click();
  await type(page, 'supplement-serving', '165');
  await type(page, 'supplement-per', '4');
  await type(page, 'supplement-kcal', '650');
  await type(page, 'supplement-protein', '50');
  await type(page, 'supplement-carbs', '100');
  await type(page, 'supplement-fat', '6');
  await page.getByTestId('supplement-save').click();
  // kept as one scoop: a quarter of the serving
  await expect(page.getByTestId('supplement-add')).toHaveText('Add 163 kcal');
  await expect(page.getByTestId('supplement-macros')).toHaveText('12.5 g protein, 25 g carbs, 1.5 g fat');
  // edited later, it shows as a serving of one scoop
  await page.getByTestId('supplement-edit').click();
  await expect(page.getByTestId('supplement-serving').getByRole('textbox')).toHaveValue('41.3');
  await expect(page.getByTestId('supplement-per').getByRole('textbox')).toHaveValue('1');
  await expect(page.getByTestId('supplement-kcal').getByRole('textbox')).toHaveValue('163');
});

test('F21: mixed with milk, edited, deleted with undo; the label edited and the supplement removed with undo', async ({ page }) => {
  await open(page, '/', [WHEY]);
  await page.getByTestId('add').click();
  await page.getByTestId('supplement').click();
  await expect(page.getByTestId('supplement-add')).toHaveText('Add 240 kcal');
  await page.getByTestId('supplement-mix').getByRole('button', { name: 'Whole milk' }).click();
  // O1: milk in ml, a 250 ml glass to start, kept in grams by the table's cup (257.8 g, 157 kcal)
  await expect(page.getByTestId('supplement-milk').getByRole('textbox')).toHaveValue('250');
  await expect(page.getByTestId('supplement-milk')).toContainText('ml');
  await expect(page.getByTestId('supplement-add')).toHaveText('Add 397 kcal');
  await page.getByTestId('supplement-add').click();
  const row = page.getByTestId('meal').first();
  await expect(row).toContainText('2 scoops with milk');
  await expect(hero(page)).toHaveText('397');

  // edit: one and a half scoops, the same milk
  await row.getByRole('button').first().click();
  await expect(page.getByTestId('supplement-scoops').getByRole('textbox')).toHaveValue('2');
  await expect(page.getByTestId('supplement-mix').getByRole('button', { name: 'Whole milk' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('supplement-scoops').getByRole('button', { name: 'Less Scoops' }).click();
  await expect(page.getByTestId('supplement-kcal')).toHaveText('337');
  await page.getByTestId('supplement-add').click();
  await expect(page.getByText('Changes saved')).toBeVisible();
  await expect(row).toContainText('1.5 scoops with milk');
  await expect(hero(page)).toHaveText('337');

  // delete, then undo
  await row.getByRole('button').first().click();
  await page.getByTestId('supplement-delete').click();
  await expect(page.getByTestId('meal')).toHaveCount(0);
  await expect(page.getByText('Added Whey protein')).toBeHidden(); // one undo at a time
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(hero(page)).toHaveText('337');

  // the label, from the amount step: a new number, then Remove with undo. Correcting the entry left the next start alone
  await page.getByTestId('add').click();
  await expect(page.getByTestId('supplement')).toContainText('2 scoops with milk');
  await expect(page.getByTestId('supplement')).toContainText('397');
  await page.getByTestId('supplement').click();
  await page.getByTestId('supplement-edit').click();
  await expect(page.getByTestId('supplement-why')).toHaveText('Copy the numbers from the label on your tub.');
  await type(page, 'supplement-kcal', '130');
  await page.getByTestId('supplement-save').click();
  await expect(page.getByTestId('supplement-kcal')).toHaveText('417');
  await page.getByTestId('supplement-edit').click();
  await page.getByTestId('supplement-remove').click();
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByText('Whey protein removed')).toBeVisible();
  await expect(page.getByText('Whey protein deleted')).toBeHidden();
  await expect(hero(page)).toHaveText('337'); // what was logged keeps its numbers
  await page.getByRole('button', { name: 'Undo' }).click();
  await page.getByTestId('add').click();
  await expect(page.getByTestId('supplement')).toContainText('Whey protein');
});

test('F21: a supplement logs offline and reaches the account once the network is back', { tag: '@smoke' }, async ({ page, context }) => {
  await open(page, '/', [WHEY]);
  // the dev server serves code on demand: load the logging sheets and the food table once, as a build precaches them
  await page.getByTestId('add').click();
  await page.getByTestId('supplement').click();
  await expect(page.getByTestId('supplement-mix').getByRole('button', { name: 'Whole milk' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();

  await context.setOffline(true);
  await expect(page.getByTestId('sync-mark')).toHaveAttribute('data-state', 'offline');
  await page.getByTestId('add').click();
  await page.getByTestId('supplement').click();
  await page.getByTestId('supplement-add').click();
  await expect(hero(page)).toHaveText('240');
  await page.waitForTimeout(2000); // past the 1.5 s debounce: nothing can leave while offline
  expect(await pending(page)).toBe(2); // the entry and the supplement's last amount

  await context.setOffline(false);
  await expect.poll(() => pending(page)).toBe(0);
  await expect(page.getByTestId('sync-mark')).toBeHidden();
});

test("F21 (M9a): a logged entry's time is changed on its amount step", async ({ page }) => {
  await open(page, '/', [WHEY]);
  await page.getByTestId('add').click();
  await page.getByTestId('supplement').click();
  await expect(page.getByTestId('supplement-time')).toHaveCount(0); // a new entry is logged now
  await page.getByTestId('supplement-add').click();
  const row = page.getByTestId('meal').first();
  await expect(row).toContainText('2 scoops');

  await row.getByRole('button').first().click();
  await expect(page.getByTestId('supplement-time')).toHaveValue(/^\d\d:\d\d$/);
  await page.getByTestId('supplement-time').fill('07:30');
  await page.getByTestId('supplement-add').click();
  await expect(page.getByText('Changes saved')).toBeVisible();
  await expect(row).toContainText('07:30');
  await expect(hero(page)).toHaveText('240');
  await row.getByRole('button').first().click();
  await expect(page.getByTestId('supplement-time')).toHaveValue('07:30');
});
