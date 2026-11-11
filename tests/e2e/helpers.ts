import { expect, type Page } from '@playwright/test';

export const TODAY = '2026-11-11';

/** Freeze "today" so dates are deterministic; timers keep running. "/" opens the app signed in to an onboarded account. */
export async function open(page: Page, path = '/') {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  if (path === '/') await seedAccount(page);
  await page.goto(path);
  await expect(page.getByTestId('dock')).toBeVisible();
}

/** Open the app signed out, on a fresh phone: the install guide in Safari on iPhone, Welcome elsewhere. */
export async function openFresh(page: Page, s = space('fresh')) {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await useSpace(page, s);
  await page.goto('/');
  await expect(page.getByTestId('install').or(page.getByTestId('welcome'))).toBeVisible();
  return s;
}

/** Past Safari's install guide, if it shows, to Welcome. */
export async function toWelcome(page: Page) {
  const install = page.getByTestId('install-continue');
  await expect(install.or(page.getByTestId('welcome'))).toBeVisible();
  if (await install.isVisible()) await install.click();
  await expect(page.getByTestId('welcome')).toBeVisible();
}

/** Seed per-device prefs (theme, text size, last tab) before the app loads, over what the app saved itself. */
export const withPrefs = (page: Page, ui: object) =>
  page.addInitScript((v) => localStorage.setItem('ot-ui', JSON.stringify({ ...JSON.parse(localStorage.getItem('ot-ui') ?? '{}'), ...JSON.parse(v) })), JSON.stringify(ui));

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

export const EMAIL = 'me@example.com';
/** A fresh world on the mock backend for one test; two contexts in one space are two phones on one account. */
export const space = (name: string) => `e2e-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
export const useSpace = (page: Page, s: string) => page.addInitScript((v) => localStorage.setItem('ontrack:mock-space', v), s);

/**
 * Sign in through the sheet with the mock's code. Opens the sheet from the avatar, or from Welcome, unless it is open.
 * By default the account has a plan, so the app lands on Today; `shell: false` stops once the sheet has closed.
 */
export async function signIn(page: Page, email = EMAIL, { shell = true } = {}) {
  const sheet = page.getByTestId('signin-sheet');
  if (!(await sheet.isVisible())) {
    const avatar = page.getByTestId('avatar');
    const install = page.getByTestId('install-continue');
    const welcome = page.getByTestId('welcome-signin');
    await expect(avatar.or(install).or(welcome)).toBeVisible();
    if (await install.isVisible()) await install.click();
    await (await avatar.isVisible() ? avatar : welcome).click();
  }
  await page.getByTestId('signin-email').fill(email);
  await page.getByTestId('signin-send').click();
  await page.getByTestId('signin-code').fill('123456');
  await expect(sheet).toBeHidden();
  if (shell) await expect(page.getByTestId('avatar')).toHaveAttribute('aria-label', 'Account');
}

/** A finished onboarding as the account holds it: vector A of docs/SCIENCE.md, the hardgainer. */
const AT = '2026-11-11T03:00:00.000Z';
export const SEED = [
  { collection: 'profile', id: 'profile', updatedAt: 1, data: { sex: 'male', birthYear: 2001, heightCm: 175, neat: 'seated', experience: 'beginner', units: 'metric', calorieMode: 'matched', checkinWeekday: 2, screening: { pregnant: false, medical: false, eatingDisorder: false, at: AT }, onboardedAt: AT } },
  { collection: 'plan', id: 'seed-plan', updatedAt: 1, data: { effectiveFrom: TODAY, goal: 'gain', ratePctPerWeek: 0.5, weightKg: 60, bmr: 1573.75, baseline: 1888.5, eeeByWeekday: [240, 0, 240, 0, 240, 240, 0], delta: 330, proteinG: 108, fatG: 66, flags: [], tdeeSource: 'formula', engineVersion: 1, source: 'onboarding' } },
  { collection: 'weight', id: `weight:${TODAY}`, updatedAt: 1, data: { date: TODAY, kg: 60 } },
];

/**
 * An account on the mock server in its own space. `onboarded` (default) gives it a plan; `signedIn` (default) signs
 * this page in to it before the app loads, once per tab, so a sign out or a reload is not undone.
 */
export async function seedAccount(page: Page, o: { space?: string; email?: string; onboarded?: boolean; signedIn?: boolean } = {}) {
  const s = o.space ?? space('seed');
  const email = o.email ?? EMAIL;
  const headers = { 'x-mock-space': s };
  const session = (await (await page.request.post('/__mock/auth/verify', { headers, data: { email, code: '123456' } })).json()) as { token: string; userId: string };
  if (o.onboarded !== false) await page.request.post('/__mock/push', { headers: { ...headers, authorization: `Bearer ${session.token}` }, data: { records: SEED } });
  const signedIn = o.signedIn === false ? '' : JSON.stringify({ token: session.token, userId: session.userId, email });
  await page.addInitScript(([sp, sess]) => {
    localStorage.setItem('ontrack:mock-space', sp);
    if (sess && !sessionStorage.getItem('ot-seeded')) {
      sessionStorage.setItem('ot-seeded', '1');
      localStorage.setItem('ontrack:mock-session', sess);
    }
  }, [s, signedIn] as const);
  return s;
}

/** Type digits on the open keypad and save. Onboarding may open the keypad again for the next value at once. */
export async function keypadEnter(page: Page, digits: string) {
  const pad = page.getByTestId('keypad');
  const title = pad.locator('[data-slot="drawer-title"]');
  await expect(pad).toBeVisible();
  const asked = await title.innerText();
  await pad.getByRole('button', { name: 'Clear' }).click();
  for (const k of digits) await page.locator(`[data-key="${k}"]`).click();
  await page.getByTestId('keypad-save').click();
  await expect.poll(async () => !(await pad.isVisible()) || (await title.innerText()) !== asked).toBe(true);
}

export type Answers = {
  goal: 'gain' | 'lose' | 'maintain';
  screening?: ('pregnant' | 'medical' | 'eatingDisorder')[];
  sex?: 'male' | 'female' | 'unspecified';
  year?: string;
  units?: 'metric' | 'imperial';
  /** cm, or feet and inches as "5 6" */
  height?: string;
  /** kg or lb */
  weight?: string;
  neat?: 'seated' | 'light' | 'moving' | 'physical';
  /** the default custom week, a days count for strength sessions, a template id, or later */
  train?: 'default' | number | 'later' | string;
  experience?: 'beginner' | 'intermediate' | 'advanced';
  /** a pace rate, or the default */
  pace?: number;
};

/** From Welcome (or the install guide) to Your plan. Defaults are vector A of docs/SCIENCE.md. */
export async function onboard(page: Page, a: Answers) {
  const install = page.getByTestId('install-continue');
  await expect(install.or(page.getByTestId('welcome-start'))).toBeVisible();
  if (await install.isVisible()) await install.click();
  await page.getByTestId('welcome-start').click();
  await page.getByTestId(`choice-${a.goal}`).click();

  await expect(page.getByTestId('step-screening')).toBeVisible();
  for (const k of a.screening ?? []) await page.getByTestId(`screen-${k}`).click();
  if (!a.screening?.length) await page.getByTestId('screen-none').click();
  await page.getByTestId('continue').click();
  if (a.screening?.length) await page.getByTestId('advice-continue').click();

  await page.getByTestId(`choice-${a.sex ?? 'male'}`).click();
  await keypadEnter(page, a.year ?? '2001'); // the keypad opens by itself, and a valid year moves on
  await expect(page.getByTestId('step-body')).toBeVisible();
  if (a.units === 'imperial') {
    await page.keyboard.press('Escape'); // the height keypad opened in metric
    await expect(page.getByTestId('keypad')).toBeHidden();
    await page.getByRole('radio', { name: 'Imperial' }).click();
    const [ft, inches] = (a.height ?? '5 9').split(' ');
    await page.getByTestId('field-height').click();
    await keypadEnter(page, ft);
    await keypadEnter(page, inches);
    await keypadEnter(page, a.weight ?? '132'); // weight follows height while it is empty
  } else {
    await keypadEnter(page, a.height ?? '175');
    await keypadEnter(page, a.weight ?? '60');
  }
  await page.getByTestId('continue').click();
  await page.getByTestId(`choice-${a.neat ?? 'seated'}`).click();

  await expect(page.getByTestId('step-train')).toBeVisible();
  const train = a.train ?? 4;
  if (train === 'later') await page.getByTestId('train-later').click();
  else if (typeof train === 'string' && train !== 'default') {
    await page.getByTestId('train-choose').click();
    await page.getByTestId(`template-${train}`).click();
  } else {
    if (typeof train === 'number') for (let n = 3; n < train; n++) await page.getByRole('button', { name: 'More Days a week' }).click();
    await page.getByTestId('continue').click();
  }

  const exp = page.getByTestId('step-experience');
  const pace = page.getByTestId('step-pace');
  const plan = page.getByTestId('your-plan');
  await expect(exp.or(pace).or(plan)).toBeVisible();
  if (await exp.isVisible()) await page.getByTestId(`choice-${a.experience ?? 'beginner'}`).click();
  await expect(pace.or(plan)).toBeVisible();
  if (await pace.isVisible()) {
    if (a.pace === undefined) await page.getByTestId('continue').click();
    else await page.getByTestId(`choice-${a.pace}`).click();
  }
  await expect(plan).toBeVisible();
}
