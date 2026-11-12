// Positions for the food map (S1, F17): read from a photo before the canvas strips them, rounded on the device before
// they are stored or sent, and grouped into pins for a zoom level. Pure, no map library.
export type Position = { lat: number; lng: number };

/**
 * About 100 m: three decimals of a degree, 111 m north to south and 108 m east to west in Bangkok (narrower toward the
 * poles). The database rounds the same way again (docs/DECISIONS.md, S1a).
 */
export const roundPosition = (p: Position): Position => ({ lat: Math.round(p.lat * 1000) / 1000, lng: Math.round(p.lng * 1000) / 1000 });

/**
 * The GPS position saved in a photo file, or null. Reads the Exif block wherever it sits (a JPEG's APP1 segment, a
 * HEIC's Exif item), so it must run on the original file: the canvas the app draws the photo on keeps no metadata.
 */
export async function photoPosition(file: Blob): Promise<Position | null> {
  const b = new Uint8Array(await file.arrayBuffer());
  for (let i = b.indexOf(0x45); i >= 0 && i + 14 < b.length; i = b.indexOf(0x45, i + 1)) {
    if (String.fromCharCode(...b.subarray(i, i + 6)) !== 'Exif\0\0') continue;
    const found = gps(new DataView(b.buffer, b.byteOffset + i + 6));
    if (found !== undefined) return found;
  }
  return null;
}

/** The position in a TIFF block's GPS directory; null when it has none, undefined when this is no TIFF block. */
function gps(v: DataView): Position | null | undefined {
  try {
    const le = v.getUint16(0) === 0x4949; // II: little endian, MM: big
    if ((!le && v.getUint16(0) !== 0x4d4d) || v.getUint16(2, le) !== 42) return undefined;
    const u32 = (o: number) => v.getUint32(o, le);
    const entries = (dir: number) => Array.from({ length: v.getUint16(dir, le) }, (_, k) => dir + 2 + k * 12);
    const pointer = entries(u32(4)).find((e) => v.getUint16(e, le) === 0x8825);
    if (pointer === undefined) return null;
    const tags = new Map(entries(u32(pointer + 8)).map((e) => [v.getUint16(e, le), e]));
    // degrees, minutes and seconds as three rationals; the reference (N, S, E, W) as a short string inside the entry
    const angle = (tag: number) => {
      const e = tags.get(tag);
      if (e === undefined) return NaN;
      const at = u32(e + 8);
      return [0, 1, 2].reduce((sum, k) => sum + u32(at + k * 8) / u32(at + k * 8 + 4) / 60 ** k, 0);
    };
    const sign = (tag: number, negative: string) => (tags.has(tag) && String.fromCharCode(v.getUint8(tags.get(tag)! + 8)) === negative ? -1 : 1);
    const lat = angle(2) * sign(1, 'S');
    const lng = angle(4) * sign(3, 'W');
    // 0, 0 is what some cameras write without a fix
    if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180) || (lat === 0 && lng === 0)) return null;
    return { lat, lng };
  } catch {
    return undefined; // cut short: not a block to read
  }
}

/**
 * The phone's position, read once and never watched (F17: never live, never a track). `denied` when the user or the
 * browser refuses, `unavailable` when no fix came in time or there is no location service.
 */
export function currentPosition(): Promise<Position | 'denied' | 'unavailable'> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return Promise.resolve('unavailable');
  return new Promise((ok) =>
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (e) => ok(e.code === 1 ? 'denied' : 'unavailable'), // 1 is PERMISSION_DENIED
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 60_000 },
    ),
  );
}

/** A map's bounds as the database compares them: longitudes back inside -180 to 180 (a map panned round the world
 * reports 185 or -540), the whole world when the box is wider than it, and a west edge east of the east edge when it
 * crosses the 180th meridian. */
export function wrapBox<B extends { west: number; east: number }>(b: B): B {
  if (b.east - b.west >= 360) return { ...b, west: -180, east: 180 };
  const wrap = (x: number) => (Math.abs(x) <= 180 ? x : ((((x + 180) % 360) + 360) % 360) - 180);
  return { ...b, west: wrap(b.west), east: wrap(b.east) };
}

/** Pins drawn as one: the lead's photo, with "+N more" where N is `more.length`. */
export type Cluster<T> = { lead: T; more: T[] };

/**
 * Groups pins closer than `radius` screen pixels at a zoom level (Web Mercator with 512 px tiles, as MapLibre draws).
 * Pins come newest first; the newest ungrouped pin leads and takes every ungrouped pin within the radius.
 * shortcut: compares every pair, fine for the SHARED_MAX pins a box holds; index by grid cell if that ever grows
 */
export function clusterPins<T extends Position>(pins: T[], zoom: number, radius = 48): Cluster<T>[] {
  const size = 512 * 2 ** zoom;
  const at = pins.map((p) => {
    const s = Math.sin((Math.max(-85.05, Math.min(85.05, p.lat)) * Math.PI) / 180);
    return { x: ((p.lng + 180) / 360) * size, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * size };
  });
  const grouped = new Set<number>();
  const out: Cluster<T>[] = [];
  pins.forEach((lead, i) => {
    if (grouped.has(i)) return;
    const more: T[] = [];
    for (let j = i + 1; j < pins.length; j++) {
      const dx = Math.abs(at[i].x - at[j].x);
      // the shorter way round, so pins either side of the 180th meridian group
      if (!grouped.has(j) && Math.hypot(Math.min(dx, size - dx), at[i].y - at[j].y) <= radius) {
        more.push(pins[j]);
        grouped.add(j);
      }
    }
    out.push({ lead, more });
  });
  return out;
}
