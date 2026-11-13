// The contrast bars in docs/DESIGN.md section 12, read from design/tokens.css: 4.5 to 1 for text, 3 to 1 for large text,
// and (U1b) 3 to 1 for what identifies a control or shows its state against what is next to it (WCAG 1.4.11).
import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('design/tokens.css', 'utf8');
const block = (sel: string) => css.slice(css.indexOf(`${sel} {`), css.indexOf('}', css.indexOf(`${sel} {`)));
const vars = (b: string) => Object.fromEntries([...b.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6}|rgba\([^)]+\))/gi)].map((m) => [m[1], m[2]]));
const light = vars(block(':root'));
// the dark block also applies to any element marked dark (the landing page's dark sections)
const dark = { ...light, ...vars(block('[data-theme="dark"]')) };

type RGBA = [number, number, number, number];
const parse = (v: string): RGBA =>
  v.startsWith('#') ? [0, 2, 4].map((i) => parseInt(v.slice(1 + i, 3 + i), 16)).concat(1) as RGBA : (v.match(/[\d.]+/g)!.map(Number) as RGBA);
const over = (fg: RGBA, bg: RGBA): RGBA => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat(1) as RGBA;
const lum = (c: RGBA) => {
  const l = c.slice(0, 3).map((x) => (x /= 255) <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a: RGBA, b: RGBA) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
/** a colour as drawn on a background, itself drawn on the theme's surface */
const on = (t: Record<string, string>, fg: string, bg: string) => {
  const base = parse(t.surface);
  const back = over(parse(t[bg] ?? bg), base);
  return ratio(over(parse(t[fg] ?? fg), back), back);
};

// [text, background, bar]. "lavender" is the hero haze's strongest stop, lavender at 75 percent over white.
const PAIRS: [string, string, number][] = [
  // ink on canvas is also a picked onboarding answer's fill against the page (U1a, WCAG 1.4.11)
  ['ink', 'canvas', 4.5], ['ink', 'surface', 4.5], ['ink', 'surface-2', 4.5], ['ink', 'accent-soft', 4.5],
  ['ink-2', 'canvas', 4.5], ['ink-2', 'surface', 4.5], ['ink-2', 'surface-2', 4.5],
  ['ink-3', 'canvas', 4.5], ['ink-3', 'surface', 4.5], // U1b: the second fact on a line, one step lighter (Facts)
  ['success-ink', 'canvas', 4.5], ['success-ink', 'surface', 4.5],
  ['on-accent', 'accent', 4.5], ['on-accent-soft', 'accent-soft', 4.5],
  ['on-action', 'action', 4.5], ['on-action', 'action-press', 4.5], // the ink pill's label, at rest and pressed
  ['accent-ink', 'canvas', 4.5], ['accent-ink', 'surface', 4.5], ['accent-ink', 'surface-2', 4.5], // violet links
  ['ink', 'glass-solid', 4.5], // a glass chip's label without blur
  ['progress', 'track-bg', 3], // a track's fill against its empty part (the reached green is the documented exception)
  ['danger', 'surface', 4.5], ['on-danger', 'danger', 4.5],
  ['attention', 'canvas', 4.5], ['attention', 'surface', 4.5],
  ['toast-ink', 'toast-bg', 4.5],
];

// [mark, what is next to it]. U1b, WCAG 1.4.11: a control known by its shape, or a state shown by a fill, needs 3 to 1 against
// its neighbours. A labelled button is known by its label (the text pairs above); its grey fill only groups it.
const STATES: [string, string][] = [
  // selected chips, segments, onboarding choices and the week's picked day are ink, on the page, a card or a grey track
  ['ink', 'canvas'], ['ink', 'surface'], ['ink', 'surface-2'],
  // the switch: its off track on a card or the page, and the knob (surface) on either track
  ['control-edge', 'surface'], ['control-edge', 'canvas'], ['surface', 'control-edge'], ['surface', 'ink'],
  // the dock's selected tab: a violet icon and label on its grey pill and on the bar
  ['accent-ink', 'surface-2'], ['accent-ink', 'bar-solid'],
  // a picked choice's icon: a lavender glyph on its violet tile (U1c, the owner)
  ['on-accent-pick', 'accent'],
  // the stepper's keys and the dock's plus, on a card or the page
  ['action', 'surface'], ['action', 'canvas'],
];

describe.each([['light', light], ['dark', dark]] as const)('%s theme', (_, t) => {
  test.each(PAIRS)('%s on %s', (fg, bg, bar) => expect(on(t, fg, bg)).toBeGreaterThanOrEqual(bar));
  test.each(STATES)('control %s next to %s', (fg, bg) => expect(on(t, fg, bg)).toBeGreaterThanOrEqual(3));
});

// U1b, the owner's dark pass (feedback 3): the page, cards, grey controls and the dock stand apart. Light gets this from the
// card shadow; dark has none, so the steps and rings must carry it.
test('dark steps stand apart', () => {
  const ring = (name: string) => css.slice(css.indexOf('[data-theme="dark"] {')).match(new RegExp(`--${name}:[^;]*?(rgba\\([^)]+\\))`))![1];
  expect(on(dark, 'surface', 'canvas'), 'card on page').toBeGreaterThanOrEqual(1.1);
  expect(on(dark, ring('shadow-card'), 'canvas'), 'card ring on page').toBeGreaterThanOrEqual(1.25);
  expect(on(dark, 'surface-2', 'canvas'), 'grey control on page').toBeGreaterThanOrEqual(1.4);
  expect(on(dark, 'surface-2', 'surface'), 'grey control or tile on card').toBeGreaterThanOrEqual(1.25);
  expect(on(dark, 'glass-edge', 'canvas'), 'dock edge on page').toBeGreaterThanOrEqual(2);
});

// U1b: the featured card's gradient (the Add sheet's Photo) carries white words on every stop, in both themes
test('words on the featured card', () => {
  const at = css.indexOf('--grad-feature:');
  for (const m of css.slice(at, css.indexOf(';', at)).matchAll(/#[0-9a-f]{6}/gi)) expect(ratio(parse(light['on-accent']), parse(m[0])), m[0]).toBeGreaterThanOrEqual(4.5);
});

test('words on the light hero haze', () => {
  const lavender = over(parse('rgba(190, 190, 255, 0.75)'), parse('#ffffff'));
  for (const fg of ['ink', 'ink-2', 'success-ink']) expect(ratio(parse(light[fg]), lavender), fg).toBeGreaterThanOrEqual(4.5);
});

// L1: words on the landing page's colour washes and violet panels, which look the same in both themes
test('words on the landing washes, panels and sky', () => {
  const stops = (name: string, from = 0) => {
    const at = css.indexOf(`--${name}:`, from);
    return [...css.slice(at, css.indexOf(';', at)).matchAll(/#[0-9a-f]{6}/gi)].map((m) => parse(m[0]));
  };
  // the hero's sky: ink words on every stop of the light one, white on the dark one, violet headline words as large text
  for (const c of stops('grad-sky')) expect(ratio(parse(light.ink), c), 'grad-sky').toBeGreaterThanOrEqual(4.5);
  for (const c of stops('grad-sky')) expect(ratio(parse(light['accent-ink']), c), 'grad-sky violet').toBeGreaterThanOrEqual(3);
  for (const c of stops('grad-sky', css.indexOf('[data-theme="dark"] {'))) expect(ratio(parse(dark.ink), c), 'dark grad-sky').toBeGreaterThanOrEqual(4.5);
  for (const c of stops('grad-sky', css.indexOf('[data-theme="dark"] {'))) expect(ratio(parse(dark['accent-ink']), c), 'dark grad-sky violet').toBeGreaterThanOrEqual(3);
  for (const w of ['wash-ink', 'wash-blue', 'wash-magenta']) for (const c of stops(w)) expect(ratio(parse(light['on-night']), c), w).toBeGreaterThanOrEqual(4.5);
  // L2: white words on the footer's violet glass at the glow's brightest (Violet/01 lifted), night words on the white glass
  // chips over the darkest thing behind them (the phone's bezel); the photo gradients themselves are measured in landing.spec.ts
  expect(ratio(parse(light['on-night']), over(parse(light['liquid-violet']), parse('#5b4ff5'))), 'liquid-violet').toBeGreaterThanOrEqual(4.5);
  expect(ratio(parse(light.night), over(parse(light['liquid-white']), parse(light.night))), 'liquid-white').toBeGreaterThanOrEqual(4.5);
  for (const c of stops('wash-lavender')) expect(ratio(parse(light.night), c), 'wash-lavender').toBeGreaterThanOrEqual(4.5);
});
