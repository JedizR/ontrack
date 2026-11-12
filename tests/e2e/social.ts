// Helpers for friends and the food map (S1b): people in one mock space, friendships made on the server, shared meals
// with their photos, and OpenFreeMap answered by a plain style so tests never reach the tile server.
import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';
import { SEED, TODAY } from './helpers';

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
/** A photo meal on the map at a place, with its photo uploaded. */
export async function shareAt(page: Page, who: Who, o: { id: string; title: string; kcal: number; lat: number; lng: number; time: string; date?: string; photo?: boolean }) {
  const date = o.date ?? TODAY;
  const meal = { date, at: at(date, o.time), title: o.title, method: 'photo', thumb: true, share: { lat: o.lat, lng: o.lng }, items: [{ name: o.title, grams: 350, kcal: o.kcal, protein: 32, carbs: 70, fat: 18, source: 'db' }] };
  expect((await page.request.post('/__mock/push', { headers: who.headers, data: { records: [{ collection: 'meal', id: o.id, updatedAt: 2, data: meal }] } })).ok()).toBe(true);
  if (o.photo !== false) await page.request.put(`/__mock/thumb/${o.id}`, { headers: who.headers, data: readFileSync('tests/fixtures/meal.jpg') });
}

/** Sends what this phone has waiting, now. */
export const flush = (page: Page) => page.evaluate(() => (window as unknown as { ontrack: { sync: { run(): Promise<void> } } }).ontrack.sync.run());

/** Opens the food map from the header and waits for it to draw. */
export async function openMap(page: Page) {
  await page.getByTestId('friends').click();
  await expect(page.getByTestId('food-map')).toBeVisible();
  await expect(page.getByTestId('map-fit').or(page.getByTestId('map-message'))).toBeVisible({ timeout: 15_000 });
}

/** The friends panel raised, by its grabber. */
export async function raise(page: Page) {
  const panel = page.getByTestId('friends-panel');
  if ((await panel.getAttribute('data-raised')) !== 'true') await page.getByTestId('panel-grabber').click();
  await expect(panel).toHaveAttribute('data-raised', 'true');
}
