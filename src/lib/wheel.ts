// The wheel picker's maths (DESIGN.md section 7, Wheel). Rows run from min to max by step, going up as the list goes
// down; a decimal value is a whole column and a tenths column.

/** Rounds away float noise: 0.1 + 0.2 is 0.3 here. */
const tidy = (v: number) => Math.round(v * 1e6) / 1e6;
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** How many rows a column has. */
export const count = (min: number, max: number, step: number) => Math.round((max - min) / step) + 1;
/** The row a value sits on (values between rows go to the nearest). */
export const indexOf = (value: number, min: number, step: number) => Math.round((value - min) / step);
/** The value on a row. */
export const valueAt = (i: number, min: number, step: number) => tidy(min + i * step);

/** A value to the tenth as its whole and tenths rows: 82.4 is 82 and 4. */
export function split(value: number) {
  const tenths = Math.round(value * 10);
  return { whole: Math.floor(tenths / 10), tenth: tenths - Math.floor(tenths / 10) * 10 };
}
/** The whole and tenths rows back as a value, kept inside min and max (at a whole max the tenths read 0). */
export const join = (whole: number, tenth: number, min: number, max: number) => tidy(clamp(whole + tenth / 10, min, max));

/** A typed number: a comma reads as a point. NaN when it is not a number. */
export function parse(text: string) {
  const t = text.trim().replace(',', '.');
  return t === '' ? NaN : Number(t);
}
/** A typed value made legal: inside min and max, on a row. */
export const snap = (v: number, min: number, max: number, step: number) => valueAt(indexOf(clamp(v, min, max), min, step), min, step);
