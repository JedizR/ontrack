import { expect, type Page } from '@playwright/test';

export const TODAY = '2026-11-11';

/**
 * Freeze "today" so dates are deterministic; timers keep running. "/" opens the app signed in to an onboarded account,
 * with `records` added to it.
 */
export async function open(page: Page, path = '/', records?: Seed[]) {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  const s = path === '/' ? await seedAccount(page, { records }) : undefined;
  await page.goto(path);
  await expect(page.getByTestId('dock')).toBeVisible();
  return s;
}

/** The mock vision provider in a space: answer every analysis with this fixture (null: by hash), start the day's count here. */
export const vision = (page: Page, s: string | undefined, o: { fixture?: string | null; used?: number }) =>
  page.request.post('/__mock/vision', { headers: { 'x-mock-space': s ?? 'default' }, data: o }).then((r) => expect(r.ok()).toBe(true));

/** Take a photo from the Add sheet's Photo tile: the camera is a file chooser in tests. */
export async function takePhoto(page: Page, notice = false) {
  await page.getByTestId('add').click();
  const chooser = page.waitForEvent('filechooser');
  await page.getByTestId('add-photo').click();
  if (notice) await page.getByTestId('photo-continue').click();
  await (await chooser).setFiles('tests/fixtures/meal.jpg');
  await expect(page.getByTestId('review-sheet')).toBeVisible();
}

/** The dev server compiles the lazy onboarding chunk on first request, which is slow with every worker asking at once. */
const FIRST_PAINT = 15_000;

/** Wait for Welcome, the first screen of a signed out browser. */
export const toWelcome = (page: Page) => expect(page.getByTestId('welcome')).toBeVisible({ timeout: FIRST_PAINT });

/** Open the app signed out, in a fresh browser: Welcome. */
export async function openFresh(page: Page, s = space('fresh')) {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await useSpace(page, s);
  await page.goto('/');
  await toWelcome(page);
  return s;
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
    const welcome = page.getByTestId('welcome-signin');
    await expect(avatar.or(welcome)).toBeVisible({ timeout: FIRST_PAINT });
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
  // four strength hours: Monday, Wednesday (TODAY), Friday and Saturday, as the plan's exercise energy says
  { collection: 'program', id: 'program', updatedAt: 1, data: { name: '', sessions: [0, 2, 4, 5].map((weekday, i) => ({ key: `s${i}`, weekday, name: 'Strength', type: 'strength', minutes: 60, intensity: 'moderate' })) } },
];

type Seed = { collection: string; id: string; updatedAt: number; deleted?: true; data: unknown };
const at = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();
const meal = (id: string, date: string, time: string, title: string, items: { name: string; grams?: number; kcal: number; protein: number; carbs: number; fat: number; source: string; foodId?: string }[]): Seed =>
  ({ collection: 'meal', id, updatedAt: 1, data: { date, at: at(date, time), title, method: items[0].source === 'manual' ? 'quick' : 'search', items } });
/** A typical day: three meals on TODAY (1,840 kcal), one the day before, and a saved meal. */
export const MEALS: Seed[] = [
  meal('m1', TODAY, '08:10', 'Oats, banana and whey', [{ name: 'Oats', grams: 80, kcal: 303, protein: 10.5, carbs: 54, fat: 5.5, source: 'db' }, { name: 'Banana', grams: 118, kcal: 105, protein: 1.3, carbs: 27, fat: 0.4, source: 'db' }, { name: 'Whey', grams: 30, kcal: 202, protein: 24, carbs: 3, fat: 2, source: 'db' }]),
  meal('m2', TODAY, '12:40', 'Chicken rice bowl', [{ name: 'White rice', grams: 300, kcal: 390, protein: 8.1, carbs: 84.5, fat: 0.8, source: 'db', foodId: 'rice-white' }, { name: 'Roast chicken breast', grams: 200, kcal: 330, protein: 62, carbs: 0, fat: 7.2, source: 'db' }]),
  meal('m3', TODAY, '19:05', 'Snack', [{ name: 'Snack', kcal: 510, protein: 12, carbs: 60, fat: 24, source: 'manual' }]),
  meal('m4', '2026-11-10', '13:00', 'Pad kra pao', [{ name: 'Pad kra pao', kcal: 2300, protein: 100, carbs: 280, fat: 80, source: 'manual' }]),
  { collection: 'saved', id: 'sv1', updatedAt: 1, data: { title: 'Usual breakfast', items: [{ name: 'Oats', grams: 80, kcal: 303, protein: 10.5, carbs: 54, fat: 5.5, source: 'db' }], uses: 3, lastUsedAt: at('2026-11-09', '08:00') } },
];

/**
 * An account on the mock server in its own space. `onboarded` (default) gives it a plan; `signedIn` (default) signs
 * this page in to it before the app loads, once per tab, so a sign out or a reload is not undone.
 */
export async function seedAccount(page: Page, o: { space?: string; email?: string; onboarded?: boolean; signedIn?: boolean; records?: Seed[] } = {}) {
  const s = o.space ?? space('seed');
  const email = o.email ?? EMAIL;
  const headers = { 'x-mock-space': s };
  const session = (await (await page.request.post('/__mock/auth/verify', { headers, data: { email, code: '123456' } })).json()) as { token: string; userId: string };
  if (o.onboarded !== false) await page.request.post('/__mock/push', { headers: { ...headers, authorization: `Bearer ${session.token}` }, data: { records: [...SEED, ...(o.records ?? [])] } });
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

/**
 * Type a value into a wheel: Enter on its first column opens the field (as tapping the band does), then type and Enter.
 * The keyboard path, because Playwright scrolls a tapped row into view first, which moves the wheel under the tap.
 */
export async function wheelType(page: Page, testid: string, value: string) {
  const wheel = page.getByTestId(testid);
  await wheel.getByRole('slider').first().press('Enter');
  const field = wheel.getByRole('textbox');
  await field.fill(value);
  await field.press('Enter');
  await expect(field).toHaveCount(0);
}

/** The wheel sheet: type a value and save it. */
export async function pickerSave(page: Page, value: string) {
  await expect(page.getByTestId('picker')).toBeVisible();
  await wheelType(page, 'picker-wheel', value);
  await page.getByTestId('picker-save').click();
  await expect(page.getByTestId('picker')).toBeHidden();
}

/** A native field, filled. */
export const fieldFill = (page: Page, testid: string, value: string) => page.getByTestId(testid).fill(value);

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

/** From Welcome to Your plan. Defaults are vector A of docs/SCIENCE.md. */
export async function onboard(page: Page, a: Answers) {
  await expect(page.getByTestId('welcome-start')).toBeVisible({ timeout: FIRST_PAINT });
  await page.getByTestId('welcome-start').click();
  await page.getByTestId(`choice-${a.goal}`).click();

  await expect(page.getByTestId('step-screening')).toBeVisible();
  for (const k of a.screening ?? []) await page.getByTestId(`screen-${k}`).click();
  if (!a.screening?.length) await page.getByTestId('screen-none').click();
  await page.getByTestId('continue').click();
  if (a.screening?.length) await page.getByTestId('advice-continue').click();

  await page.getByTestId(`choice-${a.sex ?? 'male'}`).click();
  await wheelType(page, 'wheel-year', a.year ?? '2001');
  await page.getByTestId('continue').click();
  await expect(page.getByTestId('step-body')).toBeVisible();
  if (a.units === 'imperial') {
    await page.getByRole('radio', { name: 'Imperial' }).click();
    const [ft, inches] = (a.height ?? '5 9').split(' ');
    await wheelType(page, 'wheel-height-ft', ft);
    await wheelType(page, 'wheel-height-in', inches);
    await wheelType(page, 'wheel-weight', a.weight ?? '132');
  } else {
    await wheelType(page, 'wheel-height', a.height ?? '175');
    await wheelType(page, 'wheel-weight', a.weight ?? '60');
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
