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
