// Training (F7, F8), on the mock backend. "Today" is Wednesday 2026-11-11; the seeded program trains Monday,
// Wednesday, Friday and Saturday, an hour of moderate strength each: 2,460 kcal on a training day, 2,220 at rest.
import { expect, test, type Page } from '@playwright/test';
import { open } from './helpers';

const week = (page: Page) => page.getByTestId('train-week');
const day = (page: Page, d: number) => page.getByTestId(`train-day-${d}`);
const kcalOf = (page: Page) => page.getByTestId('hero').getByText(/^of [\d,]+ kcal$/);

test('build a week: add a session, list exercises, see the analysis with its sources, drag a session, delete with undo', { tag: '@smoke' }, async ({ page }) => {
  await open(page);
  await page.getByTestId('tab-1').click();
  await expect(page.getByTestId('train-summary')).toContainText('4 sessions, 240 minutes a week');
  await expect(page.getByTestId('train-summary')).toContainText('Adds 137 kcal a day on average');
  await expect(page.getByTestId('train-balance-empty')).toContainText('List your exercises to see muscle balance');

  // a hard run on Tuesday, a rest day
  await day(page, 1).getByTestId('train-rest').click();
  const sheet = page.getByTestId('train-session-sheet');
  await sheet.getByTestId('session-name').fill('Run');
  await sheet.getByRole('button', { name: 'Cardio' }).click();
  await sheet.getByRole('button', { name: 'Hard' }).click();
  await sheet.getByRole('button', { name: 'Less Minutes a session' }).click();
  await expect(sheet.getByTestId('session-kcal')).toHaveText('Adds 440 kcal to the day'); // (9 - 1) MET x 60 kg x 55 min
  await sheet.getByTestId('session-save').click();
  await expect(day(page, 1)).toContainText('Cardio, 55 min');
  await expect(page.getByTestId('train-pending')).toHaveText('Your targets follow this program from tomorrow.');
  await expect(page.getByTestId('train-cardio')).toContainText('110 of 150 to 300 minutes a week'); // vigorous counts double

  // exercises for Monday: pull-ups from the picker, filtered to back
  await day(page, 0).getByTestId('train-session').click();
  await sheet.getByTestId('exercise-add').click();
  const picker = page.getByTestId('exercise-picker');
  await picker.getByRole('button', { name: 'Back', exact: true }).click();
  await picker.getByTestId('exercise-option').filter({ hasText: 'Pull-up' }).click();
  await expect(sheet.getByTestId('session-exercise')).toContainText('3 sets, 8 to 12 reps');
  await sheet.getByRole('button', { name: 'More Sets' }).click();
  await sheet.getByTestId('session-save').click();
  await expect(page.getByTestId('muscle-back')).toContainText('4');
  await expect(page.getByTestId('muscle-biceps')).toContainText('2');
  const rec = page.getByTestId('rec').first();
  await expect(rec).toContainText('gets 0 sets a week, so add 10 to reach the range linked with better growth.');
  await rec.getByTestId('rec-why').click();
  await expect(rec.getByTestId('rec-source')).toContainText('Schoenfeld BJ');

  // Saturday's session dragged by its handle to Sunday
  const handle = day(page, 5).getByTestId('train-handle');
  await handle.scrollIntoViewIfNeeded();
  const from = (await handle.boundingBox())!;
  const to = (await day(page, 6).boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(day(page, 5)).toContainText('Rest');
  await expect(day(page, 6)).toContainText('Strength, 60 min');

  // delete Sunday's session, then take it back
  await day(page, 6).getByTestId('train-session').click();
  await sheet.getByTestId('session-delete').click();
  await expect(day(page, 6)).toContainText('Rest');
  await page.locator('[data-sonner-toast]').filter({ hasText: 'Session deleted' }).getByRole('button', { name: 'Undo' }).click();
  await expect(day(page, 6)).toContainText('Strength, 60 min');
  await expect(week(page).getByTestId('train-session')).toHaveCount(5);
});

test('a template replaces the program from tomorrow; today and the days before keep their targets, and tomorrow trains to the new one', async ({ page }) => {
  await open(page);
  await page.getByTestId('tab-1').click();
  await page.getByTestId('train-change').click();
  await page.getByTestId('template-upper-lower-4').getByTestId('template-use').click();
  await expect(page.getByTestId('template-confirm-sheet')).toContainText('It replaces your current program.');
  await page.getByTestId('template-confirm').click();
  await expect(page.getByTestId('train-summary')).toContainText('4 sessions, 280 minutes a week');
  await expect(page.getByTestId('train-summary')).toContainText('Upper lower 4 days');
  await expect(page.getByTestId('train-recs')).toContainText('No changes to suggest.');
  await expect(day(page, 3)).toContainText('Upper B'); // Thursday

  // today, Wednesday, keeps its session and target; Tuesday, now Lower A, stays a rest day
  await page.getByTestId('tab-0').click();
  await expect(kcalOf(page)).toHaveText('of 2,460 kcal');
  await expect(page.getByTestId('training')).toContainText('Strength, 60 min. Adds 240 kcal');
  await page.getByTestId('week').getByRole('button', { name: /Tuesday, November 10/ }).click();
  await expect(kcalOf(page)).toHaveText('of 2,220 kcal');
  await expect(page.getByTestId('day-kind')).toHaveText('Rest day');

  // tomorrow is Thursday: Upper B, 70 minutes, and its energy is in the target; skipping it returns to rest (F8)
  await page.clock.setFixedTime(new Date('2026-11-12T10:00:00+07:00'));
  await page.reload();
  await expect(page.getByTestId('training')).toContainText('Upper B');
  await expect(kcalOf(page)).toHaveText('of 2,500 kcal');
  await page.getByTestId('session-more').click();
  await page.getByTestId('session-skip').click();
  await expect(kcalOf(page)).toHaveText('of 2,220 kcal');
  // and Wednesday, now a past day, is still what it was
  await page.getByTestId('week').getByRole('button', { name: /Wednesday, November 11/ }).click();
  await expect(kcalOf(page)).toHaveText('of 2,460 kcal');
  await expect(page.getByTestId('training')).toContainText('Strength');
});
