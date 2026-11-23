// Runs a folder of meal photos through the vision provider as /api/analyze would (resize to 1024 px JPEG at 0.8, the
// model, the schema check, resolution against the food table) and prints what came back with the time each took.
//   pnpm eval:vision <photo folder> [<output folder for the raw replies>]
//   pnpm eval:vision --label <folder of nutrition label photos>   (B1: the label reader, printed values only)
//   pnpm eval:vision --text <cases.json> [<output folder>]   (R2: described meals, each scored on the id it should reach)
//   pnpm exec tsx scripts/eval-vision.ts --replay <folder of saved raw replies>   (R5: re-scores replies saved by the runs above
//     with today's resolver, offline: no API call, no key; the folder is what the runs wrote to their output folder)
// shortcut: resizes with macOS `sips`; the evaluation runs on the owner's Mac, not in CI
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { visionProvider } from '../server/vision/provider.ts';
import { modelOutput } from '../server/vision/schema.ts';
import { resolveItems } from '../server/vision/resolve.ts';
import { labelOutput, toLabel } from '../server/vision/label.ts';

const label = process.argv.includes('--label');
const text = process.argv.includes('--text');
const replay = process.argv.includes('--replay');
const [dir, out] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!dir) throw new Error('usage: pnpm eval:vision <photo folder> [<output folder>]');

/** One resolved meal as lines: the title and total, then each item. A photo's grams are checked against the table's serving. */
const meal = (data: { title: string; items: Parameters<typeof resolveItems>[0] }, photo: boolean) => {
  const items = resolveItems(data.items, { photo });
  const total = items.reduce((s, i) => s + i.kcal, 0);
  return { total, line: `"${data.title}", ${total} kcal\n` + items.map((i) => `    ${i.name}, ${i.grams} g, ${i.kcal} kcal, ${i.source}${i.foodId ? ` (${i.foodId})` : ''}${i.hiddenFat ? ', hidden fat' : ''}, ${i.confidence}${i.alternatives ? `, or ${i.alternatives.map((a) => `${a.name} ${a.kcal}`).join(' / ')}` : ''}`).join('\n') };
};

if (replay) {
  // the saved files: a photo run wrote the raw reply, a text run wrote { case: { text, expect }, raw }
  let kcal = 0, files = 0, right = 0, cases = 0;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
    const saved = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const isCase = 'case' in saved && 'raw' in saved;
    const parsed = modelOutput.safeParse(isCase ? saved.raw : saved);
    if (!parsed.success || !parsed.data.is_food) { console.log(`${f}  ${parsed.success ? 'not food' : 'reply does not match the schema'}`); continue; }
    const { total, line } = meal(parsed.data, !isCase);
    files++, kcal += total;
    if (isCase) {
      const ids = resolveItems(parsed.data.items).map((i) => i.foodId ?? 'estimate');
      cases++, right += +ids.includes(saved.case.expect);
      console.log(`${ids.includes(saved.case.expect) ? 'right' : 'WRONG'}  ${saved.case.text}  ->  ${ids.join(', ')}`);
    } else console.log(`${f}  ${line}`);
  }
  console.log(`\n${files} replies re-scored, ${kcal} kcal in all${cases ? `, ${right} of ${cases} cases right` : ''}`);
  process.exit(0);
}
if (out) mkdirSync(out, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), 'ontrack-eval-'));
const provider = await visionProvider();
const PAUSE_MS = 6000; // the free tier allows about 10 requests a minute
const times: number[] = [];

if (text) {
  // one call a case; right when an item resolves to the expected id
  const cases = JSON.parse(readFileSync(dir, 'utf8')) as { text: string; expect: string }[];
  let right = 0;
  for (const [n, c] of cases.entries()) {
    let line;
    try {
      const raw = await provider.analyze({ text: c.text, locale: 'en', signal: AbortSignal.timeout(60_000) });
      if (out) writeFileSync(join(out, `${n}.json`), JSON.stringify({ case: c, raw }, null, 2));
      const parsed = modelOutput.safeParse(raw);
      const ids = parsed.success ? resolveItems(parsed.data.items).map((i) => i.foodId ?? 'estimate') : ['schema mismatch'];
      const ok = ids.includes(c.expect);
      right += +ok;
      line = `${ok ? 'right' : 'WRONG'}  ${c.text}  ->  ${ids.join(', ')}${ok ? '' : `  (expected ${c.expect})`}`;
    } catch (e) {
      line = `failed  ${c.text}  ${(e as { status?: number }).status ?? ''} ${String((e as Error).message).slice(0, 120)}`;
    }
    console.log(line);
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
  console.log(`\n${provider.model}: ${right} of ${cases.length} right`);
  process.exit(0);
}

for (const f of readdirSync(dir).filter((n) => /\.(jpe?g|png|heic)$/i.test(n)).sort()) {
  const jpeg = join(tmp, `${f}.jpg`);
  let line = '';
  try {
    execFileSync('sips', ['-Z', '1024', '-s', 'format', 'jpeg', '-s', 'formatOptions', '80', join(dir, f), '--out', jpeg], { stdio: 'ignore' });
    const image = new Uint8Array(readFileSync(jpeg));
    const started = Date.now();
    const raw = await provider.analyze({ image, locale: 'en', signal: AbortSignal.timeout(60_000), ...(label ? { label: true as const } : {}) });
    const ms = Date.now() - started;
    times.push(ms);
    if (out) writeFileSync(join(out, `${f}.json`), JSON.stringify(raw, null, 2));
    const read = label ? labelOutput.safeParse(raw) : null;
    const parsed = modelOutput.safeParse(raw);
    if (read) line = read.success ? JSON.stringify(toLabel(read.data) ?? 'not a label') : 'reply does not match the label schema';
    else if (!parsed.success) line = `reply does not match the schema`;
    else if (!parsed.data.is_food) line = 'not food';
    else {
      line = meal(parsed.data, true).line;
    }
    console.log(`${f}  ${(ms / 1000).toFixed(1)} s  ${line}`);
  } catch (e) {
    console.log(`${f}  failed: ${(e as { status?: number }).status ?? ''} ${String((e as Error).message).slice(0, 160)}`);
  }
  await new Promise((r) => setTimeout(r, PAUSE_MS));
}
times.sort((a, b) => a - b);
if (times.length) console.log(`\n${provider.model}: median ${(times[Math.floor(times.length / 2)] / 1000).toFixed(1)} s, slowest ${(times.at(-1)! / 1000).toFixed(1)} s, ${times.length} answered`);
