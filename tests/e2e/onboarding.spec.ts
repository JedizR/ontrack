// M4, O1 and U1a: first run to a saved plan (SCREENS.md sections 3 to 5, PRD F2 and section 7). Each goal, each guardrail
// exit, the number that builds, a tap that selects and Continue that moves on, Building your plan, the pace on Your plan,
// and what the answers change afterwards. Each test is a fresh browser in
// its own mock space, which opens on the landing page (L1).
import { expect, test, type Page } from '@playwright/test';
import { EMAIL, PACE, TODAY, choose, onboard, openFresh, pickerSave, seedAccount, signIn, space, startPlan, useSpace, wheelType, withPrefs } from './helpers';

type Hook = { ontrack: { db: { get(c: string, id: string): unknown; live(c: string): { data: unknown }[] } } };
const record = (page: Page, c: string, id: string) => page.evaluate(([c, id]) => (window as unknown as Hook).ontrack.db.get(c, id), [c, id] as const);
const plans = (page: Page) => page.evaluate(() => (window as unknown as Hook).ontrack.db.live('plan').map((r) => r.data)) as Promise<Record<string, unknown>[]>;
const kcal = (page: Page) => page.getByTestId('plan-kcal');
const pace = (page: Page, name: string) => page.getByTestId('plan-pace').getByRole('radio', { name });

/** The breakdown's lines add up to the target shown. */
async function sumsExactly(page: Page) {
  const values = await page.getByTestId('plan-breakdown').locator('[data-testid^="line-"]').evaluateAll((rows) =>
    rows.map((r) => [r.getAttribute('data-testid'), Number(r.querySelector('.num')!.textContent!.replace(/[,+]| kcal/g, ''))] as const));
  const total = values.find(([k]) => k === 'line-total')![1];
  expect(values.filter(([k]) => k !== 'line-total').reduce((a, [, v]) => a + v, 0)).toBe(total);
  expect(Number((await kcal(page).innerText()).replace(/,/g, ''))).toBe(total);
}

test('a hardgainer watches the number build, tunes the pace and saves the plan in under 90 seconds', { tag: '@smoke' }, async ({ page }) => {
  await openFresh(page);
  const started = Date.now();
  await expect(page.getByTestId('landing-hero')).toContainText('No account until you save it.');
  await startPlan(page);
  await choose(page, 'choice-gain');
  await choose(page, 'screen-none');
  await choose(page, 'choice-male');
  // the wheel starts at a 25 year old's year, and the body at the median man's
  await expect(page.getByTestId('wheel-year').getByRole('slider')).toHaveAttribute('aria-valuenow', '2001');
  await page.getByTestId('continue').click();
  await page.getByRole('radio', { name: 'Metric' }).click(); // the tests' phone says en-US
  await expect(page.getByTestId('wheel-height').getByRole('slider')).toHaveAttribute('aria-valuenow', '175');
  await expect(page.getByTestId('wheel-weight').getByRole('slider').first()).toHaveAttribute('aria-valuetext', '67 kg');
  await wheelType(page, 'wheel-weight', '60');
  await page.getByTestId('continue').click();

  // vector A's number grows answer by answer, in the breakdown's own rows
  await expect(page.getByTestId('so-far-value')).toHaveText('1,574');
  await expect(page.getByTestId('so-far')).toContainText('Resting energy');
  // the number grows on the tap that answers, before Continue
  await page.getByTestId('choice-seated').click();
  await expect(page.getByTestId('so-far-value')).toHaveText('1,890');
  await expect(page.getByTestId('so-far-added')).toHaveText('+316 kcal');
  await page.getByTestId('continue').click();
  await choose(page, 'days-4');
  await choose(page, 'choice-lifting');
  await expect(page.getByTestId('step-experience')).toBeVisible();
  await expect(page.getByTestId('so-far-value')).toHaveText('2,130');
  await expect(page.getByTestId('so-far')).toContainText('Training +240 kcal');
  await choose(page, 'choice-beginner');

  // Building your plan names the engine's work, ticks it off and ends in a check, then Your plan counts up
  await expect(page.getByTestId('building')).toBeVisible();
  await expect(page.getByTestId('build-row')).toHaveText(['Energy you use each day', 'Targets for training days', 'Protein for this goal']);
  await expect(page.getByTestId('build-row').last()).toHaveAttribute('data-done', 'true');
  await expect(page.getByTestId('your-plan')).toBeVisible();

  // 4 lifting sessions of 60 min, the standard pace for a beginner, counted up to
  await expect(kcal(page)).toHaveText('2,460');
  await expect(page.getByTestId('plan-rest')).toHaveText('2,220 on rest days');
  await expect(page.getByTestId('plan-protein')).toHaveText('108');
  await expect(page.getByTestId('plan-expect')).toContainText('Expect to gain about 0.3 kg a week.');
  await expect(page.getByTestId('plan-training')).toHaveText('Lifting 4 days a week, 60 minutes each, at a moderate effort. Change it any time in Train.');
  await expect(pace(page, 'Standard')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('pace-why')).toHaveCount(0); // BMI 19.6: every gain pace is offered
  await sumsExactly(page);

  // F19: the faster pace says what to expect and that it is being checked, inside the surplus cap
  await pace(page, 'Faster').click();
  await expect(page.getByTestId('pace-faster')).toHaveText('A faster gain, with more of it as fat than at the lean pace. Being checked');
  await expect(kcal(page)).toHaveText('2,530'); // the 20 percent surplus cap binds: 75 kcal over the standard pace, rounded
  await page.getByTestId('line-goal').click();
  await expect(page.getByTestId('line-goal')).toContainText('Helms ER');
  await expect(page.getByTestId('line-goal').getByTestId('provisional')).toHaveText('Being checked');
  await sumsExactly(page);
  await pace(page, 'Standard').click();
  await expect(page.getByTestId('pace-faster')).toHaveCount(0);

  // one target every day, and back
  await page.getByTestId('tune-even').click();
  await expect(kcal(page)).toHaveText('2,360');
  await expect(page.getByTestId('plan-rest')).toHaveCount(0);
  await page.getByTestId('tune-even').click();

  await expect(page.getByTestId('plan-save')).toHaveText('Save this plan');
  await expect(page.getByTestId('plan-save-line')).toHaveText('Sign in next with Google or an email code. No password needed.');
  await page.getByTestId('plan-save').click();
  await expect(page.getByTestId('signin-sheet')).toContainText('Save your plan');
  await signIn(page);
  expect(Date.now() - started).toBeLessThan(90_000);

  // the draft became the account's records
  await expect.poll(() => record(page, 'profile', 'profile')).toMatchObject({ sex: 'male', birthYear: 2001, heightCm: 175, calorieMode: 'matched', experience: 'beginner' });
  expect(await record(page, 'weight', `weight:${TODAY}`)).toEqual({ date: TODAY, kg: 60 });
  expect(((await record(page, 'program', 'program')) as { sessions: { type: string }[] }).sessions.map((s) => s.type)).toEqual(['strength', 'strength', 'strength', 'strength']);
  expect(await plans(page)).toMatchObject([{ goal: 'gain', ratePctPerWeek: 0.5, delta: 330, proteinG: 108, effectiveFrom: TODAY, source: 'onboarding' }]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ot-ui')!).draft)).toBeNull();

  // Today's first state: a true head start, then the first meal
  await expect(page.getByTestId('first-day')).toContainText('Getting started');
  await expect(page.getByTestId('first-day')).toContainText('Weigh in tomorrow morning');
  await page.getByTestId('first-meal').click();
  await expect(page.getByTestId('add-sheet')).toBeVisible();
});

test('on every choice step a tap selects without leaving the step and enables Continue, which moves on', async ({ page }) => {
  await openFresh(page);
  await startPlan(page);
  const cont = page.getByTestId('continue');
  const selects = async (step: string, answer: string) => {
    await expect(page.getByTestId(step)).toBeVisible();
    await expect(cont).toBeDisabled();
    await page.getByTestId(answer).click();
    await page.waitForTimeout(400); // longer than O1's 240 ms advance
    await expect(page.getByTestId(step)).toBeVisible();
    await expect(page.getByTestId(answer)).toHaveAttribute('aria-checked', 'true');
    await expect(cont).toBeEnabled();
    await cont.click();
  };
  await selects('step-goal', 'choice-gain');
  await selects('step-screening', 'screen-none');
  await selects('step-sex', 'choice-male');
  await cont.click(); // the birth year's wheel has an answer from the start
  await page.getByRole('radio', { name: 'Metric' }).click();
  await cont.click();
  await selects('step-move', 'choice-seated');
  await selects('step-days', 'days-4');
  await selects('step-kind', 'choice-lifting');
  await selects('step-experience', 'choice-beginner');
  await expect(page.getByTestId('your-plan')).toBeVisible();
  // the picked card's tile turns violet with a light glyph
  await page.getByTestId('back').click();
  await page.getByTestId('back').click();
  await expect(page.getByTestId('choice-lifting').locator('span').first()).toHaveClass(/bg-accent/);
  await expect(page.getByTestId('choice-cardio').locator('span').first()).toHaveClass(/\btile\b/);
});

test("Not what you're looking for? shows two more goals; Gain weight leads with the faster pace (vector J)", async ({ page }) => {
  await openFresh(page);
  await startPlan(page);
  await expect(page.getByTestId('step-goal').getByRole('radio')).toHaveCount(3);
  await page.getByTestId('goal-more').click();
  await expect(page.getByTestId('goal-more')).toHaveCount(0);
  await expect(page.getByTestId('step-goal').getByRole('radio')).toHaveText([/Build muscle/, /Lose fat/, /Maintain/, /Gain weight/, /Lose fat and build muscle/]);
  await expect(page.getByTestId('choice-weight')).toBeFocused();
  await page.getByTestId('back').click();
  await expect(page.getByTestId('landing')).toBeVisible();

  await onboard(page, { goal: 'weight' }); // vector A
  await expect(kcal(page)).toHaveText('2,530'); // vector H: the faster pace, inside the surplus cap
  await expect(page.getByTestId('plan-rest')).toHaveText('2,290 on rest days');
  await expect(page.getByTestId('plan-protein')).toHaveText('108');
  await expect(pace(page, 'Faster')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('pace-faster')).toContainText('Being checked');
  await sumsExactly(page);
  await pace(page, 'Standard').click(); // the other paces stay a tap away
  await expect(kcal(page)).toHaveText('2,460');
  await pace(page, 'Faster').click();
  await page.getByTestId('plan-save').click();
  await signIn(page);
  await expect.poll(() => plans(page)).toMatchObject([{ goal: 'gain', ratePctPerWeek: 0.75, proteinG: 108 }]);
});

test('the in-between goal is a gentle cut with the cut\'s protein and no pace to pick (vector K)', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'recomp', sex: 'female', year: '1996', height: '165', weight: '70', neat: 'light', days: 3 });
  await expect(kcal(page)).toHaveText('1,930');
  await expect(page.getByTestId('plan-rest')).toHaveText('1,650 on rest days');
  await expect(page.getByTestId('plan-protein')).toHaveText('140');
  await expect(page.getByTestId('plan-pace')).toHaveCount(0);
  await expect(page.getByTestId('plan-expect')).toContainText('Expect to lose about 0.2 kg a week.');
  await expect(page.getByTestId('plan-recomp')).toBeVisible();
  await sumsExactly(page);
  // back on the goal, the two stay shown with the pick
  for (let i = 0; i < 8; i++) await page.getByTestId('back').click();
  await expect(page.getByTestId('choice-recomp')).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByTestId('goal-more')).toHaveCount(0);
});

test('under reduced motion Your plan shows at once, with no Building your plan and no count-up', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="building"]')) (window as unknown as { built: boolean }).built = true;
    }).observe(document, { subtree: true, childList: true });
  });
  await openFresh(page);
  await onboard(page, { goal: 'gain' });
  expect(await page.getByTestId('plan-hero').locator('.text-hero').innerText()).toBe('2,460');
  expect(await page.getByTestId('plan-hero').locator('.text-display').innerText()).toBe('108');
  expect(await page.evaluate(() => (window as unknown as { built?: boolean }).built)).toBeFalsy();
});

test('no number shows before screening is answered and the body is known', async ({ page }) => {
  await openFresh(page);
  const noNumber = async () => {
    await expect(page.getByTestId('so-far')).toHaveCount(0);
    await expect(page.getByText(/\bkcal\b/)).toHaveCount(0);
  };
  await startPlan(page);
  await noNumber();
  await choose(page, 'choice-lose');
  await expect(page.getByTestId('step-screening')).toBeVisible();
  await expect(page.getByTestId('continue')).toBeDisabled(); // nothing ticked yet
  await noNumber();
  await choose(page, 'screen-none');
  await choose(page, 'choice-female');
  await expect(page.getByTestId('step-born')).toBeVisible();
  await noNumber();
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('step-body')).toBeVisible();
  await noNumber();
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('so-far')).toBeVisible();
});

test('losing fat in imperial units: the paces show live, a cap is explained, and Google keeps the draft', async ({ page }) => {
  await openFresh(page);
  // 5 ft 6 in, 200 lb: BMI 32, so all three paces are offered
  await onboard(page, { goal: 'lose', sex: 'female', year: '1990', units: 'imperial', height: '5 6', weight: '200', neat: 'light', days: 0 });
  await expect(page.getByTestId('plan-training')).toHaveText('No training yet. Add it any time in Train.');
  for (const name of ['Gentle', 'Steady', 'Faster']) await expect(pace(page, name)).toBeVisible();
  await expect(pace(page, 'Steady')).toHaveAttribute('aria-checked', 'true');
  const steady = await kcal(page).innerText();
  await pace(page, 'Faster').click();
  await expect(kcal(page)).not.toHaveText(steady);
  await expect(page.getByTestId('plan-flag')).toHaveText('We limited the deficit to 25 percent of your maintenance.');
  await expect(page.getByTestId('plan-expect')).toContainText('Expect to lose about');
  await expect(page.getByTestId('plan-expect')).toContainText(' lb a week.');
  await expect(page.getByTestId('pace-why')).toHaveCount(0);
  await expect(page.getByTestId('plan-rest')).toHaveCount(0); // no sessions: one number a day
  await sumsExactly(page);

  await page.getByTestId('plan-save').click();
  await page.getByTestId('signin-google').click(); // leaves the page and comes back signed in
  await expect(page.getByTestId('dock')).toBeVisible();
  await expect.poll(() => record(page, 'profile', 'profile')).toMatchObject({ sex: 'female', birthYear: 1990, units: 'imperial', neat: 'light' });
  expect(await plans(page)).toMatchObject([{ goal: 'lose', ratePctPerWeek: 0.75, flags: ['deficitCap'] }]);
  expect(((await record(page, 'program', 'program')) as { sessions: unknown[] }).sessions).toEqual([]);
});

test('maintain with lifting and cardio: no pace, no experience question, and Train suggests a hybrid program', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'maintain', days: 5, kind: 'both' });
  await expect(page.getByTestId('plan-pace')).toHaveCount(0);
  await expect(page.getByTestId('plan-expect')).toContainText('Expect your weight to hold steady.');
  await expect(page.getByTestId('plan-training')).toHaveText('Lifting 3 days and cardio 2 days a week, at a moderate effort. Change it any time in Train.');
  await expect(page.getByTestId('line-goal')).toHaveCount(0);
  await sumsExactly(page);
  // back goes to what is trained: the experience question was never asked
  await page.getByTestId('back').click();
  await expect(page.getByTestId('step-kind')).toBeVisible();
  await expect(page.getByTestId('step-count')).toHaveText('Step 8 of 8');
  await choose(page, 'choice-both');
  await expect(page.getByTestId('your-plan')).toBeVisible({ timeout: 1000 }); // Building your plan played once this visit
  await page.getByTestId('plan-save').click();
  await signIn(page);
  await expect.poll(() => record(page, 'program', 'program')).toMatchObject({ sessions: [{ type: 'strength' }, { type: 'cardio' }, { type: 'strength' }, { type: 'cardio' }, { type: 'strength' }] });
  expect(await plans(page)).toMatchObject([{ goal: 'maintain', delta: 0 }]);

  // five days of both, under a year of lifting assumed: the three day hybrid
  await page.getByTestId('tab-1').click();
  await expect(page.getByTestId('train-suggest').getByRole('heading')).toHaveText('Full body and cardio 3 days');
  await expect(page.getByTestId('train-suggest')).toContainText('Fits 3 days a week.');
  await page.getByTestId('suggest-use').click();
  await expect.poll(() => record(page, 'program', 'program')).toMatchObject({ name: 'Full body and cardio 3 days' });
  await expect(page.getByTestId('train-suggest')).toHaveCount(0);
});

test('gaining on cardio alone: Train adds the two strength sessions to the week, keeping the cardio', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'gain', days: 3, kind: 'cardio' });
  await expect(page.getByTestId('plan-training')).toHaveText('Cardio 3 days a week, 30 minutes each, at a moderate effort. Change it any time in Train.');
  await page.getByTestId('plan-save').click();
  await signIn(page);
  await page.getByTestId('tab-1').click();
  await expect(page.getByTestId('train-suggest').getByRole('heading')).toHaveText('Minimal 2 days');
  await expect(page.getByTestId('train-suggest')).toContainText('Adds the two strength sessions a week that health guidelines advise.');
  await page.getByTestId('suggest-use').click();
  await expect.poll(async () => ((await record(page, 'program', 'program')) as { sessions: { type: string }[] }).sessions.map((s) => s.type).sort())
    .toEqual(['cardio', 'cardio', 'cardio', 'strength', 'strength']);
});

test('a medical condition leads to advice, then a maintenance target only', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'gain', screening: ['medical'] });
  await expect(page.getByTestId('plan-flag')).toHaveText('From your answers at the start, Ontrack sets a maintenance target only.');
  await expect(page.getByTestId('plan-pace')).toHaveCount(0);
  await expect(page.getByTestId('line-goal')).toHaveCount(0);
  await page.getByTestId('plan-save').click();
  await signIn(page);
  await expect.poll(() => plans(page)).toMatchObject([{ goal: 'maintain', flags: ['maintainOnly'] }]);
  expect(await record(page, 'profile', 'profile')).toMatchObject({ screening: { medical: true, pregnant: false, eatingDisorder: false } });
});

test('an eating disorder is advised against tracking and can leave setup', async ({ page }) => {
  await openFresh(page);
  await startPlan(page);
  await choose(page, 'choice-lose');
  await page.getByTestId('screen-eatingDisorder').click();
  await expect(page.getByTestId('continue')).toBeEnabled(); // a tick enables Continue
  await page.getByTestId('screen-eatingDisorder').click();
  await expect(page.getByTestId('continue')).toBeDisabled();
  await page.getByTestId('screen-eatingDisorder').click();
  await expect(page.getByTestId('screen-none')).toHaveAttribute('aria-checked', 'false');
  // None of these apply unticks like any checkbox, and a tick takes it back
  await page.getByTestId('screen-eatingDisorder').click();
  await page.getByTestId('screen-none').click();
  await expect(page.getByTestId('screen-none')).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('screen-none').click();
  await expect(page.getByTestId('continue')).toBeDisabled();
  await page.getByTestId('screen-none').click();
  await page.getByTestId('screen-eatingDisorder').click();
  await expect(page.getByTestId('screen-none')).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('step-advice')).toContainText('Thank you for telling us.');
  await expect(page.getByTestId('step-advice')).toContainText('Support comes first');
  await page.getByTestId('advice-leave').click();
  await expect(page.getByTestId('landing')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ot-ui')!).draft)).toBeNull();
});

test('pregnancy leads to advice and maintenance', async ({ page }) => {
  await openFresh(page);
  await startPlan(page);
  await choose(page, 'choice-lose');
  await page.getByTestId('screen-pregnant').click();
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('step-advice')).toContainText('Plan this with your clinician');
  await expect(page.getByTestId('advice-continue')).toHaveText('Track with a maintenance target');
  await page.getByTestId('advice-continue').click();
  await expect(page.getByTestId('step-sex')).toBeVisible();
});

test('a birth year under 18 ends setup with an explanation', async ({ page }) => {
  await openFresh(page);
  await startPlan(page);
  await choose(page, 'choice-gain');
  await choose(page, 'screen-none');
  await choose(page, 'choice-male');
  await wheelType(page, 'wheel-year', '2012');
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('step-young')).toContainText('people 18 and over');
  await expect(page.getByTestId('continue')).toHaveCount(0);
  // a typo can be fixed: the wheel keeps the year
  await page.getByTestId('back').click();
  await expect(page.getByTestId('wheel-year').getByRole('slider')).toHaveAttribute('aria-valuenow', '2012');
  await wheelType(page, 'wheel-year', '1850'); // out of range: brought inside, and said why
  await expect(page.getByTestId('step-born')).toContainText('Enter a year from 1916 to 2026.');
  await wheelType(page, 'wheel-year', '2012');
  await page.getByTestId('continue').click();
  await page.getByTestId('young-leave').click();
  await expect(page.getByTestId('landing')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('ot-ui')!).draft)).toBeNull();
});

test('below BMI 18.5 no weight loss pace is offered', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'lose', weight: '55' }); // 175 cm, BMI 18
  await expect(page.getByTestId('pace-why')).toContainText('below a BMI of 18.5');
  await expect(page.getByTestId('plan-pace')).toHaveCount(0);
  await expect(page.getByTestId('plan-expect')).toContainText('hold steady');
  await page.getByTestId('plan-save').click();
  await signIn(page);
  await expect.poll(() => plans(page)).toMatchObject([{ goal: 'maintain', delta: 0 }]);
});

test('between BMI 18.5 and 20 only the gentle pace is offered', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'lose', weight: '60' }); // BMI 19.6
  await expect(page.getByTestId('pace-why')).toContainText('only the gentle pace');
  await expect(page.getByTestId('plan-pace').getByRole('radio')).toHaveCount(1);
  await expect(pace(page, 'Gentle')).toHaveAttribute('aria-checked', 'true');
});

test('gaining at BMI 20 or more, and after three years of lifting, each say which pace is missing', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'gain', weight: '70', experience: 'advanced' }); // BMI 22.9
  await expect(page.getByTestId('pace-why')).toHaveText('After three years of training, gains come slower, so only the lean pace is offered.');
  await expect(page.getByTestId('plan-pace').getByRole('radio')).toHaveCount(1);
  await page.getByTestId('back').click();
  await choose(page, 'choice-intermediate');
  await expect(page.getByTestId('pace-why')).toHaveText('The faster pace is offered below a BMI of 20.');
  await expect(page.getByTestId('plan-pace').getByRole('radio')).toHaveText([PACE.gain[0.25], PACE.gain[0.5]]);
});

test('under BMI 16 a doctor card shows, gaining is still offered, and a low goal weight is refused', async ({ page }) => {
  await openFresh(page);
  await onboard(page, { goal: 'gain', weight: '48' }); // BMI 15.7
  await expect(page.getByTestId('plan-doctor')).toContainText('See a doctor first');
  await expect(page.getByTestId('plan-expect')).toContainText('Expect to gain');
  await page.getByTestId('tune-goalweight').click();
  // the wheel starts at the current weight and goes no lower than BMI 18.5
  await expect(page.getByTestId('picker-save')).toBeVisible();
  await wheelType(page, 'picker-wheel', '50');
  await expect(page.getByTestId('picker-hint')).toContainText('A goal weight below 56.7 kg is not offered');
  await expect(page.getByTestId('picker-wheel').getByRole('slider').first()).toHaveAttribute('aria-valuetext', '56.7 kg');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('picker')).toBeHidden();
  await expect(page.getByTestId('tune-goalweight')).toContainText('None yet');
  await page.getByTestId('tune-goalweight').click();
  await pickerSave(page, '62');
  await expect(page.getByTestId('tune-goalweight')).toContainText('62 kg');
  // Clear takes it away again
  await page.getByTestId('tune-goalweight').click();
  await page.getByTestId('picker-clear').click();
  await expect(page.getByTestId('tune-goalweight')).toContainText('None yet');
});

test('a returning user signs in from the landing page and lands on Today with the account plan', { tag: '@smoke' }, async ({ page }) => {
  const s = await seedAccount(page, { signedIn: false });
  await openFresh(page, s);
  await signIn(page); // through the landing page's Sign in
  await expect(page.getByTestId('tab-today')).toBeVisible();
  expect(await record(page, 'profile', 'profile')).toMatchObject({ birthYear: 2001 });
  await expect(page.getByTestId('first-day')).toHaveCount(0); // set up on another phone
  // a reload goes straight to Today, without the landing page showing for a moment while the store opens
  await page.addInitScript(() => {
    new MutationObserver(() => {
      if (document.querySelector('[data-testid="landing"]')) (window as unknown as { flashed: boolean }).flashed = true;
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
  await expect(page.getByTestId('landing')).toBeVisible();
  await expect(page.getByTestId('landing-signin')).toBeVisible(); // the way to switch to another account
  await onboard(page, { goal: 'gain' });
  await expect(page.getByTestId('plan-save-line')).toHaveCount(0); // already signed in
  await page.getByTestId('plan-save').click();
  await expect(page.getByTestId('tab-today')).toBeVisible();
  await expect(page.getByTestId('signin-sheet')).toHaveCount(0);
  expect(await plans(page)).toHaveLength(1);
});

test('the draft survives a reload on any step', async ({ page }) => {
  await openFresh(page);
  await startPlan(page);
  await choose(page, 'choice-gain');
  await choose(page, 'screen-none');
  await expect(page.getByTestId('step-count')).toHaveText('Step 3 of 9');
  await page.reload();
  await expect(page.getByTestId('step-sex')).toBeVisible();
  await page.getByTestId('back').click();
  await expect(page.getByTestId('screen-none')).toHaveAttribute('aria-checked', 'true');
});

test('a draft saved before O1 opens on the same plan in the new flow', async ({ page }) => {
  await withPrefs(page, {
    draft: {
      at: 'pace', units: 'metric', goal: 'gain', screening: { pregnant: false, medical: false, eatingDisorder: false }, sex: 'male', birthYear: 2001,
      heightCm: 175, weightKg: 60, neat: 'seated', train: { kind: 'custom', days: 4, type: 'strength', minutes: 60, intensity: 'moderate' }, experience: 'beginner',
    },
  });
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await useSpace(page, space('old-draft'));
  await page.goto('/');
  await expect(page.getByTestId('your-plan')).toBeVisible({ timeout: 15_000 }); // not the landing page
  await expect(kcal(page)).toHaveText('2,460');
  await page.getByTestId('back').click();
  await expect(page.getByTestId('step-experience')).toBeVisible();
});
