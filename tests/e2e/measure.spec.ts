// O1: taps, wheel drags and time from the first tap to the save button, for a typical gain user and a typical cut user.
// Run with `pnpm playwright test --project=measure`; it prints one JSON line per user. Not a gate: the numbers go in
// the pull request. Time is modelled the same way for every flow (onboarding RESEARCH section 6): per screen 0.3 s and
// the words a first-time reader sees at 4 a second, per gesture 1.35 s to decide plus 0.4 s a tap or 1.5 s a drag. The
// words are counted from the screen as rendered, inside the viewport.
import { expect, test, type Page } from '@playwright/test';
import { openFresh } from './helpers';

type Log = { screen: string; words: number; taps: number; drags: number }[];

/** Words a first-time reader sees: text inside the viewport, numbers included. */
const words = (page: Page) =>
  page.evaluate(() => {
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n = 0;
    for (let node = walk.nextNode(); node; node = walk.nextNode()) {
      const el = node.parentElement;
      if (!el || el.closest('[aria-hidden="true"]') || !el.checkVisibility()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const r = range.getBoundingClientRect();
      if (r.height === 0 || r.bottom <= 0 || r.top >= innerHeight) continue;
      n += (node.textContent ?? '').split(/\s+/).filter(Boolean).length;
    }
    return n;
  });

function walker(page: Page) {
  const log: Log = [];
  return {
    log,
    async at(screen: string) {
      await expect(page.getByTestId(screen)).toBeVisible();
      await page.waitForTimeout(400); // transitions and count-ups settle before the words are read
      log.push({ screen, words: await words(page), taps: 0, drags: 0 });
    },
    async tap(testid: string) {
      log.at(-1)!.taps++;
      await page.getByTestId(testid).click();
    },
    /** A person drags a wheel when it does not start at their answer; the test types it. */
    async wheel(testid: string, value: string) {
      const slider = page.getByTestId(testid).getByRole('slider').first();
      if ((await slider.getAttribute('aria-valuenow')) !== value) {
        log.at(-1)!.drags++;
        await slider.press('Enter');
        const field = page.getByTestId(testid).getByRole('textbox');
        await field.fill(value);
        await field.press('Enter');
      }
    },
  };
}

function report(name: string, log: Log, ms: number) {
  const taps = log.reduce((a, s) => a + s.taps, 0);
  const drags = log.reduce((a, s) => a + s.drags, 0);
  const read = log.reduce((a, s) => a + 0.3 + s.words / 4, 0);
  const model = read + (taps + drags) * 1.35 + taps * 0.4 + drags * 1.5;
  console.log(JSON.stringify({ name, screens: log.length, taps, drags, gestures: taps + drags, words: log.reduce((a, s) => a + s.words, 0), modelSeconds: Math.round(model), walkSeconds: +(ms / 1000).toFixed(1), log }));
}

test.describe.configure({ mode: 'serial' });

// The flow before O1 (main at 0460b12), walked with this file before the redesign, same users and same model:
//   gain: 11 screens, 13 taps and 3 drags (16 gestures), 336 words, modelled 119 s, automated walk 5.0 s
//   cut:  11 screens, 12 taps and 3 drags (15 gestures), 345 words, modelled 119 s, automated walk 4.9 s
// The phone's region is Thailand, so the body screen starts in metric, as the owner's users' phones would.
test.use({ locale: 'en-TH' });

test('a typical gain user (vector A: 25, 175 cm, 60 kg, lifts 4 days)', async ({ page }) => {
  await openFresh(page);
  const w = walker(page);
  await w.at('landing-hero');
  const t0 = Date.now();
  await w.tap('landing-start');
  await w.at('step-goal');
  await w.tap('choice-gain');
  await w.at('step-screening');
  await w.tap('screen-none');
  await w.at('step-sex');
  await w.tap('choice-male');
  await w.at('step-born');
  await w.wheel('wheel-year', '2001');
  await w.tap('continue');
  await w.at('step-body');
  await w.wheel('wheel-height', '175');
  await w.wheel('wheel-weight', '60');
  await w.tap('continue');
  await w.at('step-move');
  await w.tap('choice-seated');
  await w.at('step-days');
  await w.tap('days-4');
  await w.at('step-kind');
  await w.tap('choice-lifting');
  await w.at('step-experience');
  await w.tap('choice-beginner');
  await w.at('your-plan');
  await w.tap('plan-save');
  await expect(page.getByTestId('signin-sheet')).toBeVisible();
  report('new gain', w.log, Date.now() - t0);
});

test('a typical cut user (32, 165 cm, 75 kg, some walking, lifts 3 days)', async ({ page }) => {
  await openFresh(page);
  const w = walker(page);
  await w.at('landing-hero');
  const t0 = Date.now();
  await w.tap('landing-start');
  await w.at('step-goal');
  await w.tap('choice-lose');
  await w.at('step-screening');
  await w.tap('screen-none');
  await w.at('step-sex');
  await w.tap('choice-female');
  await w.at('step-born');
  await w.wheel('wheel-year', '1994');
  await w.tap('continue');
  await w.at('step-body');
  await w.wheel('wheel-height', '165');
  await w.wheel('wheel-weight', '75');
  await w.tap('continue');
  await w.at('step-move');
  await w.tap('choice-light');
  await w.at('step-days');
  await w.tap('days-3');
  await w.at('step-kind');
  await w.tap('choice-lifting');
  await w.at('your-plan');
  await w.tap('plan-save');
  await expect(page.getByTestId('signin-sheet')).toBeVisible();
  report('new cut', w.log, Date.now() - t0);
});
