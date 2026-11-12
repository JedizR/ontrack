// The camera's barcode reader (B1, F22). Chrome's own BarcodeDetector where it reads these formats (Android); otherwise,
// Safari among them, zxing-cpp compiled to WebAssembly through the barcode-detector ponyfill (MIT, on zxing-wasm, MIT).
// Both load only when the scanner opens, and the WebAssembly is served from this site rather than the package's CDN, so
// it is cached for offline use after the first scan (vite.config.ts).
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

export const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;
export type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string; format: string }[]> };
type Native = { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> };

/** A reader for the four retail formats. Throws when the WebAssembly cannot load (offline before the first scan). */
export async function barcodeDetector(): Promise<Detector> {
  const native = (globalThis as { BarcodeDetector?: Native }).BarcodeDetector;
  const supported = native ? await native.getSupportedFormats().catch(() => [] as string[]) : [];
  if (native && FORMATS.every((f) => supported.includes(f))) return new native({ formats: [...FORMATS] });
  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
  await prepareZXingModule({ overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) }, fireImmediately: true });
  return new BarcodeDetector({ formats: [...FORMATS] });
}

/** Why the camera did not open, from getUserMedia's error. */
export function cameraProblem(e: unknown): 'denied' | 'busy' | 'none' {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy';
  return 'none';
}
