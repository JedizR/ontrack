// Number formatting for the interface. English grouping in v1; a Thai catalog brings its own locale.
const round2 = (n: number) => Math.round(n * 100) / 100;

/** 1,840 and 72.5: thousands separators, decimals only when needed (at most `maxDecimals`). */
export function num(n: number, maxDecimals = 2): string {
  return round2(n).toLocaleString('en-US', { maximumFractionDigits: maxDecimals });
}
