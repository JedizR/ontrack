// Open Food Facts (B1, F22): a packaged food by its barcode, read straight from the browser. Free, no key, open data
// under the ODbL (credited wherever it shows). Reads are limited to 15 a minute per IP address, which from the browser
// is each phone's own; from a shared server address they would be everyone's. A browser cannot set User-Agent, so the
// app names itself in X-User-Agent, which Open Food Facts accepts for this. docs/DECISIONS.md, B1.
import { V } from '$lib/model/engine';
import type { Product } from '../../../shared/records';

export const OFF_BASE = import.meta.env.VITE_BACKEND === 'mock' ? '/__mock/off' : 'https://world.openfoodfacts.org';
const FIELDS = 'product_name,product_name_en,brands,quantity,product_quantity,product_quantity_unit,serving_size,serving_quantity,nutriments';
const WAIT_MS = 8000;

export type Macros = Product['per100'];
/** What Open Food Facts knows: `per100` null when it has no energy value, so the label is needed. `serving` is the
 * serving as printed ("2 scoops (60 g)"). */
export type OffProduct = Omit<Product, 'source' | 'lastG' | 'per100'> & { per100: Macros | null; serving?: string };

/** A number from Open Food Facts, which sometimes sends numbers as strings. */
const n = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN);
const known = (v: unknown, max: number) => {
  const x = n(v);
  return Number.isFinite(x) && x > 0 && x <= max ? x : undefined;
};
const r2 = (x: number) => Math.round(x * 100) / 100;
const macro = (v: unknown) => r2(Math.min(100, Math.max(0, Number.isFinite(n(v)) ? n(v) : 0)));
const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** A product response, or null when Open Food Facts does not have the barcode. */
export function parseOff(body: unknown): OffProduct | null {
  const b = body as { status?: number; product?: Record<string, unknown> } | null;
  if (!b || b.status !== 1 || !b.product) return null;
  const p = b.product;
  const m = (p.nutriments ?? {}) as Record<string, unknown>;
  const kj = n(m['energy-kj_100g'] ?? m.energy_100g);
  const kcal = Number.isFinite(n(m['energy-kcal_100g'])) ? n(m['energy-kcal_100g']) : kj / V.kjPerKcal;
  // past 1,000 kcal in 100 g is a typo in the data, so the label is asked for instead
  const per100 = Number.isFinite(kcal) && kcal >= 0 && kcal <= 1000
    ? { kcal: r2(kcal), protein: macro(m.proteins_100g), carbs: macro(m.carbohydrates_100g), fat: macro(m.fat_100g) }
    : null;
  const ml = text(p.product_quantity_unit, 10).toLowerCase() === 'ml' || /\d\s*(ml|cl|l)\b/i.test(text(p.quantity, 60));
  const brand = text(p.brands, 200).split(',')[0].trim().slice(0, 80);
  return {
    name: (text(p.product_name_en, 120) || text(p.product_name, 120)),
    ...(brand ? { brand } : {}),
    unit: ml ? 'ml' : 'g',
    per100,
    ...(known(p.serving_quantity, 5000) ? { servingG: r2(known(p.serving_quantity, 5000)!) } : {}),
    ...(known(p.product_quantity, 20000) ? { packG: r2(known(p.product_quantity, 20000)!) } : {}),
    ...(text(p.serving_size, 80) ? { serving: text(p.serving_size, 80) } : {}),
  };
}

/** The product, null when Open Food Facts does not have it. Throws when it cannot be reached or answers with an error. */
export async function fetchOff(code: string): Promise<OffProduct | null> {
  const res = await fetch(`${OFF_BASE}/api/v2/product/${code}?fields=${FIELDS}`, {
    headers: { 'X-User-Agent': `Ontrack/${__APP_VERSION__} (https://ontrack-black.vercel.app)` },
    signal: AbortSignal.timeout(WAIT_MS),
  });
  // a barcode it does not have answers 404 with a JSON body
  if (!res.ok && res.status !== 404) throw new Error(`Open Food Facts answered ${res.status}`);
  return parseOff(await res.json());
}
