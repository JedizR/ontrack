import { expect, type Page } from '@playwright/test';

export const TODAY = '2026-11-11';

/** Freeze "today" so dates are deterministic; timers keep running. */
export async function open(page: Page, path = '/') {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await page.goto(path);
  await expect(page.getByTestId('dock')).toBeVisible();
}

/** Seed per-device prefs (theme, text size, last tab) before the app loads. */
export const withPrefs = (page: Page, ui: object) =>
  page.addInitScript((v) => localStorage.setItem('ot-ui', v), JSON.stringify(ui));

/**
 * A horizontal swipe starting at a point on screen (default: the empty middle of the page). The swipe action reads only
 * clientX and clientY of the first touch, so plain events with those fields work in every engine, including WebKit,
 * which has no CDP touch input.
 */
export async function swipeAt(page: Page, dx: number, at: { x?: number; y?: number } = {}) {
  await page.evaluate(({ dx, at }) => {
    const x = at.x ?? innerWidth / 2;
    const y = at.y ?? innerHeight / 2;
    const el = document.elementFromPoint(x, y)!;
    const fire = (type: string, cx: number) => {
      const e = new Event(type, { bubbles: true });
      const touches = type === 'touchend' ? [] : [{ clientX: cx, clientY: y }];
      Object.assign(e, { touches, changedTouches: [{ clientX: cx, clientY: y }] });
      el.dispatchEvent(e);
    };
    fire('touchstart', x);
    for (let i = 1; i <= 8; i++) fire('touchmove', x + (dx * i) / 8);
    fire('touchend', x + dx);
  }, { dx, at });
}
