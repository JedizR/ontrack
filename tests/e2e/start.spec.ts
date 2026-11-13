// M9b: cold start with a year of data (PRD section 8: interactive in 1.5 s on an iPhone 12). A year of logs is pulled
// once; then the app is reloaded from its service worker and IndexedDB, and timed from navigation to Today's number on
// screen. Not a gate (the phone's own figure is the owner's check); run it against a production build:
//   VITE_BACKEND=mock pnpm build && pnpm preview --port 5298 --strictPort &
//   E2E_BASE_URL=http://localhost:5298 pnpm exec playwright test --project=measure start
// It prints one JSON line per browser: the median of seven reloads, in WebKit and in Chromium at a 4x slower CPU.
import { chromium, expect, test, type Page } from '@playwright/test';
import { SEED, seedAccount } from './helpers';
import { addDays, weekdayOf } from '../../src/lib/model/dates';

// the dev server has no service worker: this runs only against a build (E2E_BASE_URL)
test.skip(!process.env.E2E_BASE_URL, 'needs a production build, see the top of the file');

const DAYS = 365;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
const at = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();
const food = (name: string, kcal: number) => ({ name, grams: 200, kcal, protein: kcal / 20, carbs: kcal / 8, fat: kcal / 30, source: 'db' });

/** Four meals of two items a day, a weigh-in a day and four strength sessions a week, for a year up to today. */
function year() {
  const recs: { collection: string; id: string; updatedAt: number; data: unknown }[] = SEED.filter((r) => r.collection !== 'weight');
  for (let ago = DAYS - 1; ago >= 0; ago--) {
    const date = addDays(today, -ago);
    ['08:10', '12:40', '15:30', '19:05'].forEach((time, n) =>
      recs.push({ collection: 'meal', id: `y-${date}-${n}`, updatedAt: 1, data: { date, at: at(date, time), title: `Meal ${n + 1}`, method: 'search', items: [food('Rice', 260 + n), food('Chicken', 240 + ago % 50)] } }));
    recs.push({ collection: 'weight', id: `weight:${date}`, updatedAt: 1, data: { date, kg: 60 + (DAYS - ago) * 0.01 } });
    if (ago > 0 && [0, 2, 4, 5].includes(weekdayOf(date))) recs.push({ collection: 'slog', id: `slog:${date}:s${[0, 2, 4, 5].indexOf(weekdayOf(date))}`, updatedAt: 1, data: { date, sessionKey: `s${[0, 2, 4, 5].indexOf(weekdayOf(date))}`, status: 'done' } });
  }
  // the plan starts a year ago, so every day of the year has targets
  return recs.map((r) => (r.collection === 'plan' ? { ...r, data: { ...(r.data as object), effectiveFrom: addDays(today, 1 - DAYS) } } : r));
}

/** ms from navigation to the frame after Today's number first shows (reduced motion: the number lands at once). */
const startTime = async (page: Page) => {
  await page.reload();
  return page.evaluate(() => new Promise<[number, string]>((done) => {
    const check = () => {
      const hero = document.querySelector('[data-testid="hero-value"]');
      if (!hero || !/[1-9]/.test(hero.textContent ?? '')) return false;
      requestAnimationFrame(() => done([performance.now(), hero.textContent!.trim()]));
      return true;
    };
    if (!check()) new MutationObserver((_, o) => check() && o.disconnect()).observe(document, { subtree: true, childList: true, characterData: true });
  }));
};

async function measure(page: Page, browser: string) {
  const records = year();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedAccount(page, { account: records });
  await page.goto('/');
  await expect(page.getByTestId('hero-value')).toHaveText(/[1-9]/, { timeout: 30_000 });
  await page.waitForLoadState('networkidle'); // the year's pull has finished
  await page.waitForTimeout(1500); // and IndexedDB has written it
  await startTime(page); // once more, so the service worker serves every file
  const runs: number[] = [];
  for (let i = 0; i < 7; i++) {
    const [ms, first] = await startTime(page);
    runs.push(Math.round(ms));
    // the first number shown is today's real one, read from the year in IndexedDB, not a placeholder
    await page.waitForTimeout(1000);
    await expect(page.getByTestId('hero-value')).toHaveText(first);
  }
  runs.sort((a, b) => a - b);
  console.log(JSON.stringify({ task: 'start with a year', browser, records: records.length, medianMs: runs[3], runs }));
}

/** PRD section 8, tap to visible response: each tap's Event Timing duration (input to the next paint), Chromium only. */
async function taps(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { taps: Record<number, number> };
    w.taps = {};
    new PerformanceObserver((l) => {
      for (const e of l.getEntries() as PerformanceEventTiming[]) if (e.interactionId) w.taps[e.interactionId] = Math.max(w.taps[e.interactionId] ?? 0, e.duration);
    }).observe({ type: 'event', durationThreshold: 16, buffered: false } as PerformanceObserverInit);
  });
  // the tabs (Train and Progress load on their first tap), the Add sheet, Search, and a day in the week
  for (const id of ['tab-1', 'tab-2', 'tab-0', 'add', 'add-search']) {
    await page.getByTestId(id).click();
    await page.waitForTimeout(600);
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /^Monday/ }).first().click();
  await page.waitForTimeout(600);
  const ms = Object.values(await page.evaluate(() => (window as unknown as { taps: Record<number, number> }).taps)).sort((a, b) => a - b);
  // durations under 16 ms are not reported: those taps answered within a frame
  console.log(JSON.stringify({ task: 'tap to next paint', browser: 'chromium, 4x CPU', taps: 7, over16ms: ms, maxMs: ms.at(-1) ?? 16 }));
}

test('start with a year of data, WebKit', async ({ page }) => {
  test.setTimeout(120_000);
  await measure(page, 'webkit');
});

// Chromium for its CPU throttle, launched here because a project's browser cannot change inside a file
test('start with a year of data, Chromium at a 4x slower CPU', async ({ baseURL }) => {
  test.setTimeout(120_000);
  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL, viewport: { width: 390, height: 664 }, isMobile: true, hasTouch: true, locale: 'en-US', timezoneId: 'Asia/Bangkok' });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await measure(page, 'chromium, 4x CPU');
  await taps(page);
  await browser.close();
});
