// Helpers for friends and the food map (S1b): people in one mock space, friendships made on the server, shared meals
// with their photos, and OpenFreeMap answered by a plain style so tests never reach the tile server.
import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { open, SEED, TODAY } from './helpers';

const ATTRIBUTION = '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';
const style = (ground: string) => ({
  version: 8,
  sources: { ofm: { type: 'geojson', data: { type: 'FeatureCollection', features: [] }, attribution: ATTRIBUTION } },
  layers: [{ id: 'ground', type: 'background', paint: { 'background-color': ground } }, { id: 'ofm', type: 'circle', source: 'ofm' }],
});

/** OpenFreeMap answered by a plain ground in the style's colours, with the real attribution. E2E_REAL_TILES=1 keeps the real map (screenshots for people). */
export async function quietTiles(page: Page) {
  if (process.env.E2E_REAL_TILES) return;
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ json: style(r.request().url().includes('/dark') ? '#1f2024' : '#eef0f0') }));
}

export type Who = { email: string; userId: string; headers: Record<string, string> };

/** Someone in the space with an onboarded account, a profile for friends and `records`; not signed in anywhere. */
export async function person(page: Page, s: string, email: string, social: object | null, records: object[] = []): Promise<Who> {
  const res = await page.request.post('/__mock/auth/verify', { headers: { 'x-mock-space': s }, data: { email, code: '123456' } });
  const { token, userId } = (await res.json()) as { token: string; userId: string };
  const headers = { 'x-mock-space': s, authorization: `Bearer ${token}` };
  const profile = social ? [{ collection: 'social', id: 'social', updatedAt: 1, data: social }] : [];
  expect((await page.request.post('/__mock/push', { headers, data: { records: [...SEED, ...profile, ...records] } })).ok()).toBe(true);
  return { email, userId, headers };
}

/** `a` asks and `b` says yes, on the server. */
export async function befriend(page: Page, a: Who, b: Who) {
  expect((await page.request.post('/__mock/social/request', { headers: a.headers, data: { id: b.userId } })).ok()).toBe(true);
  expect((await page.request.post('/__mock/social/accept', { headers: b.headers, data: { id: a.userId } })).ok()).toBe(true);
}

const at = (date: string, time: string) => new Date(`${date}T${time}:00+07:00`).toISOString();
const PLATE = readFileSync('tests/fixtures/meal.jpg').toString('base64');
/** The test plate as a 320 px thumbnail turned round the colour wheel by `hue` degrees, so pins look like different meals. */
async function plate(page: Page, hue: number) {
  if (!hue) return readFileSync('tests/fixtures/meal.jpg');
  const bytes = await page.evaluate(async ([b64, deg]) => {
    const img = new Image();
    img.src = `data:image/jpeg;base64,${b64}`;
    await img.decode();
    const c = Object.assign(document.createElement('canvas'), { width: 320, height: 240 });
    const g = c.getContext('2d')!;
    g.drawImage(img, 0, 0, 320, 240);
    // WebKit's canvas has no filter: blend a hue over the food instead (the white plate keeps its colour)
    g.globalCompositeOperation = 'hue';
    g.fillStyle = `hsl(${deg} 80% 50%)`;
    g.fillRect(0, 0, 320, 240);
    const blob = await new Promise<Blob>((ok) => c.toBlob((b) => ok(b!), 'image/jpeg', 0.8));
    return [...new Uint8Array(await blob.arrayBuffer())];
  }, [PLATE, hue] as const);
  return Buffer.from(bytes);
}

/** A photo meal on the map at a place, with its photo uploaded (none with `photo: false`). */
export async function shareAt(page: Page, who: Who, o: { id: string; title: string; kcal: number; lat: number; lng: number; time: string; date?: string; photo?: boolean; hue?: number }) {
  const date = o.date ?? TODAY;
  const meal = { date, at: at(date, o.time), title: o.title, method: 'photo', thumb: true, share: { lat: o.lat, lng: o.lng }, items: [{ name: o.title, grams: 350, kcal: o.kcal, protein: 32, carbs: 70, fat: 18, source: 'db' }] };
  expect((await page.request.post('/__mock/push', { headers: who.headers, data: { records: [{ collection: 'meal', id: o.id, updatedAt: 2, data: meal }] } })).ok()).toBe(true);
  if (o.photo !== false) await page.request.put(`/__mock/thumb/${o.id}`, { headers: who.headers, data: await plate(page, o.hue ?? 0) });
}

/**
 * Nan's map for screenshots: Rin, Kai and Mai are friends with meals around Bangkok (Rin's three at one spot, so "+2
 * more"), Nan shared one too, Ploy asked Nan, and Nan asked Tee. Rin shows a program. Opens Today signed in as Nan.
 */
export async function scene(page: Page) {
  await quietTiles(page);
  const s = (await open(page, '/', [
    { collection: 'social', id: 'social', updatedAt: 1, data: { handle: 'nan_eats', name: 'Nan' } },
    { collection: 'meal', id: 'n1', updatedAt: 1, data: { date: TODAY, at: at(TODAY, '07:50'), title: 'Oats, banana and whey', method: 'photo', thumb: true, share: { lat: 13.737, lng: 100.561 }, items: [{ name: 'Oats', grams: 80, kcal: 303, protein: 10.5, carbs: 54, fat: 5.5, source: 'db' }, { name: 'Whey', grams: 30, kcal: 202, protein: 24, carbs: 3, fat: 2, source: 'db' }] } },
  ]))!;
  const nan = await person(page, s, 'me@example.com', null);
  await page.request.put('/__mock/thumb/n1', { headers: nan.headers, data: await plate(page, 200) });
  const program = { collection: 'program', id: 'program', updatedAt: 2, data: { name: 'Upper lower 4 days', sessions: [{ key: 'a', weekday: 0, name: 'Upper A', type: 'strength', minutes: 60, intensity: 'moderate' }, { key: 'b', weekday: 1, name: 'Lower A', type: 'strength', minutes: 60, intensity: 'moderate' }, { key: 'c', weekday: 3, name: 'Upper B', type: 'strength', minutes: 60, intensity: 'moderate' }, { key: 'd', weekday: 4, name: 'Lower B', type: 'strength', minutes: 60, intensity: 'moderate' }, { key: 'e', weekday: 5, name: 'Long ride', type: 'cardio', minutes: 90, intensity: 'light' }] } };
  const rin = await person(page, s, 'rin@example.com', { handle: 'rin', name: 'Rin', showProgram: true }, [program]);
  const kai = await person(page, s, 'kai@example.com', { handle: 'kai_lifts', name: 'Kai' });
  const mai = await person(page, s, 'mai@example.com', { handle: 'mai', name: 'Mai' });
  const ploy = await person(page, s, 'ploy@example.com', { handle: 'ploy', name: 'Ploy' });
  const tee = await person(page, s, 'tee@example.com', { handle: 'tee_runs', name: 'Tee' });
  for (const f of [rin, kai, mai]) await befriend(page, nan, f);
  await page.request.post('/__mock/social/request', { headers: ploy.headers, data: { id: nan.userId } });
  await page.request.post('/__mock/social/request', { headers: nan.headers, data: { id: tee.userId } });
  await shareAt(page, rin, { id: 'r1', title: 'Khao man kai', kcal: 596, lat: 13.746, lng: 100.534, time: '12:40', hue: 0 });
  await shareAt(page, rin, { id: 'r2', title: 'Som tam with sticky rice', kcal: 420, lat: 13.746, lng: 100.534, time: '18:10', date: '2026-11-10', hue: 120 });
  await shareAt(page, rin, { id: 'r3', title: 'Mango sticky rice', kcal: 380, lat: 13.746, lng: 100.535, time: '15:00', date: '2026-11-09', hue: 40 });
  await shareAt(page, kai, { id: 'k1', title: 'Pad kra pao with egg', kcal: 712, lat: 13.725, lng: 100.53, time: '09:15', hue: 320 });
  await shareAt(page, mai, { id: 'm1', title: 'Tom yum noodles', kcal: 455, lat: 13.758, lng: 100.548, time: '20:05', date: '2026-11-10', hue: 260 });
  // the badge asks when the app starts
  await page.reload();
  await expect(page.getByTestId('dock')).toBeVisible();
  return s;
}

/** Sends what this phone has waiting, now. */
export const flush = (page: Page) => page.evaluate(() => (window as unknown as { ontrack: { sync: { run(): Promise<void> } } }).ontrack.sync.run());

/** Opens the food map from the header and waits for it to draw. */
export async function openMap(page: Page) {
  await page.getByTestId('friends').click();
  await expect(page.getByTestId('food-map')).toBeVisible();
  await expect(page.getByTestId('map-fit').or(page.getByTestId('map-message')).first()).toBeVisible({ timeout: 15_000 });
}

/** The friends panel raised, by its grabber. */
export async function raise(page: Page) {
  const panel = page.getByTestId('friends-panel');
  if ((await panel.getAttribute('data-raised')) !== 'true') await page.getByTestId('panel-grabber').click();
  await expect(panel).toHaveAttribute('data-raised', 'true');
}
