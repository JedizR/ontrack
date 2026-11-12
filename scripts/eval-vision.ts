// Runs a folder of meal photos through the vision provider as /api/analyze would (resize to 1024 px JPEG at 0.8, the
// model, the schema check, resolution against the food table) and prints what came back with the time each took.
//   pnpm eval:vision <photo folder> [<output folder for the raw replies>]
// shortcut: resizes with macOS `sips`; the evaluation runs on the owner's Mac, not in CI
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { visionProvider } from '../server/vision/provider.ts';
import { modelOutput } from '../server/vision/schema.ts';
import { resolveItems } from '../server/vision/resolve.ts';

const [dir, out] = process.argv.slice(2);
if (!dir) throw new Error('usage: pnpm eval:vision <photo folder> [<output folder>]');
if (out) mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'ontrack-eval-'));
const provider = await visionProvider();
const PAUSE_MS = 6000; // the free tier allows about 10 requests a minute
const times: number[] = [];

for (const f of readdirSync(dir).filter((n) => /\.(jpe?g|png|heic)$/i.test(n)).sort()) {
  const jpeg = join(tmp, `${f}.jpg`);
  let line = '';
  try {
    execFileSync('sips', ['-Z', '1024', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', join(dir, f), '--out', jpeg], { stdio: 'ignore' });
    const image = new Uint8Array(readFileSync(jpeg));
    const started = Date.now();
    const raw = await provider.analyze({ image, locale: 'en', signal: AbortSignal.timeout(60_000) });
    const ms = Date.now() - started;
    times.push(ms);
    if (out) writeFileSync(join(out, `${f}.json`), JSON.stringify(raw, null, 2));
    const parsed = modelOutput.safeParse(raw);
    if (!parsed.success) line = `reply does not match the schema`;
    else if (!parsed.data.is_food) line = 'not food';
    else {
      const items = resolveItems(parsed.data.items);
      const total = items.reduce((s, i) => s + i.kcal, 0);
      line = `"${parsed.data.title}", ${total} kcal\n` + items.map((i) => `    ${i.name}, ${i.grams} g, ${i.kcal} kcal, ${i.source}${i.foodId ? ` (${i.foodId})` : ''}${i.hiddenFat ? ', hidden fat' : ''}, ${i.confidence}`).join('\n');
    }
    console.log(`${f}  ${(ms / 1000).toFixed(1)} s  ${line}`);
  } catch (e) {
    console.log(`${f}  failed: ${(e as { status?: number }).status ?? ''} ${String((e as Error).message).slice(0, 160)}`);
  }
  await new Promise((r) => setTimeout(r, PAUSE_MS));
}
times.sort((a, b) => a - b);
if (times.length) console.log(`\n${provider.model}: median ${(times[Math.floor(times.length / 2)] / 1000).toFixed(1)} s, slowest ${(times.at(-1)! / 1000).toFixed(1)} s, ${times.length} answered`);
