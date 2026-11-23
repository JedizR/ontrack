// Thai dishes and their variants (docs/AI-THAI.md). The model reports a dish, its protein and what came with it; this
// finds the food table's entry for that plate, deterministically, from the names and aliases the table already has.
import foods from '../../src/lib/data/foods.json' with { type: 'json' };
import { V } from '../../src/lib/model/engine/constants.js';
import { compact, fold, norm } from '../../shared/text.js';
import { EXTRAS, PROTEINS, type ModelItem } from './schema.js';

type Protein = Exclude<(typeof PROTEINS)[number], 'none'>;
type Extra = (typeof EXTRAS)[number];
/** A plate: its base dish (normalised), its protein (null when its name gives none), and rice and a fried egg or not. */
export type Plate = { base: string; protein: Protein | null; rice: boolean; egg: boolean };

/** How menus write each protein and extra: English (as the table names them), romanised Thai, Thai script. */
const WORDS: Record<Protein | Extra, string[]> = {
  pork: ['pork', 'moo', 'mu', 'หมู'],
  'minced pork': ['minced pork', 'ground pork', 'moo sap', 'moo sab', 'mu sap', 'หมูสับ'],
  'crispy pork': ['crispy pork', 'crispy pork belly', 'moo krob', 'moo grob', 'moo krop', 'mu krop', 'หมูกรอบ'],
  chicken: ['chicken', 'kai', 'gai', 'ไก่'],
  beef: ['beef', 'nuea', 'neua', 'nua', 'เนื้อ', 'เนื้อวัว'],
  duck: ['duck', 'ped', 'pet', 'เป็ด'],
  shrimp: ['shrimp', 'prawn', 'prawns', 'kung', 'goong', 'gung', 'กุ้ง'],
  squid: ['squid', 'pla muek', 'pla meuk', 'pla muk', 'ปลาหมึก', 'หมึก'],
  seafood: ['seafood', 'mixed seafood', 'talay', 'thale', 'ทะเล', 'รวมมิตร'],
  fish: ['fish', 'pla', 'ปลา'],
  tofu: ['tofu', 'tao hu', 'taohu', 'เต้าหู้'],
  egg: ['egg', 'khai', 'ไข่'],
  rice: ['rice', 'khao', 'ข้าว', 'ข้าวราด', 'ราดข้าว'],
  'fried egg': ['fried egg', 'khai dao', 'kai dao', 'ไข่ดาว'],
};
/** Words a dish name may carry around its parts. */
const FILLERS = ['with', 'and', 'on', 'over', 'plus', 'rad', 'ราด', 'ใส่', 'กับ'];
/** Proteins close enough to stand in for each other when the table lacks the exact plate. */
const NEAR: Partial<Record<Protein, Protein[]>> = { pork: ['minced pork'], 'minced pork': ['pork'], seafood: ['shrimp', 'squid'], shrimp: ['seafood'], squid: ['seafood'] };

const longestFirst = <T extends Protein | Extra>(keys: readonly T[]) =>
  keys.flatMap((k) => WORDS[k].map((w) => [k, w] as const)).sort((a, b) => b[1].length - a[1].length);
const PROTEIN_WORDS = longestFirst(PROTEINS.filter((p): p is Protein => p !== 'none'));
const EXTRA_WORDS = longestFirst(EXTRAS);
const ALL_WORDS = new Set([...Object.values(WORDS).flat(), ...FILLERS]);

const pad = (s: string) => ` ${s.replace(/\s+/g, ' ').trim()} `;
/** `s` (padded) without its first `w`: Thai script by substring, as Thai has no spaces; anything else by whole words. */
function cut(s: string, w: string): string | null {
  const k = /[฀-๿]/.test(w) ? w : ` ${w} `;
  const at = s.indexOf(k);
  return at < 0 ? null : pad(`${s.slice(0, at)} ${s.slice(at + k.length)}`);
}

/** A table name's plate: "Pad kra pao chicken with rice and fried egg", "Green curry with chicken on rice". */
export function plateOf(name: string): Plate {
  let s = norm(name);
  const egg = / (and|with) fried egg$/.test(s);
  s = s.replace(/ (and|with) fried egg$/, '');
  const rice = / (with|on) rice$/.test(s);
  s = s.replace(/ (with|on) rice$/, '');
  for (const [p, w] of PROTEIN_WORDS) {
    const m = s.match(new RegExp(`^(.+?) (with )?${w}$`));
    // "Pad thai with pork or beef" and "Clear soup with tofu and minced pork" name no one protein; without "with", a
    // one word base is a cooking method, not a dish ("Fried egg", "Roast duck")
    if (m && !/ (and|or)$| with /.test(` ${m[1]}`) && (m[2] || m[1].includes(' '))) return { base: m[1], protein: p, rice, egg };
  }
  return { base: s, protein: null, rice, egg };
}

const THAI = foods.filter((f) => (f.tags as string[]).includes('thai'));
export const PLATES = new Map(THAI.map((f) => [f.id, plateOf(f.name)]));
/** Bases with variants (a protein or an extra in some name), and every Thai food on such a base. */
const BASES = new Set([...PLATES.values()].filter((p) => p.protein || p.rice || p.egg).map((p) => p.base));
const MEMBERS = [...PLATES].filter(([, p]) => BASES.has(p.base));

/** Dish names to their base: each base, then each alias without its own protein and extras ("kaprao moo" gives "kaprao"). */
const DISH = new Map(MEMBERS.map(([, p]) => [p.base, p.base]));
for (const [id, p] of MEMBERS) {
  const own = [...(p.protein ? WORDS[p.protein] : []), ...(p.rice ? WORDS.rice : []), ...(p.egg ? WORDS['fried egg'] : [])].sort((a, b) => b.length - a.length);
  for (const alias of THAI.find((f) => f.id === id)!.aliases) {
    let s = pad(norm(alias));
    for (const w of own) s = cut(s, w) ?? s;
    const dish = s.trim();
    if (dish && !ALL_WORDS.has(dish) && !DISH.has(dish)) DISH.set(dish, p.base);
  }
}
const DISH_WORDS = [...DISH.keys()].sort((a, b) => b.length - a.length);
/** Every Thai name and alias to its food: names first, then dishes' aliases before the rest, so bare "kaprao" is the
 * dish's default row (kra-pao-pork), not the basil herb that shares it. */
const EXACT = new Map<string, string>();
const isDish = (id: string) => BASES.has(PLATES.get(id)!.base);
const order = [...THAI.filter((f) => isDish(f.id)), ...THAI.filter((f) => !isDish(f.id))];
for (const f of order) if (!EXACT.has(norm(f.name))) EXACT.set(norm(f.name), f.id);
for (const f of order) for (const a of f.aliases) if (!EXACT.has(norm(a))) EXACT.set(norm(a), f.id);
/** The same names by their folded and spaceless keys ("Phad kra prao gai" finds "pad kaprao gai"). A key two different
 * names share, one food's two spellings aside, is left out: khai (egg) and kai (chicken) fold together, so neither wins. */
const keyed = (key: (s: string) => string) => {
  const m = new Map<string, { id: string; raw: string } | null>();
  for (const [f, text] of [...order.map((f) => [f, f.name] as const), ...order.flatMap((f) => f.aliases.map((a) => [f, a] as const))]) {
    const k = key(text), raw = norm(text), hit = m.get(k);
    if (hit === undefined) m.set(k, { id: f.id, raw });
    else if (hit && hit.raw !== raw && hit.id !== f.id) m.set(k, null);
  }
  return m;
};
const FOLDED = keyed(fold);
const COMPACT = keyed(compact);

/** A typed or recognised dish name read as a plate ("กะเพราหมูกรอบไข่ดาว", "kaprao gai"): a known dish, then at most
 * one protein and the extras, and nothing else left over; null when it reads as anything more. */
export function parsePlate(text: string): Plate | null {
  let s = pad(norm(text));
  const dish = DISH_WORDS.find((w) => cut(s, w) !== null);
  if (!dish) return null;
  s = cut(s, dish)!;
  const plate: Plate = { base: DISH.get(dish)!, protein: null, rice: false, egg: false };
  for (const [k, w] of EXTRA_WORDS) {
    const rest = cut(s, w);
    if (rest !== null) [s, plate[k === 'rice' ? 'rice' : 'egg']] = [rest, true];
  }
  const hit = PROTEIN_WORDS.find(([, w]) => cut(s, w) !== null);
  if (hit) [s, plate.protein] = [cut(s, hit[1])!, hit[0]];
  for (const w of FILLERS) for (let rest = cut(s, w); rest !== null; rest = cut(s, w)) s = rest;
  // as the prompt says: a one-plate dish with a fried egg comes on rice
  plate.rice ||= plate.egg;
  return s.trim() ? null : plate;
}

/** The plate the model reported: its dish (a base, an alias of one, or a name that parses), protein and extras. */
function reported(it: ModelItem): Plate | null {
  if (!it.dish) return null;
  const base = DISH.get(norm(it.dish));
  const read = base ? null : parsePlate(it.dish);
  if (!base && !read) return null;
  const protein = it.protein === 'none' ? (read?.protein ?? null) : it.protein;
  return { base: base ?? read!.base, protein, rice: it.extras.includes('rice') || !!read?.rice, egg: it.extras.includes('fried egg') || !!read?.egg };
}

/** 0 the same protein, 1 a near one, 2 a plate that names none, else no match. */
const proteinCost = (p: Plate, want: Plate) =>
  p.protein === want.protein ? 0 : want.protein && p.protein && NEAR[want.protein]?.includes(p.protein) ? 1 : p.protein === null ? 2 : Infinity;
/** The table's plates on the wanted base, nearest first: protein before rice before the egg; table order breaks ties. */
function nearest(want: Plate) {
  return MEMBERS.filter(([, p]) => p.base === want.base)
    .map(([id, p]) => ({ id, cost: proteinCost(p, want) * 10 + (p.rice !== want.rice ? 2 : 0) + (p.egg !== want.egg ? 1 : 0) }))
    .filter((c) => Number.isFinite(c.cost))
    .sort((a, b) => a.cost - b.cost);
}

/** The dish families: each base with variants, to the table ids on it (the prompt lists a family once, not each plate). */
export const FAMILIES = new Map<string, string[]>();
for (const [id, p] of MEMBERS) FAMILIES.set(p.base, [...(FAMILIES.get(p.base) ?? []), id]);

/** The same dish and extras with the same or a near protein (pork and minced pork): plates that may stand in for `id`. */
export function siblings(id: string): string[] {
  const p = PLATES.get(id);
  if (!p?.protein) return [];
  return MEMBERS.filter(([o, q]) => o !== id && q.base === p.base && q.rice === p.rice && q.egg === p.egg && q.protein && (q.protein === p.protein || NEAR[p.protein!]?.includes(q.protein))).map(([o]) => o);
}

/** The same dish with each other protein, one plate each, nearest `id`'s rice and egg: what a wrong protein guess may have been. */
export function otherProteins(id: string): string[] {
  const p = PLATES.get(id);
  if (!p || !BASES.has(p.base)) return [];
  const best = new Map<Protein, { id: string; miss: number }>();
  for (const [o, q] of MEMBERS) {
    const miss = (q.rice !== p.rice ? 2 : 0) + (q.egg !== p.egg ? 1 : 0);
    if (q.base === p.base && q.protein && q.protein !== p.protein && miss < (best.get(q.protein)?.miss ?? Infinity)) best.set(q.protein, { id: o, miss });
  }
  return [...best.values()].map((b) => b.id);
}

/** A name as a set of tokens: each protein and extra as its canonical word (moo, หมู, pork all "pork"), fillers dropped,
 * the rest folded; a Thai word as its trigrams, as Thai has no spaces to split on. */
const WORD_KEYS = [...PROTEIN_WORDS, ...EXTRA_WORDS].sort((a, b) => b[1].length - a[1].length);
const PROTEIN_KEYS = new Set<string>(PROTEINS);
const ARTICLES = ['a', 'an', 'the', 'of'];
function tokens(name: string): Set<string> {
  let s = pad(norm(name));
  const out = new Set<string>();
  for (const [k, w] of WORD_KEYS) for (let rest = cut(s, w); rest !== null; rest = cut(s, w)) { s = rest; out.add(k); }
  for (const w of s.trim().split(' ')) {
    if (!w || FILLERS.includes(w) || ARTICLES.includes(w)) continue;
    const f = fold(w), g = V.fuzzyMatch.letters;
    if (!/[฀-๿]/.test(f) || f.length <= g) out.add(f);
    else for (let i = 0; i + g <= f.length; i++) out.add(f.slice(i, i + g));
  }
  return out;
}
let NAMES: { id: string; set: Set<string> }[] | undefined;
/** Words a name may carry that its table row need not: "Tom yum shrimp soup" is "Tom yum kung". */
const GENERIC = ['soup', 'salad', 'style', 'plate', 'bowl', 'dish'];
/**
 * The Thai food whose name or alias has the same tokens as `name`, for a name no plate, id or whole name reached
 * ("Tom yum shrimp soup", "Larb pork salad"). Every word of the name must be in the row's (a protein too, so a typo
 * like "cicken" is not read past), the row may add no protein the name lacks (so beef never lands on pork), the
 * overlap must reach the threshold and lead the runner up.
 */
function fuzzy(name: string): string | null {
  const q = tokens(name);
  if (!q.size) return null;
  const qp = [...q].filter((t) => PROTEIN_KEYS.has(t));
  NAMES ??= THAI.flatMap((f) => [f.name, ...f.aliases].map((t) => ({ id: f.id, set: tokens(t) })));
  const best = new Map<string, number>();
  for (const { id, set } of NAMES) {
    if ([...q].some((t) => !set.has(t) && !GENERIC.includes(t)) || [...set].some((t) => PROTEIN_KEYS.has(t) && !qp.includes(t))) continue;
    const common = [...q].filter((t) => set.has(t)).length;
    best.set(id, Math.max(best.get(id) ?? 0, common / (q.size + set.size - common)));
  }
  const [a, b] = [...best].sort((x, y) => y[1] - x[1]);
  return a && a[1] >= V.fuzzyMatch.jaccard && a[1] - (b?.[1] ?? 0) >= V.fuzzyMatch.margin ? a[0] : null;
}

/**
 * The table id for a model item, or null for an estimate. The exact plate the model reported (or its name reads as)
 * wins; then the model's own food_id, unless it is the same dish with another protein (the user said duck, the id is
 * pork); then the nearest plate; then a Thai name or alias that matches the item's name whole.
 */
export function foodIdFor(it: ModelItem, known: (id: string) => boolean): string | null {
  const want = reported(it) ?? parsePlate(it.name);
  const ranked = want ? nearest(want) : [];
  if (ranked[0]?.cost === 0) return ranked[0].id;
  const own = it.food_id && known(it.food_id) ? PLATES.get(it.food_id) : undefined;
  const contradicted = want && own && own.base === want.base && proteinCost(own, want) === Infinity;
  if (it.food_id && known(it.food_id) && !contradicted) return it.food_id;
  return ranked[0]?.id ?? EXACT.get(norm(it.name)) ?? FOLDED.get(fold(it.name))?.id ?? (compact(it.name).length >= 4 ? COMPACT.get(compact(it.name))?.id : undefined) ?? fuzzy(it.name);
}
