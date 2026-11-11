// M4: first run to a saved plan (SCREENS.md sections 3 to 5, PRD F2 and section 7). Each test is a fresh phone in its own
// mock space. The light and dark projects are WebKit with an iPhone user agent, so Safari's install guide comes first.
import { expect, test, type Page } from '@playwright/test';
import { EMAIL, TODAY, keypadEnter, onboard, openFresh, seedAccount, signIn } from './helpers';

type Hook = { ontrack: { db: { get(c: string, id: string): unknown; live(c: string): { data: unknown }[] } } };
const record = (page: Page, c: string, id: string) => page.evaluate(([c, id]) => (window as unknown as Hook).ontrack.db.get(c, id), [c, id] as const);
const plans = (page: Page) => page.evaluate(() => (window as unknown as Hook).ontrack.db.live('plan').map((r) => r.data)) as Promise<Record<string, unknown>[]>;
const kcal = (page: Page) => page.getByTestId('plan-kcal').innerText();

/** The breakdown's lines add up to the target shown. */
async function sumsExactly(page: Page) {
  const values = await page.getByTestId('plan-breakdown').locator('[data-testid^="line-"]').evaluateAll((rows) =>
    rows.map((r) => [r.getAttribute('data-testid'), Number(r.querySelector('.num')!.textContent!.replace(/[,+]| kcal/g, ''))] as const));
  const total = values.find(([k]) => k === 'line-total')![1];
  expect(values.filter(([k]) => k !== 'line-total').reduce((a, [, v]) => a + v, 0)).toBe(total);
  expect(Number((await kcal(page)).replace(/,/g, ''))).toBe(total);
}

test('a hardgainer goes from the install guide to a saved plan in under 90 seconds', { tag: '@smoke' }, async ({ page }) => {
  await openFresh(page);
  const started = Date.now();
  await onboard(page, { goal: 'gain', train: 4 });

  // vector A: 4 strength sessions of 60 min, standard pace for a beginner
  expect(await kcal(page)).toBe('2,460');
  await expect(page.getByTestId('plan-rest')).toHaveText('2,220 on rest days');
  await expect(page.getByTestId('plan-protein')).toHaveText('108');
  await expect(page.getByTestId('plan-expect')).toContainText('Expect to gain about 0.3 kg a week.');
  await sumsExactly(page);

  // one target every day, and back
  await page.getByTestId('tune-even').click();
  expect(await kcal(page)).toBe('2,360');
  await expect(page.getByTestId('plan-rest')).toHaveCount(0);
  await page.getByTestId('tune-even').click();

  // a line opens its source
  await page.getByTestId('line-bmr').click();
  await expect(page.getByTestId('line-bmr')).toContainText('Am J Clin Nutr. 1990');

  await page.getByTestId('plan-save').click();
  await expect(page.getByTestId('signin-sheet')).toContainText('Save your plan');
  await signIn(page);
  expect(Date.now() - started).toBeLessThan(90_000);

  // the draft became the account's records
  await expect.poll(() => record(page, 'profile', 'profile')).toMatchObject({ sex: 'male', birthYear: 2001, heightCm: 175, calorieMode: 'matched' });
  expect(await record(page, 'weight', `weight:${TODAY}`)).toEqual({ date: TODAY, kg: 60 });
  expect(((await record(page, 'program', 'program')) as { sessions: unknown[] }).sessions).toHaveLength(4);
  expect(await plans(page)).toMatchObject([{ goal: 'gain', ratePctPerWeek: 0.5, delta: 330, proteinG: 108, effectiveFrom: TODAY, source: 'onboarding' }]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ot-ui')!).draft)).toBeNull();
});

test('losing fat in imperial units: the paces show their calories, a cap is explained, and Google keeps the draft', async ({ page }) => {
  await openFresh(page);
  // 5 ft 6 in, 200 lb: BMI 32, so all three paces are offered
  await onboard(page, { goal: 'lose', sex: 'female', year: '1990', units: 'imperial', height: '5 6', weight: '200', neat: 'light', train: 'later', experience: 'beginner', pace: 0.75 });
  await expect(page.getByTestId('plan-flag')).toHaveText('We limited the deficit to 25 percent of your maintenance.');
  await expect(page.getByTestId('plan-expect')).toContainText('Expect to lose about');
  await expect(page.getByTestId('plan-expect')).toContainText(' lb a week.');
  await expect(page.getByTestId('plan-rest')).toHaveCount(0); // no sessions yet: one number a day
  await sumsExactly(page);

  // the pace screen showed every option with its calories and weekly change
  await page.getByTestId('back').click();
  await expect(page.getByTestId('step-pace')).toBeVisible();
  for (const r of ['0.25', '0.5', '0.75']) await expect(page.getByTestId(`choice-${r}`)).toContainText(/Lose about [\d.]+ lb a week.*\d,\d{3}/);
  await expect(page.getByTestId('pace-why')).toHaveCount(0);
  await page.getByTestId('choice-0.75').click();

  await page.getByTestId('plan-save').click();
  await page.getByTestId('signin-google').click(); // leaves the page and comes back signed in
  await expect(page.getByTestId('dock')).toBeVisible();
  await expect.poll(() => record(page, 'profile', 'profile')).toMatchObject({ sex: 'female', birthYear: 1990, units: 'imperial', neat: 'light' });
  expect(await plans(page)).toMatchObject([{ goal: 'lose', ratePctPerWeek: 0.75, flags: ['deficitCap'] }]);
  expect(((await record(page, 'program', 'program')) as { sessions: unknown[] }).sessions).toEqual([]);
});

test('maintain skips the pace and a program comes from Templates', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'maintain', train: 'upper-lower-4', experience: 'intermediate' });
  await expect(page.getByTestId('plan-expect')).toContainText('Expect your weight to hold steady.');
  await expect(page.getByTestId('line-goal')).toHaveCount(0);
  await sumsExactly(page);
  // back through the program step: the template is kept unless the week is changed
  await page.getByTestId('back').click();
  await page.getByTestId('back').click();
  await expect(page.getByTestId('train-using')).toHaveText('Using Upper lower 4 days');
  await page.getByTestId('continue').click();
  await page.getByTestId('continue').click();
  await page.getByTestId('plan-save').click();
  await signIn(page);
  await expect.poll(() => record(page, 'program', 'program')).toMatchObject({ name: 'Upper lower 4 days' });
  expect(await plans(page)).toMatchObject([{ goal: 'maintain', delta: 0 }]);
});

test('a medical condition leads to advice, then a maintenance target only', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'gain', screening: ['medical'] });
  await expect(page.getByTestId('plan-flag')).toHaveText('From your answers at the start, Ontrack sets a maintenance target only.');
  await expect(page.getByTestId('line-goal')).toHaveCount(0);
  await page.getByTestId('plan-save').click();
  await signIn(page);
  await expect.poll(() => plans(page)).toMatchObject([{ goal: 'maintain', flags: ['maintainOnly'] }]);
  expect(await record(page, 'profile', 'profile')).toMatchObject({ screening: { medical: true, pregnant: false, eatingDisorder: false } });
});

test('an eating disorder is advised against tracking and can leave setup', async ({ page }) => {
  await openFresh(page);
  await page.getByTestId('install-continue').click();
  await page.getByTestId('welcome-start').click();
  await page.getByTestId('choice-lose').click();
  await page.getByTestId('screen-eatingDisorder').click();
  await page.getByTestId('screen-none').click(); // None of these clears the ticks
  await expect(page.getByTestId('screen-eatingDisorder')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('screen-eatingDisorder').click();
  await expect(page.getByTestId('screen-none')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('step-advice')).toContainText('Support comes first');
  await page.getByTestId('advice-leave').click();
  await expect(page.getByTestId('welcome')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ot-ui')!).draft)).toBeNull();
});

test('a birth year under 18 ends setup with an explanation', async ({ page }) => {
  await openFresh(page);
  await page.getByTestId('install-continue').click();
  await page.getByTestId('welcome-start').click();
  await page.getByTestId('choice-gain').click();
  await page.getByTestId('screen-none').click();
  await page.getByTestId('continue').click();
  await page.getByTestId('choice-male').click();
  await keypadEnter(page, '2012');
  await expect(page.getByTestId('step-young')).toContainText('people 18 and over');
  await expect(page.getByTestId('continue')).toHaveCount(0);
  // a typo can be fixed
  await page.getByTestId('back').click();
  await page.getByTestId('field-year').click();
  await keypadEnter(page, '2000');
  await expect(page.getByTestId('step-body')).toBeVisible();
});

test('below BMI 18.5 no weight loss pace is offered', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'lose', weight: '55', pace: 0 }); // 175 cm, BMI 18
  await page.getByTestId('back').click();
  await expect(page.getByTestId('pace-why')).toContainText('below a BMI of 18.5');
  await expect(page.getByTestId('step-pace').getByRole('radio')).toHaveCount(1);
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('plan-expect')).toContainText('hold steady');
  await page.getByTestId('plan-save').click();
  await signIn(page);
  await expect.poll(() => plans(page)).toMatchObject([{ goal: 'maintain', delta: 0 }]);
});

test('between BMI 18.5 and 20 only the gentle pace is offered', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'lose', weight: '60' }); // BMI 19.6
  await page.getByTestId('back').click();
  await expect(page.getByTestId('pace-why')).toContainText('only the gentle pace');
  await expect(page.getByTestId('step-pace').getByRole('radio')).toHaveCount(1);
  await expect(page.getByTestId('choice-0.25')).toContainText('Gentle');
});

test('under BMI 16 a doctor card shows, gaining is still offered, and a low goal weight is refused', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'gain', weight: '48' }); // BMI 15.7
  await expect(page.getByTestId('plan-doctor')).toContainText('See a doctor first');
  await expect(page.getByTestId('plan-expect')).toContainText('Expect to gain');
  await page.getByTestId('tune-goalweight').click();
  await keypadEnter(page, '50');
  await expect(page.getByTestId('tune-error')).toContainText('A goal weight below 56.7 kg is not offered');
  await expect(page.getByTestId('tune-goalweight')).toContainText('None yet');
  await page.getByTestId('tune-goalweight').click();
  await keypadEnter(page, '62');
  await expect(page.getByTestId('tune-goalweight')).toContainText('62 kg');
  await expect(page.getByTestId('tune-error')).toHaveText('');
});

test('a returning user signs in from Welcome and lands on Today with the account plan', { tag: '@smoke' }, async ({ page }) => {
  const s = await seedAccount(page, { signedIn: false });
  await openFresh(page, s);
  await signIn(page); // through the install guide and Welcome's "I already have an account"
  await expect(page.getByTestId('tab-today')).toBeVisible();
  expect(await record(page, 'profile', 'profile')).toMatchObject({ birthYear: 2001 });
  // a reload goes straight to Today, without Welcome or the install guide showing for a moment while the store opens
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="welcome"], [data-testid="install"]')) (window as unknown as { flashed: boolean }).flashed = true;
    }).observe(document, { childList: true, subtree: true });
  });
  await page.reload();
  await expect(page.getByTestId('tab-today')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { flashed?: boolean }).flashed ?? false)).toBe(false);
});

test('a draft that meets an account with a plan is discarded', async ({ page }) => {
  const s = await seedAccount(page, { signedIn: false });
  await openFresh(page, s);
  await onboard(page, { goal: 'lose', sex: 'female', year: '1985', weight: '80' });
  await page.getByTestId('plan-save').click();
  await signIn(page);
  await expect(page.getByTestId('tab-today')).toBeVisible();
  expect(await record(page, 'profile', 'profile')).toMatchObject({ sex: 'male', birthYear: 2001 });
  expect(await plans(page)).toHaveLength(1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ot-ui')!).draft)).toBeNull();
});

test('a signed in account without a plan goes through setup and saves without signing in again', async ({ page }) => {
  const s = await seedAccount(page, { onboarded: false, signedIn: false });
  await openFresh(page, s);
  await signIn(page, EMAIL, { shell: false });
  await expect(page.getByTestId('welcome')).toBeVisible();
  await expect(page.getByTestId('welcome-signin')).toBeVisible(); // the way to switch to another account
  await onboard(page, { goal: 'gain' });
  await page.getByTestId('plan-save').click();
  await expect(page.getByTestId('tab-today')).toBeVisible();
  await expect(page.getByTestId('signin-sheet')).toHaveCount(0);
  expect(await plans(page)).toHaveLength(1);
});

test('the draft survives a reload on any step, and the install guide comes back in Safari', async ({ page }) => {
  await openFresh(page);
  await page.getByTestId('install-continue').click();
  await page.getByTestId('welcome-start').click();
  await page.getByTestId('choice-gain').click();
  await page.getByTestId('screen-none').click();
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('step-count')).toHaveText('Step 3 of 9');
  await page.reload();
  await expect(page.getByTestId('install')).toBeVisible();
  await page.getByTestId('install-continue').click();
  await expect(page.getByTestId('step-sex')).toBeVisible();
  await page.getByTestId('back').click();
  await expect(page.getByTestId('screen-none')).toHaveAttribute('aria-checked', 'true');
});
