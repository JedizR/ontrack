// Guards for the invariants in CLAUDE.md that are easy to break without noticing.
import { describe, expect, test } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
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
    if (!path.startsWith('after.')) expect(s[0]).toBe(s[0].toUpperCase());
  });
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
