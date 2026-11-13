// Photos on the food map (S1b): a friend's photo or avatar is fetched while the map is open and kept only as an object
// URL in memory, revoked when the map closes, never stored on the phone (S1a). Your own come from the phone.
import { mealThumb, sharedPhoto } from '$lib/actions';

const urls = new Map<string, Promise<string | null>>();

/** `path`: a storage path from the server (`<owner>/<name>.jpg`). `local`: your own meal id or photo name. */
export function photoUrl(from: { path?: string | null; local?: string | null }): Promise<string | null> {
  const key = from.local ? `local:${from.local}` : from.path;
  if (!key) return Promise.resolve(null);
  let url = urls.get(key);
  if (!url) {
    const blob = from.local ? mealThumb(from.local) : sharedPhoto(from.path!).then((r) => (r.ok ? r.value : null));
    url = blob.then((b) => (b ? URL.createObjectURL(b) : null), () => null);
    // a photo still uploading is asked again next time
    void url.then((u) => { if (!u && urls.get(key) === url) urls.delete(key); });
    urls.set(key, url);
  }
  return url;
}

/** The map closed: let every photo go. */
export function forgetPhotos() {
  for (const url of urls.values()) void url.then((u) => { if (u) URL.revokeObjectURL(u); });
  urls.clear();
}
