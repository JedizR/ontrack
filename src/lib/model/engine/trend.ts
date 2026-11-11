// Weight trend for display and the rate for decisions. docs/SCIENCE.md section 10.
import { V } from './constants';

/** A weigh-in on a day number (any integer day count, such as days since 1970-01-01). */
export type WeighIn = { day: number; kg: number };

/** Exponentially smoothed trend over weigh-ins in date order, starting at the first value (S17). */
export function smooth(kgs: number[]): number[] {
  const out: number[] = [];
  for (const kg of kgs) {
    const prev = out.at(-1);
    out.push(prev == null ? kg : prev + V.trendSmoothing * (kg - prev));
  }
  return out;
}

/** Ordinary least squares slope in kg per day. Null with fewer than two distinct days. */
export function slope(points: WeighIn[]): number | null {
  if (points.length <= 1) return null;
  const mx = points.reduce((a, p) => a + p.day, 0) / points.length;
  const my = points.reduce((a, p) => a + p.kg, 0) / points.length;
  let sxx = 0;
  let sxy = 0;
  for (const p of points) {
    sxx += (p.day - mx) * (p.day - mx);
    sxy += (p.day - mx) * (p.kg - my);
  }
  return sxx === 0 ? null : sxy / sxx;
}
