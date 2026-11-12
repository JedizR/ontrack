// Progress and the weekly check-in (F9, F11) on the dev seeder's accounts (dev/seed.ts): four weeks of logs on plan A,
// the check-in due on TODAY, Wednesday 2026-11-11. One test per check-in reason; raise is vector F of docs/SCIENCE.md
// and adherence vector G.
import { expect, test, type Page } from '@playwright/test';
import { open, openSeeded } from './helpers';

const sheet = (page: Page) => page.getByTestId('checkin-sheet');
const next = (page: Page) => page.getByTestId('checkin-next').click();
type Win = { ontrack: { db: { live(c: string): { data: Record<string, unknown> }[] } } };
const plansOf = (page: Page) => page.evaluate(() => (window as unknown as Win).ontrack.db.live('plan').map((r) => r.data));

/** From Today's card to the second step, checking the sentence. */
async function readCheckin(page: Page, sentence: string) {
  await page.getByTestId('checkin-open').click();
  await expect(sheet(page)).toBeVisible();
  await expect(page.getByTestId('checkin-step')).toHaveText('Your last three weeks');
  await next(page);
  await expect(page.getByTestId('checkin-sentence')).toHaveText(sentence);
  await next(page);
  await expect(page.getByTestId('checkin-step')).toHaveText('Next');
}

test('vector F: the check-in raises by 100 to 2,560 and 2,320 from tomorrow, carrying the sessions; Progress records it', { tag: '@smoke' }, async ({ page }) => {
  await openSeeded(page, 'raise');
  await expect(page.getByTestId('weigh-card')).toHaveCount(0); // one card at a time, the check-in first
  await page.getByTestId('checkin-open').click();
  await expect(page.getByTestId('checkin-rate')).toHaveText('0.1');
  await expect(page.getByTestId('checkin-target-rate')).toHaveText('Target 0.5');
  await expect(page.getByTestId('checkin-intake')).toContainText('2,300 kcal');
  await expect(page.getByTestId('checkin-intake')).toContainText('Target 2,357');
  await expect(page.getByTestId('checkin-days')).toContainText('12 of 21');
  await expect(page.getByTestId('checkin-weighins')).toContainText('13');
  await next(page);
  await expect(page.getByTestId('checkin-sentence')).toHaveText('You are gaining slower than planned while eating to your target. Your body uses more than we estimated.');
  await expect(page.getByTestId('checkin-maintenance')).toHaveText('2,220');
  await next(page);
  await expect(page.getByTestId('checkin-proposal')).toHaveText('2,560');
  await expect(page.getByTestId('checkin-rest')).toHaveText('2,320 on rest days');
  await expect(page.getByTestId('checkin-change')).toHaveText('Up 100 kcal a day, from tomorrow.');
  // a step back and forward again
  await page.getByTestId('sheet-back').click();
  await expect(page.getByTestId('checkin-step')).toHaveText('What it means');
  await next(page);
  await page.getByTestId('checkin-use').click();
  await expect(sheet(page)).toBeHidden();
  await expect(page.getByText('Your new target starts tomorrow')).toBeVisible();
  await expect(page.getByTestId('checkin-card')).toHaveCount(0);
  await expect(page.getByTestId('hero').getByText(/^of [\d,]+ kcal$/)).toHaveText('of 2,460 kcal'); // today keeps its target

  const made = (await plansOf(page)).find((p) => p.source === 'checkin')!;
  expect(made).toMatchObject({ effectiveFrom: '2026-11-12', tdeeSource: 'measured' });
  expect((made.sessions as { weekday: number }[]).map((s) => s.weekday)).toEqual([0, 2, 4, 5]);

  await page.getByTestId('tab-2').click();
  await expect(page.getByTestId('checkin-ready')).toHaveCount(0);
  await expect(page.getByTestId('checkin-row')).toHaveText(/Wednesday, Nov 11\s*Raised by 100 kcal/);
  await page.getByTestId('checkin-row').click();
  await next(page);
  await next(page);
  await expect(sheet(page)).toContainText('You took the new target.');
  await expect(page.getByTestId('checkin-proposal')).toHaveText('2,560');
  await page.getByTestId('checkin-done').click();
  await expect(sheet(page)).toBeHidden();
});

test('vector G: adherence says the target was fine and the gap was intake, and changes nothing', async ({ page }) => {
  await openSeeded(page, 'adherence');
  await readCheckin(page, 'Your target looks right. You averaged 310 under it. Reaching it comes first.');
  await expect(sheet(page)).toContainText('Your target stays');
  await expect(page.getByTestId('checkin-proposal')).toHaveText('2,460');
  await expect(page.getByTestId('checkin-use')).toHaveCount(0);
  await page.getByTestId('checkin-done').click();
  expect((await plansOf(page)).some((p) => p.source === 'checkin')).toBe(false);
  await page.getByTestId('tab-2').click();
  await expect(page.getByTestId('checkin-row')).toContainText('No change. Reaching your target comes first');
});

test('on track: no change needed', async ({ page }) => {
  await openSeeded(page, 'on_track');
  await readCheckin(page, 'You are gaining at the pace you chose. No change needed.');
  await page.getByTestId('checkin-done').click();
  await page.getByTestId('tab-2').click();
  await expect(page.getByTestId('checkin-row')).toContainText('On track. No change');
});

test('lower: gaining faster than planned; keeping the current target changes nothing', async ({ page }) => {
  await openSeeded(page, 'lower');
  await readCheckin(page, 'You are gaining faster than planned while eating to your target. Your body uses less than we estimated.');
  await expect(sheet(page)).toContainText('Lower to');
  await expect(page.getByTestId('checkin-change')).toHaveText(/^Down \d+ kcal a day, from tomorrow\.$/);
  await page.getByTestId('checkin-keep').click();
  await expect(sheet(page)).toBeHidden();
  expect((await plansOf(page)).some((p) => p.source === 'checkin')).toBe(false);
  await page.getByTestId('tab-2').click();
  await expect(page.getByTestId('checkin-row')).toContainText('Kept your target');
});

test('need data: too few weigh-ins, check again next week', async ({ page }) => {
  await openSeeded(page, 'need_data');
  await page.getByTestId('checkin-open').click();
  await expect(page.getByTestId('checkin-rate')).toHaveText('Not enough weigh-ins to measure');
  await expect(page.getByTestId('checkin-weighins')).toContainText('6');
  await next(page);
  await expect(page.getByTestId('checkin-sentence')).toHaveText('We need a few more weigh-ins to be sure. Keep going and we will check again next week.');
  await expect(page.getByTestId('checkin-maintenance')).toHaveCount(0);
  await next(page);
  await page.getByTestId('checkin-done').click();
  await page.getByTestId('tab-2').click();
  await expect(page.getByTestId('progress-rate')).toHaveText('Weigh in on 8 days across 2 weeks to see your trend and get your first check-in.');
  await expect(page.getByTestId('checkin-row')).toContainText('Not enough weigh-ins yet');
});

test('Progress: trend, rate against target, maintenance, intake, consistency, and History opening a past day in Today', async ({ page }) => {
  await openSeeded(page, 'raise');
  await page.getByTestId('tab-2').click();
  await expect(page.getByTestId('progress-trend')).toHaveText(/^60(\.\d)?$/);
  await expect(page.getByTestId('progress-rate')).toHaveText('0.1 percent a week. Target 0.5');
  await expect(page.getByTestId('chart-dot')).toHaveCount(18);
  await expect(page.getByTestId('progress-measured')).toHaveText('2,220');
  await expect(page.getByTestId('progress-formula')).toHaveText('2,030');
  await expect(page.getByTestId('bar')).toHaveCount(4);
  await expect(page.getByTestId('progress-protein')).toContainText('Target 108 g');
  await expect(page.getByTestId('consistency-week')).toHaveCount(4);
  await expect(page.getByTestId('consistency-week').last()).toHaveAttribute('aria-label', /^This week, \d of 7 days on track$/);
  await expect(page.getByTestId('checkin-ready')).toBeVisible();
  await page.getByRole('radio', { name: '3 months' }).click();
  await expect(page.getByTestId('chart-dot')).toHaveCount(18); // the account is four weeks old

  // the ready check-in opens from here too
  await page.getByTestId('checkin-ready').click();
  await expect(sheet(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(sheet(page)).toBeHidden();

  await page.getByTestId('progress-history').click();
  await expect(page.getByTestId('history-sheet')).toContainText('November 2026');
  await expect(page.getByTestId('history-sheet')).toContainText('October 2026');
  await expect(page.getByTestId('history-day')).toHaveCount(28);
  await page.getByTestId('history-day').filter({ hasText: 'Tuesday, Nov 3' }).click();
  await expect(page.getByTestId('tab-today')).toBeVisible();
  await expect(page.getByTestId('header')).toContainText('Tuesday, Nov 3');
  await expect(page.getByTestId('meal')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Back to today' })).toBeVisible();
});

test('Progress before there is enough: says what is needed', async ({ page }) => {
  await open(page);
  await page.getByTestId('tab-2').click();
  await expect(page.getByTestId('progress-rate')).toHaveText('Weigh in on 8 days across 2 weeks to see your trend and get your first check-in.');
  await expect(page.getByTestId('progress-maintenance')).toHaveCount(0);
  await expect(page.getByTestId('progress-intake')).toContainText('Log two or more items on a day');
  await expect(page.getByTestId('progress-checkins')).toContainText('Your first check-in comes two weeks after your plan starts.');
});
