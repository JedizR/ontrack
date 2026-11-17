// R1, Bevel's workout log: Start on Today, the sets of the session, a tick that starts a rest, How was it?, the summary,
// and the day showing it done with its sets; the next workout starts from what was lifted, and a heavier lift is a new best.
import { expect, test } from '@playwright/test';
import { open } from './helpers';

const PROGRAM = { name: 'Test', sessions: [{ key: 's1', weekday: 2, name: 'Upper A', type: 'strength', minutes: 60, intensity: 'moderate', exercises: [{ exerciseId: 'bench-press', sets: 2, repsMin: 6, repsMax: 8 }, { exerciseId: 'db-fly', sets: 1, repsMin: 10, repsMax: 12 }] }] };
type Hook = { ontrack: { actions: { saveProgram(p: object): void } } };

test('a strength session is logged set by set, with a rest, an effort and a summary, and the day shows it', async ({ page }) => {
  await open(page);
  await page.evaluate((p) => (window as unknown as Hook).ontrack.actions.saveProgram(p), PROGRAM);
  const training = page.getByTestId('training');
  await expect(training.getByTestId('session-start')).toBeVisible(); // exercises listed: Start, not Done
  await expect(training.getByTestId('session-done')).toHaveCount(0);
  await training.getByTestId('session-start').click();

  const sheet = page.getByTestId('workout-sheet');
  await expect(sheet.getByTestId('workout-exercise')).toHaveCount(2);
  await expect(sheet.getByTestId('workout-set')).toHaveCount(3); // 2 + 1 planned
  await expect(sheet.getByTestId('workout-finish')).toBeDisabled(); // nothing ticked yet
  // the first set: 60 kg for 8, ticked; it starts a rest
  const set = sheet.getByTestId('workout-set').first();
  await set.getByTestId('workout-kg').fill('60');
  await set.getByTestId('workout-reps').fill('8');
  await set.getByTestId('workout-tick').click();
  await expect(sheet.getByTestId('workout-rest')).toBeVisible();
  await expect(sheet.getByTestId('workout-rest-left')).toHaveText(/^[12]:\d\d$/);
  await sheet.getByTestId('workout-rest-skip').click();
  await expect(sheet.getByTestId('workout-rest')).toHaveCount(0);
  await sheet.getByTestId('workout-add-set').first().click();
  await expect(sheet.getByTestId('workout-set')).toHaveCount(4);

  await sheet.getByTestId('workout-finish').click();
  await sheet.getByTestId('workout-effort-7').click();
  await sheet.getByTestId('workout-effort-save').click();
  // R2: the finish screen over everything, until Continue
  const done = page.getByTestId('workout-done-screen');
  await expect(done).toContainText('Nice work');
  await expect(done.getByTestId('workout-summary')).toContainText('480 kg'); // 60 x 8
  await expect(done.getByTestId('workout-summary')).toContainText('1'); // one set
  await expect(done.getByTestId('muscle-map')).toBeVisible();
  await done.getByTestId('workout-done').click();
  await expect(done).toBeHidden();

  // Today: done, with its sets, and Undo
  await expect(training.getByTestId('session-tick')).toBeVisible();
  await expect(training).toContainText('1 set');
  // Train lists the best lift (R2), and the week's muscles light up from the sets logged
  await page.getByTestId('tab-1').click();
  await expect(page.getByTestId('train-lifts')).toContainText('Bench press');
  await expect(page.getByTestId('train-lifts')).toContainText('60 kg');
  await expect(page.getByTestId('train-muscles')).toContainText('Muscles this week');
});

test('closing a workout with sets done keeps them; closing with none keeps nothing', async ({ page }) => {
  await open(page);
  await page.evaluate((p) => (window as unknown as Hook).ontrack.actions.saveProgram(p), PROGRAM);
  const training = page.getByTestId('training');
  await training.getByTestId('session-start').click();
  await expect(page.getByTestId('workout-sheet')).toHaveCSS('transform', 'none'); // slid in: Escape is heard only then
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('workout-sheet')).toBeHidden();
  await expect(training.getByTestId('session-start')).toBeVisible(); // nothing done, nothing kept

  await training.getByTestId('session-start').click();
  await expect(page.getByTestId('workout-sheet')).toHaveCSS('transform', 'none'); // slid in: Escape is heard only then
  await page.getByTestId('workout-set').first().getByTestId('workout-kg').fill('50');
  await page.getByTestId('workout-set').first().getByTestId('workout-tick').click();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('workout-sheet')).toBeHidden();
  await expect(training.getByTestId('session-tick')).toBeVisible(); // what was done is saved, as Bevel's End workout does
});
