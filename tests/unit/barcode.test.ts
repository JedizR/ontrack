// B1, F22: barcodes as product ids (check digits, UPC-A and UPC-E), and the WebAssembly reader Safari uses, on fixture
// images from scripts/barcode-fixtures.ts.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, test } from 'vitest';
import { checkDigitOk, expandUpcE, productCode } from '../../src/lib/barcode';
import { cameraProblem } from '../../src/lib/scanner';

describe('product codes', () => {
  test('the GS1 check digit', () => {
    expect(checkDigitOk('8850987101021')).toBe(true);
    expect(checkDigitOk('8850987101022')).toBe(false);
    expect(checkDigitOk('96385074')).toBe(true);
    expect(checkDigitOk('036000291452')).toBe(true);
  });
  test('UPC-E expands by its last digit', () => {
    expect(expandUpcE('01234565')).toBe('012345000065');
    expect(expandUpcE('04252614')).toBe('042100005264');
    expect(expandUpcE('01234531')).toBe('012300000451'); // ends in 3: three digits, five zeros, two digits
    expect(expandUpcE('01234541')).toBe('012340000051'); // ends in 4: four digits, five zeros, one digit
  });
  test('ids are 13 digits, or 8 for EAN-8; anything else is not a barcode', () => {
    expect(productCode('8850987101021')).toBe('8850987101021');
    expect(productCode('8850 9871 01021')).toBe('8850987101021');
    expect(productCode('036000291452')).toBe('0036000291452'); // UPC-A, as Open Food Facts stores it
    expect(productCode('01234565', 'upc_e')).toBe('0012345000065');
    expect(productCode('0012345000065', 'upc_e')).toBe('0012345000065'); // the WebAssembly reader expands it already
    expect(productCode('96385074')).toBe('96385074');
    expect(productCode('8850987101022')).toBeNull(); // check digit
    expect(productCode('885098710102')).toBeNull(); // 12 digits that are not a UPC-A
    expect(productCode('12345')).toBeNull();
    expect(productCode('88509871o1021')).toBeNull();
    expect(productCode('')).toBeNull();
  });
  test('why the camera did not open', () => {
    expect(cameraProblem({ name: 'NotAllowedError' })).toBe('denied');
    expect(cameraProblem({ name: 'NotReadableError' })).toBe('busy');
    expect(cameraProblem({ name: 'NotFoundError' })).toBe('none');
    expect(cameraProblem(new Error('x'))).toBe('none');
  });
});

describe('the WebAssembly reader', () => {
  const require = createRequire(import.meta.url);
  test('ships the WebAssembly the ponyfill was built for', async () => {
    const { ZXING_WASM_VERSION } = await import('barcode-detector/ponyfill');
    expect(JSON.parse(readFileSync('node_modules/zxing-wasm/package.json', 'utf8')).version).toBe(ZXING_WASM_VERSION);
  });

  test('reads EAN-13, EAN-8, UPC-A and UPC-E from images, and a tilted JPEG photo of one', async () => {
    // Node has no DOMRectReadOnly, which the ponyfill uses for each barcode's box
    (globalThis as { DOMRectReadOnly?: unknown }).DOMRectReadOnly ??= class { constructor(public x = 0, public y = 0, public width = 0, public height = 0) {} };
    const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
    prepareZXingModule({ overrides: { wasmBinary: readFileSync(require.resolve('zxing-wasm/reader/zxing_reader.wasm')).buffer as ArrayBuffer } });
    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    const read = async (file: string, type = 'image/png') => {
      const found = await detector.detect(new Blob([readFileSync(`tests/fixtures/barcodes/${file}`)], { type }));
      return found.map((b) => productCode(b.rawValue, b.format));
    };
    expect(await read('ean13.png')).toEqual(['8850987101021']);
    expect(await read('ean8.png')).toEqual(['96385074']);
    expect(await read('upca.png')).toEqual(['0036000291452']);
    expect(await read('upce.png')).toEqual(['0012345000065']);
    expect(await read('ean13-photo.jpg', 'image/jpeg')).toEqual(['8850987101021']);
  });
});
