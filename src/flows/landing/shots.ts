// L4, speed: each phone on the landing page shows only the top of its screen, `crop` being the share of the phone's height
// that shows (Phone.svelte). Its screenshot is stored cut to what shows, so the page fetches and decodes no more than it
// draws; tests/e2e/landing-shots.spec.ts cuts each one with these numbers.
export const CROP = { today: 0.62, photo: 0.8, scan: 0.8, thai: 0.8, supplement: 0.8, train: 0.55, progress: 0.55, checkin: 0.8, map: 1 } as const;

// the phone's sizes in shares of its width (cqw), as Phone.svelte draws it: the bezel, the status bar, the 390 by 844 screen
const SCREEN = (91.6 * 844) / 390;
export const TALL = 8.4 + 12.6 + SCREEN;

/** The share of the screen a phone cropped to `crop` shows, with a little more for the fade at its foot. */
export const screenShare = (crop: number) => Math.min(1, (crop * TALL - 4.2 - 12.6) / SCREEN + 0.02);
