// B1, F22: a barcode read by the camera, end to end. Chromium plays tests/fixtures/barcodes/scan.y4m (Mama tom yum,
// 8850987101021, from scripts/barcode-fixtures.ts) as its camera; Open Food Facts answers from the mock backend.
import { expect, test } from '@playwright/test';
import { open } from './helpers';

for (const reader of ["the browser's own reader where it has one", 'the WebAssembly reader Safari uses']) {
  test(`F22: plus, Scan, the camera reads the barcode by itself, Add: three taps, with ${reader}`, async ({ page }) => {
    // without BarcodeDetector the scanner loads zxing-cpp's WebAssembly, as on an iPhone
    if (reader.includes('WebAssembly')) await page.addInitScript(() => { delete (window as { BarcodeDetector?: unknown }).BarcodeDetector; });
    await open(page);
    await page.getByTestId('add').click();
    await page.getByTestId('add-scan').click();
    await expect(page.getByTestId('scanner-video')).toBeVisible();
    // the reader moves on by itself: no tap between the camera and the product
    await expect(page.getByTestId('product-kcal')).toHaveText('260', { timeout: 20_000 });
    await expect(page.getByTestId('product-source')).toHaveText('Open Food Facts');
    await page.getByTestId('product-add').click();
    await expect(page.getByTestId('hero-value')).toHaveText('260');
  });
}
