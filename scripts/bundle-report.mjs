// After `pnpm build` (pnpm bundle): initial JavaScript (the entry and its modulepreloads in dist/index.html) against
// PRD section 8's budget, the lazy chunks the PRD names, and a scan of every built text file for secrets.
import { readFileSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { loadEnv } from 'vite';

const BUDGET_KB = 130;
const kb = (file) => gzipSync(readFileSync(`dist${file}`)).length / 1024;
const html = readFileSync('dist/index.html', 'utf8');
const initial = [...html.matchAll(/<(?:script type="module"[^>]*src|link rel="modulepreload"[^>]*href)="([^"]+\.js)"/g)].map((m) => m[1]);
const total = initial.reduce((sum, f) => sum + kb(f), 0);

const lazy = readdirSync('dist/assets').filter((f) => f.endsWith('.js') && !initial.includes(`/assets/${f}`));
// what PRD section 8 says must load lazily: a chunk named for it, or a string only its code contains
const named = { Supabase: /GoTrueClient/, Charts: /^Progress-/, Camera: /getUserMedia/, Settings: /^SettingsSheet-/, Map: /^(FoodMap|maplibre-gl)-/, Landing: /^Landing-/ };
const has = (re, f) => re.test(f) || re.test(readFileSync(`dist/assets/${f}`, 'utf8'));
const leaked = [];
for (const [what, re] of Object.entries(named)) {
  const first = initial.some((f) => has(re, f.slice('/assets/'.length)));
  const later = lazy.some((f) => has(re, f));
  // a mock build (VITE_BACKEND=mock, from the shell as in CI or from .env.local as Vite reads it) leaves supabase-js out
  const absent = what === 'Supabase' && loadEnv('production', process.cwd(), 'VITE_').VITE_BACKEND === 'mock';
  console.log(`${what.padEnd(9)} ${first ? 'IN THE FIRST LOAD' : later ? 'lazy' : absent ? 'not in a mock build' : 'not found, fix the pattern'}`);
  if (first || (!later && !absent)) leaked.push(what);
}
// a server key, a private key, or a Supabase JWT whose role is not anon (the anon key is public by design)
const SECRET = /AIza[0-9A-Za-z_-]{35}|sb_secret_[A-Za-z0-9_-]{16,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;
const secrets = readdirSync('dist', { recursive: true }).filter((f) => /\.(js|mjs|html|css|json|webmanifest|txt|map)$/.test(f)).filter((f) => {
  const text = readFileSync(`dist/${f}`, 'utf8');
  const roles = [...text.matchAll(/eyJ[\w-]+\.(eyJ[\w-]+)\.[\w-]+/g)].map((m) => { try { return JSON.parse(Buffer.from(m[1], 'base64url').toString()).role; } catch { return 'unreadable'; } });
  return SECRET.test(text) || roles.some((r) => r !== 'anon');
});
console.log(`Secrets   ${secrets.length ? `FOUND in ${secrets.join(', ')}` : 'none in dist'}`);
console.log(`Initial JavaScript: ${total.toFixed(1)} KB gzip in ${initial.length} files (budget ${BUDGET_KB})`);
if (total > BUDGET_KB || leaked.length || secrets.length) process.exit(1);
