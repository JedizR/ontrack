// Per-device state, not synced: theme, text size, last tab, the last signed in user and the onboarding draft.
import type { Draft } from '../flows/onboarding/draft';
export type Theme = 'system' | 'light' | 'dark';
/** system follows the device text size, mapped onto one of the three levels */
export type FontSize = 'system' | 'm' | 'l' | 'xl';
export type Tab = 0 | 1 | 2;
export const FONT_SCALE = { m: 1, l: 1.15, xl: 1.3 } as const;
// index.html reads the same key and fields before first paint
export const PREFS_KEY = 'ot-ui';

interface Saved { theme: Theme; fontSize: FontSize; tab: Tab; lastUser: string | null; lastEmail: string | null; draft: Draft | null }
const DEFAULTS: Saved = { theme: 'system', fontSize: 'system', tab: 0, lastUser: null, lastEmail: null, draft: null };
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
