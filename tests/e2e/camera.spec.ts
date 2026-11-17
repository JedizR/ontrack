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

// R1, the owner's one camera: Meal and Label sit beside Barcode in the same viewfinder, and Take photo keeps the frame.
// The fake camera plays a barcode, which would be read before a tap, so this one has no reader: it is the modes, not the read
test('R1: in the scanner Meal takes a photo of the plate to Review, without leaving the camera', async ({ page }) => {
  await page.addInitScript(() => {
    // a reader for the four retail formats that never finds a code, so the camera stays on the modes
    (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = class { static getSupportedFormats() { return Promise.resolve(['ean_13', 'ean_8', 'upc_a', 'upc_e']); } detect() { return Promise.resolve([]); } };
  });
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('add-scan').click();
  await expect(page.getByTestId('scanner-video')).toBeVisible();
  await expect(page.getByTestId('scanner-shutter')).toHaveCount(0); // Barcode reads by itself: no shutter
  await page.getByRole('radio', { name: 'Meal' }).click();
  await expect(page.getByTestId('scanner-frame')).toHaveCount(0); // a plate has no guide frame
  await expect(page.getByTestId('scanner-hint')).toHaveText('Frame the whole plate.');
  await page.getByTestId('scanner-shutter').click();
  await expect(page.getByTestId('photo-notice')).toBeVisible(); // the first photo still asks first
  await page.getByTestId('photo-continue').click();
  await expect(page.getByTestId('review-sheet')).toBeVisible();
});
