// Barcode fixtures for the scanner's tests (B1): one PNG per format for the decoder's unit test, and a Y4M clip of the
// Mama tom yum barcode that Chromium plays as a fake camera in tests/e2e/scan.spec.ts. Run with `pnpm exec tsx
// scripts/barcode-fixtures.ts`; the outputs are committed, so this runs only when a fixture changes.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { prepareZXingModule, writeBarcode } from 'zxing-wasm/writer';

const OUT = 'tests/fixtures/barcodes';
const require = createRequire(import.meta.url);
prepareZXingModule({ overrides: { wasmBinary: readFileSync(require.resolve('zxing-wasm/writer/zxing_writer.wasm')).buffer as ArrayBuffer } });
mkdirSync(OUT, { recursive: true });

// what the PNGs carry: a Thai EAN-13, an EAN-8, a UPC-A and a UPC-E (GS1's example numbers for the last three)
const PNGS = { ean13: ['EAN13', '8850987101021'], ean8: ['EAN8', '96385074'], upca: ['UPCA', '036000291452'], upce: ['UPCE', '01234565'] } as const;
for (const [file, [format, text]] of Object.entries(PNGS)) {
  const r = await writeBarcode(text, { format, scale: 3, addHRT: true, addQuietZones: true });
  if (!r.image) throw new Error(`${format}: ${r.error}`);
  writeFileSync(`${OUT}/${file}.png`, Buffer.from(await r.image.arrayBuffer()));
}

// one 4:2:0 frame, the bars drawn at 3 px a module on white; Chromium loops it
const W = 480, H = 270, M = 3, BAR = 140;
const { symbol } = await writeBarcode('8850987101021', { format: 'EAN13', scale: 1, addHRT: false, addQuietZones: false });
const y = Buffer.alloc(W * H, 235);
const left = Math.round((W - symbol.width * M) / 2), top = Math.round((H - BAR) / 2);
for (let col = 0; col < symbol.width; col++) {
  if (symbol.data[col] !== 0) continue; // 0 is a bar
  for (let row = top; row < top + BAR; row++) y.fill(16, row * W + left + col * M, row * W + left + (col + 1) * M);
}
const chroma = Buffer.alloc((W / 2) * (H / 2) * 2, 128);
writeFileSync(`${OUT}/scan.y4m`, Buffer.concat([Buffer.from(`YUV4MPEG2 W${W} H${H} F15:1 Ip A1:1 C420jpeg\nFRAME\n`), y, chroma]));
console.log(`wrote ${Object.keys(PNGS).length} PNGs and scan.y4m to ${OUT}`);
