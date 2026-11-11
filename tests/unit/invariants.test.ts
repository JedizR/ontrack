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
const strings = (o: unknown): string[] => (typeof o === 'string' ? [o] : Object.values(o as object).flatMap(strings));

describe('copy rules', () => {
  test.each(strings(en))('%s', (s) => {
    expect(s).not.toMatch(/[–—·!]/); // en dash, em dash, middle dot, exclamation mark
    expect(s[0]).toBe(s[0].toUpperCase()); // sentence case starts with a capital
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
