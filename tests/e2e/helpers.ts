import { expect, type Page } from '@playwright/test';
import { seedRecords, type Outcome } from '../../dev/seed';

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

/** Wait for the landing page (L1), the first screen of a signed out browser. */
export const toLanding = (page: Page) => expect(page.getByTestId('landing')).toBeVisible({ timeout: FIRST_PAINT });

/** Open the app signed out, in a fresh browser: the landing page. */
export async function openFresh(page: Page, s = space('fresh')) {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  await useSpace(page, s);
  await page.goto('/');
  await toLanding(page);
  return s;
}

/** Build your plan on the landing page, to the first question. Onboarding is its own chunk, loaded beside the landing page. */
export async function startPlan(page: Page) {
  await page.getByTestId('landing-start').click();
  await expect(page.getByTestId('step-goal')).toBeVisible({ timeout: FIRST_PAINT });
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
 * Sign in through the sheet with the mock's code. Opens the sheet from the avatar, or from the landing page, unless it is open.
 * By default the account has a plan, so the app lands on Today; `shell: false` stops once the sheet has closed.
 */
export async function signIn(page: Page, email = EMAIL, { shell = true } = {}) {
  const sheet = page.getByTestId('signin-sheet');
  if (!(await sheet.isVisible())) {
    const avatar = page.getByTestId('avatar');
    const landing = page.getByTestId('landing-signin');
    await expect(avatar.or(landing)).toBeVisible({ timeout: FIRST_PAINT });
    await (await avatar.isVisible() ? avatar : landing).click();
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

/** N2: whey (a 32 g scoop, 120 kcal) and creatine, each logged on TODAY: whey 2 scoops with 250 g whole milk, creatine taken. */
export const SUPPLEMENTS: Seed[] = [
  { collection: 'supplement', id: 'sup-whey', updatedAt: 1, data: { name: 'Whey protein', kind: 'whey', scoopG: 32, perScoop: { kcal: 120, protein: 24, carbs: 3, fat: 1.5 }, lastScoops: 2, lastMix: { foodId: 'milk-whole', grams: 250 } } },
  { collection: 'supplement', id: 'sup-creatine', updatedAt: 1, data: { name: 'Creatine', kind: 'creatine', scoopG: 5, perScoop: { kcal: 0, protein: 0, carbs: 0, fat: 0 }, lastScoops: 1 } },
  { collection: 'meal', id: 's1', updatedAt: 1, data: { date: TODAY, at: at(TODAY, '07:30'), title: 'Whey protein', method: 'supplement', items: [{ name: 'Whey protein', grams: 64, kcal: 240, protein: 48, carbs: 6, fat: 3, source: 'yours', supplementId: 'sup-whey', scoops: 2 }, { name: 'Whole milk', grams: 250, kcal: 153, protein: 7.9, carbs: 12, fat: 8.1, source: 'db', foodId: 'milk-whole' }] } },
  { collection: 'meal', id: 's2', updatedAt: 1, data: { date: TODAY, at: at(TODAY, '07:31'), title: 'Creatine', method: 'supplement', items: [{ name: 'Creatine', grams: 5, kcal: 0, protein: 0, carbs: 0, fat: 0, source: 'yours', supplementId: 'sup-creatine', scoops: 1 }] } },
];

/**
 * An account on the mock server in its own space. `onboarded` (default) gives it a plan, or `account` instead of SEED;
 * `signedIn` (default) signs this page in to it before the app loads, once per tab, so a sign out or a reload is not undone.
 */
export async function seedAccount(page: Page, o: { space?: string; email?: string; onboarded?: boolean; signedIn?: boolean; records?: Seed[]; account?: Seed[] } = {}) {
  const s = o.space ?? space('seed');
  const email = o.email ?? EMAIL;
  const headers = { 'x-mock-space': s };
  const session = (await (await page.request.post('/__mock/auth/verify', { headers, data: { email, code: '123456' } })).json()) as { token: string; userId: string };
  // the mock takes at most 100 records a push, as the sync engine sends them
  const records = [...(o.account ?? SEED), ...(o.records ?? [])];
  if (o.onboarded !== false) for (let i = 0; i < records.length; i += 100) await page.request.post('/__mock/push', { headers: { ...headers, authorization: `Bearer ${session.token}` }, data: { records: records.slice(i, i + 100) } });
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

/** Signed in to the dev seeder's account for this check-in outcome (dev/seed.ts): four weeks of logs, the check-in due on TODAY. */
export async function openSeeded(page: Page, outcome: Outcome, path = '/') {
  await page.clock.setFixedTime(new Date(`${TODAY}T10:00:00+07:00`));
  const s = await seedAccount(page, { account: seedRecords(outcome, TODAY) });
  await page.goto(path);
  await expect(page.getByTestId('dock')).toBeVisible();
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
  /** weight and recomp are the two behind "Not what you're looking for?" (U1a) */
  goal: 'gain' | 'lose' | 'maintain' | 'weight' | 'recomp';
  screening?: ('pregnant' | 'medical' | 'eatingDisorder')[];
  sex?: 'male' | 'female' | 'unspecified';
  year?: string;
  /** the tests' phone says en-US, so the screen starts in imperial; metric unless said */
  units?: 'metric' | 'imperial';
  /** cm, or feet and inches as "5 6" */
  height?: string;
  /** kg or lb */
  weight?: string;
  neat?: 'seated' | 'light' | 'moving' | 'physical';
  /** training days a week, 0 for Not yet; 4 by default */
  days?: number;
  /** what is trained; lifting by default */
  kind?: 'lifting' | 'cardio' | 'both';
  experience?: 'beginner' | 'intermediate' | 'advanced';
  /** a pace rate, picked on Your plan; the default otherwise */
  pace?: number;
};

/** The pace control's label for a rate (SCIENCE.md section 6). */
export const PACE = { lose: { 0.25: 'Gentle', 0.5: 'Steady', 0.75: 'Faster' }, gain: { 0.25: 'Lean', 0.5: 'Standard', 0.75: 'Faster' } } as const;

/** A single answer: the tap selects it, Continue moves on (U1a). */
export async function choose(page: Page, testid: string) {
  await page.getByTestId(testid).click();
  await expect(page.getByTestId(testid)).toHaveAttribute('aria-checked', 'true');
  await page.getByTestId('continue').click();
}

/** From the landing page to Your plan. Defaults are vector A of docs/SCIENCE.md. Building your plan plays on the way. */
export async function onboard(page: Page, a: Answers) {
  await expect(page.getByTestId('landing-start')).toBeVisible({ timeout: FIRST_PAINT });
  await startPlan(page);
  if (a.goal === 'weight' || a.goal === 'recomp') await page.getByTestId('goal-more').click();
  await choose(page, `choice-${a.goal}`);

  await expect(page.getByTestId('step-screening')).toBeVisible();
  for (const k of a.screening ?? []) await page.getByTestId(`screen-${k}`).click();
  if (!a.screening?.length) await choose(page, 'screen-none');
  else {
    await page.getByTestId('continue').click();
    await page.getByTestId('advice-continue').click();
  }

  await choose(page, `choice-${a.sex ?? 'male'}`);
  await expect(page.getByTestId('step-born')).toBeVisible();
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
    await page.getByRole('radio', { name: 'Metric' }).click();
    await wheelType(page, 'wheel-height', a.height ?? '175');
    await wheelType(page, 'wheel-weight', a.weight ?? '60');
  }
  await page.getByTestId('continue').click();
  await choose(page, `choice-${a.neat ?? 'seated'}`);

  const days = a.days ?? 4;
  await choose(page, `days-${days}`);
  if (days) await choose(page, `choice-${a.kind ?? 'lifting'}`);

  const exp = page.getByTestId('step-experience');
  const plan = page.getByTestId('your-plan');
  await expect(exp.or(page.getByTestId('building')).or(plan)).toBeVisible();
  if (await exp.isVisible()) await choose(page, `choice-${a.experience ?? 'beginner'}`);
  await expect(plan).toBeVisible();
  const goal = a.goal === 'weight' ? 'gain' : a.goal;
  if (a.pace !== undefined && goal !== 'maintain' && goal !== 'recomp') await page.getByTestId('plan-pace').getByRole('radio', { name: PACE[goal][a.pace as 0.5] }).click();
}

/**
 * DESIGN.md section 6, corners nest (U1b, U2), measured on whatever is on screen:
 * - a shape 10 or less inside another's rounded corner sits the same gap from both edges and has the outer radius less
 *   the gap, so the two curves run parallel (a full pill in a pill does by itself);
 * - at any gap, no shape's corner reaches past the curve of a corner it sits in, unless that parent clips it.
 * A shape is anything drawn: a fill, a picture or a border, and a fill that only shows while pressed (a row's grey). A
 * fill the same as its parent's, with no edge or shadow, shows no corner; one that exactly fills a parent which clips
 * takes the parent's shape, and one inside something else that clips is that thing's to answer for. The landing page
 * is L4's.
 */
export const unnested = (page: Page) => page.evaluate(() => {
  const clear = (c: string) => /rgba\([^)]*, 0\)|transparent/.test(c);
  const pressedSel: string[] = [];
  const walk = (rules: CSSRuleList) => {
    for (const r of rules) {
      if (r instanceof CSSStyleRule && r.selectorText.includes(':active') && (r.style.backgroundColor || r.style.background)) pressedSel.push(r.selectorText.replaceAll(':active', ''));
      if ('cssRules' in r) walk((r as CSSGroupingRule).cssRules);
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* another origin's sheet */ } }
  // one selector list, of the rules this browser can match, so each element is matched once
  const pressedAll = pressedSel.filter((sel) => { try { document.body.matches(sel); return true; } catch { return false; } }).join(', ');
  const pressable = (e: Element) => !!pressedAll && e.matches(pressedAll);
  const clipCache = new Map<Element, boolean>();
  const clipping = (e: Element) => { let c = clipCache.get(e); if (c === undefined) clipCache.set(e, (c = getComputedStyle(e).overflow !== 'visible')); return c; };
  const name = (e: Element) => e.getAttribute('data-testid') ?? `${e.tagName.toLowerCase()}.${e.className.toString().slice(0, 40)}`;
  type Shape = { e: Element; r: DOMRect; radii: number[]; clips: boolean; fill: string; edge: boolean; pressed: boolean };
  const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  // a pressed fill carried past the row's box by its pseudo elements (`bleed`) reaches as far as they do
  const reach = (e: Element, r: DOMRect) => {
    const [b, a] = [getComputedStyle(e, '::before'), getComputedStyle(e, '::after')];
    const up = b.content !== 'none' && b.position === 'absolute' ? Math.max(0, -parseFloat(b.top) || 0) : 0;
    const down = a.content !== 'none' && a.position === 'absolute' ? Math.max(0, -parseFloat(a.bottom) || 0) : 0;
    return new DOMRect(r.x, r.y - up, r.width, r.height + up + down);
  };
  const shapes: Shape[] = [];
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest('[data-testid="landing"]')) continue;
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.opacity === '0') continue;
    const edge = (parseFloat(cs.borderTopWidth) > 0 && !clear(cs.borderTopColor)) || cs.boxShadow !== 'none';
    const filled = cs.backgroundImage !== 'none' || !clear(cs.backgroundColor) || (parseFloat(cs.borderTopWidth) > 0 && !clear(cs.borderTopColor));
    const pressed = !filled && pressable(e);
    if (!filled && !pressed) continue;
    const p = e.parentElement!;
    const b = p.getBoundingClientRect();
    if (getComputedStyle(p).overflow !== 'visible' && Math.abs(r.left - b.left) + Math.abs(r.top - b.top) + Math.abs(r.right - b.right) + Math.abs(r.bottom - b.bottom) < 1) continue;
    const radii = CORNERS.map((c) => Math.min(parseFloat(cs.getPropertyValue(`border-${c}-radius`)) || 0, r.width / 2, r.height / 2));
    shapes.push({ e, r: pressed ? reach(e, r) : r, radii, clips: cs.overflow !== 'visible', fill: `${cs.backgroundColor} ${cs.backgroundImage}`, edge, pressed });
  }
  const bad: string[] = [];
  let checked = 0;
  for (const outer of shapes) {
    const o = outer.r;
    for (const inner of shapes) {
      if (inner === outer || outer.pressed || !outer.e.contains(inner.e)) continue;
      // something between them that cuts the inner shape (a sheet's scrolling list) decides what shows of it; one that
      // clips but holds it whole (a button round a panel, whose overflow engines report differently) changes nothing
      const i0 = inner.r;
      let between = inner.e.parentElement;
      const cuts = (b: Element) => { const c = b.getBoundingClientRect(); return i0.left < c.left - 0.5 || i0.right > c.right + 0.5 || i0.top < c.top - 0.5 || i0.bottom > c.bottom + 0.5; };
      while (between && between !== outer.e && !(clipping(between) && cuts(between))) between = between.parentElement;
      if (between !== outer.e) continue;
      if (!inner.pressed && !inner.edge && inner.fill === outer.fill) continue;
      const i = inner.r;
      // per corner: the gaps to the two edges, and which way is out (sx, sy)
      const gaps = [[i.left - o.left, i.top - o.top, -1, -1], [o.right - i.right, i.top - o.top, 1, -1], [o.right - i.right, o.bottom - i.bottom, 1, 1], [i.left - o.left, o.bottom - i.bottom, -1, 1]];
      gaps.forEach(([gx, gy, sx, sy], k) => {
        const R = outer.radii[k];
        if (R < 12 || gx < -0.5 || gy < -0.5 || gx >= R || gy >= R) return; // only shapes in a rounded corner
        const r = inner.radii[k];
        if (!outer.clips) {
          // the inner corner's curve, sampled, stays inside the outer's
          const cx = sx < 0 ? o.left + R : o.right - R, cy = sy < 0 ? o.top + R : o.bottom - R;
          const ix = sx < 0 ? i.left + r : i.right - r, iy = sy < 0 ? i.top + r : i.bottom - r;
          for (let a = 0; a <= 8; a++) {
            const t = (a / 8) * (Math.PI / 2);
            const px = ix + sx * r * Math.cos(t), py = iy + sy * r * Math.sin(t);
            if ((px - cx) * sx > 0 && (py - cy) * sy > 0 && Math.hypot(px - cx, py - cy) > R + 0.75) { bad.push(`${name(inner.e)} ${CORNERS[k]}: reaches past the ${R} corner of ${name(outer.e)}`); return; }
          }
        }
        if (gx > 10 || gy > 10 || (outer.clips && gx < 0.5 && gy < 0.5)) return;
        checked++;
        if (Math.abs(gx - gy) > 1) bad.push(`${name(inner.e)} ${CORNERS[k]}: gaps ${Math.round(gx)} and ${Math.round(gy)} in ${name(outer.e)}`);
        else if (Math.abs(r - Math.max(0, R - gx)) > 1.5) bad.push(`${name(inner.e)} ${CORNERS[k]}: ${Math.round(r)} in ${Math.round(R)} at ${Math.round(gx)}, want ${Math.round(Math.max(0, R - gx))}`);
      });
    }
  }
  return { checked, bad: [...new Set(bad)] };
});
