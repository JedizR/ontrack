// Per-device state, not synced: theme, text size, last tab, the last signed in user, the onboarding draft, whether
// the photo notice has been seen, the day this phone saved the plan, a dismissed program suggestion, and (M9a) the
// reminder cards, Thai dishes first, and whether Train asked the lifting experience.
import type { Draft } from '../flows/onboarding/draft';
export type Theme = 'system' | 'light' | 'dark';
/** system follows the device text size, mapped onto one of the three levels */
export type FontSize = 'system' | 'm' | 'l' | 'xl';
export type Tab = 0 | 1 | 2;
export const FONT_SCALE = { m: 1, l: 1.15, xl: 1.3 } as const;
// index.html reads the same key and fields before first paint
export const PREFS_KEY = 'ot-ui';

/** F23: which reminder cards Today shows, and from what time the nothing logged card does */
export type Remind = { meal: boolean; mealAt: string; weigh: boolean; checkin: boolean; easy: boolean };
interface Saved { theme: Theme; fontSize: FontSize; tab: Tab; lastUser: string | null; lastEmail: string | null; draft: Draft | null; photoOk: boolean; firstDay: string | null; suggestOff: boolean; locationOk: boolean; remind: Remind; thai: boolean | null; liftAsked: boolean }
const DEFAULTS: Saved = {
  theme: 'system', fontSize: 'system', tab: 0, lastUser: null, lastEmail: null, draft: null, photoOk: false, firstDay: null, suggestOff: false, locationOk: false,
  remind: { meal: true, mealAt: '13:00', weigh: true, checkin: true, easy: true }, thai: null, liftAsked: false,
};
const load = (): Saved => {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}') }; }
  catch { return { ...DEFAULTS }; }
};

class Prefs {
  #s = $state<Saved>(load());

  get theme() { return this.#s.theme; }
  set theme(t: Theme) { this.#s.theme = t; this.#save(); applyTheme(); }
  get fontSize(): FontSize { return this.#s.fontSize; }
  set fontSize(v: FontSize) { this.#s.fontSize = v; this.#save(); applyFontSize(); }
  /** the last tab is remembered per device */
  get tab(): Tab { return this.#s.tab; }
  set tab(v: Tab) { this.#s.tab = v; this.#save(); }
  /** whose local store opens at start, before the session is restored */
  get lastUser() { return this.#s.lastUser; }
  set lastUser(v: string | null) { this.#s.lastUser = v; this.#save(); }
  get lastEmail() { return this.#s.lastEmail; }
  set lastEmail(v: string | null) { this.#s.lastEmail = v; this.#save(); }
  /** onboarding answers before sign in, kept here so they survive the Google redirect (TECH-SPEC section 4) */
  get draft() { return this.#s.draft; }
  set draft(v: Draft | null) { this.#s.draft = v; this.#save(); }
  /** the photo privacy notice was accepted (SCREENS.md section 7, first use) */
  get photoOk() { return this.#s.photoOk; }
  set photoOk(v: boolean) { this.#s.photoOk = v; this.#save(); }
  /** the day this phone saved the onboarding plan: Today's Getting started card (O1) */
  get firstDay() { return this.#s.firstDay; }
  set firstDay(v: string | null) { this.#s.firstDay = v; this.#save(); }
  /** "Not now" on Train's suggested program (O1) */
  get suggestOff() { return this.#s.suggestOff; }
  set suggestOff(v: boolean) { this.#s.suggestOff = v; this.#save(); }
  /** the one sentence about location was shown before the first location prompt (S1b, F17) */
  get locationOk() { return this.#s.locationOk; }
  set locationOk(v: boolean) { this.#s.locationOk = v; this.#save(); }
  /** the reminder cards (F23): set one field at a time, `prefs.remind = { ...prefs.remind, meal: false }` */
  get remind(): Remind { return { ...DEFAULTS.remind, ...this.#s.remind }; }
  set remind(v: Remind) { this.#s.remind = v; this.#save(); }
  /** Thai dishes first in search: null follows the phone's languages */
  get thai() { return this.#s.thai; }
  set thai(v: boolean | null) { this.#s.thai = v; this.#save(); }
  /** Train asked the lifting experience in context (M9a), once per phone and account */
  get liftAsked() { return this.#s.liftAsked; }
  set liftAsked(v: boolean) { this.#s.liftAsked = v; this.#save(); }
  #save() { try { localStorage.setItem(PREFS_KEY, JSON.stringify($state.snapshot(this.#s))); } catch { /* private mode */ } }
}

export const prefs = new Prefs();

/**
 * The device's text size as one of our three levels. iPhone: Dynamic Type via WebKit's -apple-system-body
 * (17px is the standard "Large" size). Elsewhere: the browser's default font size (16px standard).
 */
export function deviceFontLevel(): 'm' | 'l' | 'xl' {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;font:-apple-system-body';
  const apple = probe.style.font !== '';
  if (!apple) probe.style.cssText = 'position:absolute;visibility:hidden;font-size:medium';
  document.documentElement.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).fontSize) || 16;
  probe.remove();
  const base = apple ? 17 : 16;
  return px <= base ? 'm' : px <= base + 3 ? 'l' : 'xl';
}

export function applyFontSize() {
  const level = prefs.fontSize === 'system' ? deviceFontLevel() : prefs.fontSize;
  document.documentElement.style.setProperty('--fs', String(FONT_SCALE[level]));
  document.documentElement.dataset.fs = level;
}

const media = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)') : null;
export function applyTheme() {
  const root = document.documentElement;
  root.dataset.theme = prefs.theme === 'system' ? (media?.matches ? 'dark' : 'light') : prefs.theme;
  // the status bar and browser chrome take the canvas token of the theme in use
  const canvas = getComputedStyle(root).getPropertyValue('--canvas').trim();
  if (canvas) document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', canvas));
}
media?.addEventListener('change', applyTheme);
