// The capture before upload (TECH-SPEC section 8): drawn to a canvas at 1024 px on the longest edge and exported as
// JPEG at quality 0.8, which also drops location data; the 320 px thumbnail at 0.7 comes from the same canvas.
const EDGE = 1024;
const THUMB_EDGE = 320;

function draw(src: CanvasImageSource, w: number, h: number, edge: number) {
  const s = Math.min(1, edge / Math.max(w, h));
  const c = document.createElement('canvas');
  c.width = Math.round(w * s);
  c.height = Math.round(h * s);
  c.getContext('2d')!.drawImage(src, 0, 0, c.width, c.height);
  return c;
}
const jpeg = (c: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('the photo could not be encoded'))), 'image/jpeg', quality));
const base64 = (b: Blob) =>
  new Promise<string>((ok, no) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).slice(String(r.result).indexOf(',') + 1));
    r.onerror = () => no(r.error);
    r.readAsDataURL(b);
  });

/** The photo to analyse (as base64 and as a blob to show) and its thumbnail. Throws on a file that is not an image. */
export async function preparePhoto(file: Blob) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode(); // the browser applies the camera's orientation
    const big = draw(img, img.naturalWidth, img.naturalHeight, EDGE);
    const small = draw(big, big.width, big.height, THUMB_EDGE);
    const [photo, thumb] = await Promise.all([jpeg(big, 0.8), jpeg(small, 0.7)]);
    return { image: await base64(photo), photo, thumb };
  } finally {
    URL.revokeObjectURL(url);
  }
}
