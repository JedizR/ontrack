// pnpm foods:build: data/food-list.csv + four published tables -> src/lib/data/foods.json (TECH-SPEC section 9).
// - USDA FoodData Central SR Legacy and FNDDS 2021-2023 (public domain): CSV archives downloaded into data/usda/
//   (gitignored) the first time. A numeric source_id is an FDC id in either.
// - SG FoodID (Health Promotion Board, Singapore; open licence with attribution): a source_id like F05060092. There is
//   no bulk file, so the API's answer for each listed food is kept verbatim in data/sgfoodid/foods.json with its URL
//   and the date, under a checksum. Missing foods are fetched; a changed file fails the build.
// - Thai Food Composition Database, INMU, Mahidol University (N3), two ways in:
//   `owner:<code>` is a row of the extract the owner supplied, data/thai/owner/nutrition_dataset.csv, under a checksum;
//   `inmu:<code>` is the database's own page for the food, kept verbatim in data/thai/inmu/ and listed with its URL,
//   the date read and a checksum in data/thai/pages.json. Missing pages are fetched; a changed page fails the build.
//   Energy or carbohydrate a Thai row lacks is derived by Atwater and marked `derived`; a row whose energy and macros
//   disagree is left out, with the reason.
// Nobody types a nutrient value. The build fails on a missing id or nutrient.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Food, FoodTag } from '../src/lib/data/foods';
import { V } from '../src/lib/model/engine/constants.ts';

type Values = Partial<Record<'kcal' | 'protein' | 'carbs' | 'fat' | 'fiber', number>>;
type Cite = Pick<Food['source'], 'url' | 'derived'>;
/** One source's foods: its ids and the five values per 100 g for the ones on the list; for a Thai table also each
 * food's page and what was derived, and the rows left out with why. */
export type Table = { set: Food['source']['set']; name: string; ids: Set<string>; values: Map<string, Values>; cite?: Map<string, Cite>; excluded?: Map<string, string> };

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
const TH_DIR = 'data/thai';
const OWNER_FILE = 'owner/nutrition_dataset.csv';
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
    const out = table.excluded?.get(source);
    if (out) { errors.push(`row ${row}: ${id} (${table.name} ${source}) is left out: ${out}`); continue; }

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

    foods.push({ id, name, aliases: list(aliases).map((a) => a.toLowerCase()), per100, portions: parsed, tags: tagList, source: { set: table.set, id: source, ...table.cite?.get(source) } });
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
    const v = Number(f[3]);
    if (!wanted.has(f[1]) || !key || f[3] === '' || !Number.isFinite(v)) continue; // not a number is missing, and fails
    if (!values.has(f[1])) values.set(f[1], {});
    values.get(f[1])![key] = v;
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

const r2 = (n: number) => Math.round(n * 100) / 100;
/** A Thai row's values completed by Atwater: energy from the macros when only carbohydrate is given, carbohydrate from
 * energy when only energy is (marked derived). A row whose numbers disagree gives the reason to leave it out. */
export function complete(v: Values): { values: Values; derived?: Cite['derived'] } | string {
  const { protein: p, fat: f, kcal, carbs } = v;
  if (p === undefined || f === undefined) return { values: v }; // the build names what is missing if the food is listed
  const a = V.atwater;
  const fromMacros = (c: number) => a.protein * p + a.carbs * c + a.fat * f;
  if (kcal !== undefined && carbs !== undefined) {
    const t = V.tableKcalTolerance;
    const off = Math.abs(fromMacros(carbs) - kcal) > Math.max(t.kcal, t.share * kcal);
    return off ? `energy ${kcal} kcal against ${Math.round(fromMacros(carbs))} from its protein, carbohydrate and fat` : { values: v };
  }
  if (kcal !== undefined) {
    const c = (kcal - fromMacros(0)) / a.carbs;
    if (c < V.derivedCarbsMin) return `energy ${kcal} kcal is below the ${Math.round(fromMacros(0))} its protein and fat carry`;
    return { values: { ...v, carbs: r2(Math.max(0, c)) }, derived: 'carbs' };
  }
  if (carbs !== undefined) return { values: { ...v, kcal: Math.round(fromMacros(carbs)) }, derived: 'kcal' };
  return { values: v };
}

/** A number as a Thai table prints it; "-" or empty is missing. */
const thaiNumber = (s: string | undefined) => {
  const t = (s ?? '').trim();
  return t === '' || t === '-' || !Number.isFinite(Number(t)) ? undefined : Number(t);
};
function thaiTable(set: Food['source']['set'], name: string, rows: Map<string, Values>, out: Partial<Record<string, string>>, urls?: Map<string, string>): Table {
  const values = new Map<string, Values>();
  const cite = new Map<string, Cite>();
  const excluded = new Map<string, string>();
  for (const [id, v] of rows) {
    const code = id.slice(id.indexOf(':') + 1);
    const r = out[code] ?? complete(v);
    if (typeof r === 'string') { excluded.set(id, r); continue; }
    values.set(id, Object.fromEntries(Object.entries(r.values).filter(([, x]) => x !== undefined)));
    const url = urls?.get(id);
    if (url || r.derived) cite.set(id, { ...(url && { url }), ...(r.derived && { derived: r.derived }) });
  }
  return { set, name, ids: new Set(rows.keys()), values, cite, excluded };
}

const OWNER_HEADER = 'Food_Code,Thai_Name,English_Name,Scientific_name,SUGAR(g),Protein(g),Fat(g),Energy(kcal) by calculation,CHOCDF (g) Carbohydrate,FIBTG (g) Dietary fibre';
/** Rows of the owner's extract whose numbers cannot be the food they name, found by reading them (N3). */
const OWNER_OUT: Record<string, string> = {
  J36: 'a whey protein powder with 7.8 g protein in 100 g; whey powders carry about 75 to 90',
  T290: "its carbohydrate column holds the energy: INMU's page for T290 reads 47 kcal and 3.3 g carbohydrate",
  T275: "its carbohydrate column holds the energy: INMU's page for T275 reads 35 kcal and 8.5 g carbohydrate",
};

/** The owner's extract of the Thai FCD (data/thai/owner/SOURCE.md): per 100 g, ids `owner:<code>`. */
export function readOwner(csv: string): Table {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  if (lines[0] !== OWNER_HEADER) throw new Error(`the owner's extract must start with: ${OWNER_HEADER}`);
  const rows = new Map<string, Values>();
  for (const [n, line] of lines.slice(1).entries()) {
    const f = csvLine(line);
    if (f.length !== 10) throw new Error(`the owner's extract, row ${n + 2}: expected 10 fields, found ${f.length}`);
    rows.set(`owner:${f[0].trim()}`, { protein: thaiNumber(f[5]), fat: thaiNumber(f[6]), kcal: thaiNumber(f[7]), carbs: thaiNumber(f[8]), fiber: thaiNumber(f[9]) });
  }
  return thaiTable('thai-fcd-owner', "Thai FCD (the owner's extract)", rows, OWNER_OUT);
}

const INMU = 'https://inmu.mahidol.ac.th/thaifcd/';
const INMU_GROUP: Record<string, number> = { A: 70, B: 71, C: 73, D: 74, E: 75, F: 76, G: 77, H: 78, J: 79, K: 80, M: 81, N: 72, Q: 82, S: 83, T: 84, U: 85, Z: 69 };
export type InmuPages = { source: string; terms: string; pages: Record<string, { file: string; url: string; read: string; sha256: string }> };

/** One page of the online Thai FCD as its server answers it: the food's code and its values per 100 g edible portion. */
export function readInmuPage(html: string): { code?: string; values: Values } {
  const code = /Food Code:\s*<\/div>\s*<div[^>]*>([^<]+)</.exec(html)?.[1].trim();
  const cell = (label: string) => thaiNumber(new RegExp(`<td[^>]*>${label}</td>\\s*<td[^>]*>[^<]*</td>\\s*<td[^>]*>([^<]*)</td>`).exec(html)?.[1]);
  // a page gives energy and carbohydrate by available carbohydrate, or only as totals; complete() checks the pair
  const kcal = cell('Energy, by calculation') ?? cell('Total energy - by calculation');
  const carbs = cell('Carbohydrate, available') ?? cell('Carbohydrate, total');
  return { code, values: { kcal, carbs, protein: cell('Protein, total'), fat: cell('Fat, total'), fiber: cell('Dietary fibre') } };
}

/** The checked-in INMU pages, with any listed food's page it lacks fetched and added. Ids `inmu:<code>`. */
async function inmuPages(dir: string, wanted: string[]): Promise<Table> {
  const file = `${dir}/pages.json`;
  const pages: InmuPages = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {
    source: 'Thai Food Composition Database, online version 3 (August 2025), Institute of Nutrition, Mahidol University (INMU). Values per 100 g edible portion. Each page is the answer its "url" loads, kept verbatim',
    terms: `${INMU}content/term-and-condition`,
    pages: {},
  };
  const missing = wanted.filter((code) => !pages.pages[code]);
  if (missing.length) {
    const read = new Date().toISOString().slice(0, 10);
    const links = new Map<string, string>(); // code -> the food's page, from its group's list
    for (const group of new Set(missing.map((c) => c[0]))) {
      const res = await fetch(`${INMU}foodsearch/food_group_result?status=A&food_group_id=${INMU_GROUP[group]}`);
      if (!res.ok) throw new Error(`Thai FCD group ${group}: ${res.status}`);
      for (const row of (await res.text()).split('<tr').slice(1)) {
        const href = /href="([^"]*[?&]id=\d+[^"]*)"/.exec(row)?.[1];
        const code = [...row.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].at(-1)?.[1].trim();
        if (href && code) links.set(code, new URL(href, INMU).href);
      }
    }
    mkdirSync(`${dir}/inmu`, { recursive: true });
    for (const code of missing) {
      const url = links.get(code);
      if (!url) throw new Error(`Thai FCD has no food ${code}`);
      const answer = `${INMU}foodsearch/food_name_result?selected_id=${new URL(url).searchParams.get('id')}&selected_dbcode=STD`;
      console.log(`fetching ${answer}`);
      const res = await fetch(answer);
      if (!res.ok) throw new Error(`Thai FCD ${code}: ${res.status}`);
      const text = await res.text();
      const read = readInmuPage(text).code;
      if (read !== code) throw new Error(`Thai FCD ${code}: ${answer} answered the page of ${read ?? 'no food'}`);
      writeFileSync(`${dir}/inmu/${code}.html`, text);
      pages.pages[code] = { file: `inmu/${code}.html`, url, read, sha256: sha256(text) };
      await new Promise((r) => setTimeout(r, 1000)); // one page a second, gently
    }
    pages.pages = Object.fromEntries(Object.entries(pages.pages).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(file, `${JSON.stringify(pages, null, 1)}\n`);
  }
  const rows = new Map<string, Values>();
  const urls = new Map<string, string>();
  for (const [code, page] of Object.entries(pages.pages)) {
    const text = readFileSync(`${dir}/${page.file}`, 'utf8');
    if (sha256(text) !== page.sha256) throw new Error(`${dir}/${page.file} does not match its checksum in pages.json: it was edited by hand. Delete it and its entry to fetch again.`);
    const { code: read, values } = readInmuPage(text);
    if (read !== code) throw new Error(`${dir}/${page.file} is the page of ${read}, not ${code}`);
    rows.set(`inmu:${code}`, values);
    urls.set(`inmu:${code}`, page.url);
  }
  return thaiTable('thai-fcd', 'Thai FCD', rows, {}, urls);
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
  const thai = `${root}${TH_DIR}`;
  const owner = readFileSync(`${thai}/${OWNER_FILE}`, 'utf8');
  if (sha256(owner) !== readFileSync(`${thai}/${OWNER_FILE}.sha256`, 'utf8').trim()) throw new Error(`${TH_DIR}/${OWNER_FILE} does not match its checksum: it was edited. Copy the owner's file again.`);
  tables.push(readOwner(owner));
  tables.push(await inmuPages(thai, [...wanted].filter((id) => id.startsWith('inmu:')).map((id) => id.slice('inmu:'.length))));
  for (const t of tables.filter((t) => t.excluded?.size)) console.log(`${t.name}: ${t.excluded!.size} rows left out\n${[...t.excluded!].map(([id, why]) => `  ${id}: ${why}`).join('\n')}`);
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
