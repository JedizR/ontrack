// R5 freemium: the free plan's daily AI logs, the plans sheet, the mock Checkout (the 0 THB preview), Pro's trial in
// Settings with cancel and keep, and Pro features offered from where they live.
import { expect, test } from '@playwright/test';
import { openSeeded, seedAccount, setPlan, takePhoto, TODAY, vision } from './helpers';

test('a free account gets its daily AI logs, then the plans, then Pro through Checkout', async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  const s = await seedAccount(page, { plan: 'free' });
  await page.goto('/');
  await expect(page.getByTestId('dock')).toBeVisible();
  await vision(page, s, { fixture: 'basil-pork', used: 3 });

  // the fourth of five (27 Nov): it works and says what is left
  await takePhoto(page);
  await expect(page.getByTestId('review-free-left')).toHaveText('1 free AI log left today');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('review-sheet')).toHaveCount(0);

  // over the limit: log it by hand, or Pro
  await vision(page, s, { used: 5 });
  await takePhoto(page);
  await expect(page.getByTestId('review-error')).toContainText("You have used today's 5 free AI logs.");
  await page.getByTestId('review-pro').click();
  await expect(page.getByTestId('paywall-hero')).toContainText("Today's free AI logs are used");
  await expect(page.getByTestId('paywall-save')).toHaveText('Save 45%');
  await page.getByTestId('paywall-month').click();
  await expect(page.getByTestId('paywall-fine')).toContainText('7 days free, then ฿149 a month.');

  // the mock's Checkout comes straight back, as a 0 THB bill does: welcome, and Pro in Settings with its trial
  await page.getByTestId('paywall-go').click();
  await expect(page.getByTestId('paywall-welcome')).toBeVisible();
  expect(new URL(page.url()).search).toBe('');
  await page.getByTestId('paywall-done').click();
  await page.getByTestId('avatar').click();
  await expect(page.getByTestId('me-pro')).toBeVisible();
  await page.getByTestId('me-settings').click();
  await expect(page.getByTestId('set-plan')).toContainText('Ontrack Pro');
  await expect(page.getByTestId('set-plan')).toContainText('Free trial until');
  await page.getByTestId('set-plan-change').click();
  await expect(page.getByTestId('set-plan')).toContainText('then Free');
  await page.getByTestId('set-plan-change').click();
  await expect(page.getByTestId('set-plan')).toContainText('Free trial until');
});

test('on the free plan Ask Ontrack answers, says what is left this month, and offers Pro once it is used (27 Nov)', async ({ page }) => {
  const s = await openSeeded(page, 'raise');
  await setPlan(page, s!, 'free');
  await page.reload();
  await expect(page.getByTestId('dock')).toBeVisible();
  await page.getByTestId('tab-2').click();
  await page.getByTestId('ask-open').click();
  await expect(page.getByTestId('ask-sheet')).toBeVisible();
  for (let n = 9; n >= 0; n--) {
    await page.getByTestId('ask-field').fill(`How is my protein, take ${n}?`);
    await page.getByTestId('ask-send').click();
    await expect(page.getByTestId('ask-left').last()).toHaveText(n === 1 ? '1 free answer left this month' : `${n} free answers left this month`);
  }
  await page.getByTestId('ask-field').fill('And my weight?');
  await page.getByTestId('ask-send').click();
  await expect(page.getByTestId('ask-a').last()).toContainText("You have used this month's 10 free answers.");
  await page.getByTestId('ask-pro').click();
  await expect(page.getByTestId('paywall-hero')).toContainText("This month's free answers are used");
});

test('Settings on the free plan says what it has and offers Pro', async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await seedAccount(page, { plan: 'free' });
  await page.goto('/');
  await page.getByTestId('avatar').click();
  await page.getByTestId('me-settings').click();
  await expect(page.getByTestId('set-plan')).toContainText('Ontrack Free');
  await expect(page.getByTestId('set-plan')).toContainText('5 AI meal logs a day and 10 AI answers a month');
  await page.getByTestId('set-plan-pro').click();
  await expect(page.getByTestId('paywall-hero')).toContainText('Every meal, one photo away');
});
