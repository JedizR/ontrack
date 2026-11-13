// M9a on the mock: each setting, the exports, The science, the reminders (F23), easy adds (F10), Finish day, lifting
// experience asked on Train, and the sign in small print. "Today" is 2026-11-11, a training day for the seeded gain plan:
// 2,460 kcal, 2,220 on rest days.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { MEALS, SEED, TODAY, openFresh, openSeeded, pickerSave, seedAccount } from './helpers';
import { C } from '../../src/lib/model/engine/constants';

type Seed = { collection: string; id: string; updatedAt: number; deleted?: true; data: unknown };
async function openAt(page: Page, time: string, o: { records?: Seed[]; account?: Seed[] } = {}) {
  await page.clock.setFixedTime(new Date(`${TODAY}T${time}:00+07:00`));
  await seedAccount(page, o);
  await page.goto('/');
  await expect(page.getByTestId('dock')).toBeVisible();
}
type Win = { ontrack: { db: { get: (c: string, id: string) => unknown; live: (c: string) => { data: unknown }[] } } };
const get = (page: Page, c: string, id: string) => page.evaluate(([c, id]) => (window as unknown as Win).ontrack.db.get(c, id), [c, id]);
const plans = (page: Page) => page.evaluate(() => (window as unknown as Win).ontrack.db.live('plan').map((r) => r.data)) as Promise<{ effectiveFrom: string; ratePctPerWeek: number; source: string; tdeeSource: string }[]>;
const sheet = (page: Page) => page.getByTestId('account-sheet');
async function settings(page: Page) {
  await page.getByTestId('avatar').click();
  await expect(sheet(page)).toBeVisible();
}
const close = (page: Page) => sheet(page).getByRole('button', { name: 'Close' }).click();
const kcalOf = (page: Page) => page.getByTestId('hero').getByText(/^of [\d,]+ kcal$/);
const planWith = (d: object) => SEED.map((r) => (r.collection === 'plan' ? { ...r, data: { ...r.data, ...d } } : r));

test('display, units, the same target every day, Thai dishes first and the check-in day save on the tap', { tag: '@smoke' }, async ({ page }) => {
  await openAt(page, '10:00');
  await settings(page);
  const s = sheet(page);
  await s.getByRole('radiogroup', { name: 'Theme' }).getByRole('radio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await s.getByRole('radiogroup', { name: 'Text size' }).getByRole('radio', { name: 'Large', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-fs', 'l');
  await s.getByRole('radiogroup', { name: 'Units' }).getByRole('radio', { name: 'Imperial' }).click();
  await expect.poll(() => get(page, 'profile', 'profile')).toMatchObject({ units: 'imperial' });
  await s.getByRole('switch', { name: 'Thai dishes first' }).click();
  await expect(s.getByRole('switch', { name: 'Thai dishes first' })).toHaveAttribute('aria-checked', 'true');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ot-ui')!).thai)).toBe(true);

  await s.getByTestId('set-checkin').click();
  await s.getByTestId('set-checkin-day').getByRole('radio', { name: 'Thursday' }).click();
  await expect(s.getByTestId('set-checkin-day').getByRole('radio', { name: 'Thursday' })).toHaveAttribute('aria-checked', 'true');
  await s.getByTestId('sheet-back').click();
  await expect(s.getByTestId('set-checkin')).toContainText('Thursday');
  await expect.poll(() => get(page, 'profile', 'profile')).toMatchObject({ checkinWeekday: 3 });

  await s.getByRole('switch', { name: 'Same target every day' }).click();
  await close(page);
  await expect(kcalOf(page)).toHaveText('of 2,360 kcal');
});

test('goal and pace: the new target shows before saving and starts tomorrow; today keeps its own', async ({ page }) => {
  await openAt(page, '10:00');
  await settings(page);
  await sheet(page).getByTestId('set-goal-open').click();
  const pace = sheet(page).getByTestId('set-pace');
  await expect(pace.getByRole('radio', { name: 'Standard' })).toHaveAttribute('aria-checked', 'true');
  await expect(sheet(page).getByTestId('set-target')).toHaveText('Your target stays as it is.');
  await expect(sheet(page).getByTestId('set-save')).toBeDisabled();
  await pace.getByRole('radio', { name: 'Lean' }).click();
  await expect(sheet(page).getByTestId('set-target')).toContainText('From tomorrow');
  await expect(sheet(page).getByTestId('set-target')).toContainText('2,290 kcal on training days');
  await expect(sheet(page).getByTestId('set-target')).toContainText('2,050 on rest days');
  await sheet(page).getByTestId('set-save').click();
  await expect(page.getByText('Saved. Your targets change from tomorrow')).toBeVisible();
  await expect(sheet(page).getByTestId('set-goal-open')).toBeVisible();
  expect(await plans(page)).toContainEqual(expect.objectContaining({ effectiveFrom: '2026-11-12', ratePctPerWeek: 0.25, source: 'edit' }));
  await close(page);
  await expect(kcalOf(page)).toHaveText('of 2,460 kcal');
});

test('a faster gain pace past BMI 20 is still offered, so stepping down is one tap (F19)', async ({ page }) => {
  await openAt(page, '10:00', { account: planWith({ ratePctPerWeek: 0.75, weightKg: 64 }) });
  await settings(page);
  await sheet(page).getByTestId('set-goal-open').click();
  const pace = sheet(page).getByTestId('set-pace');
  await expect(pace.getByRole('radio')).toHaveText(['Lean', 'Standard', 'Faster']);
  await expect(pace.getByRole('radio', { name: 'Faster' })).toHaveAttribute('aria-checked', 'true');
  await expect(sheet(page).getByTestId('set-provisional')).toHaveText('Being checked');
  await pace.getByRole('radio', { name: 'Standard' }).click();
  await sheet(page).getByTestId('set-save').click();
  expect(await plans(page)).toContainEqual(expect.objectContaining({ ratePctPerWeek: 0.5, source: 'edit' }));
});

test('profile: a new height reruns the equation from the latest weigh-in; the target shows first', async ({ page }) => {
  await openAt(page, '10:00');
  await settings(page);
  await sheet(page).getByTestId('set-profile').click();
  await sheet(page).getByTestId('set-height').click();
  await pickerSave(page, '180');
  await expect(sheet(page).getByTestId('set-height')).toContainText('180 cm');
  await expect(sheet(page).getByTestId('set-target')).toContainText('2,500 kcal on training days');
  await sheet(page).getByTestId('set-move').getByRole('radio', { name: 'Some walking' }).click();
  await sheet(page).getByTestId('set-save').click();
  await expect.poll(() => get(page, 'profile', 'profile')).toMatchObject({ heightCm: 180, neat: 'light' });
  expect(await plans(page)).toContainEqual(expect.objectContaining({ effectiveFrom: '2026-11-12', tdeeSource: 'formula', source: 'edit' }));
});

test('exports: all data as JSON and meals as CSV, downloaded where files cannot be shared', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined }));
  await openAt(page, '10:00', { records: MEALS });
  await settings(page);
  const json = page.waitForEvent('download');
  await sheet(page).getByTestId('set-export-all').click();
  const all = JSON.parse(readFileSync((await (await json).path())!, 'utf8'));
  expect(all).toMatchObject({ app: 'Ontrack', records: { profile: [{ id: 'profile', data: { sex: 'male' } }] } });
  expect(all.records.meal).toHaveLength(4);
  await expect(page.getByText('The file is in your downloads')).toBeVisible();
  const csv = page.waitForEvent('download');
  await sheet(page).getByTestId('set-export-meals').click();
  const d = await csv;
  expect(d.suggestedFilename()).toBe(`ontrack-meals-${TODAY}.csv`);
  const lines = readFileSync((await d.path())!, 'utf8').trim().split('\r\n');
  expect(lines[0]).toBe('date,time,meal,food,grams,kcal,protein_g,carbs_g,fat_g,source,method');
  expect(lines).toHaveLength(1 + 7); // seven foods in four meals
});

test('exports go through the share sheet where the browser shares files', async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { shared?: string };
    Object.defineProperty(Navigator.prototype, 'canShare', { value: () => true });
    Object.defineProperty(Navigator.prototype, 'share', { value: async ({ files }: { files: File[] }) => { w.shared = `${files[0].name} ${files[0].type}`; } });
  });
  await openAt(page, '10:00');
  await settings(page);
  await sheet(page).getByTestId('set-export-all').click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { shared?: string }).shared)).toBe(`ontrack-${TODAY}.json application/json`);
});

test('The science lists every constant with its source and status; a row opens its citation', async ({ page }) => {
  await openAt(page, '10:00');
  await settings(page);
  await sheet(page).getByTestId('set-science').click();
  for (const key of Object.keys(C)) await expect(sheet(page).getByTestId(`science-${key}`)).toHaveCount(1);
  await sheet(page).getByTestId('science-mifflin').click();
  await expect(sheet(page).getByTestId('science-mifflin').getByTestId('science-cite')).toContainText('Mifflin MD');
  await expect(sheet(page).getByTestId('science-gainPaceFaster').getByTestId('science-status')).toHaveText('Being checked');
  await expect(sheet(page).getByTestId('science-foods')).toContainText('Open Food Facts');
});

test('Privacy and Terms open as pages, and the sign in sheet links to both', async ({ page }) => {
  await openAt(page, '10:00');
  await settings(page);
  const popup = page.waitForEvent('popup');
  await sheet(page).getByTestId('set-privacy').click();
  const p = await popup;
  await expect(p).toHaveURL(/\/privacy\.html$/);
  await expect(p.getByRole('link', { name: 'hello.ontrackapp@gmail.com' })).toBeVisible();
});

test('the sign in sheet carries the small print', async ({ page }) => {
  await openFresh(page);
  await page.getByTestId('landing-signin').click();
  const legal = page.getByTestId('signin-legal');
  await expect(legal.getByText('By signing in you accept the Terms and the Privacy notice.')).toBeVisible();
  await expect(legal.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms.html');
  await expect(legal.getByRole('link', { name: 'Privacy' })).toHaveAttribute('href', '/privacy.html');
});

test('reminders (F23): nothing logged from the set time, each card turned off in Settings', async ({ page }) => {
  await openAt(page, '14:00', { records: [{ collection: 'weight', id: `weight:${TODAY}`, updatedAt: 2, deleted: true, data: { date: TODAY, kg: 60 } }] });
  // the weigh-in prompt comes first; off, the nothing logged card shows in its place
  await expect(page.getByTestId('weigh-card')).toBeVisible();
  await settings(page);
  await sheet(page).getByRole('switch', { name: 'No weigh-in for 3 days' }).click();
  await close(page);
  await expect(page.getByTestId('weigh-card')).toBeHidden();
  await expect(page.getByTestId('nothing-card')).toContainText('Nothing logged yet today');
  await settings(page);
  await sheet(page).getByTestId('set-remind-at').fill('15:00');
  await close(page);
  await expect(page.getByTestId('nothing-card')).toBeHidden();
  await settings(page);
  await sheet(page).getByTestId('set-remind-at').fill('13:00');
  await close(page);
  await expect(page.getByTestId('nothing-card')).toBeVisible();
  await page.getByTestId('nothing-add').click();
  await expect(page.getByTestId('add-search')).toBeVisible();
  await page.keyboard.press('Escape');
  await settings(page);
  await sheet(page).getByRole('switch', { name: 'Nothing logged yet' }).click();
  await expect(sheet(page).getByTestId('set-remind-at')).toBeHidden();
  await close(page);
  await expect(page.getByTestId('nothing-card')).toBeHidden();
});

test('the check-in card can be turned off; Progress still offers the check-in', async ({ page }) => {
  await openSeeded(page, 'on_track');
  await expect(page.getByTestId('checkin-card')).toBeVisible();
  await settings(page);
  await sheet(page).getByRole('switch', { name: 'Check-in due' }).click();
  await close(page);
  await expect(page.getByTestId('checkin-card')).toBeHidden();
});

test('easy adds (F10): in the evening, three dense foods about the gap, each added in one tap', async ({ page }) => {
  await openAt(page, '19:00');
  const card = page.getByTestId('easy-card');
  await expect(card).toContainText('2,460 kcal to go');
  await expect(card.getByTestId('easy-item')).toHaveCount(3);
  await expect(card.getByTestId('easy-item').first()).toContainText('Peanut butter');
  const add = card.getByTestId('easy-add').first();
  const label = (await add.textContent())!;
  expect(label).toMatch(/^Add [\d,]+ kcal$/);
  await add.click();
  await expect(page.getByText('Added Peanut butter')).toBeVisible();
  await expect(page.getByTestId('hero-value')).toHaveText(label.replace(/^Add | kcal$/g, ''));
  await expect(page.getByTestId('meal')).toHaveCount(1);
  await settings(page);
  await sheet(page).getByRole('switch', { name: 'Evening easy adds' }).click();
  await close(page);
  await expect(card).toBeHidden();
});

test('no easy adds before 18:00; the card follows the clock', async ({ page }) => {
  await openAt(page, '17:30');
  await expect(page.getByTestId('easy-card')).toBeHidden();
  await page.clock.setFixedTime(new Date(`${TODAY}T19:00:00+07:00`));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByTestId('easy-card')).toBeVisible();
});

test('Finish day: from 20:00 and on past days; it marks the day and can be reopened', async ({ page }) => {
  await openAt(page, '10:00');
  await expect(page.getByTestId('day-finish')).toBeHidden();
  await page.clock.setFixedTime(new Date(`${TODAY}T20:30:00+07:00`));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.getByTestId('day-finish').click();
  await expect(page.getByTestId('day-finished')).toHaveText(/Day finished. It counts toward your check-in./);
  await expect.poll(() => get(page, 'day', `day:${TODAY}`)).toEqual({ date: TODAY, closed: true });
  await page.getByTestId('day-reopen').click();
  await expect(page.getByTestId('day-finish')).toBeVisible();
  await expect.poll(() => get(page, 'day', `day:${TODAY}`)).toEqual({ date: TODAY });
});

test('Train asks the lifting experience in context of a lifter who is not gaining, once', async ({ page }) => {
  await openAt(page, '10:00', { account: planWith({ goal: 'lose', ratePctPerWeek: 0.5, delta: -330 }) });
  await page.getByTestId('tab-1').click();
  const card = page.getByTestId('train-experience');
  await expect(card).toContainText('How long have you lifted consistently?');
  await expect(card.getByTestId('experience-save')).toBeDisabled();
  await card.getByRole('button', { name: '1 to 3 years' }).click();
  await expect(card.getByRole('button', { name: '1 to 3 years' })).toHaveAttribute('aria-pressed', 'true');
  await card.getByTestId('experience-save').click();
  await expect(card).toBeHidden();
  await expect.poll(() => get(page, 'profile', 'profile')).toMatchObject({ experience: 'intermediate' });
  await page.reload();
  await expect(page.getByTestId('tab-train')).toBeVisible();
  await expect(card).toBeHidden();
});

test('Profile for friends opens the friends profile over the map', async ({ page }) => {
  await openAt(page, '10:00');
  await settings(page);
  await sheet(page).getByTestId('set-friends').click();
  await expect(page.getByTestId('profile-sheet')).toBeVisible();
});
