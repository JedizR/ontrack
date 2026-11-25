// The camera's barcode reader (B1, F22). Chrome's own BarcodeDetector where it reads these formats (Android); otherwise,
// Safari among them, zxing-cpp compiled to WebAssembly through the barcode-detector ponyfill (MIT, on zxing-wasm, MIT).
// Both load only when the scanner opens, and the WebAssembly is served from this site rather than the package's CDN, so
// it is cached for offline use after the first scan (vite.config.ts).
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

export const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;
export type Detector = { detect(source: HTMLVideoElement): Promise<{ rawValue: string; format: string }[]> };
type Native = { new (o: { formats: string[] }): Detector; getSupportedFormats(): Promise<string[]> };

// one overrides object, so the WebAssembly is compiled once and reused by every later scan
const OVERRIDES = { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) };

/** A reader for the four retail formats. Throws when the WebAssembly cannot load (offline before the first scan). */
export async function barcodeDetector(): Promise<Detector> {
  const native = (globalThis as { BarcodeDetector?: Native }).BarcodeDetector;
  const supported = native ? await native.getSupportedFormats().catch(() => [] as string[]) : [];
  if (native && FORMATS.every((f) => supported.includes(f))) return new native({ formats: [...FORMATS] });
  const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
  await prepareZXingModule({ overrides: OVERRIDES, fireImmediately: true });
  return new BarcodeDetector({ formats: [...FORMATS] });
}

/** Why the camera did not open, from getUserMedia's error. */
export function cameraProblem(e: unknown): 'denied' | 'busy' | 'none' {
  const name = (e as { name?: string })?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied';
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy';
  return 'none';
}

// R7b: Safari names a lens in the phone's language ("Back Ultra Wide Camera", "Cámara ultra gran angular", 背面超広角カメラ):
// the word for ultra-wide in the scripts Apple ships, never a front lens. Android names none this way (zoom only).
// shortcut: a language outside this list gets zoom only; add its word
const ULTRA = /ultra|超广角|超廣角|超広角|울트라|초광각|อัลตร้า|มุมกว้างพิเศษ|сверхширок|надширок|siêu rộng|अल्ट्रा|אולטרה|فائق|υπερευρυ/i;
const FRONT = /front|avant|vorder|前|전면|ด้านหน้า|фронт|trước|सामने|קדמ|أمامي|μπροστ/i;
/** The back ultra-wide camera's id, the iPhone's close-focusing lens, or null. */
export function ultraWide(devices: MediaDeviceInfo[]): string | null {
  const d = devices.find((d) => d.kind === 'videoinput' && ULTRA.test(d.label) && !FRONT.test(d.label) && !(d as InputDeviceInfo).getCapabilities?.().facingMode?.includes('user'));
  return d?.deviceId ?? null;
}
