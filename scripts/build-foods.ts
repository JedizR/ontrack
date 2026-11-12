// pnpm foods:build: data/food-list.csv + three published tables -> src/lib/data/foods.json (TECH-SPEC section 9).
// - USDA FoodData Central SR Legacy and FNDDS 2021-2023 (public domain): CSV archives downloaded into data/usda/
//   (gitignored) the first time. A numeric source_id is an FDC id in either.
// - SG FoodID (Health Promotion Board, Singapore; open licence with attribution): a source_id like F05060092. There is
//   no bulk file, so the API's answer for each listed food is kept verbatim in data/sgfoodid/foods.json with its URL
//   and the date, under a checksum. Missing foods are fetched; a changed file fails the build.
// Nobody types a nutrient value. The build fails on a missing id or nutrient.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Food, FoodTag } from '../src/lib/data/foods';

type Values = Partial<Record<'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber', number>>;
/** One source's foods: its ids and the five values per 100 g for the ones on the list. */
export type Table = { set: Food['source']['set']; name: string; ids: Set<string>; values: Map<string, Values> };

const USDA = {
  'usda-sr-legacy': {
    name: 'SR Legacy',
    archive: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip',
    dir: 'data/usda',
    nutrient: { kcal: 1008, protein: 1003, fat: 1004, carbs: 1005, fiber: 1079 },
  },
  // FNDDS files name nutrients by their number (208 energy), SR Legacy by id (1008)
  'usda-fndds': {
    name: 'FNDDS',
    archive: 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_survey_food_csv_2024-10-31.zip',
    dir: 'data/usda/fndds',
    nutrient: { kcal: 208, protein: 203, fat: 204, carbs: 205, fiber: 291 },
  },
} as const;
const FILES = ['food.csv', 'food_nutrient.csv'];
const SG_DIR = 'data/sgfoodid';
const SG_API = 'https://pphtpc.hpb.gov.sg/bff/v1/food-portal/foods/details/';
const SG_ID = /^[A-Z]\d{8}$/;
const REQUIRED = ['kcal', 'protein', 'carbs', 'fat'] as const;
const TAGS: FoodTag[] = ['dense', 'protein', 'drink', 'oil', 'staple', 'thai'];
const HEADER = 'id,name,aliases,source_id,portions,tags';

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

/** The curated list joined with the tables' nutrients. Throws one error listing every problem found. */
export function buildFoods(listCsv: string, tables: Table[]): Food[] {
  const lines = listCsv.split(/\r?\n/).filter((l) => l.trim());
  const errors: string[] = [];
  if (lines[0]?.trim() !== HEADER) errors.push(`header must be: ${HEADER}`);
  const ids = new Set<string>();
  const sourceIds = new Set<string>();
  const foods: Food[] = [];
  for (const [n, line] of lines.slice(1).entries()) {
    const row = n + 2;
    const f = csvLine(line);
    if (f.length !== 6) { errors.push(`row ${row}: expected 6 fields, found ${f.length}`); continue; }
    const [id, name, aliases, source, portions, tags] = f.map((x) => x.trim());
    if (!/^[a-z0-9-]{1,80}$/.test(id)) errors.push(`row ${row}: bad id "${id}"`);
    if (ids.has(id)) errors.push(`row ${row}: duplicate id ${id}`);
    if (sourceIds.has(source)) errors.push(`row ${row}: duplicate source_id ${source}`);
    ids.add(id);
    sourceIds.add(source);
    if (!name) errors.push(`row ${row}: ${id} has no name`);
    const table = tables.find((t) => t.ids.has(source));
    if (!table) { errors.push(`row ${row}: ${id} source_id ${source} is not in ${tables.map((t) => t.name).join(' or ')}`); continue; }

    const values = table.values.get(source) ?? {};
    const missing = REQUIRED.filter((k) => values[k] === undefined);
    if (missing.length) { errors.push(`row ${row}: ${id} (${table.name} ${source}) has no ${missing.join(', ')}`); continue; }
    const per100: Food['per100'] = { kcal: values.kcal!, protein: values.protein!, carbs: values.carbs!, fat: values.fat! };
    if (values.fiber !== undefined) per100.fiber = values.fiber;

    const parsed = list(portions).map((p) => {
      const at = p.lastIndexOf(':');
      return { label: p.slice(0, at).trim(), grams: Number(p.slice(at + 1)) };
    });
    if (!parsed.length || parsed.some((p) => !p.label || !(p.grams > 0))) errors.push(`row ${row}: ${id} has bad portions "${portions}"`);
    const tagList = list(tags) as FoodTag[];
    const badTags = tagList.filter((t) => !TAGS.includes(t));
    if (badTags.length) errors.push(`row ${row}: ${id} has unknown tags ${badTags.join(', ')}`);

    foods.push({ id, name, aliases: list(aliases).map((a) => a.toLowerCase()), per100, portions: parsed, tags: tagList, source: { set: table.set, id: source } });
  }
  if (errors.length) throw new Error(`food list has ${errors.length} problem(s):\n${errors.join('\n')}`);
  return foods;
}

/** A USDA table's ids and the five nutrients for the foods on the list. */
export function readUsda(set: keyof typeof USDA, dir: string, wanted: Set<string>): Table {
  const ids = new Set<string>();
  for (const line of readFileSync(`${dir}/food.csv`, 'utf8').split('\n').slice(1)) {
    const id = csvLine(line)[0];
    if (id) ids.add(id);
  }
  const byNutrient = new Map(Object.entries(USDA[set].nutrient).map(([k, v]) => [String(v), k as keyof Values]));
  const values = new Map<string, Values>();
  for (const line of readFileSync(`${dir}/food_nutrient.csv`, 'utf8').split('\n').slice(1)) {
    const f = csvLine(line);
    const key = byNutrient.get(f[2]);
    if (!wanted.has(f[1]) || !key || f[3] === '') continue;
    if (!values.has(f[1])) values.set(f[1], {});
    values.get(f[1])![key] = Number(f[3]);
  }
  return { set, name: USDA[set].name, ids, values };
}

export type SgExtract = { source: string; terms: string; foods: Record<string, { url: string; accessed: string; data: SgFood }> };
type SgNutrients = { energy: number | null; protein: number | null; carbohydrate: number | null; fat: number | null; dietaryFibre: number | null };
type SgFood = { crId: string; name: string; baseFoodNutrients: SgNutrients };

/** SG FoodID per 100 g edible portion; null or a negative number (the API's "not analysed") is missing. */
export function readSg(extract: SgExtract): Table {
  const pick = (v: number | null | undefined) => (typeof v === 'number' && v >= 0 ? v : undefined);
  const values = new Map<string, Values>();
  for (const [id, { data }] of Object.entries(extract.foods)) {
    const n = data.baseFoodNutrients;
    const v: Values = { kcal: pick(n.energy), protein: pick(n.protein), carbs: pick(n.carbohydrate), fat: pick(n.fat), fiber: pick(n.dietaryFibre) };
    values.set(id, Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined)));
  }
  return { set: 'sg-foodid', name: 'SG FoodID', ids: new Set(Object.keys(extract.foods)), values };
}

export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

async function download(set: keyof typeof USDA, dir: string) {
  mkdirSync(dir, { recursive: true });
  const { archive } = USDA[set];
  console.log(`downloading ${archive}`);
  const res = await fetch(archive);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const zip = `${dir}/${set}.zip`;
  writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  execFileSync('unzip', ['-o', '-j', zip, ...FILES.map((f) => `*/${f}`), '-d', dir], { stdio: 'inherit' });
}

/** The checked-in SG FoodID extract, with any listed food it lacks fetched and added. */
async function sgExtract(dir: string, wanted: string[]): Promise<SgExtract> {
  const file = `${dir}/foods.json`;
  const sum = `${file}.sha256`;
  let extract: SgExtract = {
    source: 'Singapore Food Insights Database (SG FoodID), Health Promotion Board, Singapore. Values per 100 g edible portion (baseFoodNutrients)',
    terms: 'https://go.gov.sg/termsofuse-hpbsgfoodid',
    foods: {},
  };
  if (existsSync(file)) {
    const text = readFileSync(file, 'utf8');
    if (sha256(text) !== readFileSync(sum, 'utf8').trim()) throw new Error(`${file} does not match ${sum}: it was edited by hand. Delete both to fetch again.`);
    extract = JSON.parse(text) as SgExtract;
  }
  const missing = wanted.filter((id) => !extract.foods[id]);
  if (!missing.length) return extract;
  const accessed = new Date().toISOString().slice(0, 10);
  for (const id of missing) {
    const url = SG_API + id;
    console.log(`fetching ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SG FoodID ${id}: ${res.status}`);
    extract.foods[id] = { url, accessed, data: (await res.json()) as SgFood };
  }
  extract.foods = Object.fromEntries(Object.entries(extract.foods).sort(([a], [b]) => a.localeCompare(b)));
  const text = `${JSON.stringify(extract, null, 1)}\n`;
  mkdirSync(dir, { recursive: true });
  writeFileSync(file, text);
  writeFileSync(sum, `${sha256(text)}\n`);
  return extract;
}

async function main() {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const csv = readFileSync(`${root}data/food-list.csv`, 'utf8');
  const wanted = new Set(csv.split(/\r?\n/).slice(1).map((l) => csvLine(l)[3]?.trim()).filter(Boolean));
  const tables: Table[] = [];
  for (const set of Object.keys(USDA) as (keyof typeof USDA)[]) {
    const dir = `${root}${USDA[set].dir}`;
    if (!FILES.every((f) => existsSync(`${dir}/${f}`))) await download(set, dir);
    tables.push(readUsda(set, dir, wanted));
  }
  tables.push(readSg(await sgExtract(`${root}${SG_DIR}`, [...wanted].filter((id) => SG_ID.test(id)))));
  const foods = buildFoods(csv, tables);
  writeFileSync(`${root}src/lib/data/foods.json`, `${JSON.stringify(foods)}\n`);
  console.log(`wrote ${foods.length} foods to src/lib/data/foods.json`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
