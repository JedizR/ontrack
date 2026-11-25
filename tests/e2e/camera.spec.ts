// B1, F22: a barcode read by the camera, end to end. Chromium plays tests/fixtures/barcodes/scan.y4m (Mama tom yum,
// 8850987101021, from scripts/barcode-fixtures.ts) as its camera; Open Food Facts answers from the mock backend.
import { expect, test } from '@playwright/test';
import { open } from './helpers';

for (const reader of ["the browser's own reader where it has one", 'the WebAssembly reader Safari uses']) {
  test(`F22: plus, Scan, the camera reads the barcode by itself, Add: three taps, with ${reader}`, async ({ page }) => {
    // without BarcodeDetector the scanner loads zxing-cpp's WebAssembly, as on an iPhone
    if (reader.includes('WebAssembly')) await page.addInitScript(() => { delete (window as { BarcodeDetector?: unknown }).BarcodeDetector; });
    await open(page);
    await page.getByTestId('add').click(); // the plus opens on the camera (18 Nov)
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
  await expect(page.getByTestId('scanner-video')).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Meal' })).toBeChecked(); // Meal first; a barcode reads by itself in any mode
  await expect(page.getByTestId('scanner-hint')).toHaveText('Frame the whole plate.');
  await expect(page.getByTestId('scanner-reading')).toBeVisible(); // no frame: a chip says barcodes are read
  await expect(page.getByTestId('scanner-type')).toHaveCount(0); // typing only when the camera cannot read
  await page.getByTestId('scanner-shutter').click();
  await expect(page.getByTestId('review-sheet')).toBeVisible();
});

// R7, the owner's iPhone 14 Pro: the main camera cannot focus close, so a macro toggle switches to the ultra-wide (found
// by its name), framed at 2x; zoom chips zoom any camera. The fake camera has no ultra-wide, so one is listed and the
// request for it is answered by the fake one
test('R7: the zoom chips zoom, macro opens the ultra-wide at 2x, and the shot still goes to Review', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = class { static getSupportedFormats() { return Promise.resolve(['ean_13', 'ean_8', 'upc_a', 'upc_e']); } detect() { return Promise.resolve([]); } };
    const md = navigator.mediaDevices;
    const gum = md.getUserMedia.bind(md);
    const list = md.enumerateDevices.bind(md);
    const w = window as unknown as { lenses: unknown[] };
    w.lenses = [];
    md.getUserMedia = (c) => {
      const { deviceId, ...video } = (c?.video ?? {}) as MediaTrackConstraints;
      w.lenses.push(deviceId ?? 'main');
      return gum({ ...c, video });
    };
    md.enumerateDevices = async () => [...(await list()), { kind: 'videoinput', label: 'Back Ultra Wide Camera', deviceId: 'uw', groupId: 'g' } as MediaDeviceInfo];
  });
  await open(page);
  await page.getByTestId('add').click();
  await expect(page.getByTestId('scanner-hint')).toHaveText('Frame the whole plate.');
  const chip = (z: number) => page.getByTestId(`zoom-${z}`);
  await expect(chip(1)).toHaveAttribute('aria-pressed', 'true');
  await chip(2).click();
  await expect(chip(2)).toHaveAttribute('aria-pressed', 'true');
  await expect(chip(1)).toHaveAttribute('aria-pressed', 'false');
  const macro = page.getByTestId('scanner-macro');
  await expect(macro).toHaveAttribute('aria-pressed', 'false');
  await macro.click();
  await expect(macro).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('scanner-hint')).toHaveText('Frame the whole plate.');
  expect(await page.evaluate(() => (window as unknown as { lenses: unknown[] }).lenses.at(-1))).toEqual({ exact: 'uw' });
  await expect(chip(2)).toHaveAttribute('aria-pressed', 'true');
  await macro.click();
  await expect(chip(1)).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('scanner-shutter').click();
  await expect(page.getByTestId('review-sheet')).toBeVisible();
});

// R7, the owner: the mic takes Thai, English or both. The fake microphone's tone is recorded as a WAV and written down
// by the mock provider through the real handler
test('R7: Speak records, Stop sends the clip, and the words land in the Describe field', async ({ page }) => {
  // the fake camera plays a barcode under Add: a reader that never finds it keeps the sheet on Add
  await page.addInitScript(() => {
    (window as unknown as { BarcodeDetector: unknown }).BarcodeDetector = class { static getSupportedFormats() { return Promise.resolve(['ean_13', 'ean_8', 'upc_a', 'upc_e']); } detect() { return Promise.resolve([]); } };
  });
  await open(page);
  await page.getByTestId('add').click();
  await page.getByTestId('add-describe').click();
  const mic = page.getByTestId('describe-mic');
  await mic.click();
  await expect(page.getByTestId('describe-note')).toHaveText('Listening. Speak Thai, English or both.');
  await expect(mic).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(2500); // Chrome's fake microphone beeps about once a second, silent between
  await mic.click();
  await expect(page.getByTestId('describe-text')).toHaveValue('ข้าวมันไก่ with soup');
  await expect(page.getByTestId('describe-note')).toHaveCount(0);
  await expect(page.getByTestId('describe-analyse')).toBeEnabled();
});
