// R5 freemium: the free plan's daily AI logs, the plans sheet, the mock Checkout (the 0 THB preview), Pro's trial in
// Settings with cancel and keep, and Pro features offered from where they live.
import { expect, test } from '@playwright/test';
import { openSeeded, seedAccount, setPlan, takePhoto, TODAY, vision } from './helpers';

test('a free account gets its daily AI logs, then the plans, then Pro through Checkout', async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  const s = await seedAccount(page, { plan: 'free' });
  await page.goto('/');
  await expect(page.getByTestId('dock')).toBeVisible();
  await vision(page, s, { fixture: 'basil-pork', used: 1 });

  // the second of three: it works and says what is left
  await takePhoto(page);
  await expect(page.getByTestId('review-free-left')).toHaveText('1 free AI log left today');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('review-sheet')).toHaveCount(0);

  // over the limit: log it by hand, or Pro
  await vision(page, s, { used: 3 });
  await takePhoto(page);
  await expect(page.getByTestId('review-error')).toContainText("You have used today's 3 free AI logs.");
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

test('Ask Ontrack and Adjust with AI offer Pro on the free plan, and open on Pro', async ({ page }) => {
  const s = await openSeeded(page, 'raise');
  await setPlan(page, s!, 'free');
  await page.reload();
  await expect(page.getByTestId('dock')).toBeVisible();
  await page.getByTestId('tab-2').click();
  await page.getByTestId('ask-open').click();
  await expect(page.getByTestId('paywall-hero')).toContainText('Ask Ontrack is part of Pro');
  await page.getByTestId('paywall-free').click();
  await page.getByTestId('tab-1').click();
  await page.getByTestId('program-ai-open').click();
  await expect(page.getByTestId('paywall-hero')).toContainText('Adjust with AI is part of Pro');
});

test('Settings on the free plan says what it has and offers Pro', async ({ page }) => {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await seedAccount(page, { plan: 'free' });
  await page.goto('/');
  await page.getByTestId('avatar').click();
  await page.getByTestId('me-settings').click();
  await expect(page.getByTestId('set-plan')).toContainText('Ontrack Free');
  await expect(page.getByTestId('set-plan')).toContainText('3 AI meal logs a day');
  await page.getByTestId('set-plan-pro').click();
  await expect(page.getByTestId('paywall-hero')).toContainText('Every meal, one photo away');
});
