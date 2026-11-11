// pnpm foods:build: data/food-list.csv + USDA FoodData Central SR Legacy -> src/lib/data/foods.json (TECH-SPEC section 9).
// Downloads the SR Legacy CSV archive into data/usda/ (gitignored) the first time. Fails on a missing id or nutrient.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Food, FoodTag } from '../src/lib/data/foods';

const ARCHIVE = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip';
const FILES = ['food.csv', 'food_nutrient.csv'];
/** FoodData Central nutrient ids */
const NUTRIENT = { kcal: 1008, protein: 1003, fat: 1004, carbs: 1005, fiber: 1079 } as const;
const REQUIRED = ['kcal', 'protein', 'carbs', 'fat'] as const;
const TAGS: FoodTag[] = ['dense', 'protein', 'drink', 'oil', 'staple'];
const HEADER = 'id,name,aliases,fdc_id,portions,tags';

export type Usda = { foods: Set<number>; nutrients: Map<number, Map<number, number>> };

/** One CSV line, fields optionally quoted with "" as an escaped quote. */
export function csvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') quoted = false;
      else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const list = (s: string) => s.split('|').map((x) => x.trim()).filter(Boolean);

/** The curated list joined with USDA nutrients. Throws one error listing every problem found. */
export function buildFoods(listCsv: string, usda: Usda): Food[] {
  const lines = listCsv.split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (lines[0]?.trim() !== HEADER) errors.push(`header must be: ${HEADER}`);
  const ids = new Set<string>();
  const fdcIds = new Set<number>();
  const foods: Food[] = [];
  for (const [n, line] of lines.slice(1).entries()) {
    const row = n + 2;
    const f = csvLine(line);
    if (f.length !== 6) { errors.push(`row ${row}: expected 6 fields, found ${f.length}`); continue; }
    const [id, name, aliases, fdc, portions, tags] = f.map((x) => x.trim());
    const fdcId = Number(fdc);
    if (!/^[a-z0-9-]{1,80}$/.test(id)) errors.push(`row ${row}: bad id "${id}"`);
    if (ids.has(id)) errors.push(`row ${row}: duplicate id ${id}`);
    if (fdcIds.has(fdcId)) errors.push(`row ${row}: duplicate fdc_id ${fdc}`);
    ids.add(id);
    fdcIds.add(fdcId);
    if (!name) errors.push(`row ${row}: ${id} has no name`);
    if (!Number.isInteger(fdcId) || !usda.foods.has(fdcId)) { errors.push(`row ${row}: ${id} fdc_id ${fdc} is not in SR Legacy`); continue; }

    const values = usda.nutrients.get(fdcId);
    const missing = REQUIRED.filter((k) => values?.get(NUTRIENT[k]) === undefined);
    if (missing.length) { errors.push(`row ${row}: ${id} (fdc_id ${fdcId}) has no ${missing.join(', ')}`); continue; }
    const per100: Food['per100'] = { kcal: values!.get(NUTRIENT.kcal)!, protein: values!.get(NUTRIENT.protein)!, carbs: values!.get(NUTRIENT.carbs)!, fat: values!.get(NUTRIENT.fat)! };
    const fiber = values!.get(NUTRIENT.fiber);
    if (fiber !== undefined) per100.fiber = fiber;

    const parsed = list(portions).map((p) => {
      const at = p.lastIndexOf(':');
      return { label: p.slice(0, at).trim(), grams: Number(p.slice(at + 1)) };
    });
    if (!parsed.length || parsed.some((p) => !p.label || !(p.grams > 0))) errors.push(`row ${row}: ${id} has bad portions "${portions}"`);
    const tagList = list(tags) as FoodTag[];
    const badTags = tagList.filter((t) => !TAGS.includes(t));
    if (badTags.length) errors.push(`row ${row}: ${id} has unknown tags ${badTags.join(', ')}`);

    foods.push({ id, name, aliases: list(aliases).map((a) => a.toLowerCase()), per100, portions: parsed, tags: tagList, source: { set: 'usda-sr-legacy', fdcId } });
  }
  if (errors.length) throw new Error(`food list has ${errors.length} problem(s):\n${errors.join('\n')}`);
  return foods;
}

/** The SR Legacy ids and the five nutrients for the foods on the list. */
export function readUsda(dir: string, wanted: Set<number>): Usda {
  const foods = new Set<number>();
  for (const line of readFileSync(`${dir}/food.csv`, 'utf8').split('\n').slice(1)) {
    const id = Number(csvLine(line)[0]);
    if (id) foods.add(id);
  }
  const keep = new Set<number>(Object.values(NUTRIENT));
  const nutrients = new Map<number, Map<number, number>>();
  for (const line of readFileSync(`${dir}/food_nutrient.csv`, 'utf8').split('\n').slice(1)) {
    const f = csvLine(line);
    const fdc = Number(f[1]);
    const nutrient = Number(f[2]);
    if (!wanted.has(fdc) || !keep.has(nutrient) || f[3] === '') continue;
    if (!nutrients.has(fdc)) nutrients.set(fdc, new Map());
    nutrients.get(fdc)!.set(nutrient, Number(f[3]));
  }
  return { foods, nutrients };
}

async function download(dir: string) {
  mkdirSync(dir, { recursive: true });
  console.log(`downloading ${ARCHIVE}`);
  const res = await fetch(ARCHIVE);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const zip = `${dir}/sr-legacy.zip`;
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-o', '-j', zip, ...FILES.map((f) => `*/${f}`), '-d', dir], { stdio: 'inherit' });
}

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const dir = `${root}data/usda`;
  if (!FILES.every((f) => existsSync(`${dir}/${f}`))) await download(dir);
  const csv = readFileSync(`${root}data/food-list.csv`, 'utf8');
  const wanted = new Set(csv.split(/\r?\n/).slice(1).map((l) => Number(csvLine(l)[3])).filter(Boolean));
  const foods = buildFoods(csv, readUsda(dir, wanted));
  writeFileSync(`${root}src/lib/data/foods.json`, `${JSON.stringify(foods)}\n`);
  console.log(`wrote ${foods.length} foods to src/lib/data/foods.json`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
