// Guards for the invariants in CLAUDE.md that are easy to break without noticing.
import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { en } from '../../src/lib/i18n/en';

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : [p];
  });
const src = files('src').filter((f) => /\.(ts|svelte)$/.test(f));
// [path, text]; a function is called with '1' for each argument so its output is checked too
const strings = (o: unknown, path = ''): [string, string][] =>
  typeof o === 'string' ? [[path, o]]
  : typeof o === 'function' ? [[path, o(...Array(o.length).fill('1'))]]
  : Object.entries(o as object).flatMap(([k, v]) => strings(v, path ? `${path}.${k}` : k));

describe('copy rules', () => {
  test.each(strings(en))('%s: %s', (path, s) => {
    expect(s).not.toMatch(/[–—·!]/); // en dash, em dash, middle dot, exclamation mark
    // sentence case starts with a capital, except captions that continue a number ("620" then "to go")
    // and the example handle, since handles are lowercase
    if (!path.startsWith('after.') && path !== 'social.handleHint') expect(s[0]).toBe(s[0].toUpperCase());
  });
});

describe('no emoji', () => {
  // The owner's rule: icons are real icons, never typed emoji. Copyright, registered and trademark signs are text, not emoji.
  const emoji = /(?![\u00A9\u00AE\u2122])\p{Extended_Pictographic}|\uFE0F|\u200D/u;
  const text = [...files('src').filter((f) => /\.(ts|svelte|css|html|json)$/.test(f)), 'index.html',
    ...files('public').filter((f) => /\.(html|svg|webmanifest|txt|md)$/.test(f))];
  test.each(text)('%s has no emoji', (f) => expect(readFileSync(f, 'utf8')).not.toMatch(emoji));
  test.each(strings(en))('catalog %s has no emoji', (_, s) => expect(s).not.toMatch(emoji));
  test('the check catches emoji and lets text symbols through', () => {
    for (const e of ['\u{1F4AA}', '\u{1F525}', '\u2705', '\u2764\uFE0F']) expect(e).toMatch(emoji);
    for (const t of ['\u00A9 OpenStreetMap', '\u2192', '\u00D7', '5 \u00B0C']) expect(t).not.toMatch(emoji);
  });
});

describe('the app icon, mark and wordmark are frozen', () => {
  // The owner froze the icon (design/brand/ICON.md). Changing it means changing this hash on purpose.
  const icon = readFileSync('design/brand/app-icon.svg');
  test('design/brand/app-icon.svg is unchanged', () => {
    expect(createHash('sha256').update(icon).digest('hex')).toBe('9639506f439012176d5cd7b41cba8208e8e88b17434a2d00748091d35d0f3d62');
  });
  test('public/favicon.svg is a copy of it', () => expect(readFileSync('public/favicon.svg').equals(icon)).toBe(true));
  test.each([
    ['design/brand/mark.svg', '60f17514f30aeef2dae2476e8e25950d24818f03796209740cb52c1aea82d2db'],
    ['design/brand/wordmark.svg', '78cc54b2c5ef4912b0a9826983f092b2137749096d4dbfb5a0aea30ea66d5f07'],
  ])('%s is unchanged', (f, hash) => expect(createHash('sha256').update(readFileSync(f)).digest('hex')).toBe(hash));
});

describe('tokens only', () => {
  test.each(src)('%s has no raw hex colours or pixel font sizes', (f) => {
    const code = readFileSync(f, 'utf8');
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b(?![\w-])/);
    expect(code).not.toMatch(/text-\[\d+px\]|font-size:\s*\d+px/);
  });
});

describe('the server boundary is a directory', () => {
  test.each(src)('%s imports nothing from server/ or api/', (f) => {
    expect(readFileSync(f, 'utf8')).not.toMatch(/from\s+['"][./]*(server|api)\//);
  });
});

describe('numbers come from one place', () => {
  const engine = src.filter((f) => f.includes(join('model', 'engine')));
  const code = (f: string) =>
    readFileSync(f, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g, "''");

  test.each(engine.filter((f) => !f.endsWith('constants.ts')))('%s has no numeric literal but 0 and 1', (f) => {
    const literals = code(f).match(/(?<![\w.])\d+(?:\.\d+)?(?:e-?\d+)?/g) ?? [];
    expect(literals.filter((n) => n !== '0' && n !== '1')).toEqual([]);
  });
  test.each(engine)('%s imports only from the engine', (f) => {
    for (const [, path] of readFileSync(f, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)) expect(path).toMatch(/^\.\//);
  });
  // Signature values from constants.ts that have no other meaning in UI code.
  const signature = ['7700', '370', '21.6', '6.25', '161', '1.45', '18.5', '6.8', '12500', '1350'];
  test.each(src.filter((f) => !f.endsWith(join('engine', 'constants.ts'))))('%s inlines no science constant', (f) => {
    const found = signature.filter((v) => new RegExp(`(?<![\\w.])${v.replace('.', '\\.')}(?![\\w.])`).test(code(f)));
    expect(found).toEqual([]);
  });
  test('every source id has a row in docs/SOURCES.md', async () => {
    const { C } = await import('../../src/lib/model/engine/constants');
    const ledger = readFileSync('docs/SOURCES.md', 'utf8');
    for (const id of new Set(Object.values(C).map((c) => c.source))) expect(ledger, id).toMatch(new RegExp(`^\\| ${id} \\|`, 'm'));
  });
});
