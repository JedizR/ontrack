// The food map's positions (S1, F17): GPS read from a photo's Exif, rounded to about 100 m, pins grouped by zoom.
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { clusterPins, photoPosition, roundPosition, type Position } from '../../src/lib/geo';

/** A JPEG's start, an APP1 Exif segment whose TIFF block has a GPS directory, and its end. dms: degrees, minutes, seconds. */
function jpegWithGps(lat: number[], latRef: string, lng: number[], lngRef: string, le: boolean) {
  const t = new DataView(new ArrayBuffer(128));
  const entry = (at: number, tag: number, type: number, count: number, value: number) => {
    t.setUint16(at, tag, le);
    t.setUint16(at + 2, type, le);
    t.setUint32(at + 4, count, le);
    t.setUint32(at + 8, value, le);
  };
  const ref = (at: number, tag: number, c: string) => {
    entry(at, tag, 2, 2, 0);
    t.setUint8(at + 8, c.charCodeAt(0));
  };
  const rationals = (at: number, dms: number[]) => dms.forEach((n, k) => { t.setUint32(at + k * 8, Math.round(n * 100), le); t.setUint32(at + k * 8 + 4, 100, le); });
  t.setUint16(0, le ? 0x4949 : 0x4d4d);
  t.setUint16(2, 42, le);
  t.setUint32(4, 8, le);
  t.setUint16(8, 1, le); // IFD0: one entry, the GPS pointer
  entry(10, 0x8825, 4, 1, 26);
  t.setUint16(26, 4, le); // GPS IFD: four entries
  ref(28, 1, latRef);
  entry(40, 2, 5, 3, 80);
  ref(52, 3, lngRef);
  entry(64, 4, 5, 3, 104);
  rationals(80, lat);
  rationals(104, lng);
  const app1 = [...new TextEncoder().encode('Exif\0\0'), ...new Uint8Array(t.buffer)];
  return new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe1, (app1.length + 2) >> 8, (app1.length + 2) & 255, ...app1, 0xff, 0xd9])], { type: 'image/jpeg' });
}

test('reads the position a photo saved, in either byte order and every hemisphere', async () => {
  // Victory Monument, Bangkok: 13 45' 54.36" N, 100 32' 18.72" E
  const bangkok = await photoPosition(jpegWithGps([13, 45, 54.36], 'N', [100, 32, 18.72], 'E', true));
  expect(bangkok!.lat).toBeCloseTo(13.7651, 4);
  expect(bangkok!.lng).toBeCloseTo(100.5385, 4);
  const lima = await photoPosition(jpegWithGps([12, 2, 47.88], 'S', [77, 1, 42.36], 'W', false));
  expect(lima!.lat).toBeCloseTo(-12.0466, 4);
  expect(lima!.lng).toBeCloseTo(-77.0284, 4);
});

test('a photo with no position, a broken block or a bogus 0, 0 gives null', async () => {
  expect(await photoPosition(new Blob([readFileSync('tests/fixtures/meal.jpg')]))).toBeNull();
  expect(await photoPosition(new Blob(['Exif\0\0MM\0*\0\0\0\x08'], { type: 'image/jpeg' }))).toBeNull();
  expect(await photoPosition(jpegWithGps([0, 0, 0], 'N', [0, 0, 0], 'E', true))).toBeNull();
  expect(await photoPosition(new Blob([]))).toBeNull();
});

test('a position is rounded to three decimals, never more than about 80 m from where it was', () => {
  expect(roundPosition({ lat: 13.76508, lng: 100.53853 })).toEqual({ lat: 13.765, lng: 100.539 });
  expect(roundPosition({ lat: -12.04663, lng: -77.02843 })).toEqual({ lat: -12.047, lng: -77.028 });
  const p = { lat: 13.7655, lng: 100.5385 };
  const r = roundPosition(p);
  const m = Math.hypot((r.lat - p.lat) * 111_320, (r.lng - p.lng) * 111_320 * Math.cos((p.lat * Math.PI) / 180));
  expect(m).toBeLessThan(80);
});

test('pins group by zoom: close ones under the newest, apart again zoomed in, and across the 180th meridian', () => {
  const pin = (id: string, lat: number, lng: number): Position & { id: string } => ({ id, lat, lng });
  // newest first: two shops 150 m apart, one across town
  const pins = [pin('new', 13.745, 100.534), pin('near', 13.746, 100.535), pin('far', 13.8, 100.6)];
  const ids = (z: number) => clusterPins(pins, z).map((c) => [c.lead.id, ...c.more.map((p) => p.id)]);
  expect(ids(14)).toEqual([['new', 'near'], ['far']]);
  expect(ids(18)).toEqual([['new'], ['near'], ['far']]);
  expect(ids(4)).toEqual([['new', 'near', 'far']]);
  expect(clusterPins([pin('east', -17.7, 179.999), pin('west', -17.7, -179.999)], 10).length).toBe(1);
  expect(clusterPins([], 10)).toEqual([]);
});
