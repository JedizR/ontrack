// iPhone specifics: share-sheet saving, standalone detection.
export const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** Running from the home-screen icon (iOS keeps its storage separate from Safari's). */
export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** Save a text file: the iOS share sheet (Save to Files, LINE...) when available, else a normal download. */
export async function saveFile(name: string, text: string, type: string) {
  const file = new File([text], name, { type });
  if (isIOS() && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return; // user closed the sheet
    }
  }
  const url = URL.createObjectURL(file);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
