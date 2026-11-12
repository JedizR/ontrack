// Barcodes on packaged food (B1, F22): EAN-13, EAN-8, UPC-A and UPC-E, GS1 numbers that end in a check digit.

/** The GS1 check digit: weights 3 and 1 alternate leftwards from the digit before it. */
export function checkDigitOk(code: string) {
  let sum = 0;
  for (let i = code.length - 2, w = 3; i >= 0; i--, w = 4 - w) sum += Number(code[i]) * w;
  return (10 - (sum % 10)) % 10 === Number(code[code.length - 1]);
}

/** UPC-E's 8 digits as the 12 digit UPC-A they stand for (the GS1 zero suppression rules). */
export function expandUpcE(e: string) {
  const d = e.slice(1, 7);
  const last = d[5];
  const body =
    last <= '2' ? `${d.slice(0, 2)}${last}0000${d.slice(2, 5)}`
    : last === '3' ? `${d.slice(0, 3)}00000${d.slice(3, 5)}`
    : last === '4' ? `${d.slice(0, 4)}00000${d[4]}`
    : `${d.slice(0, 5)}0000${last}`;
  return e[0] + body + e[7];
}

/**
 * A product's id from a read or typed barcode: 13 digits (a UPC-A gets the leading 0 Open Food Facts stores it with)
 * or 8 for EAN-8; null when the digits do not make a barcode. A camera's UPC-E is expanded first. Typed 8 digits are
 * taken as EAN-8: UPC-E is rare outside North America, and its expansion is on the pack's 12 digit code anyway.
 */
export function productCode(raw: string, format?: string): string | null {
  const digits = raw.replace(/[\s-]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  let code = format === 'upc_e' && digits.length === 8 ? expandUpcE(digits) : digits;
  if (code.length === 12) code = `0${code}`;
  return (code.length === 8 || code.length === 13) && checkDigitOk(code) ? code : null;
}
